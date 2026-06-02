import Link from "next/link";

const cards = [
  {
    title: "Create Event",
    description: "Prepare event paperwork and submit it for High Council review.",
    href: "/committee/event?mode=paperwork",
  },
  {
    title: "Event Details",
    description: "Edit drafts, publish approved events, and resubmit rejected events.",
    href: "/committee/event?mode=events#event-details",
  },
  {
    title: "Certificate Drafts",
    description: "Generate certificate drafts for paid student registrations.",
    href: "/committee/certificates",
  },
  {
    title: "Approval Status",
    description: "Track event and certificate approval progress.",
    href: "/committee/approval-status",
  },
];

const stats = [
  { label: "Paperwork", value: "Create", description: "Prepare event proposal documents." },
  { label: "Approval", value: "Track", description: "Monitor High Council and Advisor reviews." },
  { label: "Certificates", value: "Draft", description: "Generate certificates after payment." },
];

const workflow = [
  { label: "Draft", tone: "bg-slate-100 text-slate-700", width: "w-1/5" },
  { label: "High Council", tone: "bg-amber-100 text-amber-700", width: "w-2/5" },
  { label: "Advisor", tone: "bg-blue-100 text-blue-700", width: "w-3/5" },
  { label: "Published", tone: "bg-emerald-100 text-emerald-700", width: "w-4/5" },
  { label: "Certificates", tone: "bg-purple-100 text-purple-700", width: "w-full" },
];

export default function CommitteeDashboardPage() {
  return (
    <div className="space-y-5">
      <div className="ds-page-header">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Operations Workspace</p>
        <h1 className="ds-page-title mt-2">Club Committee Dashboard</h1>
        <p className="ds-page-subtitle">
          Manage event operations and submit work for High Council review.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="ds-stat-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{stat.value}</p>
              </div>
              <span className="ds-stat-icon">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{stat.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-950">Program Release Pipeline</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Paperwork moves from draft to certificate release.</p>
            </div>
            <Link href="/committee/approval-status" className="text-sm font-bold text-blue-700 hover:text-blue-800">
              View status -&gt;
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {workflow.map((item, index) => (
              <div key={item.label} className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full bg-blue-600 ${item.width}`} />
                </div>
                <span className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold ${item.tone}`}>
                  Step {index + 1}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-black text-slate-950">Operational Focus</h2>
          <div className="mt-4 grid gap-3">
            {["Complete paperwork early", "Track review comments", "Generate drafts only after approval"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <span className="text-sm font-semibold text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </div>
            <h2 className="text-lg font-black text-slate-950">{card.title}</h2>
            <p className="mt-2 text-sm leading-5 text-slate-600">{card.description}</p>
            <p className="mt-3 text-sm font-bold text-blue-700 group-hover:text-blue-800">Open module -&gt;</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
