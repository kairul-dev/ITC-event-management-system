"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ShowcaseEvent = {
  id?: string;
  title: string;
  type: string;
  date: string;
  month: string;
  fullDate: string;
  time: string;
  venue: string;
  description: string;
  image: string;
  color: string;
  outline: string;
  feeAmount?: number | null;
};

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  fee_amount?: number | null;
  max_students: number;
  location?: string | null;
  purpose?: string | null;
  objective?: string | null;
  poster_url?: string | null;
};

const eventVisuals = [
  {
    title: "Web Development Bootcamp",
    type: "Workshop",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    color: "from-violet-600 to-indigo-600",
    outline: "border-violet-300 text-violet-700",
  },
  {
    title: "UI/UX Design Sprint",
    type: "Design",
    image:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80",
    color: "from-emerald-500 to-green-600",
    outline: "border-green-300 text-green-700",
  },
  {
    title: "ITC Coding Challenge",
    type: "Competition",
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=80",
    color: "from-pink-500 to-rose-500",
    outline: "border-pink-300 text-pink-700",
  },
  {
    title: "Cybersecurity Awareness Talk",
    type: "Talk",
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=900&q=80",
    color: "from-sky-500 to-blue-600",
    outline: "border-blue-300 text-blue-700",
  },
  {
    title: "Tech Career Sharing Session",
    type: "Career",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80",
    color: "from-orange-500 to-red-500",
    outline: "border-orange-300 text-orange-700",
  },
  {
    title: "Final Year Project Showcase",
    type: "Showcase",
    image:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80",
    color: "from-indigo-500 to-violet-600",
    outline: "border-indigo-300 text-indigo-700",
  },
];

const fallbackVisual = eventVisuals[0];
const placeholderTermPattern = /\b(?:test|demo|dummy|sample|audit)\b/gi;

const cleanPresentationText = (value: string, fallback: string) => {
  const cleaned = value
    .replace(placeholderTermPattern, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.:;!?])/g, "$1")
    .trim();

  return cleaned || fallback;
};

const formatShowcaseEvent = (event: EventRow, index: number): ShowcaseEvent => {
  const startDate = new Date(event.start_date);
  const visual =
    eventVisuals.find((item) => item.title === event.title) ||
    eventVisuals[index % eventVisuals.length] ||
    fallbackVisual;

  return {
    id: event.id,
    title: cleanPresentationText(event.title, "ITC Community Event"),
    type: visual.type,
    date: startDate.toLocaleDateString("en-US", { day: "2-digit" }),
    month: startDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    fullDate: startDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    venue: cleanPresentationText(event.location || "", "Venue will be announced"),
    description: cleanPresentationText(
      event.purpose || event.objective || "",
      "View the full details, check the venue and schedule, then register your seat through the student portal.",
    ),
    image: event.poster_url || visual.image,
    color: visual.color,
    outline: visual.outline,
    feeAmount: event.fee_amount,
  };
};

