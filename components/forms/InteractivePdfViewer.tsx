'use client'
import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { FormField } from '@/types'

interface Props {
  pdfUrl: string
  fields: FormField[]
  mode: 'preview' | 'fill'
  values?: Record<string, any>
  onChange?: (fieldId: string, value: any) => void
  brandColor?: string
  selectedFieldId?: string | null
  onFieldClick?: (fieldId: string) => void
}

interface PageInfo {
  width: number
  height: number
}

export default function InteractivePdfViewer({
  pdfUrl,
  fields,
  mode,
  values = {},
  onChange,
  brandColor = '#6366F1',
  selectedFieldId,
  onFieldClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [scale, setScale] = useState(1)
  const [pageInfos, setPageInfos] = useState<PageInfo[]>([])
  const [loading, setLoading] = useState(true)
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  const renderScale = scale * dpr

  const positionedFields = fields.filter(f => f.page_x != null && f.page_y != null)
  const unpositionedFields = fields.filter(f => f.page_x == null || f.page_y == null)

  // Load PDF
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        const response = await fetch(pdfUrl)
        const buffer = await response.arrayBuffer()

        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
        if (cancelled) return

        const version = (pdfjsLib as any).version || '5.7.284'
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`

        const doc = await pdfjsLib.getDocument({ data: buffer }).promise
        if (cancelled) { doc.destroy(); return }

        setPdfDoc(doc)

        const infos: PageInfo[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          const viewport = page.getViewport({ scale: 1 })
          infos.push({ width: viewport.width, height: viewport.height })
        }
        setPageInfos(infos)
      } catch (err) {
        console.error('Failed to load PDF:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [pdfUrl])

  // Compute display scale to fit container width
  useEffect(() => {
    if (!containerRef.current || pageInfos.length === 0) return

    const containerWidth = containerRef.current.clientWidth - 48
    const maxPageWidth = Math.max(...pageInfos.map(p => p.width))
    const s = Math.min(containerWidth / maxPageWidth, 2)
    setScale(s)
  }, [pageInfos])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <div className="animate-pulse">Loading PDF…</div>
      </div>
    )
  }

  if (!pdfDoc) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Failed to load PDF
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto p-6">
      {Array.from({ length: pdfDoc.numPages }, (_, i) => (
        <PageRenderer
          key={i}
          pdfDoc={pdfDoc}
          pageIndex={i}
          scale={scale}
          pageInfo={pageInfos[i]}
          fields={positionedFields}
          mode={mode}
          values={values}
          onChange={onChange}
          brandColor={brandColor}
          selectedFieldId={selectedFieldId}
          onFieldClick={onFieldClick}
          renderScale={renderScale}
        />
      ))}

      {unpositionedFields.length > 0 && mode === 'fill' && (
        <div className="max-w-2xl mx-auto mt-8 space-y-4">
          {unpositionedFields.map(field => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <input
                type="text"
                value={values[field.id] || ''}
                onChange={e => onChange?.(field.id, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                  text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Page Renderer Component ----

function PageRenderer({
  pdfDoc,
  pageIndex,
  scale,
  pageInfo,
  fields,
  mode,
  values,
  onChange,
  brandColor,
  selectedFieldId,
  onFieldClick,
  renderScale,
}: {
  renderScale?: number

  pdfDoc: any
  pageIndex: number
  scale: number
  pageInfo: PageInfo
  fields: FormField[]
  mode: 'preview' | 'fill'
  values: Record<string, any>
  onChange?: (fieldId: string, value: any) => void
  brandColor: string
  selectedFieldId?: string | null
  onFieldClick?: (fieldId: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState(false)

  const pageFields = fields.filter(
    f => f.page_x != null && f.page_y != null && (f.page || 1) === pageIndex + 1
  )

  // Re-render canvas when scale changes
  useEffect(() => {
    setRendered(false)
  }, [scale])

  // Compute render scale factoring devicePixelRatio for retina-sharp output
  const effectiveRenderScale = renderScale || scale

  // Render PDF page to canvas
  useEffect(() => {
    if (!canvasRef.current || rendered) return

    let cancelled = false
    let renderTask: any = null

    const render = async () => {
      const canvas = canvasRef.current
      if (!canvas) return

      try {
        const page = await pdfDoc.getPage(pageIndex + 1)
        if (cancelled) { page.cleanup(); return }

        const viewport = page.getViewport({ scale: effectiveRenderScale })
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        renderTask = page.render({ canvasContext: ctx, viewport })
        await renderTask.promise
        if (!cancelled) setRendered(true)
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') return
        console.error('PDF page render failed:', err)
      }
    }

    render()
    return () => {
      cancelled = true
      if (renderTask) renderTask.cancel()
    }
  }, [pdfDoc, pageIndex, effectiveRenderScale, rendered])

  if (!pageInfo) return null

  const canvasWidth = pageInfo.width * scale
  const canvasHeight = pageInfo.height * scale

  const toCanvas = (pdfX: number, pdfY: number) => ({
    x: pdfX * scale,
    y: (pageInfo.height - pdfY) * scale,
  })

  return (
    <div
      className="relative mx-auto mb-4 shadow-2xl rounded-lg overflow-hidden"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div
        className="absolute inset-0"
        style={{ pointerEvents: mode === 'fill' || onFieldClick ? 'auto' : 'none' }}
      >
        {pageFields.map(field => (
          <FieldOverlay
            key={field.id}
            field={field}
            canvasX={toCanvas(field.page_x!, field.page_y!).x}
            canvasY={toCanvas(field.page_x!, field.page_y!).y}
            pageInfo={pageInfo}
            scale={scale}
            mode={mode}
            value={values[field.id]}
            onChange={val => onChange?.(field.id, val)}
            brandColor={brandColor}
            selectedFieldId={selectedFieldId}
            onFieldClick={onFieldClick}
          />
        ))}
      </div>
    </div>
  )
}

// ---- Individual Field Overlay ----

function FieldOverlay({
  field,
  canvasX,
  canvasY,
  pageInfo,
  scale,
  mode,
  value,
  onChange,
  brandColor,
  selectedFieldId,
  onFieldClick,
}: {
  field: FormField
  canvasX: number
  canvasY: number
  pageInfo: PageInfo
  scale: number
  mode: 'preview' | 'fill'
  value: any
  onChange: (val: any) => void
  brandColor: string
  selectedFieldId?: string | null
  onFieldClick?: (fieldId: string) => void
}) {
  const fieldWidth = computeFieldWidth(field, pageInfo, scale, canvasX)
  const isSelected = selectedFieldId === field.id

  if (mode === 'preview') {
    return (
      <div
        className="absolute"
        style={{
          left: canvasX,
          top: canvasY - 4 * scale,
          width: fieldWidth,
          minHeight: 22 * scale,
          cursor: onFieldClick ? 'pointer' : 'default',
        }}
        onClick={() => onFieldClick?.(field.id)}
      >
        <div
          className={`w-full h-full rounded border-2 flex items-center px-2 transition-all ${
            isSelected
              ? 'border-indigo-400 bg-indigo-500/15 opacity-100'
              : 'border-dashed opacity-60 hover:opacity-90'
          }`}
          style={{ borderColor: isSelected ? undefined : brandColor }}
        >
          <span
            className="text-[10px] font-medium truncate"
            style={{ color: isSelected ? '#818CF8' : brandColor }}
          >
            {field.label}
          </span>
        </div>
      </div>
    )
  }

  if (field.field_type === 'checkbox') {
    const size = 16 * scale
    return (
      <div
        className="absolute"
        style={{ left: canvasX, top: canvasY, width: size, height: size }}
      >
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`w-full h-full rounded border-2 flex items-center justify-center transition-colors ${
            value
              ? 'border-indigo-500 bg-indigo-500'
              : 'border-white/40 hover:border-white/70 bg-white/10'
          }`}
        >
          {value && <Check className="w-[10px] h-[10px] text-white" />}
        </button>
      </div>
    )
  }

  if (field.field_type === 'signature') {
    const w = Math.min(200 * scale, fieldWidth)
    const h = 50 * scale
    return (
      <div
        className="absolute"
        style={{ left: canvasX, top: canvasY, width: w, height: h }}
      >
        <SignaturePad
          value={value}
          onChange={onChange}
          width={w}
          height={h}
          brandColor={brandColor}
        />
      </div>
    )
  }

  // text, email, phone, number, date
  const inputHeight = 22 * scale
  return (
    <div
      className="absolute"
      style={{ left: canvasX, top: canvasY, width: fieldWidth, height: inputHeight }}
    >
      <input
        type={
          field.field_type === 'email' ? 'email' :
          field.field_type === 'phone' ? 'tel' :
          field.field_type === 'number' ? 'number' :
          field.field_type === 'date' ? 'date' :
          'text'
        }
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder || ''}
        className={`w-full h-full rounded px-1.5 text-xs bg-white/10 border transition-colors
          text-white placeholder-zinc-500
          focus:outline-none focus:ring-1 focus:ring-indigo-500
          ${value ? 'border-white/30' : 'border-white/15'}
        `}
        style={{ fontSize: `${Math.max(10, 12 * scale)}px` }}
      />
    </div>
  )
}

// ---- Helpers ----

function computeFieldWidth(
  field: FormField,
  pageInfo: PageInfo,
  scale: number,
  canvasX: number
): number {
  const pageWidthPx = pageInfo.width * scale
  const rightPadding = 20
  let width = pageWidthPx - canvasX - rightPadding
  width = Math.max(60 * scale, width)
  width = Math.min(300 * scale, width)
  return width
}

function SignaturePad({
  value,
  onChange,
  width,
  height,
  brandColor,
}: {
  value?: string
  onChange: (val: string) => void
  width: number
  height: number
  brandColor: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = brandColor
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    const start = (e: MouseEvent | TouchEvent) => {
      drawing.current = true
      const pos = getPos(e, canvas)
      ctx!.beginPath()
      ctx!.moveTo(pos.x, pos.y)
    }

    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return
      e.preventDefault()
      const pos = getPos(e, canvas)
      ctx!.lineTo(pos.x, pos.y)
      ctx!.stroke()
    }

    const end = () => {
      if (!drawing.current) return
      drawing.current = false
      onChange(canvas.toDataURL())
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    canvas.addEventListener('mouseup', end)
    canvas.addEventListener('mouseleave', end)
    canvas.addEventListener('touchstart', start, { passive: true })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      canvas.removeEventListener('mouseup', end)
      canvas.removeEventListener('mouseleave', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
    }
  }, [width, height, brandColor, onChange])

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
      }
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  if (value) {
    return (
      <canvas ref={canvasRef} className="w-full h-full rounded bg-white/5 cursor-crosshair" />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded bg-white/5 border border-dashed border-white/20 cursor-crosshair"
    />
  )
}
