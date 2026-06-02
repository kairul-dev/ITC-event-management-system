"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type RegisteredEvent = {
  id: string;
  registered_at: string;
  payment_status?: "unpaid" | "pending" | "paid" | "rejected" | "refunded";
  payment_reference?: string | null;
  payment_note?: string | null;
  status?: string | null;
  checked_in_at?: string | null;
  events: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    fee_amount?: number;
    location?: string;
    status: string;
  };
  certificateId?: string | null;
};

type RegisteredEventRow = Omit<RegisteredEvent, "events"> & {
  events?: RegisteredEvent["events"] | RegisteredEvent["events"][] | null;
};

type CertificateRow = {
  id: string;
  event_id: string;
};

type FilterStatus = "All" | "Registered" | "Paid" | "Attended" | "Completed" | "Cancelled";

const filters: FilterStatus[] = ["All", "Registered", "Paid", "Attended", "Completed", "Cancelled"];
const eventVisuals = [
  "from-blue-950 via-blue-700 to-cyan-500",
  "from-slate-950 via-indigo-800 to-fuchsia-500",
  "from-emerald-950 via-teal-700 to-cyan-500",
  "from-orange-700 via-amber-600 to-yellow-400",
  "from-violet-950 via-purple-700 to-blue-500",
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
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
}

function inferCategory(title: string) {
  const text = title.toLowerCase();
  if (text.includes("workshop")) return "Workshop";
  if (text.includes("seminar") || text.includes("talk")) return "Seminar";
  if (text.includes("competition") || text.includes("tournament")) return "Competition";
  if (text.includes("career")) return "Career";
  if (text.includes("ai") || text.includes("web") || text.includes("cyber") || text.includes("tech")) return "Technical";
  return "Event";
}

function registrationStatus(registration: RegisteredEvent): FilterStatus {
  if (registration.status === "cancelled") return "Cancelled";
  if (registration.events.status === "Completed" || registration.events.status === "Closed") return "Completed";
  if (registration.status === "attended" || registration.checked_in_at) return "Attended";
  if (registration.payment_status === "paid") return "Paid";
  return "Registered";
}

function statusBadgeClass(status: string) {
  if (status === "Paid") return "bg-emerald-100 text-emerald-700";
  if (status === "Attended") return "bg-violet-100 text-violet-700";
  if (status === "Completed") return "bg-teal-100 text-teal-700";
  if (status === "Cancelled") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

function paymentBadgeClass(status?: string) {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "refunded") return "bg-slate-100 text-slate-700";
  return "bg-orange-100 text-orange-700";
}

