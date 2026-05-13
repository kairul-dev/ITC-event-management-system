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

export default function PublicEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [query, setQuery] = useState("");
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
    return text.includes(query.toLowerCase());
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="font-black text-slate-950">
            ITC FSKTM
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Student Login
            </Link>
            <Link href="/register" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500">
              Join ITC
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase text-violet-700">
            ITC Event Browser
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Browse available club events.
          </h1>
          <p className="mt-4 text-slate-600">
            View event details freely. When you are ready to register, log in with your student account.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by event name, venue, purpose, or objective..."
            className="h-12 w-full rounded-md border border-slate-300 px-4 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        {loading ? (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-600">
            Loading events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white p-10 text-center">
            <h2 className="text-xl font-black text-slate-950">No approved events found</h2>
            <p className="mt-2 text-sm text-slate-600">Try another search term or check again later.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <article key={event.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-violet-700 p-5 text-white">
                  <p className="text-xs font-bold uppercase text-violet-200">
                    {new Date(event.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <h2 className="mt-3 text-xl font-black">{event.title}</h2>
                </div>
                <div className="p-5">
                  <p className="min-h-12 text-sm leading-6 text-slate-600">
                    {event.purpose || event.objective || "View event details, venue, capacity, and registration information."}
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    <p>{event.location || "Venue will be announced"}</p>
                    <p>{event.fee_amount && event.fee_amount > 0 ? `RM ${Number(event.fee_amount).toFixed(2)}` : "Free event"}</p>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Link href={`/events/${event.id}`} className="rounded-md border border-violet-300 px-4 py-3 text-center text-sm font-bold text-violet-700 hover:bg-violet-50">
                      View Details
                    </Link>
                    <Link href={`/events/${event.id}`} className="rounded-md bg-violet-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-violet-500">
                      Register
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
