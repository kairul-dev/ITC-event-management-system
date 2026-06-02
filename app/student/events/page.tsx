"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getObjectiveText, getPurposeText } from "@/lib/eventDisplay";

type Event = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  max_students: number;
  status: string;
  created_at: string;
  fee_amount?: number;
  location?: string;
  purpose?: string;
  objective?: string;
  registered_count?: number;
};

type RegistrationRow = {
  event_id: string;
};

type Category = "All" | "Technical" | "Workshop" | "Seminar" | "Competition" | "Career" | "Others";
type SortMode = "newest" | "oldest" | "popular" | "closing";

const categories: Category[] = ["All", "Technical", "Workshop", "Seminar", "Competition", "Career", "Others"];
const eventVisuals = [
  "from-blue-950 via-blue-700 to-cyan-500",
  "from-slate-950 via-indigo-800 to-fuchsia-500",
  "from-emerald-950 via-teal-700 to-cyan-500",
  "from-slate-800 via-blue-900 to-slate-500",
  "from-violet-950 via-purple-700 to-blue-500",
  "from-orange-700 via-amber-600 to-yellow-400",
];

function Icon({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric", weekday: "short" });
}

function formatTime(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
}

function inferCategory(event: Event): Category {
  const text = `${event.title} ${getPurposeText(event.purpose)} ${getObjectiveText(event.purpose, event.objective)}`.toLowerCase();
  if (text.includes("workshop")) return "Workshop";
  if (text.includes("seminar") || text.includes("talk")) return "Seminar";
  if (text.includes("competition") || text.includes("tournament") || text.includes("challenge")) return "Competition";
  if (text.includes("career") || text.includes("fair")) return "Career";
  if (text.includes("ai") || text.includes("web") || text.includes("cyber") || text.includes("tech") || text.includes("coding")) return "Technical";
  return "Others";
}

function getAvailability(event: Event, registeredEventIds: Set<string>, now: number) {
  const used = event.registered_count || 0;
  const total = event.max_students || 0;
  const progress = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const alreadyRegistered = registeredEventIds.has(event.id);
  const full = total > 0 && used >= total;
  const closed = event.status === "Closed" || event.status === "Completed" || new Date(event.start_date).getTime() <= now;

  if (alreadyRegistered) return { badge: "Registered", label: "Already registered", action: "Registered", disabled: true, tone: "bg-blue-100 text-blue-700", progress };
  if (closed) return { badge: "Closed", label: "Event ended", action: "Closed", disabled: true, tone: "bg-red-100 text-red-700", progress: Math.max(progress, 100) };
  if (full) return { badge: "Full", label: "Fully booked", action: "Full", disabled: true, tone: "bg-slate-100 text-slate-700", progress: 100 };
  if (progress >= 80) return { badge: "Almost Full", label: "Almost full", action: "Register Now", disabled: false, tone: "bg-amber-100 text-amber-700", progress };
  return { badge: "Open", label: "Slots left", action: "Register Now", disabled: false, tone: "bg-emerald-100 text-emerald-700", progress };
}

function EventPoster({ event, index }: { event: Event; index: number }) {
  return (
    <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${eventVisuals[index % eventVisuals.length]}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.35),transparent_20%),radial-gradient(circle_at_78%_35%,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="absolute bottom-5 left-5 max-w-[72%]">
        <p className="line-clamp-2 text-xl font-black text-white drop-shadow">{event.title}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-white/75">{inferCategory(event)}</p>
      </div>
      <div className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-lg border border-white/25 bg-white/15 text-white backdrop-blur">
        <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10v17l-5-3-5 3V4Z" /></Icon>
      </div>
      <div className="absolute bottom-5 right-5 h-16 w-20 rounded-xl border border-white/20 bg-white/15" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-24 animate-pulse rounded-lg bg-white" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-80 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
    </div>
  );
}

