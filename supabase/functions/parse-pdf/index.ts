import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { formId, pdfText } = await req.json()

    if (!formId) {
      throw new Error('Missing formId')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let detectedFields: any[] = []

    if (pdfText && pdfText.length > 50) {
      console.log(`Extracted ${pdfText.length} characters from PDF`)
      detectedFields = await detectFieldsWithAi(pdfText)
      console.log(`AI detected ${detectedFields.length} fields`)
    } else {
      console.log('PDF has little or no extractable text — saving with no fields')
    }

    const fieldRecords = detectedFields.map((field: any, index: number) => ({
      form_id: formId,
      label: field.label,
      field_type: field.field_type,
      required: field.required ?? false,
      options: field.options ?? null,
      position: index,
      page: 1,
    }))

    if (fieldRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('form_fields')
        .insert(fieldRecords)

      if (insertError) throw insertError
    }

    await supabase
      .from('forms')
      .update({ status: 'ready' })
      .eq('id', formId)

    return new Response(
      JSON.stringify({ success: true, fieldsCount: fieldRecords.length, textLength: pdfText?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('parse-pdf error:', error)

    try {
      const { formId } = await new Request(req).json().catch(() => ({}))
      if (formId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )
        await supabase.from('forms').update({ status: 'error' }).eq('id', formId)
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function detectFieldsWithAi(pdfText: string): Promise<any[]> {
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

Document text:
${pdfText.slice(0, 8000)}`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://formforge.app',
      'X-Title': 'FormForge'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error: ${err}`)
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
  } catch (e) {
    console.error('Failed to parse AI response:', content)
    return []
  }
}
