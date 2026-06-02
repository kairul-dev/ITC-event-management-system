"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Certificate = {
  id: string;
  certificate_no: string;
  issued_at: string;
  event_id: string;
  feedbackSubmitted: boolean;
  event: {
    title: string;
    event_date: string;
  } | null;
};

type CertificateRow = {
  id: string;
  certificate_no: string;
  issued_at: string;
  event_id: string;
};

type EventRow = {
  id: string;
  title: string;
};

type FeedbackRow = {
  event_id: string;
};

export default function StudentCertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCertificates = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("certificates")
        .select("id, certificate_no, issued_at, event_id, user_id, status")
        .eq("user_id", user.id)
        .eq("status", "issued")
        .order("issued_at", { ascending: false });

      if (error) {
        console.error("Error loading certificates:", error.message, error.details);
        setCertificates([]);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setCertificates([]);
        setLoading(false);
        return;
      }

      // Fetch events separately to avoid RLS issues
      const certificateRows = (data || []) as CertificateRow[];
      const eventIds = [...new Set(certificateRows.map((certificate) => certificate.event_id))];
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, title")
        .in("id", eventIds);

      const { data: feedbackData, error: feedbackError } = await supabase
        .from("event_feedback")
        .select("event_id")
        .eq("user_id", user.id)
        .in("event_id", eventIds);

      if (eventsError) {
        console.error("Error loading events:", eventsError.message);
      }

      if (feedbackError) {
        console.error("Error loading feedback:", feedbackError.message);
      }

      const eventsMap = new Map(((eventsData || []) as EventRow[]).map((event) => [event.id, event]));
      const feedbackEventIds = new Set(((feedbackData || []) as FeedbackRow[]).map((row) => row.event_id));

      const normalized: Certificate[] = certificateRows.map((row) => {
        const eventData = eventsMap.get(row.event_id);
        return {
          id: row.id,
          certificate_no: row.certificate_no,
          issued_at: row.issued_at,
          event_id: row.event_id,
          feedbackSubmitted: feedbackEventIds.has(row.event_id),
          event: eventData
            ? {
                title: eventData.title,
                event_date: "",
              }
            : null,
        };
      });

      setCertificates(normalized);
      setLoading(false);
    };

    void loadCertificates();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Certificates</h1>
        <p className="text-sm text-gray-500">
          View certificates issued for your completed events.
        </p>
      </div>

      {certificates.length === 0 ? (
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            No certificates yet
          </h2>
          <p className="text-sm text-slate-500">
            You will see your certificates here once events have been approved
            and certificates issued.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {certificates.map((c) => (
            <article key={c.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-blue-800 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">Certificate Preview</p>
                    <h2 className="mt-2 line-clamp-2 text-xl font-black">{c.event?.title ?? "Event Certificate"}</h2>
                  </div>
                  <span className={c.feedbackSubmitted ? "ds-badge-issued bg-white text-blue-800" : "ds-badge-locked bg-amber-100 text-amber-800"}>
                    {c.feedbackSubmitted ? "Issued" : "Pending Feedback"}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Certificate No</p>
                  <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{c.certificate_no}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Issued {new Date(c.issued_at).toLocaleDateString("en-MY")}
                  </p>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button
                    onClick={() => router.push(c.feedbackSubmitted ? `/certificate/${c.id}` : `/feedback/${c.event_id}`)}
                    className={c.feedbackSubmitted ? "ds-btn-primary" : "inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700"}
                  >
                    {c.feedbackSubmitted ? "View" : "Submit Feedback"}
                  </button>
                  <button
                    onClick={() => router.push(c.feedbackSubmitted ? `/certificate/${c.id}` : `/feedback/${c.event_id}`)}
                    className="ds-btn-secondary"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => router.push(`/verify-certificate?certificateNo=${encodeURIComponent(c.certificate_no)}`)}
                    className="ds-btn-secondary"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