function Thumbnail({ index }: { index: number }) {
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${eventVisuals[index % eventVisuals.length]} text-white shadow-sm`}>
      <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" /></Icon>
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-lg bg-white" />
      <div className="h-96 animate-pulse rounded-lg bg-white" />
    </div>
  );
}

function RegisteredEventsContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<RegisteredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingCheckoutId, setStartingCheckoutId] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function loadRegisteredEvents() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("event_registrations")
      .select(`
        id,
        registered_at,
        payment_status,
        payment_reference,
        payment_note,
        status,
        checked_in_at,
        events (
          id,
          title,
          start_date,
          end_date,
          fee_amount,
          location,
          status
        )
      `)
      .eq("user_id", user.id)
      .order("registered_at", { ascending: false });

    if (error) {
      console.error("Error loading registered events:", error);
      setEvents([]);
      setLoading(false);
      return;
    }

    const rows = ((data || []) as RegisteredEventRow[])
      .map((row) => ({
        ...row,
        events: Array.isArray(row.events) ? row.events[0] : row.events,
      }))
      .filter((row): row is RegisteredEvent => Boolean(row.events));

    if (rows.length > 0) {
      const eventIds = rows.map((row) => row.events.id);
      const { data: certificates } = await supabase
        .from("certificates")
        .select("id,event_id")
        .eq("user_id", user.id)
        .in("event_id", eventIds);
      const certificateMap = new Map(((certificates || []) as CertificateRow[]).map((item) => [item.event_id, item.id]));
      setEvents(rows.map((row) => ({ ...row, certificateId: certificateMap.get(row.events.id) || null })));
    } else {
      setEvents([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRegisteredEvents();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const confirmStripePayment = async (sessionId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) throw new Error("Please log in again and retry payment confirmation.");

    const response = await fetch("/api/payments/confirm-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "Unable to confirm Stripe payment.");
  };

  useEffect(() => {
    const paymentState = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentState === "success") {
      const finalizePayment = async () => {
        setCheckoutMessage("Payment completed. Finalizing your payment status.");
        try {
          if (sessionId) await confirmStripePayment(sessionId);
          await loadRegisteredEvents();
          setCheckoutMessage("Payment completed and confirmed.");
        } catch (error) {
          setCheckoutMessage(error instanceof Error ? error.message : "Unable to confirm payment right now.");
          await loadRegisteredEvents();
        }
      };
      void finalizePayment();
      return;
    }

    queueMicrotask(() => {
      if (paymentState === "cancel") setCheckoutMessage("Payment was cancelled. You can try again anytime.");
      else setCheckoutMessage(null);
    });
  }, [searchParams]);

  const startStripeCheckout = async (registrationId: string) => {
    setStartingCheckoutId(registrationId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        alert("Please log in again and retry payment.");
        setStartingCheckoutId(null);
        return;
      }

      const response = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ registrationId }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.url) {
        alert(payload?.error || "Unable to start payment checkout.");
        setStartingCheckoutId(null);
        return;
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error("Stripe checkout error:", error);
      alert("Unable to start Stripe checkout.");
      setStartingCheckoutId(null);
    }
  };

  const filteredEvents = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      const status = registrationStatus(event);
      const matchesStatus = filter === "All" || status === filter;
      const matchesSearch =
        !needle ||
        event.events.title.toLowerCase().includes(needle) ||
        (event.events.location || "").toLowerCase().includes(needle) ||
        inferCategory(event.events.title).toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [events, filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const pagedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">My Registrations</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">View and manage all your event registrations.</p>
          {checkoutMessage && <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">{checkoutMessage}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-80">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            </Icon>
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search registrations..."
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Filter</button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setFilter(item);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${filter === item ? "bg-blue-700 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-black text-slate-950">You have not registered for any events yet.</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Browse available events and start joining ITC programs.</p>
          <Link href="/student/events" className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">Browse Available Events</Link>
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left">Event</th>
                  <th className="px-5 py-4 text-left">Date & Time</th>
                  <th className="px-5 py-4 text-left">Venue</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Payment</th>
                  <th className="px-5 py-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pagedEvents.map((event, index) => {
                  const status = registrationStatus(event);
                  const paid = event.payment_status === "paid";
                  return (
                    <tr key={event.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Thumbnail index={index} />
                          <div>
                            <p className="font-black text-slate-950">{event.events.title}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{inferCategory(event.events.title)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600">{formatDate(event.events.start_date)}<br /><span className="text-xs">{formatTime(event.events.start_date)} - {formatTime(event.events.end_date)}</span></td>
                      <td className="px-5 py-4 font-semibold text-slate-600">{event.events.location || "Not provided"}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusBadgeClass(status)}`}>{status}</span></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${paymentBadgeClass(event.payment_status || "unpaid")}`}>{event.payment_status || "unpaid"}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {event.certificateId ? (
                            <Link href={`/certificate/${event.certificateId}`} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">View Certificate</Link>
                          ) : (
                            <Link href={`/student/events/${event.events.id}`} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">View Details</Link>
                          )}
                          {!paid && (
                            <button type="button" onClick={() => startStripeCheckout(event.id)} disabled={startingCheckoutId === event.id} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-60">
                              {startingCheckoutId === event.id ? "Redirecting..." : "Pay"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 lg:hidden">
            {pagedEvents.map((event, index) => {
              const status = registrationStatus(event);
              return (
                <article key={event.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex gap-3">
                    <Thumbnail index={index} />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-950">{event.events.title}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{inferCategory(event.events.title)}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
                    <p>{formatDate(event.events.start_date)} | {formatTime(event.events.start_date)}</p>
                    <p>{event.events.location || "Not provided"}</p>
                    <p><span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusBadgeClass(status)}`}>{status}</span></p>
                  </div>
                  <Link href={event.certificateId ? `/certificate/${event.certificateId}` : `/student/events/${event.events.id}`} className="mt-4 inline-flex rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">
                    {event.certificateId ? "View Certificate" : "View Details"}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {filteredEvents.length > 0 && (
        <footer className="flex flex-col gap-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredEvents.length)} of {filteredEvents.length} registrations</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-md border border-slate-200 bg-white px-3 py-2 font-black text-slate-700 disabled:opacity-50">Prev</button>
            <button type="button" className="rounded-md bg-blue-700 px-3 py-2 font-black text-white">{page}</button>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-md border border-slate-200 bg-white px-3 py-2 font-black text-slate-700 disabled:opacity-50">Next</button>
          </div>
        </footer>
      )}
    </motion.div>
  );
}

export default function RegisteredEventsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <RegisteredEventsContent />
    </Suspense>
  );
}
