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

export default function CommitteeDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Club Committee Dashboard</h1>
        <p className="text-sm text-slate-600">
          Manage event operations and submit work for High Council review.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <h2 className="text-lg font-bold text-slate-950">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
