import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conditionId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const { id, conditionId } = await params

  const { error } = await supabaseAdmin
    .from('form_conditions')
    .update({
      target_field_id: body.target_field_id,
      action: body.action,
      operator: body.operator,
      source_field_id: body.source_field_id,
      value: body.value,
    })
    .eq('id', conditionId)
    .eq('form_id', id)

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ data: { success: true } })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; conditionId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id, conditionId } = await params

  const { error } = await supabaseAdmin
    .from('form_conditions')
    .delete()
    .eq('id', conditionId)
    .eq('form_id', id)

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ data: { success: true } })
}
