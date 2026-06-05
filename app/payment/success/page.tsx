"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Confirming your payment with Stripe...");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("Missing Stripe checkout session. Please open My Registrations and refresh your payment status.");
      return;
    }

    const confirmPayment = async () => {
      try {
        const response = await fetch("/api/payments/confirm-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const payload = (await response.json()) as { error?: string };

        if (!response.ok) throw new Error(payload.error || "Unable to confirm payment.");

        setStatus("success");
        setMessage("Payment confirmed. Your registration has been updated.");
        window.setTimeout(() => {
          window.location.assign("/student/registered-events?payment=success");
        }, 1200);
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to confirm payment.");
      }
    };

    void confirmPayment();
  }, [sessionId]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 text-slate-950">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-950/10">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${status === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
          {status === "loading" ? (
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
          ) : (
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {status === "success" ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 13 4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.9 19h14.2L12 5 4.9 19Z" />
              )}
            </svg>
          )}
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight">
          {status === "success" ? "Payment Confirmed" : status === "error" ? "Payment Needs Review" : "Confirming Payment"}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/student/registered-events?payment=success" className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
            Go to My Registrations
          </Link>
          <Link href="/student/events" className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
            Browse Events
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