export default function StudentEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [sortBy, setSortBy] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());
  const pageSize = 8;

  const loadEvents = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "Published")
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Error loading events:", error);
      setEvents([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as Event[];
    const [eventsWithCounts, registrationsResult] = await Promise.all([
      Promise.all(
        rows.map(async (event) => {
          const { count } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);
          return { ...event, registered_count: count || 0 };
        }),
      ),
      user
        ? supabase.from("event_registrations").select("event_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] as RegistrationRow[] }),
    ]);

    setEvents(eventsWithCounts);
    setRegisteredEventIds(new Set(((registrationsResult.data || []) as RegistrationRow[]).map((row) => row.event_id)));
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEvents();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredEvents = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const next = events.filter((event) => {
      const matchesCategory = activeCategory === "All" || inferCategory(event) === activeCategory;
      const matchesSearch =
        !needle ||
        event.title.toLowerCase().includes(needle) ||
        (event.location || "").toLowerCase().includes(needle) ||
        getPurposeText(event.purpose).toLowerCase().includes(needle);
      return matchesCategory && matchesSearch;
    });

    return next.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "popular") return (b.registered_count || 0) - (a.registered_count || 0);
      if (sortBy === "closing") return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [activeCategory, events, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const pagedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  const registerEvent = async (eventId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setToast({ message: "Please login first.", type: "error" });
      return;
    }

    setRegisteringId(eventId);
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("fee_amount, max_students, start_date, status")
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      setRegisteringId(null);
      setToast({ message: "Event not found.", type: "error" });
      return;
    }

    if (eventData.status !== "Published" || new Date(eventData.start_date).getTime() <= Date.now()) {
      setRegisteringId(null);
      setToast({ message: "This event is closed for registration.", type: "error" });
      return;
    }

    const [{ count }, { data: existingRegistration }] = await Promise.all([
      supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("event_id", eventId),
      supabase.from("event_registrations").select("id").eq("event_id", eventId).eq("user_id", user.id).maybeSingle(),
    ]);

    if ((count || 0) >= eventData.max_students) {
      setRegisteringId(null);
      setToast({ message: "This event is full.", type: "error" });
      return;
    }

    if (existingRegistration) {
      setRegisteringId(null);
      setToast({ message: "You already registered for this event.", type: "error" });
      await loadEvents();
      return;
    }

    const isFreeEvent = !eventData.fee_amount || eventData.fee_amount === 0;
    const { error } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_id: eventId,
      payment_status: isFreeEvent ? "paid" : "unpaid",
    });

    setRegisteringId(null);

    if (error) {
      setToast({ message: error.code === "23505" ? "You already registered for this event." : error.message, type: "error" });
      return;
    }

    setToast({
      message: isFreeEvent ? "Registered successfully. No payment needed." : "Registration started. Please pay by card from My Registrations.",
      type: "success",
    });
    await loadEvents();
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {toast && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {toast.message}
        </div>
      )}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Available Events</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Discover and register for exciting ITC events.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 sm:w-96">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            </Icon>
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search events by title, organizer or venue..."
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Filter</button>
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as SortMode);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="popular">Most Popular</option>
            <option value="closing">Closing Soon</option>
          </select>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => {
              setActiveCategory(category);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${activeCategory === category ? "bg-blue-700 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700"}`}
          >
            {category}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-black text-slate-950">No available events at the moment.</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Please check again later for new ITC events.</p>
        </section>
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {pagedEvents.map((event, index) => {
              const availability = getAvailability(event, registeredEventIds, now);
              const used = event.registered_count || 0;
              const total = event.max_students || 0;
              return (
                <article key={event.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative">
                    <EventPoster event={event} index={index} />
                    <span className={`absolute left-3 top-3 rounded-md px-3 py-1 text-xs font-black ${availability.tone}`}>{availability.badge}</span>
                  </div>
                  <div className="space-y-3 p-4">
                    <h2 className="line-clamp-2 min-h-11 text-base font-black text-slate-950">{event.title}</h2>
                    <div className="space-y-2 text-sm font-semibold text-slate-600">
                      <p className="flex items-center gap-2"><Icon className="text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" /></Icon>{formatDate(event.start_date)}</p>
                      <p className="flex items-center gap-2"><Icon className="text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></Icon>{formatTime(event.start_date)} - {formatTime(event.end_date)}</p>
                      <p className="flex items-center gap-2"><Icon className="text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" /></Icon>{event.location || "Not provided"}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-black">
                        <span>{used} / {total || "Open"}</span>
                        <span className={availability.disabled && availability.badge !== "Registered" ? "text-red-600" : "text-emerald-600"}>{availability.label}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${availability.progress >= 100 ? "bg-red-500" : availability.progress >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${availability.progress}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link href={`/student/events/${event.id}`} className="rounded-md border border-blue-200 px-3 py-2 text-center text-xs font-black text-blue-700 hover:bg-blue-50">View Details</Link>
                      <button
                        type="button"
                        onClick={() => registerEvent(event.id)}
                        disabled={availability.disabled || registeringId === event.id}
                        className="rounded-md bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        {registeringId === event.id ? "Registering..." : availability.action}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <footer className="flex flex-col gap-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredEvents.length)} of {filteredEvents.length} events</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-md border border-slate-200 bg-white px-3 py-2 font-black text-slate-700 disabled:opacity-50">Prev</button>
              {Array.from({ length: totalPages }).slice(0, 5).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`rounded-md px-3 py-2 font-black ${page === pageNumber ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{pageNumber}</button>
                );
              })}
              <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-md border border-slate-200 bg-white px-3 py-2 font-black text-slate-700 disabled:opacity-50">Next</button>
            </div>
          </footer>
        </>
      )}
    </motion.div>
  );
}
