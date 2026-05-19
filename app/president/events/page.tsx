"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

type Event = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  budget: number;
  max_students: number;
  status: string;
  created_at: string;
  location?: string;
  purpose?: string;
  objective?: string;
};

export default function PresidentEventsPage() {
  const pathname = usePathname();
  const isHighCouncil = pathname.startsWith("/high-council");
  const reviewConfig = {
    queueStatus: isHighCouncil ? "Pending High Council Approval" : "Pending Club Advisor Approval",
    approveStatus: isHighCouncil ? "Pending Club Advisor Approval" : "Approved",
    title: isHighCouncil ? "High Council Paperwork Review" : "Club Advisor Paperwork Review",
    description: isHighCouncil
      ? "Review admin paperwork before forwarding it to the club advisor."
      : "Give final paperwork approval after high council review.",
    countLabel: isHighCouncil ? "Pending High Council Approval" : "Pending Club Advisor Approval",
    emptyTitle: isHighCouncil ? "No Paperwork Awaiting High Council" : "No Paperwork Awaiting Club Advisor",
    emptyDescription: isHighCouncil
      ? "All submitted paperwork has been reviewed by the high council."
      : "No high council approved paperwork is waiting for final approval.",
    queueBadge: isHighCouncil ? "High Council Review" : "Club Advisor Review",
    approveLabel: isHighCouncil ? "Send to Club Advisor" : "Approve Paperwork",
    rejectLabel: "Reject Paperwork",
  };
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", reviewConfig.queueStatus)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading events:", error);
        alert("Error loading events: " + error.message);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [reviewConfig.queueStatus]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId(null);
      setRejectReason("");
      return;
    }

    const exists = events.some((event) => event.id === selectedEventId);
    if (!selectedEventId || !exists) {
      setSelectedEventId(events[0].id);
      setRejectReason("");
    }
  }, [events, selectedEventId]);

  const updateStatus = async (
    id: string,
    status: "Approved" | "Pending Club Advisor Approval" | "Rejected",
    rejectionReason?: string,
  ) => {
    if (status === "Rejected") {
      const reason = (rejectionReason ?? "").trim();
      if (!reason) {
        alert("Rejection reason is required");
        return;
      }

      setProcessingId(id);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          alert("Please log in again to review paperwork.");
          setProcessingId(null);
          return;
        }

        const response = await fetch("/api/events/review-paperwork", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            eventId: id,
            nextStatus: status,
            rejectionReason: reason,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          alert("Error: " + (payload.error || "Unable to reject paperwork."));
          setProcessingId(null);
          return;
        }

        setEvents((prev) => prev.filter((e) => e.id !== id));
        setRejectReason("");
        setProcessingId(null);
      } catch (error) {
        console.error("Error updating status:", error);
        setProcessingId(null);
      }
      return;
    }

    setProcessingId(id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Please log in again to review paperwork.");
        setProcessingId(null);
        return;
      }

      const response = await fetch("/api/events/review-paperwork", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          eventId: id,
          nextStatus: status,
          rejectionReason: null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        alert("Error: " + (payload.error || "Unable to approve paperwork."));
        setProcessingId(null);
        return;
      }

      setEvents((prev) => prev.filter((e) => e.id !== id));
      setRejectReason("");
      setProcessingId(null);
    } catch (error) {
      console.error("Error updating status:", error);
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{reviewConfig.title}</h1>
        <p className="text-sm text-slate-600">{reviewConfig.description}</p>
      </div>

      <div className="ds-card p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{reviewConfig.countLabel}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{events.length}</p>
        </div>
        <span className="ds-badge-pending">Queue Open</span>
      </div>

      {events.length === 0 ? (
        <div className="ds-card p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">{reviewConfig.emptyTitle}</h3>
          <p className="text-slate-500">{reviewConfig.emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <aside className="xl:col-span-4 ds-card p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">{reviewConfig.countLabel}</h2>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {events.map((event) => {
                const isActive = selectedEventId === event.id;
                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setRejectReason("");
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className={`font-semibold ${isActive ? "text-white" : "text-slate-900"}`}>{event.title}</p>
                    <p className={`text-xs mt-1 ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                      {new Date(event.start_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {" - "}
                      {new Date(event.end_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <span className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActive ? "bg-slate-100 text-slate-900" : "bg-amber-100 text-amber-800"}`}>
                      {reviewConfig.queueBadge}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="xl:col-span-8 ds-card p-6 flex flex-col min-h-[70vh]">
            {!selectedEvent ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">Select an event to review.</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">{selectedEvent.title}</h2>
                    <p className="text-sm text-slate-600 mt-1">Submitted on {new Date(selectedEvent.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="ds-badge-pending">{reviewConfig.queueBadge}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-500 text-xs font-semibold uppercase">Start Date</p>
                    <p className="text-slate-900 mt-1">{new Date(selectedEvent.start_date).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-500 text-xs font-semibold uppercase">End Date</p>
                    <p className="text-slate-900 mt-1">{new Date(selectedEvent.end_date).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-500 text-xs font-semibold uppercase">Budget</p>
                    <p className="text-slate-900 mt-1">
                      {typeof selectedEvent.budget === "number" ? `RM ${selectedEvent.budget.toLocaleString()}` : "-"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-500 text-xs font-semibold uppercase">Max Students</p>
                    <p className="text-slate-900 mt-1">{selectedEvent.max_students || "-"}</p>
                  </div>
                  <div className="md:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-500 text-xs font-semibold uppercase">Location</p>
                    <p className="text-slate-900 mt-1">{selectedEvent.location || "-"}</p>
                  </div>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-1">Purpose</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-6">{selectedEvent.purpose || "-"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-1">Objective</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-6">{selectedEvent.objective || "-"}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 sticky bottom-0 bg-white">
                  <label className="ds-label">Rejection Reason (required to reject)</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="State why this submission does not meet approval criteria..."
                    className="ds-textarea"
                  />
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end mt-3">
                    <button
                      onClick={() => updateStatus(selectedEvent.id, "Rejected", rejectReason)}
                      disabled={processingId === selectedEvent.id}
                      className="px-5 py-2.5 rounded-xl text-white font-semibold bg-rose-700 hover:bg-rose-800 disabled:opacity-50"
                    >
                      {processingId === selectedEvent.id ? "Processing..." : reviewConfig.rejectLabel}
                    </button>
                    <button
                      onClick={() =>
                        updateStatus(
                          selectedEvent.id,
                          reviewConfig.approveStatus as "Approved" | "Pending Club Advisor Approval",
                        )
                      }
                      disabled={processingId === selectedEvent.id}
                      className="ds-btn-primary"
                    >
                      {processingId === selectedEvent.id ? "Processing..." : reviewConfig.approveLabel}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
