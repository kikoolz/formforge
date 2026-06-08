'use client'
import type { Submission } from '@/types'

export default function SubmissionsTable({ submissions }: { submissions: Submission[] }) {
  if (!submissions.length) {
    return <div className="text-zinc-500">No submissions yet.</div>
  }

  // Get headers from the first submission's data keys
  const headers = Array.from(
    new Set(submissions.flatMap(s => Object.keys(s.data)))
  ).slice(0, 5) // Show max 5 columns to keep it clean

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-zinc-300">
        <thead className="text-xs uppercase bg-white/5 text-zinc-500 border-b border-white/10">
          <tr>
            <th className="px-4 py-3">Date</th>
            {headers.map(h => (
              <th key={h} className="px-4 py-3 truncate max-w-[150px]">{h}</th>
            ))}
            <th className="px-4 py-3">PDF</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(sub => (
            <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="px-4 py-3 whitespace-nowrap">
                {new Date(sub.submitted_at).toLocaleDateString()}
              </td>
              {headers.map(h => {
                const val = sub.data[h]
                // if it's a signature (data:image) show a string "Signed" instead of giant data url
                const displayVal = typeof val === 'string' && val.startsWith('data:image') 
                  ? '(Signature)' 
                  : String(val || '')
                return (
                  <td key={h} className="px-4 py-3 truncate max-w-[150px]">
                    {displayVal}
                  </td>
                )
              })}
              <td className="px-4 py-3">
                {sub.pdf_url ? (
                  <a href={sub.pdf_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                    View
                  </a>
                ) : (
                  <span className="text-zinc-600">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
