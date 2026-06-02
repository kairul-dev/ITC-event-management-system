"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PublishedEvent = {
  id: string;
  title: string;
  start_date: string;
  end_date?: string | null;
  location?: string | null;
  max_students?: number | null;
  fee_amount?: number | null;
  registered_count?: number;
};

type RegisteredEvent = {
  id: string;
  registered_at: string;
  payment_status?: string | null;
  events: PublishedEvent & {
    status?: string | null;
  };
};

type Certificate = {
  id: string;
  certificate_no: string;
  status: string;
  issued_at: string;
  events?: {
    title: string;
  } | null;
};

type CertificateRow = Omit<Certificate, "events"> & {
  events?: Certificate["events"] | NonNullable<Certificate["events"]>[] | null;
};

type StudentProfile = {
  name?: string | null;
};

type RegistrationRow = RegisteredEvent & {
  events?: RegisteredEvent["events"] | RegisteredEvent["events"][] | null;
};

const eventVisuals = [
  "from-slate-950 via-blue-900 to-blue-500",
  "from-slate-950 via-blue-900 to-cyan-500",
  "from-slate-950 via-sky-800 to-blue-500",
  "from-slate-950 via-cyan-900 to-emerald-500",
];

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

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(value);
  eventDate.setHours(0, 0, 0, 0);
  return Math.ceil((eventDate.getTime() - today.getTime()) / 86400000);
}

function StatusPill({ status }: { status?: string | null }) {
  const paid = status === "paid";
  return (
    <span className={`rounded-md px-3 py-1 text-xs font-bold ${paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      {paid ? "Paid" : "Unpaid"}
    </span>
  );
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
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg sm:h-14 sm:w-14 ${tone}`}>
          <Icon>{icon}</Icon>
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-black text-slate-950 sm:text-3xl">{value}</p>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
        </div>
      </div>
      <p className="mt-5 text-sm font-bold text-blue-700">{action} <span aria-hidden="true">-&gt;</span></p>
    </Link>
  );
}

