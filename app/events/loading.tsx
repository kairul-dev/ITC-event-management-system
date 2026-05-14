export default function EventsLoading() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-slate-950">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-200" />
            <div className="h-4 w-28 rounded bg-slate-200" />
          </div>
          <div className="h-10 w-20 rounded-md bg-slate-200" />
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0b2e4a] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,46,74,0.98)_0%,rgba(15,61,94,0.88)_50%,rgba(31,122,140,0.58)_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[1fr_360px] lg:px-10">
          <div className="max-w-3xl animate-pulse">
            <div className="h-4 w-48 rounded bg-white/30" />
            <div className="mt-5 h-12 w-full max-w-xl rounded bg-white/25" />
            <div className="mt-3 h-12 w-4/5 rounded bg-white/20" />
            <div className="mt-6 h-5 w-full max-w-2xl rounded bg-white/20" />
            <div className="mt-3 h-5 w-2/3 rounded bg-white/20" />
          </div>

          <div className="grid content-end gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-lg border border-white/15 bg-white/10" />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="-mt-16 h-24 animate-pulse rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]" />
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.10)]">
              <div className="h-48 animate-pulse bg-slate-200" />
              <div className="space-y-4 p-5">
                <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-11 animate-pulse rounded-md bg-slate-200" />
                  <div className="h-11 animate-pulse rounded-md bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
