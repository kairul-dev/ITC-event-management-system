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
  status?: string | null;
  checked_in_at?: string | null;
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

type Category = "All" | "Technical" | "Workshop" | "Seminar" | "Competition" | "Career" | "Others";

const categories: Category[] = ["All", "Technical", "Workshop", "Seminar", "Competition", "Career", "Others"];

const eventVisuals = [
  "from-blue-700 via-indigo-600 to-violet-500",
  "from-cyan-700 via-blue-600 to-indigo-500",
  "from-emerald-600 via-teal-600 to-cyan-500",
  "from-orange-500 via-amber-500 to-yellow-400",
  "from-fuchsia-600 via-violet-600 to-blue-600",
  "from-slate-800 via-blue-900 to-sky-600",
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
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inferCategory(event: PublishedEvent): Category {
  const title = event.title.toLowerCase();
  if (title.includes("workshop")) return "Workshop";
  if (title.includes("seminar") || title.includes("talk")) return "Seminar";
  if (title.includes("competition") || title.includes("tournament") || title.includes("challenge")) return "Competition";
  if (title.includes("career") || title.includes("fair")) return "Career";
  if (title.includes("web") || title.includes("ai") || title.includes("cyber") || title.includes("tech") || title.includes("coding")) return "Technical";
  return "Others";
}

function getEventAvailability(event: PublishedEvent, registeredEventIds: Set<string>, now: number) {
  const total = event.max_students || 0;
  const registered = event.registered_count || 0;
  const isAlreadyRegistered = registeredEventIds.has(event.id);
  const isFull = total > 0 && registered >= total;
  const deadlinePassed = new Date(event.start_date).getTime() <= now;
  const ratio = total > 0 ? registered / total : 0;

  if (isAlreadyRegistered) {
    return {
      badge: "Registered",
      label: "Already registered",
      disabled: true,
      reason: "Already registered",
      tone: "bg-blue-100 text-blue-700 ring-blue-200",
    };
  }

  if (deadlinePassed) {
    return {
      badge: "Closed",
      label: "Registration closed",
      disabled: true,
      reason: "Closed",
      tone: "bg-slate-100 text-slate-700 ring-slate-200",
    };
  }

  if (isFull) {
    return {
      badge: "Full",
      label: "Fully booked",
      disabled: true,
      reason: "Full",
      tone: "bg-red-100 text-red-700 ring-red-200",
    };
  }

  if (ratio >= 0.8) {
    return {
      badge: "Almost Full",
      label: "Almost full",
      disabled: false,
      reason: "Register Now",
      tone: "bg-amber-100 text-amber-700 ring-amber-200",
    };
  }

  return {
    badge: "Open",
    label: "Available",
    disabled: false,
    reason: "Register Now",
    tone: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };
}

function registrationStatus(registration: RegisteredEvent) {
  if (registration.events?.status === "Completed" || registration.events?.status === "Closed") return "Completed";
  if (registration.status === "cancelled") return "Cancelled";
  if (registration.status === "attended" || registration.checked_in_at) return "Attended";
  if (registration.payment_status === "paid") return "Paid";
  return "Registered";
}

function statusBadgeClass(status: string) {
  if (status === "Paid") return "bg-emerald-100 text-emerald-700";
  if (status === "Attended") return "bg-blue-100 text-blue-700";
  if (status === "Completed") return "bg-violet-100 text-violet-700";
  if (status === "Cancelled") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${tone}`}>
          <Icon>{icon}</Icon>
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-black text-slate-950">{value}</p>
          <p className="text-sm font-bold text-slate-600">{label}</p>
        </div>
      </div>
      <div className="mt-4 flex h-5 items-end gap-1">
        {[30, 55, 42, 70, 58, 82].map((height, index) => (
          <span key={index} className="w-full rounded-full bg-current opacity-20" style={{ height: `${height}%` }} />
        ))}
      </div>
    </section>
  );
}

function EventArtwork({ index, title }: { index: number; title: string }) {
  return (
    <div className={`relative h-40 overflow-hidden rounded-t-lg bg-gradient-to-br ${eventVisuals[index % eventVisuals.length]}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.35),transparent_22%),radial-gradient(circle_at_75%_35%,rgba(255,255,255,0.25),transparent_20%)]" />
      <div className="absolute left-5 top-5 h-12 w-12 rounded-xl border border-white/25 bg-white/15 backdrop-blur" />
      <div className="absolute bottom-5 left-5 max-w-[70%]">
        <p className="line-clamp-2 text-lg font-black text-white drop-shadow">{title}</p>
      </div>
      <div className="absolute bottom-5 right-5 h-16 w-20 rounded-xl border border-white/20 bg-white/15" />
      <div className="absolute right-10 top-8 h-7 w-7 rounded-full bg-white/20" />
    </div>
  );
}

