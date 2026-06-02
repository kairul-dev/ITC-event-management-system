"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PaperworkEvent = {
  id: string;
  title: string;
  created_at?: string | null;
  status?: string | null;
  approved_by?: string | null;
};

type ApprovalHistory = {
  id: string;
  entity_type: "event" | "certificate";
  entity_id: string;
  action: string;
  actor_id?: string | null;
  actor_role?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  comments?: string | null;
  created_at?: string | null;
};

type UserLookup = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

const REVIEW_STATUSES = [
  "Pending Approval",
  "Pending High Council Approval",
  "Pending Club Advisor Approval",
];

const APPROVED_STATUSES = ["Approved", "Published"];

const quickActions = [
  {
    label: "Create Event Paperwork",
    href: "/committee/event?mode=paperwork",
    description: "Prepare a new proposal for review.",
  },
  {
    label: "Upload Participant List",
    href: "/committee/event?mode=events#event-details",
    description: "Manage participants for approved events.",
  },
  {
    label: "View Approval Status",
    href: "/committee/approval-status",
    description: "Track comments and review decisions.",
  },
  {
    label: "Generate Certificate Draft",
    href: "/committee/certificates",
    description: "Create drafts after event completion.",
  },
  {
    label: "Open Program Calendar",
    href: "/committee/program-calendar",
    description: "Check planned programs and conflicts.",
  },
];

const timelineSteps = [
  "Draft Created",
  "Submitted to High Council",
  "High Council Review",
  "Club Advisor Review",
  "Published",
  "Certificate Draft Generated",
];

