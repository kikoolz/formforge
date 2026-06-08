'use client'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import SignatureCanvas from 'react-signature-canvas'
import type { Form, FormField } from '@/types'
import InteractivePdfViewer from './InteractivePdfViewer'

interface Props {
  form: Form & { form_fields: FormField[] }
}

export default function PublicForm({ form }: Props) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const sigRefs = useRef<Record<string, SignatureCanvas | null>>({})

  const fields = form.form_fields

  // Progress = fields with a non-empty value
  const filledCount = fields.filter(f => {
    const val = values[f.id]
    return val !== undefined && val !== '' && val !== false
  }).length
  const progress = Math.round((filledCount / fields.length) * 100)

  function setValue(fieldId: string, value: any) {
    setValues(prev => ({ ...prev, [fieldId]: value }))
    if (errors[fieldId]) {
      setErrors(prev => { const e = { ...prev }; delete e[fieldId]; return e })
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    fields.forEach(field => {
      if (field.required) {
        const val = values[field.id]
        if (val === undefined || val === '' || val === false) {
          newErrors[field.id] = `${field.label} is required`
        }
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit() {
    if (!validate()) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    // Build submission data: { "Full Name": "John Smith", ... }
    const submissionData: Record<string, any> = {}
    fields.forEach(field => {
      if (field.field_type === 'signature') {
        submissionData[field.label] = sigRefs.current[field.id]?.toDataURL() || ''
      } else {
        submissionData[field.label] = values[field.id] || ''
      }
    })

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: form.id,
          data: submissionData,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error)
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [form.branding_color, '#818cf8', '#c7d2fe'],
      })

      setSubmitted(true)

      if (form.redirect_url) {
        setTimeout(() => { window.location.href = form.redirect_url! }, 3000)
      }
    } catch (error: any) {
      toast.error(error.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center
            justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Submitted!</h2>
          <p className="text-zinc-400">
            Your response has been received. You'll get a confirmation email shortly.
          </p>
          {form.redirect_url && (
            <p className="text-zinc-500 text-sm mt-4">Redirecting you in 3 seconds…</p>
          )}
        </motion.div>
      </div>
    )
  }

  const unpositionedFields = fields.filter(f => f.page_x == null || f.page_y == null)

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <motion.div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: form.branding_color }}
        />
      </div>

      {/* Form header */}
      <div className="pt-12 pb-6 px-4 text-center">
        {form.logo_url && (
          <img
            src={form.logo_url}
            alt="Logo"
            className="h-12 mx-auto mb-4 object-contain"
          />
        )}
        <h1 className="text-2xl font-bold text-white">{form.title}</h1>
        {form.description && (
          <p className="text-zinc-400 mt-2">{form.description}</p>
        )}
      </div>

      {form.form_type === 'pdf_overlay' && form.original_pdf_url ? (
        <>
          <InteractivePdfViewer
            pdfUrl={form.original_pdf_url}
            fields={fields}
            mode="fill"
            values={values}
            onChange={setValue}
            brandColor={form.branding_color}
          />

          {Object.keys(errors).length > 0 && (
            <div className="max-w-2xl mx-auto px-6 mb-4">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-red-400 text-sm font-medium">
                  Please fill in all required fields
                </p>
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto px-6 pb-12 mt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-white font-semibold
                disabled:opacity-50 transition-opacity text-base"
              style={{ backgroundColor: form.branding_color }}
            >
              {submitting ? 'Submitting\u2026' : 'Submit'}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Web form fields */}
          <div className="max-w-xl mx-auto px-4 mb-6 space-y-5">
            {fields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <FieldInput
                  field={field}
                  value={values[field.id]}
                  error={errors[field.id]}
                  onChange={val => setValue(field.id, val)}
                  sigRef={ref => { sigRefs.current[field.id] = ref }}
                  brandColor={form.branding_color}
                />
              </motion.div>
            ))}
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="max-w-xl mx-auto px-4 mb-4">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-red-400 text-sm font-medium">
                  Please fill in all required fields
                </p>
              </div>
            </div>
          )}

          {fields.length === 0 && (
            <div className="max-w-xl mx-auto px-4 mb-6 text-center text-zinc-500">
              No form fields configured yet
            </div>
          )}

          <div className="max-w-xl mx-auto px-4 pb-12 mt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-white font-semibold
                disabled:opacity-50 transition-opacity text-base"
              style={{ backgroundColor: form.branding_color }}
            >
              {submitting ? 'Submitting\u2026' : 'Submit'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Renders the correct input for each field type (web form mode)
function FieldInput({
  field, value, error, onChange, sigRef, brandColor
}: {
  field: FormField
  value: any
  error?: string
  onChange: (val: any) => void
  sigRef?: (ref: SignatureCanvas | null) => void
  brandColor: string
}) {
  const baseInput = `w-full bg-white/5 border rounded-xl px-4 py-3 text-white
                     placeholder-zinc-500 focus:outline-none transition-colors text-sm ${
    error ? 'border-red-500/50' : 'border-white/10 focus:border-indigo-500'
  }`

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {field.field_type === 'textarea' && (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          rows={4}
          className={baseInput + ' resize-none'}
        />
      )}

      {['text', 'email', 'phone', 'number'].includes(field.field_type) && (
        <input
          type={field.field_type === 'phone' ? 'tel' : field.field_type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          className={baseInput}
        />
      )}

      {field.field_type === 'date' && (
        <input
          type="date"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
        />
      )}

      {field.field_type === 'checkbox' && (
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                           transition-colors ${
            value ? 'border-indigo-500 bg-indigo-500' : 'border-white/20 group-hover:border-white/40'
          }`}
            onClick={() => onChange(!value)}
          >
            {value && <span className="text-white text-xs">\u2713</span>}
          </div>
          <span className="text-zinc-300 text-sm">{field.label}</span>
        </label>
      )}

      {field.field_type === 'radio' && field.options && (
        <div className="space-y-2">
          {field.options.map(option => (
            <label key={option}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-xl
                         border border-white/8 hover:border-white/20 transition-colors"
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center
                               justify-center transition-colors ${
                value === option ? 'border-indigo-500' : 'border-white/30'
              }`}
                onClick={() => onChange(option)}
              >
                {value === option && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </div>
              <span className="text-zinc-300 text-sm">{option}</span>
            </label>
          ))}
        </div>
      )}

      {field.field_type === 'select' && field.options && (
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
        >
          <option value="">Select an option...</option>
          {field.options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}

      {field.field_type === 'signature' && (
        <div className={`border rounded-xl overflow-hidden ${
          error ? 'border-red-500/50' : 'border-white/10'
        }`}>
          <SignatureCanvas
            ref={ref => sigRef?.(ref)}
            penColor="white"
            canvasProps={{
              className: 'w-full bg-white/5',
              height: 150,
              style: { width: '100%' }
            }}
            onEnd={() => onChange('signed')}
          />
          <div className="flex justify-end p-2 border-t border-white/8">
            <button
              type="button"
              onClick={() => {
                onChange(undefined)
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
