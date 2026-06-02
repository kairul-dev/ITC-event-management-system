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

export default function CommitteeDashboardPage() {
  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </div>
            <h2 className="text-lg font-black text-slate-950">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            <p className="mt-4 text-sm font-bold text-blue-700 group-hover:text-blue-800">Open module -&gt;</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
