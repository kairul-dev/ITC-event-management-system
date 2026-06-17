"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getObjectiveText, getPurposeText } from "@/lib/eventDisplay";

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  max_students: number;
  fee_amount?: number | null;
  location?: string | null;
  purpose?: string | null;
  objective?: string | null;
  poster_url?: string | null;
  registered_count?: number;
};

type EventVisual = {
  type: string;
  image: string;
  color: string;
  outline: string;
};

const eventVisuals: Record<string, EventVisual> = {
  "Web Development Bootcamp": {
    type: "Workshop",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    color: "from-violet-600 to-indigo-600",
    outline: "border-violet-300 text-violet-700 hover:bg-violet-50",
  },
  "UI/UX Design Sprint": {
    type: "Design",
    image:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80",
    color: "from-emerald-500 to-green-600",
    outline: "border-green-300 text-green-700 hover:bg-green-50",
  },
  "ITC Coding Challenge": {
    type: "Competition",
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=80",
    color: "from-pink-500 to-rose-500",
    outline: "border-pink-300 text-pink-700 hover:bg-pink-50",
  },
  "Cybersecurity Awareness Talk": {
    type: "Talk",
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=900&q=80",
    color: "from-sky-500 to-blue-600",
    outline: "border-blue-300 text-blue-700 hover:bg-blue-50",
  },
  "Tech Career Sharing Session": {
    type: "Career",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80",
    color: "from-orange-500 to-red-500",
    outline: "border-orange-300 text-orange-700 hover:bg-orange-50",
  },
  "Final Year Project Showcase": {
    type: "Showcase",
    image:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80",
    color: "from-indigo-500 to-violet-600",
    outline: "border-indigo-300 text-indigo-700 hover:bg-indigo-50",
  },
};

