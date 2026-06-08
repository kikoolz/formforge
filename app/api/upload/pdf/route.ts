import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { extractPdfText } from '@/lib/extract-pdf-text'
import { extractPdfTextWithOcr } from '@/lib/extract-pdf-text-ocr'
import { matchFieldPositions } from '@/lib/match-field-positions'
import type { DetectedField } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('form_limit')
    .eq('id', user.id)
    .single()

  const { count: formCount } = await supabase
    .from('forms')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (userData && formCount != null && formCount >= userData.form_limit) {
    return NextResponse.json(
      { error: 'Form limit reached. Please upgrade your plan.', code: 'FORM_LIMIT_REACHED' },
      { status: 403 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('pdf') as File
  const title = formData.get('title') as string || 'Untitled Form'
  const formType = formData.get('form_type') as string || 'pdf_overlay'

  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Please upload a PDF file', code: 'INVALID_FILE' }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 20MB', code: 'FILE_TOO_LARGE' }, { status: 400 })
  }

  const fileName = `${user.id}/${crypto.randomUUID()}.pdf`
  const fileBuffer = await file.arrayBuffer()

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('pdfs')
    .upload(fileName, fileBuffer, { contentType: 'application/pdf' })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed', code: 'UPLOAD_FAILED' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('pdfs')
    .getPublicUrl(uploadData.path)

  const slug = generateSlug(title)

  const { data: form, error: formError } = await supabaseAdmin
    .from('forms')
    .insert({
      user_id: user.id,
      title,
      original_pdf_url: publicUrl,
      status: 'processing',
      public_slug: slug,
      form_type: formType,
      notification_email: user.email,
    })
    .select()
    .single()

  if (formError) {
    return NextResponse.json({ error: 'Failed to create form', code: 'DB_ERROR' }, { status: 500 })
  }

  let extraction = { text: '', items: [] as any[] }
  try {
    extraction = await extractPdfText(fileBuffer)
    console.log(`[upload] Extracted ${extraction.text.length} chars, ${extraction.items.length} text items`)
  } catch (e) {
    console.error('[upload] Text extraction failed:', e)
    extraction = { text: '', items: [] }
  }

  // If standard extraction fails, try OCR (scanned PDFs)
  if (!extraction.text.trim()) {
    console.log('[upload] Standard text extraction empty, trying OCR...')
    try {
      const ocrResult = await extractPdfTextWithOcr(fileBuffer)
      if (ocrResult.text.trim()) {
        extraction = ocrResult
        console.log(`[upload] OCR extracted ${extraction.text.length} chars`)
      } else {
        console.log('[upload] OCR also returned empty text')
      }
    } catch (ocrErr) {
      const ocrMsg = ocrErr instanceof Error ? ocrErr.message : String(ocrErr)
      console.error('[upload] OCR fallback failed:', ocrMsg)
      // Return the actual error so we can debug
      await supabaseAdmin
        .from('forms')
        .update({ status: 'ready' })
        .eq('id', form.id)
      return NextResponse.json({
        data: { formId: form.id, slug: form.public_slug },
        warning: `OCR failed: ${ocrMsg}`,
      })
    }
  }

  // Skip AI if no text extracted
  if (!extraction.text.trim()) {
    console.log('[upload] No text extracted, skipping AI detection')
    await supabaseAdmin
      .from('forms')
      .update({ status: 'ready' })
      .eq('id', form.id)
    return NextResponse.json({
      data: { formId: form.id, slug: form.public_slug },
      warning: 'No text could be extracted from this PDF. It may be a scanned document. You can add fields manually in the editor.',
    })
  }

  // Detect fields via OpenRouter
  try {
    const detectedFields = await detectFieldsWithAi(extraction.text)

    const matchedFields = matchFieldPositions(detectedFields, extraction.items)

    if (matchedFields.length > 0) {
      const fieldRecords = matchedFields.map((field: any, index: number) => ({
        form_id: form.id,
        label: field.label,
        field_type: field.field_type,
        required: field.required ?? false,
        options: field.options ?? null,
        position: index,
        page: field.page ?? 1,
        page_x: field.page_x ?? null,
        page_y: field.page_y ?? null,
      }))

      const { error: insertError } = await supabaseAdmin
        .from('form_fields')
        .insert(fieldRecords)

      if (insertError) throw insertError
    }

    await supabaseAdmin
      .from('forms')
      .update({ status: 'ready' })
      .eq('id', form.id)
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Field detection failed'
    const message = raw.toLowerCase().includes('image')
      ? 'AI field detection couldn\'t process this PDF — it may contain scanned images. Your form was created but has no fields. You can add fields manually in the editor.'
      : raw
    console.error('Field detection failed:', raw)
    await supabaseAdmin
      .from('forms')
      .update({ status: 'ready' })
      .eq('id', form.id)

    return NextResponse.json({
      data: { formId: form.id, slug: form.public_slug },
      warning: message,
    })
  }

  return NextResponse.json({ data: { formId: form.id, slug: form.public_slug } })
}

