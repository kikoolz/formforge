import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()

  const { id } = await params

  const { data: field, error } = await supabaseAdmin
    .from('form_fields')
    .insert({
      form_id: id,
      label: body.label || 'New Field',
      field_type: body.field_type || 'text',
      required: body.required ?? false,
      position: body.position ?? 0,
      options: body.options ?? null,
      placeholder: body.placeholder ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ data: field })
}