export default function ShowcasePage() {
  const eventsPerPage = 4;
  const [events, setEvents] = useState<ShowcaseEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const filteredEvents = useMemo(() => {
    const needle = activeSearch.trim().toLowerCase();

    if (!needle) {
      return events;
    }

    return events.filter((event) =>
      [event.title, event.type, event.venue, event.description].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [activeSearch, events]);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const activePage = Math.min(currentPage, totalPages || 1);
  const visibleEvents = filteredEvents.slice(
    (activePage - 1) * eventsPerPage,
    activePage * eventsPerPage,
  );
  const freeEvents = events.filter((event) => event.feeAmount === 0 || event.feeAmount == null).length;
  const thisMonthEvents = events.filter((event) => {
    const date = new Date(event.fullDate);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const stats = [
    { value: String(events.length), label: "Upcoming Events", color: "from-indigo-500 to-violet-600" },
    { value: String(freeEvents), label: "Free Events", color: "from-orange-500 to-orange-400" },
    { value: String(thisMonthEvents), label: "This Month", color: "from-indigo-500 to-violet-600" },
  ];

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveSearch(searchQuery);
    setCurrentPage(1);
    document.getElementById("available-events")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const loadEvents = async () => {
      const response = await fetch("/api/events/public?limit=12");

      if (response.ok) {
        const data = (await response.json()) as EventRow[];
        setEvents(data.map(formatShowcaseEvent));
      }
    };

    loadEvents();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-y-0 right-0 w-full bg-cover bg-center lg:w-[58%]" style={{backgroundImage:"url('https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1600&q=90')"}} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#020617_0%,#070a2b_43%,rgba(7,10,43,0.72)_58%,rgba(2,6,23,0.15)_100%)]" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
            <Link href="/" className="flex items-center gap-3 font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 shadow-lg shadow-violet-950/30">
                <span className="h-3 w-3 rounded-sm bg-slate-950" />
              </span>
              <span><strong className="block text-lg leading-none">ITC CLUB</strong><small className="mt-1 block text-[9px] font-medium tracking-wider text-slate-300">INFORMATION TECHNOLOGY CLUB</small></span>
            </Link>

            <nav className="hidden items-center gap-9 text-sm font-semibold text-white/80 lg:flex">
              <Link href="/" className="border-b-2 border-violet-400 pb-2 text-violet-300">
                Home
              </Link>
              <a href="#available-events" className="transition hover:text-white">
                Events
              </a>
              <a href="#about" className="transition hover:text-white">
                About Us
              </a>
              <Link
                href="/login?role=student&next=%2Fstudent%2Fregistered-events"
                className="transition hover:text-white"
              >
                My Events
              </Link>
              <Link href="/verify-certificate" className="transition hover:text-white">
                Verify Certificate
              </Link>
              <a href="#contact" className="transition hover:text-white">
                Contact
              </a>
            </nav>

            <Link
              href="/login"
              className="rounded-md border border-white/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-28 pt-16 sm:px-8 md:pb-32 lg:px-10 lg:pb-28 lg:pt-20">
          <div className="max-w-xl">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-orange-400">
              Connect&nbsp; • &nbsp;Learn&nbsp; • &nbsp;Innovate
            </p>
            <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] text-white sm:text-6xl">
              Where Technology<br />Meets Opportunity
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-200">
              Empowering students to explore, collaborate, and lead through impactful IT events, workshops, and real-world industry experiences.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#available-events"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-8 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5"
              >
                Browse Events
              </a>
              <Link
                href="/verify-certificate"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-orange-500 bg-slate-950/40 px-8 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Verify Certificate
              </Link>
            </div>
            <div className="mt-8 grid max-w-xl gap-4 border-t border-white/15 pt-5 text-xs text-slate-300 sm:grid-cols-3">
              <p><strong className="block text-sm text-white">Student Driven</strong>Built by students, for students</p>
              <p><strong className="block text-sm text-white">Real Impact</strong>Practical skills, real outcomes</p>
              <p><strong className="block text-sm text-white">Trusted &amp; Secure</strong>Secured by blockchain</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <form
          onSubmit={handleSearch}
          className="-mt-9 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_20px_55px_rgba(15,23,42,0.18)] sm:flex-row"
        >
          <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-slate-500">
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value;
                setSearchQuery(value);

                if (!value.trim()) {
                  setActiveSearch("");
                  setCurrentPage(1);
                }
              }}
              placeholder="Search ITC events, skills, or venues..."
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
          <button type="submit" className="h-12 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-9 text-sm font-bold text-white">
            Search
          </button>
        </form>
        <div className="mt-4 grid rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:grid-cols-3">
          {stats.map((stat, index) => (
            <div key={stat.label} className={`flex items-center gap-4 py-2 ${index ? "md:border-l md:border-slate-200 md:pl-8" : ""}`}>
              <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${stat.color} text-xl font-black text-white`}>{index === 0 ? "□" : index === 1 ? "◎" : "◇"}</span>
              <div><strong className="text-3xl font-black text-slate-950">{stat.value}</strong><span className="ml-3 text-sm font-bold text-slate-800">{stat.label}</span><p className="text-xs text-slate-500">{index === 0 ? "Registered & open events" : index === 1 ? "Growing ITC community" : "Events happening soon"}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-5 sm:px-8">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#09082d] via-[#100b45] to-[#16095a] px-6 py-6 text-white shadow-xl sm:px-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
          <div className="relative">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Blockchain Certificate Verification</h2>
            <p className="mt-2 text-sm text-slate-200">
              Verify certificate authenticity using <span className="font-bold text-orange-400">Ethereum Sepolia</span> blockchain records.
            </p>
            <div className="mt-5 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
              <span><strong className="block text-white">Tamper Proof</strong>Immutable records</span>
              <span><strong className="block text-white">Instant Verification</strong>Real-time results</span>
              <span><strong className="block text-white">Privacy Protected</strong>Secure &amp; confidential</span>
            </div>
          </div>

          <form action="/verify-certificate" className="relative mt-6 lg:mt-0">
            <p className="pb-2 text-xs font-semibold text-slate-200">Enter Certificate Number</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Certificate number</span>
                <input
                  name="certificateNo"
                  placeholder="Example: CERT-1779247771947-2YGI90"
                  className="h-11 w-full rounded-lg border border-violet-500/60 bg-slate-950/50 px-4 font-mono text-sm text-white outline-none placeholder:text-slate-500"
                />
              </label>
              <button type="submit" className="h-11 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-7 text-sm font-bold text-white">
                Verify Now
              </button>
            </div>
            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">Secured by Ethereum Sepolia Network <span className="text-emerald-400">●</span></p>
          </form>
        </div>
      </section>

      <section
        id="available-events"
        className="mx-auto max-w-6xl scroll-mt-6 px-5 pb-16 pt-2 sm:px-8"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Upcoming Events
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Browse club activities, view the details, and register as a student.
            </p>
          </div>
          <Link
            href="/events"
            prefetch
            className="group inline-flex w-fit items-center gap-2 rounded-md border border-violet-300 px-5 py-3 text-sm font-bold text-violet-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-violet-50 hover:shadow-md active:translate-y-0"
          >
            Browse All Events
            <svg className="h-4 w-4 transition duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
            </svg>
          </Link>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="mt-7 rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
            {activeSearch
              ? `No published events match "${activeSearch}".`
              : "No published events are available yet."}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleEvents.map((event) => (
            <article
              key={event.id || event.title}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-36 overflow-hidden">
                <img
                  src={event.image}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className={`absolute right-3 top-3 rounded-md bg-gradient-to-r ${event.color} px-3 py-1 text-[10px] font-bold text-white`}>
                  {event.type}
                </span>
                <span className="absolute left-3 top-3 grid h-14 w-12 place-items-center rounded-md bg-white text-center font-black leading-none text-slate-950 shadow-lg">
                  <span className="text-[10px] text-violet-600">{event.month}</span>
                  <span className="text-xl">{event.date}</span>
                </span>
              </div>

              <div className="p-4">
                <h3 className="line-clamp-1 text-base font-black text-slate-950">{event.title}</h3>
                <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">
                  {event.description}
                </p>

                <div className="mt-3 grid gap-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {event.fullDate}
                    <span className="ml-2 inline-flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {event.time}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11zm0-8a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                    {event.venue}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <Link
                    href={event.id ? `/events/${event.id}` : "/events"}
                    className="text-xs font-bold text-violet-700 hover:underline"
                  >
                    View Details
                  </Link>
                  <Link
                    href={event.id ? `/events/${event.id}` : "/events"}
                    className={`rounded-lg bg-gradient-to-r px-5 py-2 text-center text-xs font-bold text-white ${event.color}`}
                  >
                    Register Now
                  </Link>
                </div>
              </div>
            </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;

            return (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`grid h-10 w-10 place-items-center rounded-md border text-sm font-black transition ${
                  activePage === page
                    ? "border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-950/20"
                    : "border-slate-300 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                }`}
                aria-label={`Show event page ${page}`}
                aria-current={activePage === page ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
          </div>
        )}
      </section>

      <section id="about" className="mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 p-7 text-white shadow-2xl shadow-pink-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/10">
              <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 010 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 010-4V7a2 2 0 012-2z" />
              </svg>
            </span>
            <div>
              <h2 className="text-2xl font-black">Want updates from ITC?</h2>
              <p className="mt-1 text-sm text-white/85">
                Create an account to register for events and keep track of your
                club activities in one place.
              </p>
            </div>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-7 py-3 text-sm font-bold text-pink-600 transition hover:bg-slate-100"
          >
            Register Account
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      <footer id="contact" className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:px-8 lg:px-10">
          <p className="font-semibold text-slate-700">Information Technology Club Event Portal</p>
          <div className="flex gap-5 font-semibold">
            <Link href="/login" className="hover:text-violet-700">
              Secure Module
            </Link>
            <Link href="/events" className="hover:text-violet-700">
              Events
            </Link>
            <Link href="/verify-certificate" className="hover:text-violet-700">
              Verify Certificate
            </Link>
            <Link href="/register" className="hover:text-violet-700">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
