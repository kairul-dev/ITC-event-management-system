"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getPaperworkFile, stripPaperworkFileMarker, formatFileSize } from "@/lib/paperworkFile";
import { stripEventPosterMarker } from "@/lib/eventPoster";

type EventRow = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  max_students?: number | null;
  status?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  purpose?: string | null;
  objective?: string | null;
  rejection_reason?: string | null;
};

type HistoryRow = {
  id: string;
  action?: string | null;
  actor_role?: string | null;
  comments?: string | null;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
}

function eventCode(event: EventRow) {
  const year = event.created_at ? new Date(event.created_at).getFullYear() : "0000";
  return `EVT-${year}-${event.id.slice(0, 6).toUpperCase()}`;
}

function normalizeStatus(status?: string | null) {
  if (!status) return "Draft";
  if (status === "Pending Approval" || status === "Pending High Council Approval") return "Pending High Council";
  if (status === "Pending Club Advisor Approval") return "Pending Club Advisor";
  return status;
}

function badgeClass(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (normalized === "Rejected") return "bg-red-100 text-red-700 ring-red-200";
  if (normalized === "Approved") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (normalized === "Published") return "bg-blue-100 text-blue-700 ring-blue-200";
  if (normalized.startsWith("Pending")) return "bg-amber-100 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}

function EventDetailSkeleton() {
  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <SkeletonBlock className="h-5 w-36" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-9 w-72 max-w-full" />
          <SkeletonBlock className="h-4 w-56 max-w-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-10 w-28" />
          <SkeletonBlock className="h-10 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <section key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-4 h-6 w-28" />
            <SkeletonBlock className="mt-3 h-3 w-20" />
          </section>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3 border-b border-slate-200 pb-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-5 w-24" />
            ))}
          </div>
          <div className="mt-6 space-y-4">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
        </section>
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <SkeletonBlock className="h-5 w-36" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <SkeletonBlock className="h-3 w-3 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-40" />
                    <SkeletonBlock className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="mt-5 h-16 w-full" />
          </section>
        </aside>
      </div>
    </motion.div>
  );
}

export default function ClubCommitteeEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [registrations, setRegistrations] = useState(0);
  const [certificates, setCertificates] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = user?.id
        ? await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
        : { data: null };

      let query = supabase.from("events").select("*").eq("id", eventId);
      if (user?.id && profile?.role !== "admin") query = query.eq("created_by", user.id);

      const { data } = await query.maybeSingle();
      const selected = data as EventRow | null;
      setEvent(selected);

      if (selected) {
        const [historyResult, registrationResult, certificateResult] = await Promise.all([
          supabase
            .from("approval_history")
            .select("id,action,actor_role,comments,created_at")
            .eq("entity_type", "event")
            .eq("entity_id", selected.id)
            .order("created_at", { ascending: false }),
          supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", selected.id),
          supabase.from("certificates").select("id", { count: "exact", head: true }).eq("event_id", selected.id),
        ]);
        setHistory((historyResult.data || []) as HistoryRow[]);
        setRegistrations(registrationResult.count || 0);
        setCertificates(certificateResult.count || 0);
      }
      setLoading(false);
    };

    void loadDetail();
  }, [eventId]);

  const paperworkFile = getPaperworkFile(event?.objective);
  const objectiveText = stripPaperworkFileMarker(stripEventPosterMarker(event?.objective));
  const tabs = ["Overview", "Paperwork", "Timeline", "Participants", "Certificates", "Activity Log"];
  const progress = useMemo(
    () => [
      ["Draft Created", event ? "Completed" : "Pending"],
      ["Submitted to High Council", event?.status === "Draft" ? "Pending" : "Completed"],
      ["Reviewed by High Council", history.find((item) => item.actor_role === "high_council") ? "Completed" : "Pending"],
      ["Reviewed by Club Advisor", history.find((item) => item.actor_role === "club_advisor") ? "Completed" : "Pending"],
      ["Published", event?.status === "Published" ? "Completed" : "Pending"],
      ["Certificate Draft Generated", certificates > 0 ? "Completed" : "Pending"],
    ],
    [certificates, event, history],
  );

  if (loading) return <EventDetailSkeleton />;

  if (!event) {
    return (
      <motion.div
        className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <h1 className="text-xl font-black text-slate-950">Event not found</h1>
        <p className="mt-2 text-sm text-slate-500">The event is not available or you do not have access to it.</p>
        <Link href="/committee/event?mode=events" className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-black text-white">Back to Event Details</Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <Link href="/committee/event?mode=events" className="inline-flex text-sm font-black text-blue-700 hover:text-blue-800">
        Back to Event List
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{event.title}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${badgeClass(event.status)}`}>{normalizeStatus(event.status)}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {eventCode(event)} | Created {formatDate(event.created_at)}, {formatTime(event.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(normalizeStatus(event.status) === "Draft" || normalizeStatus(event.status) === "Rejected") && (
            <Link href="/committee/event?mode=paperwork" className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">Edit Event</Link>
          )}
          <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Download PDF</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Event Date", formatDate(event.start_date), `${formatTime(event.start_date)} - ${formatTime(event.end_date)}`],
          ["Venue", event.location || "Not provided", "Room/block not provided"],
          ["Expected Participants", String(event.max_students || 0), "Students"],
          ["Registered", String(registrations), "Participants"],
          ["Current Status", normalizeStatus(event.status), "Workflow status"],
        ].map(([label, value, detail]) => (
          <section key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3">
            {tabs.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-black ${activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="p-5">
            {activeTab === "Overview" ? (
              <div className="space-y-6">
                <section>
                  <h2 className="text-sm font-black text-slate-950">Event Description</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{event.purpose || "Not provided"}</p>
                </section>
                <section className="grid gap-6 border-t border-slate-200 pt-5 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Event Information</h3>
                    <dl className="mt-4 grid gap-3 text-sm">
                      {[
                        ["Event ID", eventCode(event)],
                        ["Organizer", "Club Committee"],
                        ["Program", "Not provided"],
                        ["Mode", event.location ? "Physical" : "Not provided"],
                        ["Language", "Not provided"],
                        ["Created Date", formatDate(event.created_at)],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[130px_1fr] gap-3">
                          <dt className="font-semibold text-slate-500">{label}</dt>
                          <dd className="font-bold text-slate-800">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Event Objectives</h3>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{objectiveText || "Not provided"}</p>
                  </div>
                </section>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                {activeTab} information will appear here when records are available.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-950">Approval Progress</h2>
            <div className="mt-4 space-y-3">
              {progress.map(([label, state]) => (
                <div key={label} className="flex gap-3">
                  <span className={`mt-1 h-3 w-3 rounded-full ${state === "Completed" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <div>
                    <p className="text-sm font-black text-slate-950">{label}</p>
                    <p className="text-xs font-semibold text-slate-500">{state}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-950">Attachments</h2>
            {paperworkFile ? (
              <div className="mt-4 rounded-md border border-slate-200 p-3">
                <p className="truncate text-sm font-black text-slate-950">{paperworkFile.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatFileSize(paperworkFile.size)}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm font-semibold text-slate-500">No paperwork attachment found.</p>
            )}
          </section>
        </aside>
      </div>
    </motion.div>
  );
}