function Icon({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeStatus(status?: string | null) {
  if (!status) return "Draft";
  if (status === "Pending Approval") return "Pending High Council";
  if (status === "Pending High Council Approval") return "Pending High Council";
  if (status === "Pending Club Advisor Approval") return "Pending Club Advisor";
  return status;
}

function statusClasses(status?: string | null) {
  if (status === "Approved" || status === "Published") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (status === "Rejected") return "bg-red-100 text-red-700 ring-red-200";
  if (REVIEW_STATUSES.includes(status || "")) return "bg-amber-100 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function reviewerLabel(status?: string | null, reviewer?: UserLookup) {
  if (reviewer?.name) return reviewer.name;
  if (reviewer?.email) return reviewer.email;
  if (status === "Pending Club Advisor Approval" || status === "Approved" || status === "Published") return "High Council";
  if (status === "Rejected") return "Reviewer";
  if (status === "Pending Approval" || status === "Pending High Council Approval") return "Club Committee";
  return "Not reviewed";
}

function timelineIndex(status?: string | null, certificateDrafts = 0) {
  if (certificateDrafts > 0 && (status === "Published" || status === "Approved")) return 5;
  if (status === "Published") return 4;
  if (status === "Approved") return 4;
  if (status === "Pending Club Advisor Approval") return 3;
  if (status === "Pending Approval" || status === "Pending High Council Approval") return 2;
  if (status === "Rejected") return 2;
  return 0;
}

function actionText(action: string, toStatus?: string | null) {
  if (action === "approved" && toStatus === "Pending Club Advisor Approval") return "High Council forwarded paperwork";
  if (action === "approved") return "Club Advisor approved paperwork";
  if (action === "rejected") return "Reviewer requested changes";
  if (action === "submitted") return "Event paperwork submitted";
  if (action === "resubmitted") return "Event paperwork resubmitted";
  if (action === "issued") return "Certificate issued";
  return "Workflow updated";
}

function StatCard({
  label,
  value,
  description,
  href,
  tone,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  href: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{label}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${tone}`}>
          <Icon>{icon}</Icon>
        </span>
      </div>
      <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">{description}</p>
      <p className="mt-3 text-sm font-bold text-blue-700">Open -&gt;</p>
    </Link>
  );
}

export default function CommitteeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [paperwork, setPaperwork] = useState<PaperworkEvent[]>([]);
  const [certificateDrafts, setCertificateDrafts] = useState(0);
  const [activities, setActivities] = useState<ApprovalHistory[]>([]);
  const [usersById, setUsersById] = useState<Record<string, UserLookup>>({});

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let eventQuery = supabase
          .from("events")
          .select("id,title,created_at,status,approved_by")
          .order("created_at", { ascending: false })
          .limit(8);

        if (user?.id) {
          eventQuery = eventQuery.eq("created_by", user.id);
        }

        const [eventsResult, certificateResult, activityResult] = await Promise.all([
          eventQuery,
          supabase.from("certificates").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
          supabase
            .from("approval_history")
            .select("id,entity_type,entity_id,action,actor_id,actor_role,from_status,to_status,comments,created_at")
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

        let eventRows = (eventsResult.data || []) as PaperworkEvent[];

        if (eventRows.length === 0) {
          const fallback = await supabase
            .from("events")
            .select("id,title,created_at,status,approved_by")
            .order("created_at", { ascending: false })
            .limit(8);
          eventRows = (fallback.data || []) as PaperworkEvent[];
        }

        const actorIds = new Set<string>();
        eventRows.forEach((event) => {
          if (event.approved_by) actorIds.add(event.approved_by);
        });
        ((activityResult.data || []) as ApprovalHistory[]).forEach((activity) => {
          if (activity.actor_id) actorIds.add(activity.actor_id);
        });

        let userMap: Record<string, UserLookup> = {};
        if (actorIds.size > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("id,name,email,role")
            .in("id", Array.from(actorIds));

          userMap = Object.fromEntries(((users || []) as UserLookup[]).map((item) => [item.id, item]));
        }

        setPaperwork(eventRows);
        setCertificateDrafts(certificateResult.count || 0);
        setActivities((activityResult.data || []) as ApprovalHistory[]);
        setUsersById(userMap);
      } catch (error) {
        console.error("Committee dashboard load error:", error);
        setPaperwork([]);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const stats = useMemo(
    () => ({
      pendingPaperwork: paperwork.filter((event) => event.status === "Draft" || !event.status).length,
      underReview: paperwork.filter((event) => REVIEW_STATUSES.includes(event.status || "")).length,
      approvedEvents: paperwork.filter((event) => APPROVED_STATUSES.includes(event.status || "")).length,
      certificateDrafts,
    }),
    [paperwork, certificateDrafts],
  );

  const activePaperwork = paperwork[0];
  const currentStep = timelineIndex(activePaperwork?.status, certificateDrafts);

  const eventTitlesById = useMemo(
    () => Object.fromEntries(paperwork.map((event) => [event.id, event.title])),
    [paperwork],
  );

  if (loading) {
    return (
      <div className="grid min-h-96 place-items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="ds-page-header">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Operations Workspace</p>
        <h1 className="ds-page-title mt-2">Club Committee Dashboard</h1>
        <p className="ds-page-subtitle">
          Prepare paperwork, track High Council and Club Advisor review, manage event details, and generate certificate drafts.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Paperwork"
          value={stats.pendingPaperwork}
          description="Draft paperwork that still needs submission."
          href="/committee/event?mode=paperwork"
          tone="bg-slate-100 text-slate-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h4" />}
        />
        <StatCard
          label="Under Review"
          value={stats.underReview}
          description="Paperwork waiting for High Council or Club Advisor action."
          href="/committee/approval-status"
          tone="bg-amber-100 text-amber-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
        />
        <StatCard
          label="Approved Events"
          value={stats.approvedEvents}
          description="Approved or published events ready for operations."
          href="/committee/event?mode=events#event-details"
          tone="bg-emerald-100 text-emerald-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" />}
        />
        <StatCard
          label="Certificate Drafts"
          value={stats.certificateDrafts}
          description="Generated certificate drafts waiting for approval."
          href="/committee/certificates"
          tone="bg-blue-100 text-blue-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-950">My Recent Paperwork</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Latest event proposals and their review state.</p>
            </div>
            <Link href="/committee/approval-status" className="text-sm font-bold text-blue-700 hover:text-blue-800">
              Track all -&gt;
            </Link>
          </div>

          <div className="mobile-card-scroll rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Event Title</th>
                  <th className="px-4 py-3 text-left">Submitted Date</th>
                  <th className="px-4 py-3 text-left">Current Status</th>
                  <th className="px-4 py-3 text-left">Last Reviewer</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {paperwork.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center font-medium text-slate-500">
                      No event paperwork found yet.
                    </td>
                  </tr>
                ) : (
                  paperwork.slice(0, 5).map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50">
                      <td className="max-w-[260px] px-4 py-3 font-bold text-slate-900">
                        <span className="line-clamp-2">{event.title}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">{formatDate(event.created_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${statusClasses(event.status)}`}>
                          {normalizeStatus(event.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">
                        {reviewerLabel(event.status, event.approved_by ? usersById[event.approved_by] : undefined)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href="/committee/event?mode=events#event-details" className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                            View
                          </Link>
                          {(event.status === "Draft" || event.status === "Rejected") && (
                            <Link href="/committee/event?mode=paperwork" className="rounded-md border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">
                              Edit
                            </Link>
                          )}
                          <Link href="/committee/approval-status" className="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">
                            Track
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-black text-slate-950">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href} className="group flex gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-blue-700 ring-1 ring-blue-100">
                    <Icon>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7 7 7-7 7" />
                    </Icon>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-950 group-hover:text-blue-700">{action.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{action.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-950">Approval Timeline</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {activePaperwork ? activePaperwork.title : "Create paperwork to start the approval flow."}
            </p>
          </div>

          <div className="space-y-1">
            {timelineSteps.map((step, index) => {
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;
              return (
                <div key={step} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < timelineSteps.length - 1 && (
                    <div className={`absolute left-4 top-9 h-[calc(100%-1.5rem)] border-l ${isComplete ? "border-blue-500" : "border-slate-200"}`} />
                  )}
                  <span
                    className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ring-4 ring-white ${
                      isComplete
                        ? "bg-blue-700 text-white"
                        : isCurrent
                          ? "bg-amber-100 text-amber-700 ring-amber-50"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isComplete ? (
                      <Icon className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </Icon>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1 rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-950">{step}</p>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-bold ${
                          isComplete
                            ? "bg-emerald-100 text-emerald-700"
                            : isCurrent
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isComplete ? "Completed" : isCurrent ? "Current" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Recent Activity</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Latest review and certificate workflow updates.</p>
            </div>
            <Link href="/committee/approval-status" className="shrink-0 text-sm font-bold text-blue-700 hover:text-blue-800">
              Details -&gt;
            </Link>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              paperwork.slice(0, 4).map((event) => (
                <div key={event.id} className="flex gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-950">Event paperwork prepared</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{event.title} | {normalizeStatus(event.status)}</p>
                  </div>
                </div>
              ))
            ) : (
              activities.map((activity) => {
                const actor = activity.actor_id ? usersById[activity.actor_id] : undefined;
                const entityTitle = activity.entity_type === "event"
                  ? eventTitlesById[activity.entity_id] || "Event paperwork"
                  : "Certificate draft";
                return (
                  <div key={activity.id} className="flex gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${activity.action === "rejected" ? "bg-red-500" : activity.action === "approved" ? "bg-emerald-500" : "bg-blue-600"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-950">{actionText(activity.action, activity.to_status)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {entityTitle} | {actor?.name || actor?.email || activity.actor_role || "System"} | {formatDate(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
