"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type RecentEvent = {
  id: string;
  title: string;
  start_date?: string | null;
  created_at?: string | null;
  status?: string | null;
  location?: string | null;
  max_students?: number | null;
  registration_count?: number;
  rejection_reason?: string | null;
};

type StatCard = {
  label: string;
  value: number;
  href: string;
  cta: string;
  accent: string;
  icon: React.ReactNode;
};

const eventImages = [
  "from-slate-950 via-blue-900 to-cyan-500",
  "from-slate-900 via-sky-800 to-indigo-500",
  "from-indigo-950 via-violet-700 to-fuchsia-500",
  "from-slate-950 via-blue-800 to-emerald-500",
  "from-blue-950 via-cyan-800 to-blue-500",
];

function IconBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white shadow-sm ${className}`}>
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.07)] ${className}`}>
      {children}
    </section>
  );
}

function MiniThumb({ index }: { index: number }) {
  return (
    <div className={`relative h-16 w-24 overflow-hidden rounded-md bg-gradient-to-br ${eventImages[index % eventImages.length]}`}>
      <div className="absolute inset-x-4 top-3 h-5 rounded border border-white/25 bg-white/10" />
      <div className="absolute bottom-3 left-3 h-6 w-6 rounded-full bg-cyan-300/80 blur-[1px]" />
      <div className="absolute bottom-2 right-3 h-8 w-5 rounded-t-full bg-white/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_28%),radial-gradient(circle_at_75%_70%,rgba(255,255,255,0.24),transparent_24%)]" />
    </div>
  );
}

function formatDate(date?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-MY", options ?? { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClasses(status?: string | null) {
  if (status === "Published" || status === "Approved") return "bg-emerald-100 text-emerald-700";
  if (status?.startsWith("Pending")) return "bg-amber-100 text-amber-700";
  if (status === "Draft") return "bg-slate-100 text-slate-600";
  if (status === "Rejected") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

function statusLabel(status?: string | null) {
  if (status === "Published") return "Open";
  if (status === "Approved") return "Approved";
  if (status?.startsWith("Pending")) return "Pending";
  if (status === "Draft") return "Draft";
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Upcoming";
}

function pointsFor(values: number[], maxValue: number) {
  const width = 380;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = 20 + index * step;
      const y = 170 - (value / maxValue) * 150;
      return `${x},${y}`;
    })
    .join(" ");
}

function countByDay<T>(
  rows: T[],
  dateSelector: (row: T) => string | null | undefined,
  monthStart: Date,
  daysInMonth: number,
) {
  const counts = Array.from({ length: daysInMonth }, () => 0);
  rows.forEach((row) => {
    const value = dateSelector(row);
    if (!value) return;

    const date = new Date(value);
    const sameMonth =
      date.getFullYear() === monthStart.getFullYear() &&
      date.getMonth() === monthStart.getMonth();

    if (sameMonth) counts[date.getDate() - 1] += 1;
  });

  return counts;
}

