"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  color: "from-[#1f5f8b] to-[#1f7a8c]",
  outline: "border-sky-300 text-sky-700 hover:bg-sky-50",
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

export default function PublicEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [query, setQuery] = useState("");
  const [feeFilter, setFeeFilter] = useState<"all" | "free" | "paid">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,start_date,end_date,max_students,fee_amount,location,purpose,objective")
        .eq("status", "approved")
        .order("start_date", { ascending: true });

      if (!error) {
        setEvents((data || []) as EventRow[]);
      }

      setLoading(false);
    };

    loadEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    const text = `${event.title} ${event.location || ""} ${event.purpose || ""} ${event.objective || ""}`.toLowerCase();
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
    <main className="min-h-screen bg-[#f7f5f0] text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3 font-black text-slate-950">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b2e4a] text-xs text-white">
              ITC
            </span>
            <span>ITC FSKTM</span>
          </Link>
          <Link href="/login" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            Login
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0b2e4a] text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1800&q=85')",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,46,74,0.98)_0%,rgba(15,61,94,0.88)_50%,rgba(31,122,140,0.58)_100%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[1fr_360px] lg:px-10">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase text-amber-300">
              ITC Event Directory
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-6xl">
              Choose the next event for your IT journey.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-100">
              Explore approved workshops, talks, competitions, and showcases.
              Open an event to see the full details before registering with
              your student account.
            </p>
          </div>

          <div className="grid content-end gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-black">{events.length}</p>
              <p className="mt-1 text-sm text-slate-100">Approved events</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-black">{freeEvents}</p>
              <p className="mt-1 text-sm text-slate-100">Free events</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xl font-black">
                {events[0] ? formatDate(events[0].start_date) : "Coming soon"}
              </p>
              <p className="mt-1 text-sm text-slate-100">Next session</p>
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
                className="h-12 w-full rounded-md border border-slate-300 pl-12 pr-4 text-sm outline-none transition focus:border-[#1f5f8b] focus:ring-2 focus:ring-[#1f5f8b]/20"
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
                      ? "bg-[#0b2e4a] text-white shadow-sm"
                      : "text-slate-600 hover:bg-white"
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
            <h2 className="text-xl font-black text-slate-950">No approved events found</h2>
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

                  return (
                    <article key={event.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.10)] transition hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(15,23,42,0.16)]">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={visual.image}
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
                        <h3 className="text-xl font-black tracking-tight text-slate-950">
                          {event.title}
                        </h3>
                        <p className="min-h-16 text-sm leading-6 text-slate-600">
                          {event.purpose || event.objective || "View event details, venue, capacity, and registration information."}
                        </p>

                        <div className="mt-5 grid gap-3 text-sm text-slate-600">
                          <p className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#1f7a8c]" />
                            {formatDate(event.start_date)} at {formatTime(event.start_date)}
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#d98e04]" />
                            {event.location || "Venue will be announced"}
                          </p>
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <p className="rounded-md bg-slate-50 px-3 py-2 font-bold text-slate-700">
                              {getFeeLabel(event.fee_amount)}
                            </p>
                            <p className="rounded-md bg-slate-50 px-3 py-2 font-bold text-slate-700">
                              {event.max_students} seats
                            </p>
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
