"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventOption = {
  id: string;
  title: string | null;
  status: string | null;
};

type RecentComment = {
  id: string;
  eventId: string;
  eventTitle: string;
  rating: number;
  comments: string | null;
  submittedAt: string;
  isAnonymous: boolean;
  studentName: string;
  studentEmail: string | null;
};

type AnalyticsResponse = {
  events: EventOption[];
  averageRating: number;
  totalResponses: number;
  ratingDistribution: Record<string, number>;
  recentComments: RecentComment[];
};

type FeedbackAnalyticsPageProps = {
  title: string;
  subtitle: string;
};

export default function FeedbackAnalyticsPage({ title, subtitle }: FeedbackAnalyticsPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [eventSearch, setEventSearch] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsResponse>({
    events: [],
    averageRating: 0,
    totalResponses: 0,
    ratingDistribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    recentComments: [],
  });

  const filteredEventsForSelect = useMemo(() => {
    const term = eventSearch.trim().toLowerCase();
    if (!term) return analytics.events;
    return analytics.events.filter((event) =>
      (event.title || "").toLowerCase().includes(term)
    );
  }, [analytics.events, eventSearch]);

  const selectedEvent = useMemo(
    () => analytics.events.find((event) => event.id === selectedEventId) || null,
    [analytics.events, selectedEventId],
  );

  const feedbackUrl = useMemo(() => {
    if (typeof window === "undefined" || !selectedEvent) return "";
    return `${window.location.origin}/feedback/${selectedEvent.id}`;
  }, [selectedEvent]);

  const qrUrl = feedbackUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(feedbackUrl)}`
    : "";

  const loadAnalytics = useCallback(async (eventId: string) => {
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

    const response = await fetch(`/api/feedback/analytics?eventId=${encodeURIComponent(eventId)}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Unable to load feedback analytics.");
    } else {
      setAnalytics(payload as AnalyticsResponse);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnalytics("all");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAnalytics]);

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    void loadAnalytics(eventId);
  };

  const distributionMax = Math.max(...Object.values(analytics.ratingDistribution), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row w-full lg:w-fit lg:shrink-0">
          <input
            type="text"
            placeholder="Search event..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-48"
          />
          <select
            value={selectedEventId}
            onChange={(event) => handleEventChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-64"
          >
            <option value="all">All Events</option>
            {filteredEventsForSelect.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title || "Untitled Event"}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">Average Rating</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">
            {analytics.averageRating.toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">Total Responses</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">{analytics.totalResponses}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-md">
          <p className="text-sm text-gray-500">Selected Scope</p>
          <p className="mt-2 text-lg font-semibold text-gray-950">
            {selectedEvent?.title || "All Events"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-lg bg-white p-6 shadow-md xl:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Rating Distribution</h2>
          <div className="mt-5 space-y-4">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = analytics.ratingDistribution[String(rating)] || 0;
              const width = `${Math.round((count / distributionMax) * 100)}%`;
              return (
                <div key={rating} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">{rating}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width }} />
                  </div>
                  <span className="text-right text-sm text-gray-600">{count}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-900">Feedback QR</h2>
          {selectedEvent && qrUrl ? (
            <div className="mt-4 space-y-4">
              <img
                src={qrUrl}
                alt={`QR code for ${selectedEvent.title || "event"} feedback`}
                className="h-44 w-44 rounded-lg border border-gray-200 bg-white p-2"
              />
              <p className="break-all text-sm text-gray-600">{feedbackUrl}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">
              Select an event to show its public feedback QR link.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900">Recent Comments</h2>
        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading feedback...</p>
        ) : analytics.recentComments.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No comments submitted yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-200">
            {analytics.recentComments.map((comment) => (
              <article key={comment.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{comment.studentName}</p>
                    <p className="text-xs text-gray-500">
                      {comment.eventTitle} - Rating {comment.rating}/5
                    </p>
                    {comment.studentEmail && (
                      <p className="text-xs text-gray-500">{comment.studentEmail}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.submittedAt).toLocaleString("en-MY")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-700">{comment.comments}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
