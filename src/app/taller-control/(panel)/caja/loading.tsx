export default function CashboxLoading() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Header bar skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-56 rounded-xl bg-fg/15" />
            <div className="h-6 w-32 rounded-full bg-emerald-500/10" />
          </div>
          <div className="h-4 w-64 rounded-lg bg-fg/5" />
        </div>

        {/* Month selector skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full border border-border-strong bg-fg/5" />
          <div className="h-8 w-36 rounded-xl border border-border-strong bg-fg/5" />
          <div className="h-8 w-8 rounded-full border border-border-strong bg-fg/5" />
        </div>
      </div>

      {/* 3 Payment Method Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "EFECTIVO", tint: "border-emerald-500/20 bg-emerald-500/5" },
          { label: "YAPE 1", tint: "border-violet-500/20 bg-violet-500/5" },
          { label: "YAPE 2", tint: "border-fuchsia-500/20 bg-fuchsia-500/5" },
        ].map((item, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-5 shadow-sm space-y-3 ${item.tint}`}
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-fg/10" />
              <div className="h-9 w-9 rounded-xl bg-fg/10" />
            </div>
            <div className="h-8 w-32 rounded-lg bg-fg/20" />
            <div className="h-3 w-28 rounded bg-fg/5" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-2xl border border-border/50 bg-bg-surface/70 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="h-5 w-48 rounded-lg bg-fg/15" />
          <div className="h-4 w-36 rounded bg-fg/5" />
        </div>
        <div className="h-44 w-full rounded-xl bg-fg/5 flex items-center justify-center">
          <div className="h-2 w-3/4 rounded-full bg-fg/10" />
        </div>
      </div>

      {/* Form skeleton */}
      <div className="rounded-2xl border border-border/50 bg-bg-surface/70 p-5 shadow-sm space-y-3">
        <div className="h-5 w-44 rounded-lg bg-fg/15" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="h-10 rounded-xl bg-fg/5" />
          <div className="h-10 rounded-xl bg-fg/5" />
          <div className="h-10 rounded-xl bg-fg/5" />
          <div className="h-10 rounded-xl bg-fg/10" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-border/50 bg-bg-surface/70 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded-lg bg-fg/15" />
          <div className="flex gap-2">
            <div className="h-7 w-24 rounded-lg bg-fg/10" />
            <div className="h-7 w-24 rounded-lg bg-fg/10" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-xl border border-border/30 bg-bg-alt/30 p-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-16 rounded bg-fg/10" />
                <div className="h-5 w-40 rounded bg-fg/15" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-5 w-16 rounded bg-fg/10" />
                <div className="h-6 w-20 rounded bg-fg/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
