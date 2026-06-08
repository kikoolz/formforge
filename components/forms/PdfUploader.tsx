'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

const STATUS_MESSAGES: Record<UploadStatus, string> = {
  idle:       '',
  uploading:  'Uploading PDF...',
  processing: 'AI detecting fields...',
  done:       'Done! Redirecting...',
  error:      'Something went wrong',
}

export default function PdfUploader() {
  const router = useRouter()
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File must be under 20MB')
      return
    }

    setStatus('uploading')
    setProgress(20)

    // Build form data
    const formData = new FormData()
    formData.append('pdf', file)
    formData.append('title', file.name.replace('.pdf', ''))

    try {
      setProgress(50)
      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setProgress(80)
      setStatus('processing')

      // Poll for processing completion
      await pollForCompletion(result.data.formId)

      setProgress(100)
      setStatus('done')
      toast.success('Form created!')

      // Redirect to editor
      setTimeout(() => {
        router.push(`/dashboard/forms/${result.data.formId}/edit`)
      }, 500)

    } catch (error: any) {
      setStatus('error')
      toast.error(error.message || 'Upload failed')
    }
  }, [router])

  // Poll every 2 seconds until status is 'ready' or 'error'
  async function pollForCompletion(formId: string) {
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const response = await fetch(`/api/forms/${formId}`)
      const { data } = await response.json()

      if (data?.status === 'ready') return
      if (data?.status === 'error') throw new Error('AI processing failed')
    }
    throw new Error('Processing timed out')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => {
          if (status === 'idle') {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.pdf'
            input.onchange = e => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) handleFile(file)
            }
            input.click()
          }
        }}
        animate={{
          borderColor: isDragging ? '#6366F1' : 'rgba(255,255,255,0.1)',
          backgroundColor: isDragging ? 'rgba(99,102,241,0.05)' : 'transparent',
        }}
        className="border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer
                   transition-all"
      >
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
              <p className="text-white font-medium text-lg">Drop your PDF here</p>
              <p className="text-zinc-500 mt-1">or click to browse • max 20MB</p>
            </motion.div>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <motion.div key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <FileText className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
              <p className="text-white font-medium">{STATUS_MESSAGES[status]}</p>

              {/* Progress bar */}
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-500 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}

          {status === 'done' && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-white font-medium">Fields detected!</p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-white font-medium">Upload failed</p>
              <button
                onClick={e => { e.stopPropagation(); setStatus('idle'); setProgress(0) }}
                className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
