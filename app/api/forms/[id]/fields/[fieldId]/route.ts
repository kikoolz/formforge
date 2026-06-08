import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()

  const { id, fieldId } = await params

  const { error } = await supabaseAdmin
    .from('form_fields')
    .update({
      label: body.label,
      field_type: body.field_type,
      required: body.required,
      position: body.position,
      options: body.options,
      placeholder: body.placeholder,
    })
    .eq('id', fieldId)
    .eq('form_id', id)

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ data: { success: true } })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id, fieldId } = await params

  const { error } = await supabaseAdmin
    .from('form_fields')
    .delete()
    .eq('id', fieldId)
    .eq('form_id', id)

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ data: { success: true } })
}
