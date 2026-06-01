"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CalendarView = "month" | "week" | "list";

type CalendarEvent = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_by: string | null;
  organizerName: string;
};

type Organizer = {
  id: string;
  name: string;
};

type CalendarStats = {
  eventsThisMonth: number;
  pendingApprovals: number;
  upcomingEvents: number;
  completedEvents: number;
};

type CalendarResponse = {
  events: CalendarEvent[];
  organizers: Organizer[];
  stats: CalendarStats;
};

const STATUSES = [
  "Draft",
  "Pending Approval",
  "Pending High Council Approval",
  "Pending Club Advisor Approval",
  "Approved",
  "Published",
  "Completed",
  "Rejected",
];

const statusStyles: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-800 border-gray-200",
  "Pending Approval": "bg-yellow-100 text-yellow-900 border-yellow-200",
  "Pending High Council Approval": "bg-yellow-100 text-yellow-900 border-yellow-200",
  "Pending Club Advisor Approval": "bg-yellow-100 text-yellow-900 border-yellow-200",
  Approved: "bg-green-100 text-green-800 border-green-200",
  Published: "bg-blue-100 text-blue-800 border-blue-200",
  Completed: "bg-purple-100 text-purple-800 border-purple-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
};

const pad = (value: number) => String(value).padStart(2, "0");

const toMonthValue = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string | null) => {
  const date = parseDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const eventTouchesDay = (event: CalendarEvent, day: Date) => {
  const start = parseDate(event.start_date);
  const end = parseDate(event.end_date) || start;
  if (!start || !end) return false;
  const current = new Date(day);
  current.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return start <= current && end >= current;
};

function buildMonthDays(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function buildWeekDays(monthValue: string) {
  const today = new Date();
  const [year, month] = monthValue.split("-").map(Number);
  const anchor =
    today.getFullYear() === year && today.getMonth() === month - 1
      ? today
      : new Date(year, month - 1, 1);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function ProgramCalendarPage({
  title = "Program Planning Calendar",
}: {
  title?: string;
}) {
  const [view, setView] = useState<CalendarView>("month");
  const [month, setMonth] = useState(toMonthValue());
  const [status, setStatus] = useState("all");
  const [organizer, setOrganizer] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<CalendarResponse>({
    events: [],
    organizers: [],
    stats: {
      eventsThisMonth: 0,
      pendingApprovals: 0,
      upcomingEvents: 0,
      completedEvents: 0,
    },
  });

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Missing session. Please log in again.");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({
      month,
      status,
      organizer,
    });

    const response = await fetch(`/api/program-calendar?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Unable to load program calendar.");
    } else {
      setData(payload as CalendarResponse);
    }

    setLoading(false);
  }, [month, organizer, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCalendar();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCalendar]);

  const monthDays = useMemo(() => buildMonthDays(month), [month]);
  const weekDays = useMemo(() => buildWeekDays(month), [month]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of data.events) {
      for (const day of monthDays) {
        if (!eventTouchesDay(event, day)) continue;
        const key = toDateKey(day);
        const list = map.get(key) || [];
        list.push(event);
        map.set(key, list);
      }
    }
    return map;
  }, [data.events, monthDays]);

  const sortedEvents = useMemo(
    () =>
      [...data.events].sort((a, b) =>
        String(a.start_date || "").localeCompare(String(b.start_date || "")),
      ),
    [data.events],
  );

  const statCards = [
    ["Events This Month", data.stats.eventsThisMonth],
    ["Pending Approvals", data.stats.pendingApprovals],
    ["Upcoming Events", data.stats.upcomingEvents],
    ["Completed Events", data.stats.completedEvents],
  ];

  const renderEventPill = (event: CalendarEvent) => (
    <div
      key={event.id}
      className={`rounded-md border px-2 py-1 text-xs font-semibold ${
        statusStyles[event.status] || statusStyles.Draft
      }`}
      title={`${event.title} - ${event.organizerName}`}
    >
      <div className="truncate">{event.title}</div>
      <div className="truncate font-medium opacity-80">{event.organizerName}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">
            Review planned programs by month, week, status, and organizer.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          {(["month", "week", "list"] as CalendarView[]).map((item) => (
            <button
              key={item}
              onClick={() => setView(item)}
              className={`rounded-md px-4 py-2 text-sm font-semibold capitalize ${
                view === item ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {statCards.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-5 shadow-md">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white p-5 shadow-md">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={organizer}
            onChange={(event) => setOrganizer(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All organizers</option>
            {data.organizers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-white p-5 shadow-md">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading calendar...</div>
        ) : view === "list" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Organizer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sortedEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{event.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(event.start_date)} - {formatDate(event.end_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{event.organizerName}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[event.status] || statusStyles.Draft}`}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedEvents.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">No events found.</p>
            )}
          </div>
        ) : (
          <div className={view === "month" ? "grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200" : "grid grid-cols-1 gap-3 md:grid-cols-7"}>
            {(view === "month" ? monthDays : weekDays).map((day) => {
              const key = toDateKey(day);
              const dayEvents = eventsByDay.get(key) || [];
              const isCurrentMonth = key.startsWith(month);
              return (
                <div
                  key={key}
                  className={`min-h-32 bg-white p-3 ${view === "month" && !isCurrentMonth ? "opacity-50" : ""}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {day.toLocaleDateString("en-MY", { weekday: "short" })}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{day.getDate()}</span>
                  </div>
                  <div className="space-y-2">
                    {dayEvents.slice(0, view === "month" ? 3 : 8).map(renderEventPill)}
                    {dayEvents.length > (view === "month" ? 3 : 8) && (
                      <p className="text-xs font-semibold text-gray-500">
                        +{dayEvents.length - (view === "month" ? 3 : 8)} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((item) => (
          <span
            key={item}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[item]}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
