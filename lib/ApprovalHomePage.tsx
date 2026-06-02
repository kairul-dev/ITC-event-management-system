"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PendingEvent = {
  id: string;
  title: string;
  start_date?: string | null;
  created_at?: string | null;
  location?: string | null;
};

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

function SummaryCard({
  label,
  value,
  href,
  action,
  tone,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  action: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${tone}`}>
          <Icon>{icon}</Icon>
        </div>
        <div>
          <p className="text-3xl font-black text-slate-950">{value}</p>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
        </div>
      </div>
      <p className="mt-5 text-sm font-bold text-violet-700">{action} <span aria-hidden="true">-&gt;</span></p>
    </Link>
  );
}

export default function ApprovalHomePage() {
  const pathname = usePathname();
  const basePath = pathname.startsWith("/club-advisor") ? "/club-advisor" : "/high-council";
  const roleName = pathname.startsWith("/club-advisor") ? "Club Advisor" : "High Council";
  const [stats, setStats] = useState({
    pendingEvents: 0,
    approvedEvents: 0,
  });
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const pendingStatus = pathname.startsWith("/club-advisor") ? "Pending Club Advisor Approval" : "Pending Approval";
        const [pendingEventsCount, approvedEventsCount, pendingEventRows] = await Promise.all([
          supabase.from("events").select("*", { count: "exact", head: true }).eq("status", pendingStatus),
          supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "Approved"),
          supabase
            .from("events")
            .select("id,title,start_date,created_at,location")
            .eq("status", pendingStatus)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        setStats({
          pendingEvents: pendingEventsCount.count || 0,
          approvedEvents: approvedEventsCount.count || 0,
        });
        setPendingEvents((pendingEventRows.data || []) as PendingEvent[]);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, [pathname]);

  if (loading) {
    return (
      <div className="grid min-h-96 place-items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Welcome back, {roleName}!</h2>
        <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
          {pathname.startsWith("/club-advisor")
            ? "Give final approval for forwarded paperwork and certificate drafts."
            : "Review submitted event paperwork before final advisor approval."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          label="Pending Events"
          value={stats.pendingEvents}
          href={`${basePath}/events`}
          action="Review events"
          tone="bg-violet-100 text-violet-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />}
        />
        <SummaryCard
          label="Approved Events"
          value={stats.approvedEvents}
          href={`${basePath}/events`}
          action="View approved"
          tone="bg-emerald-100 text-emerald-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" />}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-black text-slate-950">Approval Throughput</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Current queue compared with completed approvals.</p>
          </div>
          <Link href={`${basePath}/events`} className="text-sm font-bold text-violet-700 hover:text-violet-600">
            Open review queue -&gt;
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["Waiting", stats.pendingEvents, "bg-amber-500"],
            ["Approved", stats.approvedEvents, "bg-emerald-500"],
          ].map(([label, value, color]) => {
            const total = Math.max(1, stats.pendingEvents + stats.approvedEvents);
            const width = `${Math.max(8, Math.round(((value as number) / total) * 100))}%`;
            return (
              <div key={label as string} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-700">{label as string}</span>
                  <span className="text-slate-950">{value as number}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div className={`h-full rounded-full ${color as string}`} style={{ width }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-950 sm:text-xl">Final Approval Queue</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">Compact review cards keep the queue readable without a wide table.</p>
            </div>
            <Link href={`${basePath}/events`} className="text-sm font-bold text-violet-700 hover:text-violet-600">View All -&gt;</Link>
          </div>
          {pendingEvents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center font-medium text-slate-500">
              No paperwork is waiting for final approval.
            </p>
          ) : (
            <div className="grid gap-3">
              {pendingEvents.map((event, index) => (
                <article key={event.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-violet-200 hover:bg-white">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 ring-1 ring-violet-100">
                        <Icon>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />
                        </Icon>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-slate-950">{event.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {formatDate(event.start_date)} <span className="mx-1">·</span> forwarded {formatDate(event.created_at)}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-600">{event.location || "Not set"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <span className="rounded-md bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">Pending</span>
                      <Link href={`${basePath}/events`} className="rounded-lg border border-violet-300 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50">
                        Review
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Submitted</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(event.created_at)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Queue position</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">#{index + 1}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-lg font-black text-slate-950">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              {[
                ["Review Paperwork", `${basePath}/events`],
                ["Update Profile", `${basePath}/profile`],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-violet-700">
                    <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h10M9 12h10M9 19h10M4 5h.01M4 12h.01M4 19h.01" /></Icon>
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