const fallbackVisual: EventVisual = {
  type: "Event",
  image:
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
  color: "from-violet-600 to-indigo-600",
  outline: "border-violet-300 text-violet-700 hover:bg-violet-50",
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const getFeeLabel = (fee?: number | null) =>
  fee && fee > 0 ? `RM ${Number(fee).toFixed(2)}` : "Free";

const getVisual = (title: string) => eventVisuals[title] || fallbackVisual;
const getEventStatus = (event: EventRow) => {
  const registered = event.registered_count || 0;
  if (registered >= event.max_students) return "Full";
  if (new Date(event.start_date).getTime() <= Date.now()) return "Closed";
  return "Open";
};

export default function PublicEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [query, setQuery] = useState("");
  const [feeFilter, setFeeFilter] = useState<"all" | "free" | "paid">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      const response = await fetch("/api/events/public");

      if (response.ok) {
        const rows = (await response.json()) as EventRow[];
        setEvents(rows);
      }

      setLoading(false);
    };

    loadEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    const text = `${event.title} ${event.location || ""} ${getPurposeText(event.purpose)} ${getObjectiveText(event.purpose, event.objective)}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const isPaid = !!event.fee_amount && event.fee_amount > 0;
    const matchesFee =
      feeFilter === "all" ||
      (feeFilter === "free" && !isPaid) ||
      (feeFilter === "paid" && isPaid);

    return matchesQuery && matchesFee;
  });

  const freeEvents = events.filter((event) => !event.fee_amount || event.fee_amount === 0).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1800&q=85')",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_26%,rgba(124,58,237,0.42),transparent_28%),linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.86)_45%,rgba(2,6,23,0.48)_100%)]" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
            <Link href="/" className="flex items-center gap-3 font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 shadow-lg shadow-violet-950/30">
                <span className="h-3 w-3 rounded-sm bg-slate-950" />
              </span>
              <span className="text-lg">ITC FSKTM</span>
            </Link>

            <nav className="hidden items-center gap-9 text-sm font-semibold text-white/80 lg:flex">
              <Link href="/" className="transition hover:text-white">
                Home
              </Link>
              <Link href="/events" className="border-b-2 border-violet-400 pb-2 text-violet-300">
                Events
              </Link>
              <Link href="/#about" className="transition hover:text-white">
                About ITC
              </Link>
              <Link
                href="/login?role=student&next=%2Fstudent%2Fregistered-events"
                className="transition hover:text-white"
              >
                My Events
              </Link>
              <Link href="/verify-certificate" className="transition hover:text-white">
                Verify Certificate
              </Link>
              <Link href="/#contact" className="transition hover:text-white">
                Contact
              </Link>
            </nav>

            <Link
              href="/login"
              className="rounded-md border border-white/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-24 pt-16 sm:px-8 md:pb-28 md:pt-20 lg:grid-cols-[1fr_320px] lg:px-10">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-md bg-violet-500 px-3 py-2 text-xs font-bold uppercase text-white shadow-lg shadow-violet-950/30">
              Information Technology Club
            </p>
            <h1 className="mt-7 text-5xl font-black leading-[1.03] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Explore Every <span className="text-violet-400">ITC Event</span>
              <span className="text-orange-400">.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Explore published workshops, talks, competitions, and showcases.
              Open an event to see the full details before registering with
              your student account.
            </p>
          </div>

          <div className="grid content-center gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/10 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-md">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <span>
                <strong className="block text-2xl font-black">{events.length}</strong>
                <span className="text-sm text-slate-200">Approved Events</span>
              </span>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/10 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-md">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.2 0-4 .9-4 2s1.8 2 4 2 4 .9 4 2-1.8 2-4 2m0-8V6m0 10v2m9-6a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span>
                <strong className="block text-2xl font-black">{freeEvents}</strong>
                <span className="text-sm text-slate-200">Free Events</span>
              </span>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/10 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-md">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span>
                <strong className="block text-lg font-black">
                  {events[0] ? formatDate(events[0].start_date) : "Coming soon"}
                </strong>
                <span className="text-sm text-slate-200">Next Session</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="-mt-16 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] md:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="relative block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
                </svg>
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events, venues, purpose, or objective"
                className="h-12 w-full rounded-md border border-slate-300 pl-12 pr-4 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </label>

            <div className="grid grid-cols-3 rounded-md border border-slate-200 bg-slate-50 p-1 text-sm font-bold">
              {(["all", "free", "paid"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setFeeFilter(filter)}
                  className={`rounded px-4 py-2 capitalize transition ${
                    feeFilter === filter
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-violet-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">No published events found</h2>
            <p className="mt-2 text-sm text-slate-600">Try another search term or check again later.</p>
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            <div>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    All Events
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"} available
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.map((event) => {
                  const visual = getVisual(event.title);
                  const date = new Date(event.start_date);
                  const status = getEventStatus(event);
                  const availableSlots = Math.max(0, event.max_students - (event.registered_count || 0));
                  const summaryText =
                    getPurposeText(event.purpose) ||
                    getObjectiveText(event.purpose, event.objective) ||
                    "View event details, venue, capacity, and registration information.";

                  return (
                    <article key={event.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(15,23,42,0.16)]">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={event.poster_url || visual.image}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
                        <span className={`absolute left-4 top-4 rounded-md bg-gradient-to-r ${visual.color} px-3 py-1.5 text-xs font-bold text-white shadow-lg`}>
                          {visual.type}
                        </span>
                        <span className="absolute right-4 top-4 grid h-16 w-14 place-items-center rounded-md bg-white text-center font-black leading-none text-slate-950 shadow-lg">
                          <span className="text-2xl">{date.getDate()}</span>
                          <span className="text-xs text-slate-500">
                            {date.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                        </span>
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-xl font-black tracking-tight text-slate-950">
                            {event.title}
                          </h3>
                          <span className={`shrink-0 rounded-full bg-gradient-to-r ${visual.color} px-2.5 py-1 text-xs font-black text-white shadow-sm`}>
                            {getFeeLabel(event.fee_amount)}
                          </span>
                        </div>

                        <p className="mt-3 min-h-16 text-sm leading-6 text-slate-600">
                          {summaryText}
                        </p>

                        <div className="mt-5 grid gap-3 text-sm">
                          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-br ${visual.color} text-white shadow-sm`}>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </span>
                            <span>
                              <span className="block text-xs font-bold uppercase text-slate-400">Schedule</span>
                              <span className="font-bold text-slate-800">{formatDate(event.start_date)} at {formatTime(event.start_date)}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-br ${visual.color} text-white shadow-sm`}>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11zm0-8a3 3 0 100-6 3 3 0 000 6z" />
                              </svg>
                            </span>
                            <span>
                              <span className="block text-xs font-bold uppercase text-slate-400">Venue</span>
                              <span className="font-bold text-slate-800">{event.location || "Venue will be announced"}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                              <span className="block text-xs font-bold uppercase text-slate-400">Fee</span>
                              <span className="mt-1 block text-lg font-black text-slate-950">{getFeeLabel(event.fee_amount)}</span>
                            </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                              <span className="block text-xs font-bold uppercase text-slate-400">Available Slots</span>
                              <span className="mt-1 block text-lg font-black text-slate-950">{availableSlots}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                              <span className="block text-xs font-bold uppercase text-slate-400">Deadline</span>
                              <span className="mt-1 block text-sm font-black text-slate-950">{formatDate(event.start_date)}</span>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                              <span className="block text-xs font-bold uppercase text-slate-400">Status</span>
                              <span className="mt-1 block text-sm font-black text-slate-950">{status}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <Link href={`/events/${event.id}`} className={`rounded-md border px-4 py-3 text-center text-sm font-bold transition ${visual.outline}`}>
                            View Details
                          </Link>
                          <Link href={`/events/${event.id}`} className={`rounded-md bg-gradient-to-r ${visual.color} px-4 py-3 text-center text-sm font-bold text-white transition hover:brightness-110`}>
                            Register
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
