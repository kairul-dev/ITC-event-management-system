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
  payment_proof_url?: string | null;
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
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);
  const [startingCheckoutId, setStartingCheckoutId] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});
  const [paymentProofs, setPaymentProofs] = useState<Record<string, string>>({});

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
        payment_proof_url,
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
    loadRegisteredEvents();
  }, []);

  useEffect(() => {
    const paymentState = searchParams.get("payment");

    if (paymentState === "success") {
      setCheckoutMessage("Payment completed. We are finalizing your payment status.");
      loadRegisteredEvents();
      return;
    }

    if (paymentState === "cancel") {
      setCheckoutMessage("Payment was cancelled. You can try again anytime.");
      return;
    }

    setCheckoutMessage(null);
  }, [searchParams]);

  const submitPayment = async (registrationId: string) => {
    const paymentReference = (paymentRefs[registrationId] || "").trim();
    const paymentProofUrl = (paymentProofs[registrationId] || "").trim();

    if (!paymentReference) {
      alert("Please enter a payment reference.");
      return;
    }

    setSavingPaymentId(registrationId);

    const { error } = await supabase
      .from("event_registrations")
      .update({
        payment_reference: paymentReference,
        payment_proof_url: paymentProofUrl || null,
        payment_status: "pending",
        payment_submitted_at: new Date().toISOString(),
        payment_note: null,
      })
      .eq("id", registrationId);

    setSavingPaymentId(null);

    if (error) {
      alert("Failed to submit payment: " + error.message);
      return;
    }

    alert("Payment submitted. Awaiting admin verification.");
    await loadRegisteredEvents();
  };

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Registered Events</h1>
        <p className="text-sm text-gray-500">
          View all events you have registered for.
        </p>
        {checkoutMessage && (
          <p className="mt-2 text-sm text-indigo-700">{checkoutMessage}</p>
        )}
      </div>

      {events.length === 0 ? (
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
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No registered events
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            You have not registered for any events yet.
          </p>
          <Link
            href="/student/events"
            className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow hover:bg-indigo-700"
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
              className="bg-white rounded-lg shadow-md p-5 border border-gray-200 hover:bg-gray-50 transition"
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
                    <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
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
                          <input
                            type="text"
                            placeholder="Payment reference (e.g. TXN12345)"
                            value={paymentRefs[event.id] ?? event.payment_reference ?? ""}
                            onChange={(e) =>
                              setPaymentRefs((prev) => ({ ...prev, [event.id]: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                          <input
                            type="url"
                            placeholder="Proof URL (optional)"
                            value={paymentProofs[event.id] ?? event.payment_proof_url ?? ""}
                            onChange={(e) =>
                              setPaymentProofs((prev) => ({ ...prev, [event.id]: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                          <button
                            onClick={() => startStripeCheckout(event.id)}
                            disabled={startingCheckoutId === event.id}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {startingCheckoutId === event.id
                              ? "Redirecting..."
                              : "Pay Now"}
                          </button>

                          <p className="text-xs text-gray-500">
                            Test card: 4242 4242 4242 4242, any future date, any CVC.
                          </p>

                          <button
                            onClick={() => submitPayment(event.id)}
                            disabled={savingPaymentId === event.id}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {savingPaymentId === event.id
                              ? "Submitting..."
                              : "Submit Payment Manually"}
                          </button>
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
                    className="px-5 py-2.5 bg-gray-200 text-gray-800 text-sm font-medium rounded-lg shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
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