export default function AdminPage() {
  const todayLabel = new Date().toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "long",
  });
  const [stats, setStats] = useState({
    totalPaperwork: 0,
    draftPaperwork: 0,
    pendingHighCouncil: 0,
    pendingClubAdvisor: 0,
    approvedPaperwork: 0,
    publishedEvents: 0,
    totalRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [chartData, setChartData] = useState({
    registrations: [0],
    events: [0],
    labels: ["Today"],
    maxValue: 1,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      const { count: eventCount } = await supabase.from("events").select("*", { count: "exact", head: true });
      const { count: draftCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "Draft");
      const { count: pendingHighCouncilCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending High Council Approval");
      const { count: pendingClubAdvisorCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending Club Advisor Approval");
      const { count: approvedCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "Approved");
      const { count: publishedCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "Published");
      const { count: registrationCount } = await supabase.from("event_registrations").select("*", { count: "exact", head: true });
      const { data: events } = await supabase
        .from("events")
        .select("id,title,start_date,created_at,status,location,max_students,rejection_reason")
        .order("created_at", { ascending: false })
        .limit(5);
      const { data: monthEvents } = await supabase
        .from("events")
        .select("id,created_at")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", nextMonthStart.toISOString());
      const { data: registrations } = await supabase
        .from("event_registrations")
        .select("event_id,created_at")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", nextMonthStart.toISOString());
      const { data: recentRegistrations } = await supabase
        .from("event_registrations")
        .select("event_id");

      const registrationMap = new Map<string, number>();
      (recentRegistrations || []).forEach((row) => {
        const eventId = row.event_id as string | null;
        if (!eventId) return;
        registrationMap.set(eventId, (registrationMap.get(eventId) || 0) + 1);
      });

      const eventsWithCounts = ((events || []) as RecentEvent[]).map((event) => ({
        ...event,
        registration_count: registrationMap.get(event.id) || 0,
      }));
      const eventCounts = countByDay(monthEvents || [], (event) => event.created_at, monthStart, daysInMonth);
      const registrationCounts = countByDay(
        registrations || [],
        (registration) => registration.created_at,
        monthStart,
        daysInMonth,
      );
      const maxChartValue = Math.max(1, ...eventCounts, ...registrationCounts);
      const labelDays = Array.from(
        new Set([1, Math.ceil(daysInMonth / 4), Math.ceil(daysInMonth / 2), Math.ceil((daysInMonth * 3) / 4), daysInMonth]),
      );

      setStats({
        totalPaperwork: eventCount || 0,
        draftPaperwork: draftCount || 0,
        pendingHighCouncil: pendingHighCouncilCount || 0,
        pendingClubAdvisor: pendingClubAdvisorCount || 0,
        approvedPaperwork: approvedCount || 0,
        publishedEvents: publishedCount || 0,
        totalRegistrations: registrationCount || 0,
      });
      setRecentEvents(eventsWithCounts);
      setChartData({
        registrations: registrationCounts,
        events: eventCounts,
        labels: labelDays.map((day) => `${day} ${monthStart.toLocaleDateString("en-MY", { month: "short" })}`),
        maxValue: maxChartValue,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setRecentEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const displayEvents = recentEvents;
  const statCards: StatCard[] = [
    {
      label: "Total Paperwork",
      value: stats.totalPaperwork,
      href: "/admin/event?mode=paperwork",
      cta: "View all events",
      accent: "bg-gradient-to-br from-violet-500 to-indigo-600",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" />,
    },
    {
      label: "Pending High Council",
      value: stats.pendingHighCouncil,
      href: "/admin/approval-status",
      cta: "Track approval",
      accent: "bg-gradient-to-br from-emerald-400 to-green-600",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-5M7 3v4m10-4v4M5 6h14v15H5V6Z" />,
    },
    {
      label: "Total Registrations",
      value: stats.totalRegistrations,
      href: "/admin/payments",
      cta: "View participants",
      accent: "bg-gradient-to-br from-sky-500 to-blue-600",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m11-12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm7 12v-1a4 4 0 0 0-3-3.8M17 4.2a4 4 0 0 1 0 7.6" />,
    },
    {
      label: "Pending Club Advisor",
      value: stats.pendingClubAdvisor,
      href: "/admin/approval-status",
      cta: "Review now",
      accent: "bg-gradient-to-br from-amber-400 to-yellow-500",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
    },
    {
      label: "Approved Paperwork",
      value: stats.approvedPaperwork,
      href: "/admin/event?mode=events#event-details",
      cta: "Publish event",
      accent: "bg-gradient-to-br from-pink-500 to-fuchsia-500",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h4" />,
    },
    {
      label: "Published Events",
      value: stats.publishedEvents,
      href: "/admin/event?mode=events#event-details",
      cta: "Manage events",
      accent: "bg-gradient-to-br from-cyan-500 to-blue-600",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Welcome back, Admin!</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Here&apos;s what&apos;s happening with ITC events today.</p>
        </div>
        <div className="flex w-fit items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
          <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" />
          </svg>
          {todayLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {statCards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center gap-4">
              <IconBox className={card.accent}>{card.icon}</IconBox>
              <div>
                <p className="text-2xl font-extrabold text-slate-950">{card.value}</p>
                <p className="text-sm font-semibold text-slate-950">{card.label}</p>
              </div>
            </div>
            <Link href={card.href} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800">
              {card.cta}
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_0.78fr_1.07fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-950">Events Overview</h3>
            <button className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">This Month</button>
          </div>
          <div className="mb-2 flex justify-center gap-8 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-600" />Registrations</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Events</span>
          </div>
          <div className="h-64 w-full overflow-hidden">
            <svg viewBox="0 0 420 210" className="h-full w-full" preserveAspectRatio="none">
              {[20, 55, 90, 125, 160].map((y) => (
                <line key={y} x1="20" x2="400" y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
              ))}
              <defs>
                <linearGradient id="regFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="eventFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`20,170 ${pointsFor(chartData.registrations, chartData.maxValue)} 400,170`} fill="url(#regFill)" />
              <polygon points={`20,170 ${pointsFor(chartData.events, chartData.maxValue)} 400,170`} fill="url(#eventFill)" />
              <polyline points={pointsFor(chartData.registrations, chartData.maxValue)} fill="none" stroke="#4f46e5" strokeWidth="2.5" />
              <polyline points={pointsFor(chartData.events, chartData.maxValue)} fill="none" stroke="#22c55e" strokeWidth="2.5" />
              {chartData.labels.map((label, index) => (
                <text key={label} x={35 + index * 88} y="197" fill="#475569" fontSize="11">{label}</text>
              ))}
              {Array.from({ length: 6 }, (_, index) => Math.round((chartData.maxValue / 5) * index)).map((label, index) => (
                <text key={`${label}-${index}`} x="4" y={173 - index * 30} fill="#475569" fontSize="11">{label}</text>
              ))}
            </svg>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-5 text-lg font-extrabold text-slate-950">Paperwork Approval Flow</h3>
          <div className="space-y-5">
            {[
              ["Admin Submitted", "Draft paperwork", stats.draftPaperwork, "text-indigo-600 bg-blue-100"],
              ["High Council Review", "Under review by high council", stats.pendingHighCouncil, "text-amber-600 bg-amber-100"],
              ["Club Advisor Review", "Under review by club advisor", stats.pendingClubAdvisor, "text-violet-600 bg-violet-100"],
              ["Admin Received Approval", "Ready to publish event", stats.approvedPaperwork, "text-emerald-600 bg-emerald-100"],
            ].map(([title, subtitle, count, badge], index) => (
              <div key={title} className="relative flex gap-3">
                {index < 3 && <div className="absolute left-3 top-8 h-8 border-l border-indigo-300" />}
                <div className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-indigo-500 bg-white text-xs font-bold text-indigo-600">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-950">{title}</p>
                  <p className="text-xs font-medium text-slate-500">{subtitle}</p>
                </div>
                <span className={`h-fit rounded-md px-2 py-1 text-sm font-bold ${badge}`}>{count}</span>
              </div>
            ))}
          </div>
          <Link href="/admin/approval-status" className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
            View All Paperwork <span aria-hidden="true">-&gt;</span>
          </Link>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-950">Upcoming Events</h3>
            <Link href="/admin/event?mode=events#event-details" className="text-sm font-bold text-blue-700">View All</Link>
          </div>
          {displayEvents.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-500">
              No event data yet.
            </p>
          ) : (
          <div className="space-y-4">
            {displayEvents.slice(0, 3).map((event, index) => (
              <div key={event.id} className="flex gap-4">
                <MiniThumb index={index} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-extrabold text-slate-950">{event.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(event.start_date)} <span className="mx-1">.</span> {formatTime(event.start_date)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{event.location || "Venue not set"}</p>
                </div>
                <span className={`h-fit shrink-0 rounded-md px-2 py-1 text-xs font-bold ${statusClasses(event.status)}`}>{statusLabel(event.status)}</span>
              </div>
            ))}
          </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2.08fr_0.95fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-950">Recent Events</h3>
            <Link href="/admin/event?mode=events#event-details" className="text-sm font-bold text-blue-700">View All Events</Link>
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Event Title</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Registrations</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {displayEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                      No real event data found.
                    </td>
                  </tr>
                ) : displayEvents.map((event, index) => (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <MiniThumb index={index} />
                        <span className="font-semibold text-slate-950">{event.title}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-600">{formatDate(event.start_date)}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-600">{event.registration_count || 0} / {event.max_students || 0}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClasses(event.status)}`}>{statusLabel(event.status)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <div className="flex gap-2">
                        <Link href="/admin/event?mode=events#event-details" className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" title="View event">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                          </svg>
                        </Link>
                        <Link href="/admin/event?mode=events#event-details" className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" title="Edit event">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 5 4 4M4 20l4.5-1L20 7.5 16.5 4 5 15.5 4 20Z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/admin/event?mode=events#event-details" className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
            View All Events <span aria-hidden="true">-&gt;</span>
          </Link>
        </Card>

        <Card className="p-5">
          <h3 className="mb-5 text-lg font-extrabold text-slate-950">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Create New Event", "/admin/event?mode=events#event-details", "text-indigo-600", <path key="a" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5M7 3v4m10-4v4M5 7h14v14H5V7Z" />],
              ["Upload Participants", "/admin/payments", "text-emerald-600", <path key="b" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m18-7h-6m3-3v6M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />],
              ["Create Paperwork", "/admin/event?mode=paperwork", "text-amber-500", <path key="c" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h6" />],
              ["View Reports", "/admin/report", "text-blue-600", <path key="d" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20V9m5 11V4m5 16v-7m5 7V7M3 20h18" />],
              ["Manage Users", "/admin/users", "text-pink-500", <path key="e" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />],
              ["System Settings", "/admin/profile", "text-slate-500", <path key="f" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm8.5 4a7.9 7.9 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L16 3h-4l-.4 3a8 8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.4 3h4l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />],
            ].map(([label, href, color, icon]) => (
              <Link key={label as string} href={href as string} className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <svg className={`mb-2 h-9 w-9 ${color as string}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {icon as React.ReactNode}
                </svg>
                <span className="text-sm font-extrabold leading-tight text-slate-950">{label as string}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
