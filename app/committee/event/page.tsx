"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminEventPage from "../../admin/event/page";

type EventRow = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  max_students?: number | null;
  status?: string | null;
  created_at?: string | null;
  created_by?: string | null;
};

type RegistrationRow = {
  event_id?: string | null;
};

const statusOptions = [
  "Draft",
  "Pending High Council",
  "Pending Club Advisor",
  "Approved",
  "Rejected",
  "Published",
];

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
}

function eventCode(event: EventRow) {
  const year = event.created_at ? new Date(event.created_at).getFullYear() : "0000";
  return `EVT-${year}-${event.id.slice(0, 6).toUpperCase()}`;
}

function normalizeStatus(status?: string | null) {
  if (!status) return "Draft";
  if (status === "Pending Approval" || status === "Pending High Council Approval") return "Pending High Council";
  if (status === "Pending Club Advisor Approval") return "Pending Club Advisor";
  return status;
}

function statusBadge(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (normalized === "Rejected") return "bg-red-100 text-red-700 ring-red-200";
  if (normalized === "Approved") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (normalized === "Published") return "bg-blue-100 text-blue-700 ring-blue-200";
  if (normalized === "Pending High Council") return "bg-amber-100 text-amber-700 ring-amber-200";
  if (normalized === "Pending Club Advisor") return "bg-orange-100 text-orange-700 ring-orange-200";
  if (normalized === "Under Review") return "bg-violet-100 text-violet-700 ring-violet-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg p-4 ${tone}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-white/70">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z" />
          </svg>
        </span>
        <div>
          <p className="text-2xl font-black text-slate-950">{value}</p>
          <p className="text-xs font-black text-slate-600">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function CommitteeEventPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mode !== "events") return;

    const loadEvents = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = user?.id
        ? await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
        : { data: null };

      let query = supabase
        .from("events")
        .select("id,title,start_date,end_date,location,max_students,status,created_at,created_by")
        .order("created_at", { ascending: false });

      if (user?.id && profile?.role !== "admin") {
        query = query.eq("created_by", user.id);
      }

      const { data } = await query;
      const rows = (data || []) as EventRow[];
      setEvents(rows);

      if (rows.length > 0) {
        const { data: registrationRows } = await supabase
          .from("event_registrations")
          .select("event_id")
          .in("event_id", rows.map((event) => event.id));

        const counts = ((registrationRows || []) as RegistrationRow[]).reduce<Record<string, number>>((acc, row) => {
          if (!row.event_id) return acc;
          acc[row.event_id] = (acc[row.event_id] || 0) + 1;
          return acc;
        }, {});
        setRegistrations(counts);
      } else {
        setRegistrations({});
      }

      setLoading(false);
    };

    void loadEvents();
  }, [mode]);

  const filteredEvents = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        !needle ||
        event.title.toLowerCase().includes(needle) ||
        eventCode(event).toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || normalizeStatus(event.status) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  const stats = useMemo(
    () => ({
      total: events.length,
      draft: events.filter((event) => normalizeStatus(event.status) === "Draft").length,
      review: events.filter((event) => normalizeStatus(event.status).startsWith("Pending")).length,
      approved: events.filter((event) => normalizeStatus(event.status) === "Approved").length,
    }),
    [events],
  );

  if (mode !== "events") {
    return <AdminEventPage />;
  }

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const reloadEvents = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = user?.id
      ? await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
      : { data: null };

    let query = supabase
      .from("events")
      .select("id,title,start_date,end_date,location,max_students,status,created_at,created_by")
      .order("created_at", { ascending: false });

    if (user?.id && profile?.role !== "admin") query = query.eq("created_by", user.id);
    const { data } = await query;
    setEvents((data || []) as EventRow[]);
  };

  const deleteDraft = async (eventId: string) => {
    if (!confirm("Delete this draft event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId).eq("status", "Draft");
    if (error) alert(error.message);
    await reloadEvents();
  };

  const resubmitEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .update({ status: "Pending Approval", rejection_reason: null })
      .eq("id", eventId);
    if (error) alert(error.message);
    await reloadEvents();
  };

  const publishEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .update({ status: "Published", rejection_reason: null })
      .eq("id", eventId)
      .eq("status", "Approved");
    if (error) alert(error.message);
    await reloadEvents();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Event Details</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Search, select, and view full details of events managed by Club Committee.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_520px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">Search Events</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by event title or ID..."
                className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">Filter by Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-7 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-950">Event Summary</h2>
            <Link href="/committee/program-calendar" className="rounded-md border border-blue-100 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-50">
              View All Calendar
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Events" value={stats.total} tone="bg-blue-50 text-blue-700" />
            <StatCard label="Draft" value={stats.draft} tone="bg-amber-50 text-amber-700" />
            <StatCard label="Under Review" value={stats.review} tone="bg-violet-50 text-violet-700" />
            <StatCard label="Approved" value={stats.approved} tone="bg-emerald-50 text-emerald-700" />
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">All Events</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Manage and monitor all events created by your club.</p>
          </div>
          <Link href="/committee/event?mode=paperwork" className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-blue-800">
            + Create New Event
          </Link>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <h3 className="text-lg font-black text-slate-950">No events found</h3>
              <p className="mt-2 text-sm font-medium text-slate-500">Create your first event paperwork to begin the approval workflow.</p>
              <Link href="/committee/event?mode=paperwork" className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800">
                Create New Event
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 text-left">Event</th>
                    <th className="px-5 py-4 text-left">Date</th>
                    <th className="px-5 py-4 text-left">Venue</th>
                    <th className="px-5 py-4 text-left">Participants</th>
                    <th className="px-5 py-4 text-left">Status</th>
                    <th className="px-5 py-4 text-left">Last Updated</th>
                    <th className="px-5 py-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEvents.map((event) => {
                    const registered = registrations[event.id] || 0;
                    const max = event.max_students || 0;
                    const progress = max > 0 ? Math.min(100, Math.round((registered / max) * 100)) : 0;
                    const status = normalizeStatus(event.status);
                    return (
                      <tr key={event.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-md bg-blue-50 text-blue-700">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z" />
                              </svg>
                            </span>
                            <div>
                              <p className="font-black text-slate-950">{event.title}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">{eventCode(event)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">{formatDate(event.start_date)}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{formatTime(event.start_date)} - {formatTime(event.end_date)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">{event.location || "Not provided"}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Not provided</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">{registered} / {max}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Registered</p>
                          <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusBadge(status)}`}>{status}</span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">{formatDate(event.created_at)}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{formatTime(event.created_at)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/club-committee/events/${event.id}`} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">
                              View Details
                            </Link>
                            <details className="relative">
                              <summary className="list-none rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">More</summary>
                              <div className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                                <Link href={`/committee/approval-status?eventId=${event.id}`} className="block rounded-md px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Track Approval</Link>
                                <button type="button" onClick={() => window.print()} className="block w-full rounded-md px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">Download Report</button>
                                {(status === "Draft" || status === "Rejected") && <Link href="/committee/event?mode=paperwork" className="block rounded-md px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Edit Event</Link>}
                                {status === "Draft" && <button type="button" onClick={() => deleteDraft(event.id)} className="block w-full rounded-md px-3 py-2 text-left text-xs font-bold text-red-700 hover:bg-red-50">Delete Draft</button>}
                                {status === "Rejected" && <button type="button" onClick={() => resubmitEvent(event.id)} className="block w-full rounded-md px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50">Resubmit</button>}
                                {status === "Approved" && <button type="button" onClick={() => publishEvent(event.id)} className="block w-full rounded-md px-3 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50">Publish Event</button>}
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {filteredEvents.map((event) => {
                const status = normalizeStatus(event.status);
                return (
                  <article key={event.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{event.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{eventCode(event)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusBadge(status)}`}>{status}</span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
                      <p>Date: {formatDate(event.start_date)}</p>
                      <p>Venue: {event.location || "Not provided"}</p>
                      <p>Participants: {registrations[event.id] || 0} / {event.max_students || 0}</p>
                    </div>
                    <Link href={`/club-committee/events/${event.id}`} className="mt-4 inline-flex rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">
                      View Details
                    </Link>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-lg border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-black text-slate-950">How it works?</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Search or filter events, then click View Details to see full information, paperwork, approvals, participants, and more.
          </p>
        </div>
        <Link href="/committee/approval-status" className="rounded-md bg-white px-4 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50">
          View User Guide
        </Link>
      </section>
    </div>
  );
}
