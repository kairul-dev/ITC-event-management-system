"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RegisteredEvent = {
  id: string;
  registered_at: string;
  payment_status?: "unpaid" | "pending" | "paid" | "rejected";
  payment_reference?: string | null;
  payment_note?: string | null;
  events: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    fee_amount?: number;
    location?: string;
    status: string;
  };
};

type RegisteredEventRow = Omit<RegisteredEvent, "events"> & {
  events?: RegisteredEvent["events"] | RegisteredEvent["events"][] | null;
};

function RegisteredEventsContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<RegisteredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingCheckoutId, setStartingCheckoutId] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

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
    } else {
      const rows = ((data || []) as RegisteredEventRow[])
        .map((row) => ({
          ...row,
          events: Array.isArray(row.events) ? row.events[0] : row.events,
        }))
        .filter((row): row is RegisteredEvent => Boolean(row.events));

      setEvents(rows);
    }

    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadRegisteredEvents();
    });
  }, []);

  const confirmStripePayment = async (sessionId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      throw new Error("Please log in again and retry payment confirmation.");
    }

    const response = await fetch("/api/payments/confirm-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to confirm Stripe payment.");
    }
  };

  useEffect(() => {
    const paymentState = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentState === "success") {
      const finalizePayment = async () => {
        setCheckoutMessage("Payment completed. Finalizing your payment status.");

        try {
          if (sessionId) {
            await confirmStripePayment(sessionId);
          }

          await loadRegisteredEvents();
          setCheckoutMessage("Payment completed and confirmed.");
        } catch (error) {
          console.error("Stripe payment confirmation failed:", error);
          setCheckoutMessage(
            error instanceof Error ? error.message : "Unable to confirm payment right now."
          );
          await loadRegisteredEvents();
        }
      };

      void finalizePayment();
      return;
    }

    if (paymentState === "cancel") {
      queueMicrotask(() => {
        setCheckoutMessage("Payment was cancelled. You can try again anytime.");
      });
      return;
    }

    queueMicrotask(() => {
      setCheckoutMessage(null);
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

  const paymentBadgeClass = (status?: string) => {
    if (status === "paid") return "bg-green-100 text-green-800";
    if (status === "pending") return "bg-amber-100 text-amber-800";
    if (status === "rejected") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
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
      {/* Header */}
      <div className="ds-page-header">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Payment and Registration</p>
        <h1 className="ds-page-title mt-2">My Registered Events</h1>
        <p className="ds-page-subtitle">
          View all events you have registered for.
        </p>
        {checkoutMessage && (
          <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{checkoutMessage}</p>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
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
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No registered events
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            You have not registered for any events yet.
          </p>
          <Link
            href="/student/events"
            className="ds-btn-primary"
          >
            Browse Available Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.filter((event) => event.events).map((event) => {
            const isPaid = event.payment_status === "paid";

            return (
            <div
              key={event.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {event.events.title}
                  </h3>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Start Date:</span>{" "}
                      {new Date(event.events.start_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">End Date:</span>{" "}
                      {new Date(event.events.end_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Location:</span>{" "}
                      {event.events.location || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Status:</span>{" "}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        event.events.status === "Closed"
                          ? "bg-green-100 text-green-800"
                          : event.events.status === "Published"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {event.events.status === "Closed" ? "Closed" : event.events.status === "Published" ? "Published" : event.events.status}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      <span className="font-medium">Registered on:</span>{" "}
                      {new Date(event.registered_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      at {new Date(event.registered_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Amount to Pay:</span>{" "}
                        RM {Number(event.events.fee_amount || 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Payment Status:</span>{" "}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${paymentBadgeClass(event.payment_status || "unpaid")}`}>
                          {event.payment_status || "unpaid"}
                        </span>
                      </p>

                      {event.payment_note && (
                        <p className="text-xs text-red-700">Note: {event.payment_note}</p>
                      )}

                      {isPaid && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Payment Reference:</span>{" "}
                          {event.payment_reference || "-"}
                        </p>
                      )}

                      {!isPaid && (
                        <>
                          <button
                            onClick={() => startStripeCheckout(event.id)}
                            disabled={startingCheckoutId === event.id}
                            className="inline-flex w-fit items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-800 disabled:opacity-50"
                          >
                            {startingCheckoutId === event.id
                              ? "Redirecting..."
                              : "Pay by Card"}
                          </button>

                          <p className="text-xs text-gray-500">
                            Card payment is handled securely through Stripe Checkout.
                          </p>
                        </>
                      )}

                      {isPaid && (
                        <span className="inline-flex w-fit items-center px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-semibold">
                          Already Paid
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 md:ml-6">
                  <Link
                    href={`/student/events/${event.events.id}`}
                    className="ds-btn-secondary"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RegisteredEventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      }
    >
      <RegisteredEventsContent />
    </Suspense>
  );
}
