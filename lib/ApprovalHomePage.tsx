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
    <div className="w-full space-y-6">
      <section>
        <h2 className="text-3xl font-black tracking-tight text-slate-950">Welcome back, {roleName}!</h2>
        <p className="mt-2 text-base font-medium text-slate-500">
          {pathname.startsWith("/club-advisor")
            ? "Give final approval for forwarded paperwork and certificate drafts."
            : "Review submitted event paperwork before final advisor approval."}
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
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

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-950">Final Approval Queue</h3>
            <Link href={`${basePath}/events`} className="text-sm font-bold text-violet-700 hover:text-violet-600">View All -&gt;</Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Event Date</th>
                  <th className="px-4 py-3">Forwarded</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {pendingEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center font-medium text-slate-500">
                      No paperwork is waiting for final approval.
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
                        <Link href={`${basePath}/events`} className="rounded-md border border-violet-300 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50">
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

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
