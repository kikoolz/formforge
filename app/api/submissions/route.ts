const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const limit = 10

  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }

  if (entry.count >= limit) return true

  entry.count++
  return false
}

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateFilledPdf } from '@/lib/pdf'
import { sendSubmissionNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

  const { form_id, data } = await request.json()

  // 1. Get the form (verify it exists and is published)
  const { data: form, error: formError } = await supabaseAdmin
    .from('forms')
    .select('*')
    .eq('id', form_id)
    .eq('is_published', true)
    .single()

  if (formError || !form) {
    return NextResponse.json({ error: 'Form not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  // 2. Check submission limits
  const { data: owner } = await supabaseAdmin
    .from('users')
    .select('submission_count, submission_limit, email')
    .eq('id', form.user_id)
    .single()

  if (owner && owner.submission_count >= owner.submission_limit) {
    return NextResponse.json(
      { error: 'This form has reached its submission limit', code: 'LIMIT_REACHED' },
      { status: 403 }
    )
  }

  // 3. Generate filled PDF with field positions
  let pdfUrl: string | null = null

  if (form.original_pdf_url) {
    try {
      const { data: fields } = await supabaseAdmin
        .from('form_fields')
        .select('label, page_x, page_y, page')
        .eq('form_id', form_id)

      const pdfBytes = await generateFilledPdf(form.original_pdf_url, data, fields || [])
      const fileName = `filled/${form_id}/${crypto.randomUUID()}.pdf`

      const { data: uploadData } = await supabaseAdmin.storage
        .from('pdfs')
        .upload(fileName, pdfBytes, { contentType: 'application/pdf' })

      if (uploadData) {
        const { data: urlData } = supabaseAdmin.storage
          .from('pdfs')
          .getPublicUrl(uploadData.path)
        pdfUrl = urlData.publicUrl
      }
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
  }

  // 4. Get respondent email if available
  const respondentEmail = Object.entries(data).find(
    ([key]) => key.toLowerCase().includes('email')
  )?.[1] as string || null

  // 5. Get IP address
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || null

  // 6. Save submission to database
  const { data: submission, error: subError } = await supabaseAdmin
    .from('submissions')
    .insert({
      form_id,
      respondent_email: respondentEmail,
      data,
      pdf_url: pdfUrl,
      ip_address: ipAddress,
    })
    .select()
    .single()

  if (subError) {
    return NextResponse.json({ error: 'Failed to save', code: 'DB_ERROR' }, { status: 500 })
  }

  // 7. Increment counters
  await supabaseAdmin
    .from('forms')
    .update({ submission_count: (form.submission_count || 0) + 1 })
    .eq('id', form_id)

  await supabaseAdmin
    .from('users')
    .update({ submission_count: (owner?.submission_count || 0) + 1 })
    .eq('id', form.user_id)

  // 8. Send notification email (async, don't block response)
  if (form.notification_email) {
    sendSubmissionNotification({
      to: form.notification_email,
      formTitle: form.title,
      submissionData: data,
      pdfUrl,
    }).catch(console.error)
  }

  return NextResponse.json({ data: { id: submission.id } })
}