function sanitizeText(text: string): string {
  return text
    .replace(/\b[\w\-]+\.(png|jpg|jpeg|gif|bmp|svg|webp|ico)\b/gi, '')
    .replace(/["']?[\w\-./\\]*[\w\-]+\.(png|jpg|jpeg|gif|bmp|svg|webp|ico)["']?/gi, '')
    .replace(/data:image\/[^;"'\s]+;base64[^;"'\s]+/gi, '')
    .replace(/image\/(png|jpeg|jpg|gif|svg|webp|bmp|x-icon|x-png)/gi, '')
    .replace(/\bfigure\s+\d+\b/gi, '')
    .replace(/\b(image|photo|picture|screenshot)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const AI_MODELS = [
  'qwen/qwen3-coder:free',
  'google/gemma-4-31b-it:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-20b:free',
]

async function detectFieldsWithAi(pdfText: string): Promise<DetectedField[]> {
  const cleanText = sanitizeText(pdfText)
  console.log(`[detect] Clean text length: ${cleanText.length}, first 200: "${cleanText.slice(0, 200)}"`)

  const prompt = `You are a precise form field detector.

Analyze this document text and identify every form field — every place where
a person would need to write, type, tick, or sign something.

Return ONLY a valid JSON array. No explanation. No markdown. No backticks.
Just the raw JSON array.

Each object in the array must have exactly these keys:
- "label": string — the field name (e.g. "Full Name", "Date of Birth", "Signature")
- "field_type": one of exactly these values: text, email, phone, date, number, textarea, checkbox, radio, select, signature
- "required": boolean — true if the field looks mandatory
- "options": array of strings OR null — only fill this for radio or select fields

Choosing field_type:
- Use "email" if the label contains "email"
- Use "phone" if the label contains "phone", "mobile", "cell", "tel"
- Use "date" if the label contains "date", "dob", "born"
- Use "signature" if the label contains "sign", "signature"
- Use "checkbox" for yes/no single toggles
- Use "radio" for multiple choice (pick one)
- Use "textarea" for "comments", "notes", "description", "message" fields
- Use "text" for everything else

${cleanText ? `Document text:\n${cleanText.slice(0, 8000)}` : 'No text could be extracted from this PDF. Return an empty array [].'}`

  let lastError: Error | null = null

  for (const model of AI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000))
      }

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://formforge.app',
            'X-Title': 'FormForge'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 2000
          })
        })

        if (response.status === 429) {
          const body = await response.json().catch(() => ({}))
          const retryAfter = body?.error?.metadata?.retry_after_seconds || 15
          lastError = new Error(`Rate limited on ${model}, retrying in ${retryAfter}s`)
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          continue
        }

        if (!response.ok) {
          const err = await response.text()
          const isImageError = err.toLowerCase().includes('image')
          if (isImageError) {
            console.warn(`Model ${model} rejected image references, trying next model`)
            lastError = new Error(`Image error on ${model}: ${err.slice(0, 100)}`)
            continue
          }
          lastError = new Error(`OpenRouter error (${model}): ${err}`)
          break
        }

        const data = await response.json()
        let content = data.choices?.[0]?.message?.content || '[]'

        content = content
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim()

        const arrayMatch = content.match(/\[[\s\S]*\]/)
        if (!arrayMatch) {
          console.warn('No JSON array found in AI response:', content)
          return []
        }

        try {
          const fields = JSON.parse(arrayMatch[0])
          return fields.filter((f: any) => f.label && f.field_type)
        } catch {
          console.error('Failed to parse AI response:', content)
          return []
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }
  }

  throw lastError || new Error('All AI models exhausted')
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}