function EventArtwork({ index }: { index: number }) {
  return (
    <div className={`relative h-36 overflow-hidden rounded-t-lg bg-gradient-to-br ${eventVisuals[index % eventVisuals.length]}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(255,255,255,0.45),transparent_20%),radial-gradient(circle_at_70%_55%,rgba(255,255,255,0.2),transparent_24%)]" />
      <div className="absolute bottom-5 left-6 h-12 w-12 rounded-full border border-white/30 bg-white/10" />
      <div className="absolute bottom-7 right-8 h-16 w-24 rounded-lg border border-white/20 bg-white/10" />
    </div>
  );
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<StudentProfile>({});
  const [availableEvents, setAvailableEvents] = useState<PublishedEvent[]>([]);
  const [registrations, setRegistrations] = useState<RegisteredEvent[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const [profileResult, eventsResult, registrationsResult, certificatesResult] = await Promise.all([
          supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
          supabase
            .from("events")
            .select("id, title, start_date, end_date, location, max_students, fee_amount")
            .eq("status", "Published")
            .order("start_date", { ascending: true })
            .limit(6),
          supabase
            .from("event_registrations")
            .select(`
              id,
              registered_at,
              payment_status,
              events (
                id,
                title,
                start_date,
                end_date,
                location,
                max_students,
                status
              )
            `)
            .eq("user_id", user.id)
            .order("registered_at", { ascending: false })
            .limit(5),
          supabase
            .from("certificates")
            .select(`
              id,
              certificate_no,
              status,
              issued_at,
              events (
                title
              )
            `)
            .eq("user_id", user.id)
            .order("issued_at", { ascending: false })
            .limit(5),
        ]);

        setProfile((profileResult.data as StudentProfile | null) || {});

        const published = ((eventsResult.data || []) as PublishedEvent[]).filter(Boolean);
        const eventsWithCounts = await Promise.all(
          published.map(async (event) => {
            const { count } = await supabase
              .from("event_registrations")
              .select("*", { count: "exact", head: true })
              .eq("event_id", event.id);
            return { ...event, registered_count: count || 0 };
          })
        );

        setAvailableEvents(eventsWithCounts);
        const registrationRows = ((registrationsResult.data || []) as RegistrationRow[])
          .map((row) => ({
            ...row,
            events: Array.isArray(row.events) ? row.events[0] : row.events,
          }))
          .filter((row): row is RegisteredEvent => Boolean(row.events));

        setRegistrations(registrationRows);
        const certificateRows = ((certificatesResult.data || []) as CertificateRow[]).map((row) => ({
          ...row,
          events: Array.isArray(row.events) ? row.events[0] : row.events,
        }));

        setCertificates(certificateRows);
      } catch (error) {
        console.error("Error loading student dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  const approvedCertificates = certificates.filter((certificate) => certificate.status === "issued").length;
  const attendedEvents = registrations.filter((registration) => registration.events?.status === "completed").length;
  const reminders = useMemo(
    () =>
      availableEvents
        .filter((event) => {
          const days = daysUntil(event.start_date);
          return days !== null && days >= 0;
        })
        .slice(0, 3),
    [availableEvents]
  );
  const displayName = profile.name || "Student";

  if (loading) {
    return (
      <div className="grid min-h-96 place-items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Welcome back, {displayName}!</h2>
        <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">Discover and join exciting ITC club events.</p>
      </section>

      <section className="grid min-w-0 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Available Events"
          value={availableEvents.length}
          href="/student/events"
          action="Browse events"
          tone="bg-blue-100 text-blue-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />}
        />
        <SummaryCard
          label="My Registrations"
          value={registrations.length}
          href="/student/registered-events"
          action="View all"
          tone="bg-emerald-100 text-emerald-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 3v4m10-4v4M5 6h14v15H5V6Z" />}
        />
        <SummaryCard
          label="Events Attended"
          value={attendedEvents}
          href="/student/registered-events"
          action="View history"
          tone="bg-amber-100 text-amber-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8m-8 0a4 4 0 0 0 8 0m-8 0H5a2 2 0 0 1-2-2v-4h4m9 6h3a2 2 0 0 0 2-2v-4h-4M7 4h10v8a5 5 0 0 1-10 0V4Z" />}
        />
        <SummaryCard
          label="Certificates Earned"
          value={approvedCertificates}
          href="/student/certificates"
          action="View certificates"
          tone="bg-sky-100 text-sky-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />}
        />
      </section>

      <div className="grid min-w-0 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950 sm:text-xl">Available Events</h3>
              <Link href="/student/events" className="shrink-0 text-xs font-bold text-blue-700 hover:text-blue-800 sm:text-sm">View All Events -&gt;</Link>
            </div>
            {availableEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-500">
                No published events are available right now.
              </div>
            ) : (
              <div className="grid min-w-0 gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-4">
                {availableEvents.slice(0, 4).map((event, index) => {
                  const seats = event.max_students || 0;
                  const registered = event.registered_count || 0;
                  const remaining = Math.max(seats - registered, 0);
                  return (
                    <article key={event.id} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="relative">
                        <EventArtwork index={index} />
                        <span className="absolute left-3 top-3 rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          {remaining === 0 && seats > 0 ? "Full" : "Open"}
                        </span>
                      </div>
                      <div className="space-y-3 p-4">
                        <h4 className="line-clamp-2 min-h-10 break-words text-sm font-black text-slate-950">{event.title}</h4>
                        <div className="space-y-2 text-xs font-medium text-slate-600">
                          <p className="flex items-center gap-2">
                            <Icon className="text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" /></Icon>
                            {formatDate(event.start_date)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Icon className="text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></Icon>
                            {formatTime(event.start_date)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Icon className="text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" /></Icon>
                            {event.location || "ITC venue"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>Slots Left</span>
                          <span className={remaining > 0 ? "text-emerald-600" : "text-red-600"}>
                            {seats > 0 ? `${remaining} / ${seats}` : "Open"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 pt-1 min-[380px]:grid-cols-2">
                          <Link href={`/student/events/${event.id}`} className="rounded-md border border-blue-200 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-50">
                            View Details
                          </Link>
                          <Link href={`/student/events/${event.id}`} className="rounded-md bg-blue-700 px-3 py-2 text-center text-xs font-bold text-white hover:bg-blue-800">
                            Register Now
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950 sm:text-xl">My Registrations</h3>
              <Link href="/student/registered-events" className="shrink-0 text-xs font-bold text-blue-700 hover:text-blue-800 sm:text-sm">View All -&gt;</Link>
            </div>
            {registrations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-500">
                You have not registered for any events yet.
              </div>
            ) : (
              <div className="grid gap-3">
                {registrations.slice(0, 4).map((registration, index) => (
                  <article key={registration.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-white">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${eventVisuals[index % eventVisuals.length]}`}>
                          <Icon className="text-white/90">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
                          </Icon>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-extrabold text-slate-950">{registration.events.title}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {formatDate(registration.events.start_date)} <span className="mx-1">|</span> {formatTime(registration.events.start_date)}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-600">{registration.events.location || "ITC venue"}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                        <StatusPill status={registration.payment_status} />
                        <Link href={`/student/events/${registration.events.id}`} className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Upcoming Reminders</h3>
            <div className="mt-4 space-y-4">
              {reminders.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">No upcoming event reminders.</p>
              ) : (
                reminders.map((event) => {
                  const date = new Date(event.start_date);
                  const days = daysUntil(event.start_date) || 0;
                  return (
                    <div key={event.id} className="flex gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-blue-50 text-center">
                        <span className="block text-xl font-black leading-none text-blue-700">{date.getDate()}</span>
                        <span className="block text-[10px] font-black uppercase text-blue-500">{date.toLocaleDateString("en-MY", { month: "short" })}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{event.title}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">Starts in {days} {days === 1 ? "day" : "days"}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Link href="/student/events" className="mt-5 inline-block text-sm font-bold text-blue-700 hover:text-blue-800">
              View Calendar -&gt;
            </Link>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              {[
                ["Browse All Events", "/student/events"],
                ["My Registrations", "/student/registered-events"],
                ["Update Profile", "/student/profile"],
                ["My Certificates", "/student/certificates"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700">
                    <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h10M9 12h10M9 19h10M4 5h.01M4 12h.01M4 19h.01" /></Icon>
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-blue-50 p-5 text-center shadow-sm ring-1 ring-blue-100">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-blue-700 shadow-sm">
              <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10a6 6 0 1 0-12 0v4a3 3 0 0 0 3 3h1m8-7v7a2 2 0 0 1-2 2h-2m-2 0h2m0 0v-3" /></Icon>
            </div>
            <h3 className="mt-4 text-base font-black text-slate-950">Need Help?</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">Contact the ITC Club committee for event or certificate support.</p>
            <Link href="/student/profile" className="mt-4 inline-flex rounded-lg bg-blue-700 px-6 py-3 text-sm font-bold text-white hover:bg-blue-800">
              Contact Us
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
