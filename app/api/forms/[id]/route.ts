import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  const { data: form, error } = await supabase
    .from('forms')
    .select('*, form_fields(*), form_conditions(*)')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({ data: form })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()

  const allowedFields = ['title', 'description', 'branding_color', 'logo_url', 'redirect_url', 'notification_email', 'form_type']

  const updates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update', code: 'INVALID_INPUT' }, { status: 400 })
  }

  const { id } = await params

  const { data: updated, error } = await supabaseAdmin
    .from('forms')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ data: updated })
}