function HeroGraphic() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-96 overflow-hidden lg:block">
      <div className="absolute right-16 top-6 h-44 w-44 rounded-full bg-blue-200/35" />
      <svg className="absolute bottom-0 right-8 h-56 w-80" viewBox="0 0 320 224" fill="none" aria-hidden="true">
        <rect x="92" y="86" width="142" height="82" rx="16" fill="#2563EB" opacity=".16" />
        <rect x="112" y="104" width="104" height="58" rx="8" fill="#1D4ED8" opacity=".95" />
        <circle cx="164" cy="133" r="8" fill="#DBEAFE" />
        <path d="M105 181h118" stroke="#1E3A8A" strokeWidth="8" strokeLinecap="round" opacity=".22" />
        <circle cx="165" cy="58" r="34" fill="#BFDBFE" />
        <path d="M145 60c12 13 34 14 47-2" stroke="#1E3A8A" strokeWidth="7" strokeLinecap="round" />
        <path d="M121 199c12-32 29-48 53-48 23 0 42 16 54 48" fill="#1D4ED8" opacity=".88" />
        <path d="M72 78h28m-14-14v28M246 64h30m-15-15v30" stroke="#60A5FA" strokeWidth="5" strokeLinecap="round" opacity=".75" />
      </svg>
    </div>
  );
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<StudentProfile>({});
  const [availableEvents, setAvailableEvents] = useState<PublishedEvent[]>([]);
  const [registrations, setRegistrations] = useState<RegisteredEvent[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [now] = useState(() => Date.now());

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
          .order("start_date", { ascending: true }),
        supabase
          .from("event_registrations")
          .select(`
            id,
            registered_at,
            payment_status,
            status,
            checked_in_at,
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
          .order("registered_at", { ascending: false }),
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
          .order("issued_at", { ascending: false }),
      ]);

      setProfile((profileResult.data as StudentProfile | null) || {});

      const published = ((eventsResult.data || []) as PublishedEvent[]).filter(Boolean);
      const registrationCountRows = await Promise.all(
        published.map(async (event) => {
          const { count } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);
          return { ...event, registered_count: count || 0 };
        })
      );

      setAvailableEvents(registrationCountRows);

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

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const registeredEventIds = useMemo(
    () => new Set(registrations.map((registration) => registration.events.id)),
    [registrations],
  );

  const filteredEvents = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return availableEvents.filter((event) => {
      const matchesCategory = activeCategory === "All" || inferCategory(event) === activeCategory;
      const matchesSearch = !needle || event.title.toLowerCase().includes(needle) || (event.location || "").toLowerCase().includes(needle);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, availableEvents, searchQuery]);

  const attendedEvents = registrations.filter((registration) => registration.status === "attended" || registration.checked_in_at).length;
  const completedEvents = registrations.filter((registration) => registration.events?.status === "Completed" || registration.events?.status === "Closed").length;
  const upcomingRegistrations = registrations.filter((registration) => new Date(registration.events.start_date).getTime() > now).length;
  const certificatesEarned = certificates.filter((certificate) => certificate.status === "issued" || certificate.status === "downloaded").length;
  const participationRate = registrations.length > 0 ? Math.round((Math.max(attendedEvents, completedEvents) / registrations.length) * 100) : 0;
  const displayName = profile.name || "Student";

  const upcomingEvent =
    registrations.find((registration) => new Date(registration.events.start_date).getTime() > now)?.events ||
    availableEvents.find((event) => new Date(event.start_date).getTime() > now) ||
    null;

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

    if (eventData.status !== "Published") {
      setRegisteringId(null);
      setToast({ message: "This event is not open for registration.", type: "error" });
      return;
    }

    if (new Date(eventData.start_date).getTime() <= Date.now()) {
      setRegisteringId(null);
      setToast({ message: "Registration deadline has passed.", type: "error" });
      return;
    }

    const { count } = await supabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    if ((count || 0) >= eventData.max_students) {
      setRegisteringId(null);
      setToast({ message: "This event is full.", type: "error" });
      return;
    }

    const { data: existingRegistration } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingRegistration) {
      setRegisteringId(null);
      setToast({ message: "You already registered for this event.", type: "error" });
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
    await loadDashboardData();
  };

  if (loading) {
    return (
      <div className="grid min-h-96 place-items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      {toast && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${
          toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {toast.message}
        </div>
      )}

      <section className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-6 shadow-sm lg:p-8">
        <HeroGraphic />
        <div className="relative max-w-3xl">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Student Portal</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Welcome back, {displayName}!</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 sm:text-base">
            Stay updated with your events, registrations, and certificates.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/student/events" className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800">
              Browse Events
            </Link>
            <Link href="/student/registered-events" className="rounded-lg border border-blue-200 bg-white px-5 py-3 text-sm font-black text-blue-700 hover:bg-blue-50">
              My Registrations
            </Link>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-5">
        <SummaryCard
          label="Available Events"
          value={availableEvents.length}
          tone="bg-blue-100 text-blue-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />}
        />
        <SummaryCard
          label="My Registrations"
          value={registrations.length}
          tone="bg-emerald-100 text-emerald-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 3v4m10-4v4M5 6h14v15H5V6Z" />}
        />
        <SummaryCard
          label="Events Attended"
          value={attendedEvents}
          tone="bg-amber-100 text-amber-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M7 4h10v8a5 5 0 0 1-10 0V4Zm-3 2h3v2a3 3 0 0 1-3-3V6Zm13 0h3v2a3 3 0 0 0 3-3V6Z" />}
        />
        <SummaryCard
          label="Certificates Earned"
          value={certificatesEarned}
          tone="bg-violet-100 text-violet-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />}
        />
        <SummaryCard
          label="Participation Rate"
          value={`${participationRate}%`}
          tone="bg-cyan-100 text-cyan-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v9l6 3m3-3a9 9 0 1 1-9-9" />}
        />
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950">Browse by Category</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Filter events by interest and find the right program quickly.</p>
              </div>
              <div className="relative w-full lg:w-72">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
                </Icon>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search events..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
                    activeCategory === category ? "bg-blue-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950 sm:text-xl">Available Events</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Discover and register for exciting ITC events.</p>
              </div>
              <Link href="/student/events" className="shrink-0 text-xs font-black text-blue-700 hover:text-blue-800 sm:text-sm">View All Events -&gt;</Link>
            </div>
            {filteredEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                No events available yet.
              </div>
            ) : (
              <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredEvents.slice(0, 6).map((event, index) => {
                  const total = event.max_students || 0;
                  const registered = event.registered_count || 0;
                  const progress = total > 0 ? Math.min(100, Math.round((registered / total) * 100)) : 0;
                  const availability = getEventAvailability(event, registeredEventIds, now);
                  return (
                    <article key={event.id} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="relative">
                        <EventArtwork index={index} title={event.title} />
                        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black ring-1 ${availability.tone}`}>
                          {availability.badge}
                        </span>
                      </div>
                      <div className="space-y-3 p-4">
                        <h4 className="line-clamp-2 min-h-10 break-words text-base font-black text-slate-950">{event.title}</h4>
                        <div className="space-y-2 text-xs font-semibold text-slate-600">
                          <p className="flex items-center gap-2">
                            <Icon className="text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" /></Icon>
                            {formatDate(event.start_date)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Icon className="text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></Icon>
                            {formatTime(event.start_date)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Icon className="text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" /></Icon>
                            {event.location || "ITC venue"}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs font-black">
                            <span>{registered} / {total || "Open"} slots</span>
                            <span className={availability.disabled && availability.badge !== "Registered" ? "text-red-600" : "text-emerald-600"}>
                              {availability.label}
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${progress >= 100 ? "bg-red-500" : progress >= 80 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 pt-1 min-[420px]:grid-cols-2">
                          <Link href={`/student/events/${event.id}`} className="rounded-md border border-blue-200 px-3 py-2 text-center text-xs font-black text-blue-700 hover:bg-blue-50">
                            View Details
                          </Link>
                          <button
                            type="button"
                            onClick={() => registerEvent(event.id)}
                            disabled={availability.disabled || registeringId === event.id}
                            className="rounded-md bg-blue-700 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                          >
                            {registeringId === event.id ? "Registering..." : availability.reason}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-950">My Registrations</h3>
                <Link href="/student/registered-events" className="text-xs font-black text-blue-700 hover:text-blue-800">View All -&gt;</Link>
              </div>
              {registrations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                  You have not registered for any events yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-3 text-left">Event</th>
                        <th className="px-3 py-3 text-left">Date & Time</th>
                        <th className="px-3 py-3 text-left">Status</th>
                        <th className="px-3 py-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {registrations.slice(0, 5).map((registration) => {
                        const statusText = registrationStatus(registration);
                        return (
                          <tr key={registration.id}>
                            <td className="px-3 py-4">
                              <p className="font-black text-slate-950">{registration.events.title}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">{registration.events.location || "ITC venue"}</p>
                            </td>
                            <td className="px-3 py-4 font-semibold text-slate-600">
                              {formatDate(registration.events.start_date)}
                              <br />
                              <span className="text-xs">{formatTime(registration.events.start_date)}</span>
                            </td>
                            <td className="px-3 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusBadgeClass(statusText)}`}>{statusText}</span>
                            </td>
                            <td className="px-3 py-4">
                              <Link href={`/student/events/${registration.events.id}`} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">
                                View Details
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">My Stats</h3>
              <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
                <div
                  className="grid h-40 w-40 shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(#2563eb ${participationRate * 3.6}deg, #e0e7ff 0deg)` }}
                >
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
                    <div>
                      <p className="text-3xl font-black text-slate-950">{participationRate}%</p>
                      <p className="text-xs font-bold text-slate-500">Participation</p>
                    </div>
                  </div>
                </div>
                <div className="grid flex-1 gap-2 text-sm font-bold text-slate-600">
                  <p className="flex justify-between gap-6"><span>Registered</span><span className="text-slate-950">{registrations.length}</span></p>
                  <p className="flex justify-between gap-6"><span>Attended</span><span className="text-slate-950">{attendedEvents}</span></p>
                  <p className="flex justify-between gap-6"><span>Upcoming</span><span className="text-slate-950">{upcomingRegistrations}</span></p>
                  <p className="flex justify-between gap-6"><span>Completed</span><span className="text-slate-950">{completedEvents}</span></p>
                </div>
              </div>
              <div className="mt-5 rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-800 ring-1 ring-blue-100">
                Keep going. Your participation record grows with every completed ITC event.
              </div>
            </section>
          </div>
        </main>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Upcoming Event</h3>
            {upcomingEvent ? (
              <div className="mt-4 rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
                <p className="text-base font-black text-slate-950">{upcomingEvent.title}</p>
                <p className="mt-2 text-sm font-bold text-slate-600">{formatDate(upcomingEvent.start_date)} | {formatTime(upcomingEvent.start_date)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{upcomingEvent.location || "ITC venue"}</p>
                <Link href={`/student/events/${upcomingEvent.id}`} className="mt-4 inline-flex w-full justify-center rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-50">
                  View Details
                </Link>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500">No upcoming event yet.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              {[
                ["Browse All Events", "/student/events", "bg-blue-50 text-blue-700"],
                ["My Registrations", "/student/registered-events", "bg-emerald-50 text-emerald-700"],
                ["My Certificates", "/student/certificates", "bg-violet-50 text-violet-700"],
                ["Update Profile", "/student/profile", "bg-amber-50 text-amber-700"],
              ].map(([label, href, tone]) => (
                <Link key={href} href={href} className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-black transition hover:-translate-y-0.5 ${tone}`}>
                  <span>{label}</span>
                  <span aria-hidden="true">-&gt;</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950">Recent Certificates</h3>
              <Link href="/student/certificates" className="text-xs font-black text-blue-700 hover:text-blue-800">View All -&gt;</Link>
            </div>
            {certificates.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500">No certificates earned yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {certificates.slice(0, 3).map((certificate) => (
                  <article key={certificate.id} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="grid h-16 w-12 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                      <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" /></Icon>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">{certificate.events?.title || certificate.certificate_no}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Issued on {formatDate(certificate.issued_at)}</p>
                      <Link href={`/certificate/${certificate.id}`} className="mt-2 inline-flex rounded-md border border-blue-200 px-3 py-1.5 text-xs font-black text-blue-700">
                        Download
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
