import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicForm from '@/components/forms/PublicForm'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const supabase = await createClient()
  const { slug } = await params
  const { data: form } = await supabase
    .from('forms')
    .select('title, description')
    .eq('public_slug', slug)
    .eq('is_published', true)
    .single()

  return {
    title: form?.title || 'Fill out this form',
    description: form?.description || 'Complete this form and submit your responses.'
  }
}

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()

  const { slug } = await params

  const { data: form } = await supabase
    .from('forms')
    .select('*, form_fields(*)')
    .eq('public_slug', slug)
    .eq('is_published', true)
    .order('position', { referencedTable: 'form_fields', ascending: true })
    .single()

  if (!form) notFound()

  return <PublicForm form={form} />
}
