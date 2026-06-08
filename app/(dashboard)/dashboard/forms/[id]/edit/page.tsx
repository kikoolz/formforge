import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import FormEditor from '@/components/forms/FormEditor'

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const { data: form, error } = await supabase
    .from('forms')
    .select('*, form_fields(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .order('position', { referencedTable: 'form_fields', ascending: true })
    .single()

  if (error || !form) notFound()

  return <FormEditor initialForm={form} />
}
