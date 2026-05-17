"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { getObjectiveText, getPurposeText } from "@/lib/eventDisplay";

type Event = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  budget: number;
  fee_amount?: number;
  max_students: number;
  status: string;
  created_at: string;
  location?: string;
  purpose?: string;
  objective?: string;
  description?: string;
};

type EventStats = {
  registered_count: number;
  is_registered: boolean;
};

export default function EventDetailsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats>({ registered_count: 0, is_registered: false });
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [now] = useState(() => Date.now());
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  useEffect(() => {
    loadEventDetails();
  }, [id]);

  const loadEventDetails = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .eq("status", "Published")
        .single();

      if (error) {
        console.error("Error fetching event:", error);
        setEvent(null);
      } else {
        setEvent(data);

        // Get registration count
        const { count } = await supabase
          .from("event_registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", id as string);

        // Check if user is already registered
        let isRegistered = false;
        if (authUser) {
          const { data: registration } = await supabase
            .from("event_registrations")
            .select("id")
            .eq("event_id", id as string)
            .eq("user_id", authUser.id)
            .single();

          isRegistered = !!registration;
        }

        setStats({
          registered_count: count || 0,
          is_registered: isRegistered,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const registerEvent = async () => {
    if (!user) {
      setToast({ message: "Please login to register", type: "error" });
      return;
    }

    if (stats.is_registered) {
      setToast({ message: "You are already registered for this event", type: "error" });
      return;
    }

    if (!event || event.status !== "Published") {
      setToast({ message: "This event is not open for registration", type: "error" });
      return;
    }

    if (event.max_students <= stats.registered_count) {
      setToast({ message: "This event is full", type: "error" });
      return;
    }

    if (new Date(event.start_date).getTime() <= new Date().getTime()) {
      setToast({ message: "Registration deadline has passed", type: "error" });
      return;
    }

    setRegistering(true);

    try {
      // Determine payment status: free events are automatically "paid"
      const isFreeEvent = !event?.fee_amount || event?.fee_amount === 0;
      const paymentStatus = isFreeEvent ? "paid" : "unpaid";

      const { error } = await supabase.from("event_registrations").insert({
        user_id: user.id,
        event_id: id as string,
        payment_status: paymentStatus,
      });

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
        await loadEventDetails();
      }
    } finally {
      setRegistering(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-6">
        <Link href="/student/events" className="text-indigo-600 hover:text-indigo-700">
          ← Back to Events
        </Link>
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Event not found</h2>
          <p className="text-gray-500 text-sm mt-2">
            The event you&apos;re looking for doesn&apos;t exist or is not available.
          </p>
        </div>
      </div>
    );
  }

  const spotsRemaining = Math.max(0, event.max_students - stats.registered_count);
  const capacityPercentage = (stats.registered_count / event.max_students) * 100;
  const isDeadlinePassed = new Date(event.start_date).getTime() <= now;
  const eventStatus = spotsRemaining === 0 ? "Full" : isDeadlinePassed ? "Closed" : "Open";
  const purposeText = getPurposeText(event.purpose);
  const objectiveText = getObjectiveText(event.purpose, event.objective);

  return (
    <div className="space-y-6">
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
      {/* Back Button */}
      <Link href="/student/events" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
        ← Back to Events
      </Link>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header with Status */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{event.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  eventStatus !== "Open"
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                }`}>
                  {eventStatus}
                </span>
              </div>
              {purposeText && (
                <p className="text-indigo-100 mt-2">{purposeText}</p>
              )}
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Key Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="text-base font-medium text-gray-900">
                      {event.location || "TBA"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registration Deadline</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(event.start_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Event Fee</p>
                    <p className="text-base font-medium text-gray-900">
                      RM {Number(event.fee_amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(event.start_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(event.end_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Objective */}
              {objectiveText && (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Objektif</h3>
                  <p className="text-gray-700">{objectiveText}</p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Capacity Status */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Availability</h2>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Capacity</span>
                    <span className="text-sm font-bold text-gray-900">
                      {stats.registered_count} / {event.max_students}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        capacityPercentage >= 90
                          ? "bg-red-500"
                          : capacityPercentage >= 70
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-indigo-600">{spotsRemaining} spots</span> remaining
                  </p>
                  {spotsRemaining < 10 && spotsRemaining > 0 && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ⚠️ Spots filling up quickly!
                    </p>
                  )}
                  {spotsRemaining === 0 && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ✕ Event is full
                    </p>
                  )}
                </div>
              </div>

              {/* Registration Button */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 sticky top-20">
                {stats.is_registered ? (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-green-700">Registered!</p>
                    <p className="text-sm text-gray-600 mt-2">
                      You are registered for this event.
                    </p>
                    <Link
                      href="/student/registered-events"
                      className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      View your registrations →
                    </Link>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={registerEvent}
                      disabled={
                        registering ||
                        spotsRemaining === 0 ||
                        eventStatus === "Closed"
                      }
                      className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {registering ? (
                        <span className="flex items-center justify-center gap-2">
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
                        </span>
                      ) : spotsRemaining === 0 ? (
                        "Event is Full"
                      ) : eventStatus === "Closed" ? (
                        "Registration Closed"
                      ) : (
                        "Register Now"
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      {(!event.fee_amount || event.fee_amount === 0)
                        ? "This is a free event. No payment needed."
                        : "By registering, you agree to pay the event fee to complete your registration."}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About This Event</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
