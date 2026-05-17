"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getObjectiveText, getPurposeText } from "@/lib/eventDisplay";

type Event = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  budget: number;
  max_students: number;
  status: string;
  created_at: string;
  fee_amount?: number;
  location?: string;
  purpose?: string;
  objective?: string;
  registered_count?: number;
};

type ViewMode = "grid" | "list" | "calendar";

export default function StudentEventsPage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"upcoming" | "trending" | "newest">("trending");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterPriceRange, setFilterPriceRange] = useState<"all" | "free" | "paid">("all");
  const [locations, setLocations] = useState<string[]>([]);
  const [now] = useState(() => Date.now());
  const formatYearMonth = (d: Date) => `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;

  const getRegistrationDeadline = (event: Event) => new Date(event.start_date);
  const getStudentStatus = (event: Event) => {
    const isFull = (event.registered_count || 0) >= event.max_students;
    const isClosed = event.status === "Closed" || getRegistrationDeadline(event).getTime() <= now;
    if (isFull) return "Full";
    if (isClosed) return "Closed";
    return "Open";
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(
    formatYearMonth(new Date())
  );

  const loadEvents = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "Published")
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Error loading events:", error);
      setAllEvents([]);
      setFilteredEvents([]);
    } else {
      const events = (data || []) as Event[];

      // Get registration count for each event
      const eventsWithCounts = await Promise.all(
        events.map(async (event) => {
          const { count } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          return { ...event, registered_count: count || 0 };
        })
      );

      setAllEvents(eventsWithCounts);

      // Extract unique locations
      const uniqueLocations = Array.from(
        new Set(eventsWithCounts.map((e) => e.location).filter(Boolean))
      ) as string[];
      setLocations(uniqueLocations);
    }

    setLoading(false);
  };

  const filterAndSortEvents = () => {
    let filtered = allEvents;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          getPurposeText(event.purpose).toLowerCase().includes(query) ||
          getObjectiveText(event.purpose, event.objective).toLowerCase().includes(query)
      );
    }

    // Location filter
    if (filterLocation) {
      filtered = filtered.filter((event) => event.location === filterLocation);
    }

    // Price filter
    if (filterPriceRange === "free") {
      filtered = filtered.filter((event) => !event.fee_amount || event.fee_amount === 0);
    } else if (filterPriceRange === "paid") {
      filtered = filtered.filter((event) => event.fee_amount && event.fee_amount > 0);
    }

    // Sort
    if (sortBy === "trending") {
      filtered.sort((a, b) => (b.registered_count || 0) - (a.registered_count || 0));
    } else if (sortBy === "upcoming") {
      filtered.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    } else if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredEvents(filtered);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      filterAndSortEvents();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [allEvents, searchQuery, sortBy, filterLocation, filterPriceRange]);

  const registerEvent = async (eventId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setToast({ message: "Please login first", type: "error" });
      return;
    }

    setRegisteringId(eventId);

    // Get event to check if it's free
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("fee_amount, max_students, start_date, status")
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      setRegisteringId(null);
      setToast({ message: "Event not found", type: "error" });
      return;
    }

    if (eventData.status !== "Published") {
      setRegisteringId(null);
      setToast({ message: "This event is not open for registration.", type: "error" });
      return;
    }

    if (new Date(eventData.start_date).getTime() <= new Date().getTime()) {
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
      setToast({ message: "You already registered for this event", type: "error" });
      return;
    }

    // Determine payment status: free events are automatically "paid"
    const isFreeEvent = !eventData.fee_amount || eventData.fee_amount === 0;
    const paymentStatus = isFreeEvent ? "paid" : "unpaid";

    const { error } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_id: eventId,
      payment_status: paymentStatus,
    });

    setRegisteringId(null);

    if (error) {
      if (error.code === "23505") {
        setToast({ message: "You already registered for this event", type: "error" });
      } else {
        setToast({ message: error.message, type: "error" });
      }
    } else {
      const message = isFreeEvent
        ? "✓ Registered successfully! No payment needed."
        : "Registration started. Please proceed to payment.";
      setToast({ message, type: "success" });
      loadEvents();
    }
  };

  const getEventTrend = (registered: number) => {
    if (registered >= 20) return "🔥 Trending";
    if (registered >= 10) return "📈 Popular";
    return "";
  };

  const renderCalendarView = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const eventsByDate = new Map<string, Event[]>();
    filteredEvents.forEach((event) => {
      const date = new Date(event.start_date).toISOString().substring(0, 10);
      if (!eventsByDate.has(date)) {
        eventsByDate.set(date, []);
      }
      eventsByDate.get(date)!.push(event);
    });

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {new Date(year, month - 1).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                  const [y, m] = selectedMonth.split("-").map(Number);
                  const newDate = new Date(y, m - 2, 1);
                  setSelectedMonth(formatYearMonth(newDate));
                }}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              ← Prev
            </button>
            <button
              onClick={() => {
                  const [y, m] = selectedMonth.split("-").map(Number);
                  const newDate = new Date(y, m, 1);
                  setSelectedMonth(formatYearMonth(newDate));
                }}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-gray-700 mb-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dateStr = day
              ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              : "";
            const dayEvents = dateStr ? eventsByDate.get(dateStr) || [] : [];

            return (
              <div
                key={index}
                className={`min-h-24 p-2 rounded-lg border-2 ${
                  day ? "bg-gray-50 border-gray-200" : "bg-gray-100 border-transparent"
                }`}
              >
                {day && (
                  <>
                    <p className="font-semibold text-gray-900 mb-1">{day}</p>
                    {dayEvents.length > 0 && (
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <Link
                            key={event.id}
                            href={`/student/events/${event.id}`}
                            className="block text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded truncate hover:bg-indigo-200"
                          >
                            {event.title}
                          </Link>
                        ))}
                        {dayEvents.length > 2 && (
                          <p className="text-xs text-gray-600">+{dayEvents.length - 2} more</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Discover Events</h1>
        <p className="text-gray-600 mt-2">
          Browse and register for upcoming events. Found {filteredEvents.length} event
          {filteredEvents.length !== 1 ? "s" : ""}
          {searchQuery || filterLocation || filterPriceRange !== "all" ? " matching your filters" : ""}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search events by title, purpose, or objective..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "upcoming" | "trending" | "newest")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="trending">🔥 Most Popular</option>
              <option value="upcoming">📅 Upcoming First</option>
              <option value="newest">✨ Newest First</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Price Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <select
              value={filterPriceRange}
              onChange={(e) => setFilterPriceRange(e.target.value as "all" | "free" | "paid")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Prices</option>
              <option value="free">💰 Free</option>
              <option value="paid">💵 Paid</option>
            </select>
          </div>

          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                  viewMode === "grid"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📋 Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                  viewMode === "list"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📝 List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                  viewMode === "calendar"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📅 Calendar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* No Results */}
      {filteredEvents.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No events found</h2>
          <p className="text-gray-500 text-sm">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && filteredEvents.length > 0 && renderCalendarView()}

      {/* Grid View */}
      {viewMode === "grid" && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const spotsRemaining = Math.max(0, event.max_students - (event.registered_count || 0));
            const isEventFull = spotsRemaining === 0;
            const eventTrend = getEventTrend(event.registered_count || 0);
            const studentStatus = getStudentStatus(event);
            const isRegistrationClosed = studentStatus !== "Open";
            const purposeText = getPurposeText(event.purpose);

            return (
              <Link
                key={event.id}
                href={`/student/events/${event.id}`}
                className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition transform hover:scale-105"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-4 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold flex-1 group-hover:underline">
                      {event.title}
                    </h3>
                    {eventTrend && (
                      <span className="text-xs font-bold bg-white bg-opacity-20 px-2 py-1 rounded-full whitespace-nowrap">
                        {eventTrend}
                      </span>
                    )}
                  </div>
                  {event.location && (
                    <p className="text-sm text-indigo-100">📍 {event.location}</p>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {purposeText && (
                    <p className="text-sm text-gray-600 line-clamp-2">{purposeText}</p>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>📅</span>
                    <span>
                      {new Date(event.start_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Capacity */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Capacity</span>
                      <span className="font-semibold">
                        {event.registered_count || 0} / {event.max_students}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          isEventFull
                            ? "bg-red-500"
                            : spotsRemaining < 5
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            ((event.registered_count || 0) / event.max_students) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600">
                      {isEventFull ? "Event is full" : `${spotsRemaining} spot${spotsRemaining !== 1 ? "s" : ""} left`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <span>Deadline: {getRegistrationDeadline(event).toLocaleDateString()}</span>
                    <span className="text-right font-bold">Status: {studentStatus}</span>
                  </div>

                  {/* Fee */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    {!event.fee_amount || event.fee_amount === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        ✓ FREE
                      </span>
                    ) : (
                      <span className="font-semibold text-indigo-600">
                        RM {Number(event.fee_amount).toFixed(2)}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        registerEvent(event.id);
                      }}
                      disabled={registeringId === event.id || isRegistrationClosed}
                      className="px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {registeringId === event.id ? "..." : isRegistrationClosed ? studentStatus : "Register"}
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && filteredEvents.length > 0 && (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const spotsRemaining = Math.max(0, event.max_students - (event.registered_count || 0));
            const isEventFull = spotsRemaining === 0;
            const eventTrend = getEventTrend(event.registered_count || 0);
            const studentStatus = getStudentStatus(event);
            const isRegistrationClosed = studentStatus !== "Open";
            const purposeText = getPurposeText(event.purpose);

            return (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row md:items-center md:justify-between border border-gray-200 hover:shadow-lg transition"
              >
                <Link href={`/student/events/${event.id}`} className="flex-1 hover:text-indigo-600">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {event.title}
                        </h3>
                        {eventTrend && (
                          <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                            {eventTrend}
                          </span>
                        )}
                      </div>
                      {purposeText && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                          {purposeText}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>📅 {new Date(event.start_date).toLocaleDateString()}</span>
                        {event.location && <span>📍 {event.location}</span>}
                        <span>Deadline: {getRegistrationDeadline(event).toLocaleDateString()}</span>
                        <span>Status: {studentStatus}</span>
                        {!event.fee_amount || event.fee_amount === 0 ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                            ✓ FREE
                          </span>
                        ) : (
                          <span>💰 RM {Number(event.fee_amount).toFixed(2)}</span>
                        )}
                      </div>

                      {/* Capacity Bar */}
                      <div className="mt-2 w-full md:w-80">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">
                            {event.registered_count || 0} / {event.max_students} registered
                          </span>
                          <span className="text-xs font-semibold text-gray-600">
                            {isEventFull ? "Full" : `${spotsRemaining} left`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              isEventFull
                                ? "bg-red-500"
                                : spotsRemaining < 5
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                ((event.registered_count || 0) / event.max_students) * 100,
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="mt-4 md:mt-0 md:ml-6 flex items-center gap-2">
                  <Link
                    href={`/student/events/${event.id}`}
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-300 transition"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => registerEvent(event.id)}
                    disabled={registeringId === event.id || isRegistrationClosed}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {registeringId === event.id ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Registering...
                      </>
                    ) : isRegistrationClosed ? (
                      studentStatus
                    ) : (
                      "Register"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
