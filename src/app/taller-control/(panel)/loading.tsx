export default function AdminPanelLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-xl bg-fg/10" />
          <div className="h-4 w-72 rounded-lg bg-fg/5" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-fg/10" />
          <div className="h-9 w-28 rounded-xl bg-fg/10" />
        </div>
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-bg-surface/70 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-fg/10" />
              <div className="h-9 w-9 rounded-xl bg-fg/10" />
            </div>
            <div className="h-7 w-32 rounded-lg bg-fg/15" />
            <div className="h-3 w-20 rounded bg-fg/5" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-2xl border border-border/50 bg-bg-surface/70 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded-lg bg-fg/15" />
          <div className="h-4 w-20 rounded bg-fg/10" />
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-xl border border-border/30 bg-bg-alt/40 p-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-fg/10" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-fg/15" />
                  <div className="h-3 w-48 rounded bg-fg/5" />
                </div>
              </div>
              <div className="h-5 w-20 rounded bg-fg/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
