"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReviewEvent = {
  id: string;
  title: string;
  start_date?: string | null;
  created_at?: string | null;
  location?: string | null;
  status?: string | null;
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
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md sm:p-5">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg sm:h-14 sm:w-14 ${tone}`}>
          <Icon>{icon}</Icon>
        </div>
        <div>
          <p className="text-2xl font-black text-slate-950 sm:text-3xl">{value}</p>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-bold text-violet-700">{action} <span aria-hidden="true">-&gt;</span></p>
    </Link>
  );
}

export default function HighCouncilHomePage() {
  const [stats, setStats] = useState({
    pendingEvents: 0,
    forwardedEvents: 0,
    rejectedEvents: 0,
    publishedEvents: 0,
  });
  const [pendingEvents, setPendingEvents] = useState<ReviewEvent[]>([]);
  const [forwardedEvents, setForwardedEvents] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);

      const [pending, forwarded, rejected, published, pendingRows, forwardedRows] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "Pending High Council Approval"),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "Pending Club Advisor Approval"),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "Rejected"),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "Published"),
        supabase
          .from("events")
          .select("id,title,start_date,created_at,location,status")
          .eq("status", "Pending High Council Approval")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("events")
          .select("id,title,start_date,created_at,location,status")
          .eq("status", "Pending Club Advisor Approval")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        pendingEvents: pending.count || 0,
        forwardedEvents: forwarded.count || 0,
        rejectedEvents: rejected.count || 0,
        publishedEvents: published.count || 0,
      });
      setPendingEvents((pendingRows.data || []) as ReviewEvent[]);
      setForwardedEvents((forwardedRows.data || []) as ReviewEvent[]);
      setLoading(false);
    };

    void loadDashboardData();
  }, []);

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
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Welcome back, High Council!</h2>
        <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">Review event paperwork and send complete proposals to the Club Advisor.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Pending Review"
          value={stats.pendingEvents}
          href="/high-council/events"
          action="Review paperwork"
          tone="bg-violet-100 text-violet-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />}
        />
        <SummaryCard
          label="Forwarded"
          value={stats.forwardedEvents}
          href="/high-council/events"
          action="View forwarded"
          tone="bg-emerald-100 text-emerald-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" />}
        />
        <SummaryCard
          label="Rejected"
          value={stats.rejectedEvents}
          href="/high-council/events"
          action="Check rejected"
          tone="bg-red-100 text-red-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 9-6 6m0-6 6 6M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" />}
        />
        <SummaryCard
          label="Published Events"
          value={stats.publishedEvents}
          href="/events"
          action="View public page"
          tone="bg-sky-100 text-sky-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16M12 4l8 8-8 8" />}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-black text-slate-950">Review Distribution</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Live paperwork status for council review.</p>
          </div>
          <Link href="/high-council/events" className="text-sm font-bold text-violet-700 hover:text-violet-600">Manage queue -&gt;</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["Pending", stats.pendingEvents, "bg-amber-500"],
            ["Forwarded", stats.forwardedEvents, "bg-emerald-500"],
            ["Rejected", stats.rejectedEvents, "bg-red-500"],
            ["Published", stats.publishedEvents, "bg-sky-500"],
          ].map(([label, value, color]) => {
            const total = Math.max(1, stats.pendingEvents + stats.forwardedEvents + stats.rejectedEvents + stats.publishedEvents);
            const width = `${Math.max(8, Math.round(((value as number) / total) * 100))}%`;
            return (
              <div key={label as string} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-700">{label as string}</span>
                  <span className="text-slate-950">{value as number}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
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
            <h3 className="text-lg font-black text-slate-950 sm:text-xl">Paperwork Queue</h3>
            <Link href="/high-council/events" className="text-sm font-bold text-violet-700 hover:text-violet-600">View All -&gt;</Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Event Date</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {pendingEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center font-medium text-slate-500">
                      No paperwork is waiting for High Council review.
                    </td>
                  </tr>
                ) : (
                  pendingEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3 font-bold text-slate-900">{event.title}</td>
                      <td className="px-4 py-3 font-medium text-slate-600">{formatDate(event.start_date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-600">{formatDate(event.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-slate-600">{event.location || "Not set"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Pending</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href="/high-council/events" className="rounded-md border border-violet-300 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-lg font-black text-slate-950">Recently Forwarded</h3>
            <div className="mt-4 space-y-4">
              {forwardedEvents.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">No paperwork forwarded yet.</p>
              ) : (
                forwardedEvents.slice(0, 4).map((event) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" /></Icon>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{event.title}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(event.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-lg font-black text-slate-950">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              {[
                ["Review Paperwork", "/high-council/events"],
                ["Program Calendar", "/high-council/program-calendar"],
                ["Update Profile", "/high-council/profile"],
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
