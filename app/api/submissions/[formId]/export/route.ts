import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { formId } = await params

  const { data: form } = await supabaseAdmin
    .from('forms')
    .select('title, user_id')
    .eq('id', formId)
    .single()

  if (!form || form.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const { data: submissions } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .eq('form_id', formId)
    .order('submitted_at', { ascending: false })

  if (!submissions?.length) {
    return new NextResponse('No submissions', { status: 200 })
  }

  const headers = Array.from(
    new Set(submissions.flatMap(s => Object.keys(s.data as Record<string, unknown>)))
  )

  const rows = submissions.map(s => {
    const data = s.data as Record<string, unknown>
    return [
      new Date(s.submitted_at).toISOString(),
      s.respondent_email || '',
      ...headers.map(h => {
        const val = data[h]
        if (typeof val === 'string' && val.startsWith('data:image')) return '(Signature)'
        return String(val ?? '')
      }),
    ].map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  })

  const csv = [
    ['Date', 'Respondent Email', ...headers].join(','),
    ...rows,
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${form.title}-submissions.csv"`,
    },
  })
}
