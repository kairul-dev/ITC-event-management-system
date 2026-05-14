"use client";

import Link from "next/link";
import { useState } from "react";

const events = [
  {
    title: "Web Development Bootcamp",
    type: "Workshop",
    date: "22",
    month: "JUN",
    time: "09:00 AM",
    venue: "Computer Lab 3, FSKTM",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    color: "from-violet-600 to-indigo-600",
    outline: "border-violet-300 text-violet-700",
  },
  {
    title: "UI/UX Design Sprint",
    type: "Design",
    date: "28",
    month: "JUN",
    time: "10:00 AM",
    venue: "Seminar Room, FSKTM",
    image:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80",
    color: "from-emerald-500 to-green-600",
    outline: "border-green-300 text-green-700",
  },
  {
    title: "ITC Coding Challenge",
    type: "Competition",
    date: "05",
    month: "JUL",
    time: "08:30 AM",
    venue: "Main Hall, FSKTM",
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=80",
    color: "from-pink-500 to-rose-500",
    outline: "border-pink-300 text-pink-700",
  },
  {
    title: "Cybersecurity Awareness Talk",
    type: "Talk",
    date: "12",
    month: "JUL",
    time: "09:30 AM",
    venue: "Lecture Hall 1, FSKTM",
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=900&q=80",
    color: "from-sky-500 to-blue-600",
    outline: "border-blue-300 text-blue-700",
  },
  {
    title: "Tech Career Sharing Session",
    type: "Career",
    date: "20",
    month: "JUL",
    time: "02:30 PM",
    venue: "Auditorium, FSKTM",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80",
    color: "from-orange-500 to-red-500",
    outline: "border-orange-300 text-orange-700",
  },
  {
    title: "Final Year Project Showcase",
    type: "Showcase",
    date: "27",
    month: "JUL",
    time: "11:00 AM",
    venue: "Innovation Space, FSKTM",
    image:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80",
    color: "from-indigo-500 to-violet-600",
    outline: "border-indigo-300 text-indigo-700",
  },
];

const stats = [
  {
    value: "120+",
    label: "Student Registrations",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
    color: "from-indigo-500 to-violet-600",
  },
  {
    value: "400+",
    label: "Active ITC Members",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-6a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0"
      />
    ),
    color: "from-pink-500 to-rose-500",
  },
  {
    value: "25+",
    label: "Club Events",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11zm0-8a3 3 0 100-6 3 3 0 000 6z"
      />
    ),
    color: "from-amber-400 to-orange-500",
  },
];

export default function ShowcasePage() {
  const eventsPerPage = 4;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(events.length / eventsPerPage);
  const visibleEvents = events.slice(
    (currentPage - 1) * eventsPerPage,
    currentPage * eventsPerPage,
  );

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
              <Link href="/" className="border-b-2 border-violet-400 pb-2 text-violet-300">
                Home
              </Link>
              <a href="#events" className="transition hover:text-white">
                Events
              </a>
              <a href="#about" className="transition hover:text-white">
                About ITC
              </a>
              <Link
                href="/login?role=student&next=%2Fstudent%2Fregistered-events"
                className="transition hover:text-white"
              >
                My Events
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

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-16 sm:px-8 md:pb-24 md:pt-24 lg:grid-cols-[1fr_320px] lg:px-10">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-md bg-violet-500 px-3 py-2 text-xs font-bold uppercase text-white shadow-lg shadow-violet-950/30">
              Information Technology Club
            </p>
            <h1 className="mt-7 text-5xl font-black leading-[1.03] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Browse ITC <span className="text-violet-400">Events</span>
              <span className="text-orange-400">.</span>
              <br />
              Register With Ease.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
              A student event portal for Information Technology Club members to
              explore upcoming activities, check event details, and register for
              programs that build skills, confidence, and community.
            </p>

            <form className="mt-8 flex max-w-2xl flex-col gap-3 rounded-lg bg-white p-2 shadow-2xl shadow-slate-950/30 sm:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-slate-500">
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
                </svg>
                <input
                  type="search"
                  placeholder="Search ITC events, skills, or venues..."
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
              <button
                type="submit"
                className="h-12 rounded-md bg-violet-600 px-8 text-sm font-bold text-white transition hover:bg-violet-500"
              >
                Search
              </button>
            </form>
          </div>

          <div className="grid content-center gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/10 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-md"
              >
                <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br ${stat.color}`}>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {stat.icon}
                  </svg>
                </span>
                <span>
                  <strong className="block text-2xl font-black">{stat.value}</strong>
                  <span className="text-sm text-slate-200">{stat.label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="events" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              Available ITC Events
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

        <div className="mt-7 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
          {visibleEvents.map((event) => (
            <article
              key={event.title}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.10)]"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={event.image}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
                <span className={`absolute left-4 top-4 rounded-md bg-gradient-to-r ${event.color} px-3 py-1.5 text-xs font-bold text-white shadow-lg`}>
                  {event.type}
                </span>
                <span className="absolute right-4 top-4 grid h-16 w-14 place-items-center rounded-md bg-white text-center font-black leading-none text-slate-950 shadow-lg">
                  <span className="text-2xl">{event.date}</span>
                  <span className="text-xs text-slate-500">{event.month}</span>
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-xl font-black text-slate-950">{event.title}</h3>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                  View the full details, check the venue and schedule, then
                  register your seat through the student portal.
                </p>

                <div className="mt-4 grid gap-2 text-sm text-slate-500">
                  <p className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {event.date} {event.month === "JUN" ? "June" : "July"} 2024
                    <span className="ml-4 inline-flex items-center gap-2">
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

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link
                    href="/events"
                    className={`rounded-md border px-4 py-3 text-center text-sm font-bold transition hover:bg-slate-50 ${event.outline}`}
                  >
                    View Details
                  </Link>
                  <Link
                    href="/events"
                    className={`rounded-md bg-gradient-to-r px-4 py-3 text-center text-sm font-bold text-white transition hover:brightness-110 ${event.color}`}
                  >
                    Register Now
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;

            return (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`grid h-10 w-10 place-items-center rounded-md border text-sm font-black transition ${
                  currentPage === page
                    ? "border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-950/20"
                    : "border-slate-300 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                }`}
                aria-label={`Show event page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>
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
            <Link href="/register" className="hover:text-violet-700">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
