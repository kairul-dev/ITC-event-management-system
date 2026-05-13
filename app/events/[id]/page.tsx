"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  budget: number;
  max_students: number;
  fee_amount?: number | null;
  location?: string | null;
  purpose?: string | null;
  objective?: string | null;
};

type StudentProfile = {
  name: string;
  email: string;
  matrix_number: string;
  role: string;
};

export default function PublicEventDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", params.id)
        .eq("status", "approved")
        .single();

      if (!error && data) {
        setEvent(data as EventRow);

        const { count } = await supabase
          .from("event_registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", params.id);

        setRegisteredCount(count || 0);

        if (authUser) {
          const { data: profileData } = await supabase
            .from("users")
            .select("name,email,matrix_number,role")
            .eq("id", authUser.id)
            .single();

          setProfile((profileData as StudentProfile | null) || null);

          const { data: registrationData } = await supabase
            .from("event_registrations")
            .select("id")
            .eq("event_id", params.id)
            .eq("user_id", authUser.id)
            .maybeSingle();

          setIsRegistered(!!registrationData);
        }
      }

      setLoading(false);
    };

    loadEvent();
  }, [params.id]);

  const startRegister = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?role=student&next=${encodeURIComponent(`/events/${params.id}`)}`);
      return;
    }

    if (isRegistered) {
      setMessage({ text: "You are already registered for this event.", type: "error" });
      return;
    }

    if (profile?.role && profile.role !== "student") {
      setMessage({ text: "Only student accounts can register for ITC events.", type: "error" });
      return;
    }

    setShowConfirm(true);
  };

  const confirmRegister = async () => {
    if (!user || !event) return;

    setRegistering(true);
    setMessage(null);

    const isFreeEvent = !event.fee_amount || event.fee_amount === 0;
    const paymentStatus = isFreeEvent ? "paid" : "unpaid";

    const { error } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_id: event.id,
      payment_status: paymentStatus,
    });

    setRegistering(false);
    setShowConfirm(false);

    if (error) {
      setMessage({
        text:
          error.code === "23505"
            ? "You are already registered for this event."
            : error.message,
        type: "error",
      });
      return;
    }

    setIsRegistered(true);
    setRegisteredCount((count) => count + 1);
    setMessage({
      text: isFreeEvent
        ? "Registration confirmed. Your student details were used automatically."
        : "Registration confirmed. Please complete the payment step from your student portal.",
      type: "success",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center text-slate-600">
        Loading event details...
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center">
        <h1 className="text-2xl font-black text-slate-950">Event not found</h1>
        <Link href="/events" className="mt-4 inline-flex rounded-md bg-violet-600 px-5 py-3 text-sm font-bold text-white">
          Back to Events
        </Link>
      </main>
    );
  }

  const spotsLeft = Math.max(0, event.max_students - registeredCount);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-black">
            ITC FSKTM
          </Link>
          <Link href="/events" className="text-sm font-bold text-violet-700 hover:text-violet-600">
            Back to Events
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-violet-700 p-8 text-white">
            <p className="text-sm font-bold uppercase text-violet-200">
              Information Technology Club Event
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">{event.title}</h1>
          </div>

          <div className="grid gap-8 p-6 lg:grid-cols-[1fr_280px] lg:p-8">
            {message && (
              <div
                className={`lg:col-span-2 rounded-md px-4 py-3 text-sm font-bold ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-black">Purpose</h2>
                <p className="mt-2 leading-7 text-slate-600">
                  {event.purpose || "Purpose will be announced soon."}
                </p>
              </section>
              <section>
                <h2 className="text-xl font-black">Objective</h2>
                <p className="mt-2 leading-7 text-slate-600">
                  {event.objective || "Objective will be announced soon."}
                </p>
              </section>
            </div>

            <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-black">Event Info</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-bold text-slate-500">Date</dt>
                  <dd className="mt-1 text-slate-900">
                    {new Date(event.start_date).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500">Venue</dt>
                  <dd className="mt-1 text-slate-900">{event.location || "To be announced"}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500">Fee</dt>
                  <dd className="mt-1 text-slate-900">
                    {event.fee_amount && event.fee_amount > 0 ? `RM ${Number(event.fee_amount).toFixed(2)}` : "Free"}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500">Seats</dt>
                  <dd className="mt-1 text-slate-900">
                    {spotsLeft} left from {event.max_students}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={startRegister}
                disabled={spotsLeft === 0 || isRegistered}
                className="mt-6 w-full rounded-md bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRegistered
                  ? "Already Registered"
                  : spotsLeft === 0
                  ? "Event Full"
                  : user
                  ? "Register for Event"
                  : "Login to Register"}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Student details are taken from your account, so you only need to confirm.
              </p>
            </aside>
          </div>
        </div>
      </section>

      {showConfirm && event && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-5">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">
              Confirm Registration
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Please confirm that you want to register for this ITC event using
              your saved student account details.
            </p>

            <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm">
              <p className="font-bold text-slate-950">{event.title}</p>
              <div className="mt-3 space-y-1 text-slate-600">
                <p>Name: {profile?.name || user?.email || "Student"}</p>
                <p>Matrix: {profile?.matrix_number || "Saved in your profile"}</p>
                <p>Email: {profile?.email || user?.email}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={registering}
                className="rounded-md border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRegister}
                disabled={registering}
                className="rounded-md bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {registering ? "Registering..." : "Yes, Register"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
