"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventInfo = {
  id: string;
  title: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
};

type FeedbackInfo = {
  id: string;
  rating: number;
  comments?: string | null;
  is_anonymous: boolean;
  submitted_at: string;
};

type RegistrationInfo = {
  id: string;
  payment_status?: string | null;
};

type CertificateInfo = {
  id: string;
  certificate_no: string;
  status: string;
};

type FeedbackEventResponse = {
  event: EventInfo;
  feedbackOpen: boolean;
  feedback: FeedbackInfo | null;
  registration: RegistrationInfo | null;
  certificate: CertificateInfo | null;
};

export default function EventFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params.eventId || "");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<FeedbackEventResponse | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const feedbackUrl = useMemo(() => {
    if (typeof window === "undefined" || !eventId) return "";
    return `${window.location.origin}/feedback/${eventId}`;
  }, [eventId]);

  const loadFeedbackDetails = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    setIsSignedIn(Boolean(session));

    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`/api/feedback/event/${eventId}`, { headers });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Unable to load feedback form.");
      setDetails(null);
    } else {
      setDetails(payload as FeedbackEventResponse);
      if (payload.feedback?.rating) setRating(payload.feedback.rating);
      if (payload.feedback?.comments) setComments(payload.feedback.comments);
      if (typeof payload.feedback?.is_anonymous === "boolean") {
        setIsAnonymous(payload.feedback.is_anonymous);
      }
    }

    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;

    const timeoutId = window.setTimeout(() => {
      void loadFeedbackDetails();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [eventId, loadFeedbackDetails]);

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      router.push(`/login?role=student&next=${encodeURIComponent(`/feedback/${eventId}`)}`);
      return;
    }

    const response = await fetch("/api/feedback/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        eventId,
        rating,
        comments,
        isAnonymous,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Unable to submit feedback.");
      setSubmitting(false);
      return;
    }

    await loadFeedbackDetails();
    setSubmitting(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="h-12 w-12 rounded-full border-b-2 border-indigo-600 animate-spin" />
      </main>
    );
  }

  const event = details?.event;
  const hasFeedback = Boolean(details?.feedback);
  const canSubmit = Boolean(isSignedIn && details?.registration && details.feedbackOpen && !hasFeedback);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                Event Feedback
              </p>
              <h1 className="mt-2 text-2xl font-bold text-gray-950">
                {event?.title || "Feedback"}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Certificate access is available immediately after feedback is submitted.
              </p>
              {event?.location && (
                <p className="mt-2 text-sm text-gray-500">Location: {event.location}</p>
              )}
            </div>
            <span className="self-start rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
              {event?.status || "Unknown"}
            </span>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isSignedIn && (
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">Student login required</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in with your student account to submit feedback and unlock your certificate.
            </p>
            <button
              onClick={() => router.push(`/login?role=student&next=${encodeURIComponent(`/feedback/${eventId}`)}`)}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Login as Student
            </button>
          </section>
        )}

        {isSignedIn && !details?.registration && (
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">Registration not found</h2>
            <p className="mt-2 text-sm text-gray-600">
              Feedback is only available to students registered for this event.
            </p>
          </section>
        )}

        {isSignedIn && details?.registration && !details.feedbackOpen && (
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">Feedback not open yet</h2>
            <p className="mt-2 text-sm text-gray-600">
              Feedback opens after the event status becomes Completed or Closed.
            </p>
          </section>
        )}

        {hasFeedback && (
          <section className="bg-white rounded-lg shadow-md p-6">
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
              Feedback Submitted
            </span>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Certificate unlocked</h2>
            <p className="mt-2 text-sm text-gray-600">
              Thank you. Your certificate is now available for viewing and download.
            </p>
            {details?.certificate ? (
              <button
                onClick={() => router.push(`/certificate/${details.certificate?.id}`)}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                View Certificate
              </button>
            ) : (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                Feedback is complete. Your certificate will appear once it is issued.
              </p>
            )}
          </section>
        )}

        {canSubmit && (
          <form onSubmit={submitFeedback} className="bg-white rounded-lg shadow-md p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Submit feedback</h2>
              <p className="mt-1 text-sm text-gray-600">
                Your certificate remains in Pending Feedback until this form is submitted.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rating</label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      rating === value
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                Comments
              </label>
              <textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Share what worked well or what can be improved."
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Submit anonymously to committee analytics
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Feedback and Unlock Certificate"}
            </button>
          </form>
        )}

        {feedbackUrl && (
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">Feedback QR Link</h2>
            <p className="mt-2 break-all text-sm text-gray-600">{feedbackUrl}</p>
          </section>
        )}
      </div>
    </main>
  );
}
