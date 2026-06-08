import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import SubmissionsTable from '@/components/forms/SubmissionsTable'

export default async function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const { data: form } = await supabase
    .from('forms')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!form) notFound()

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('form_id', id)
    .order('submitted_at', { ascending: false })
    .limit(20)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{form.title}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {submissions?.length || 0} submissions
          </p>
        </div>

        <a
          href={`/api/submissions/${id}/export`}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10
                     text-white text-sm rounded-lg transition-colors"
        >
          Export CSV
        </a>
      </div>

      <SubmissionsTable submissions={submissions || []} />
    </div>
  )
}
