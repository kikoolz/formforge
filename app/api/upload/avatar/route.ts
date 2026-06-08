import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('avatar') as File

  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Please upload an image file', code: 'INVALID_FILE' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 5MB', code: 'FILE_TOO_LARGE' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'png'
  const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(fileName, fileBuffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed', code: 'UPLOAD_FAILED' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('avatars')
    .getPublicUrl(fileName)

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update profile', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ data: { avatar_url: publicUrl } })
}
