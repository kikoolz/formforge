export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-white/5 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-white/10" />
              <div className="h-4 w-4 rounded bg-white/10" />
            </div>
            <div className="h-8 w-16 rounded bg-white/10" />
          </div>
        ))}
      </div>

      <div className="h-12 w-[460px] rounded-lg bg-white/5" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-44 rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  )
}
