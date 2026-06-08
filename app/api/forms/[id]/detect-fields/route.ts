import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { extractPdfText } from '@/lib/extract-pdf-text'
import { extractPdfTextWithOcr } from '@/lib/extract-pdf-text-ocr'
import { matchFieldPositions } from '@/lib/match-field-positions'
import type { DetectedField } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: form } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  if (!form.original_pdf_url) {
    return NextResponse.json({ error: 'No PDF attached to this form' }, { status: 400 })
  }

  try {
    // Download the PDF
    const response = await fetch(form.original_pdf_url)
    const buffer = await response.arrayBuffer()

    // Extract text
    let text = ''
    let items: any[] = []
    try {
      const extraction = await extractPdfText(buffer)
      text = extraction.text
      items = extraction.items
      console.log(`[detect-fields] Extracted ${text.length} chars, ${items.length} text items`)
    } catch (e) {
      console.error('[detect-fields] Text extraction failed:', e)
      text = ''
      items = []
    }

    // If standard extraction fails, try OCR (scanned PDFs)
    if (!text.trim()) {
      console.log('[detect-fields] Standard text extraction empty, trying OCR...')
      try {
        const ocrResult = await extractPdfTextWithOcr(buffer)
        if (ocrResult.text.trim()) {
          text = ocrResult.text
          items = ocrResult.items
          console.log(`[detect-fields] OCR extracted ${text.length} chars`)
        } else {
          console.log('[detect-fields] OCR also returned empty text')
        }
      } catch (ocrErr) {
        console.error('[detect-fields] OCR fallback failed:', ocrErr)
      }
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'No text could be extracted from this PDF. It may be a scanned document.' }, { status: 400 })
    }

    const cleanText = sanitizeText(text)
    console.log(`[detect-fields] Clean text length: ${cleanText.length} chars`)
    const detectedFields = await detectFieldsWithAi(cleanText)
    const matchedFields = matchFieldPositions(detectedFields, items)

    // Delete existing fields and insert new ones
    if (matchedFields.length > 0) {
      await supabaseAdmin
        .from('form_fields')
        .delete()
        .eq('form_id', id)

      const fieldRecords = matchedFields.map((field: any, index: number) => ({
        form_id: id,
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

    return NextResponse.json({ data: { fields: matchedFields } })
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Field detection failed'
    const message = raw.toLowerCase().includes('image')
      ? 'This PDF appears to contain scanned images rather than text. AI field recognition works best on text-based PDFs.'
      : raw

    return NextResponse.json(
      { error: message, code: 'AI_DETECTION_FAILED' },
      { status: 400 }
    )
  }
}

function sanitizeText(text: string): string {
  return text
    .replace(/[\w\-./:\\]+\.(png|jpg|jpeg|gif|bmp|svg|webp|ico)/gi, '')
    .replace(/data:image\/[^;]+;base64[^"]+/gi, '')
    .replace(/["']?[\w\-./\\]+\.(png|jpg|jpeg|gif|bmp|svg|webp|ico)["']?/gi, '')
    .replace(/\bfigure\s+\d+\b/gi, '')
    .replace(/\bimage\b/gi, '')
    .replace(/\bphoto\b/gi, '')
}

const AI_MODELS = [
  'qwen/qwen3-coder:free',
  'google/gemma-4-31b-it:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-20b:free',
]

async function detectFieldsWithAi(pdfText: string): Promise<DetectedField[]> {
  console.log(`[detect-fields] Clean text length: ${pdfText.length}, first 200: "${pdfText.slice(0, 200)}"`)

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

${pdfText ? `Document text:\n${pdfText.slice(0, 8000)}` : 'No text could be extracted from this PDF. Return an empty array [].'}`

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
          console.log(`[detect-fields] ${model} returned ${response.status}: ${err.slice(0, 300)}`)
          const isImageError = err.toLowerCase().includes('image')
          if (isImageError) {
            lastError = new Error(`This PDF appears to contain scanned images rather than text. AI field recognition works best on text-based PDFs.`)
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
