"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getPaperworkFile, stripPaperworkFileMarker, formatFileSize, type UploadedPaperworkFile } from "@/lib/paperworkFile";
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
  actor_id?: string | null;
  actor_role?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  comments?: string | null;
  created_at?: string | null;
  actorName?: string;
};

type RegistrationRow = {
  id: string;
  user_id?: string | null;
  registered_at?: string | null;
  payment_status?: string | null;
  status?: string | null;
  checked_in_at?: string | null;
  student?: {
    name?: string | null;
    email?: string | null;
    matrix_number?: string | null;
  } | null;
};

type CertificateRow = {
  id: string;
  user_id?: string | null;
  certificate_no?: string | null;
  status?: string | null;
  issued_at?: string | null;
  certificate_hash?: string | null;
};

type UserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
};

const tabs = ["Overview", "Paperwork", "Timeline", "Participants", "Certificates", "Activity Log"];

function formatDate(value?: string | null) {
  if (!value) return "Not Provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not Provided";
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not Provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not Provided";
  return date.toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "Not Provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not Provided";
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
  if (status === "Closed") return "Completed";
  return status;
}

function badgeClass(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (normalized === "Rejected") return "bg-red-100 text-red-700 ring-red-200";
  if (normalized === "Approved") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (normalized === "Published") return "bg-blue-100 text-blue-700 ring-blue-200";
  if (normalized === "Completed") return "bg-violet-100 text-violet-700 ring-violet-200";
  if (normalized === "Pending Club Advisor") return "bg-orange-100 text-orange-700 ring-orange-200";
  if (normalized === "Pending High Council") return "bg-amber-100 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function humanRole(role?: string | null) {
  if (!role) return "Not Provided";
  if (role === "high_council") return "High Council";
  if (role === "club_advisor") return "Club Advisor";
  if (role === "committee") return "Club Committee";
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M8 4h8l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3Z" />
          </svg>
        </div>
        <h3 className="mt-4 text-sm font-black text-slate-950">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">{text}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "emerald" | "amber" | "orange" | "violet" | "slate";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-50 text-slate-700",
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${tones[tone]}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-lg font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </div>
      </div>
    </section>
  );
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
      <SkeletonBlock className="h-5 w-80 max-w-full" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-9 w-80 max-w-full" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-10 w-28" />
          <SkeletonBlock className="h-10 w-32" />
          <SkeletonBlock className="h-10 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
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
            {Array.from({ length: 5 }).map((_, index) => (
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
            <SkeletonBlock className="mt-5 h-48 w-full" />
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
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [certificateUsers, setCertificateUsers] = useState<Record<string, UserRow>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [participantSearch, setParticipantSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");

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

      if (!selected) {
        setHistory([]);
        setRegistrations([]);
        setCertificates([]);
        setCertificateUsers({});
        setLoading(false);
        return;
      }

      const [historyResult, registrationResult, certificateResult] = await Promise.all([
        supabase
          .from("approval_history")
          .select("id,action,actor_id,actor_role,from_status,to_status,comments,created_at")
          .eq("entity_type", "event")
          .eq("entity_id", selected.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("event_registrations")
          .select("id,user_id,registered_at,payment_status,status,checked_in_at,student:users!fk_event_registrations_user(name,email,matrix_number)")
          .eq("event_id", selected.id)
          .order("registered_at", { ascending: false }),
        supabase
          .from("certificates")
          .select("id,user_id,certificate_no,status,issued_at,certificate_hash")
          .eq("event_id", selected.id)
          .order("issued_at", { ascending: false }),
      ]);

      const historyRows = (historyResult.data || []) as HistoryRow[];
      const actorIds = [...new Set(historyRows.map((item) => item.actor_id).filter(Boolean))] as string[];
      if (actorIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id,name,email").in("id", actorIds);
        const userMap = new Map(((users || []) as UserRow[]).map((item) => [item.id, item]));
        setHistory(
          historyRows.map((item) => ({
            ...item,
            actorName: item.actor_id ? userMap.get(item.actor_id)?.name || userMap.get(item.actor_id)?.email || undefined : undefined,
          })),
        );
      } else {
        setHistory(historyRows);
      }

      const registrationRows = (registrationResult.data || []) as RegistrationRow[];
      const certificateRows = (certificateResult.data || []) as CertificateRow[];
      setRegistrations(registrationRows);
      setCertificates(certificateRows);

      const certificateUserIds = [...new Set(certificateRows.map((item) => item.user_id).filter(Boolean))] as string[];
      if (certificateUserIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id,name,email").in("id", certificateUserIds);
        setCertificateUsers(
          Object.fromEntries(((users || []) as UserRow[]).map((item) => [item.id, item])),
        );
      } else {
        setCertificateUsers({});
      }

      setLoading(false);
    };

    void loadDetail();
  }, [eventId]);

  const paperworkFile = getPaperworkFile(event?.objective);
  const objectiveText = stripPaperworkFileMarker(stripEventPosterMarker(event?.objective));
  const status = normalizeStatus(event?.status);
  const attendedCount = registrations.filter((row) => row.status === "attended" || Boolean(row.checked_in_at)).length;
  const checkedInCount = registrations.filter((row) => Boolean(row.checked_in_at)).length;
  const absentCount = Math.max(registrations.length - attendedCount, 0);
  const issuedCount = certificates.filter((item) => item.status === "issued").length;
  const downloadedCount = certificates.filter((item) => item.status === "downloaded").length;
  const lastHistoryDate = history[0]?.created_at;
  const lastUpdated = lastHistoryDate || event?.created_at;

  const progressSteps = useMemo(() => {
    const highCouncilReviewed = history.some((item) => item.actor_role === "high_council");
    const advisorReviewed = history.some((item) => item.actor_role === "club_advisor");
    const isDraft = status === "Draft";
    const isPublished = status === "Published" || status === "Completed";
    const certificateDraftGenerated = certificates.length > 0;
    const rejected = status === "Rejected";

    return [
      { label: "Draft Created", state: event ? "completed" : "pending", reviewer: "Club Committee", date: event?.created_at, comments: "Event paperwork record created." },
      { label: "Submitted to High Council", state: isDraft ? "pending" : "completed", reviewer: "Club Committee", date: event?.created_at, comments: isDraft ? "Waiting for submission." : "Paperwork submitted for High Council review." },
      { label: rejected ? "High Council Review" : "Pending High Council Review", state: highCouncilReviewed ? (rejected ? "rejected" : "completed") : status === "Pending High Council" ? "current" : "pending", reviewer: history.find((item) => item.actor_role === "high_council")?.actorName || "High Council", date: history.find((item) => item.actor_role === "high_council")?.created_at, comments: history.find((item) => item.actor_role === "high_council")?.comments || "Review comments are not provided." },
      { label: "Pending Club Advisor Review", state: advisorReviewed ? "completed" : status === "Pending Club Advisor" ? "current" : "pending", reviewer: history.find((item) => item.actor_role === "club_advisor")?.actorName || "Club Advisor", date: history.find((item) => item.actor_role === "club_advisor")?.created_at, comments: history.find((item) => item.actor_role === "club_advisor")?.comments || "Final approval comments are not provided." },
      { label: "Published", state: isPublished ? "completed" : status === "Approved" ? "current" : "pending", reviewer: "Club Committee", date: isPublished ? lastUpdated : null, comments: isPublished ? "Event is available for students." : "Publication is pending approval completion." },
      { label: "Certificate Draft Generated", state: certificateDraftGenerated ? "completed" : "pending", reviewer: "Club Committee", date: certificates[0]?.issued_at, comments: certificateDraftGenerated ? "Certificate records are available." : "Certificate drafts are generated after event completion." },
    ];
  }, [certificates, event, history, lastUpdated, status]);

  const progressPercent = Math.round((progressSteps.filter((step) => step.state === "completed").length / progressSteps.length) * 100);
  const currentProgressLabel =
    progressSteps.find((step) => step.state === "current")?.label ||
    [...progressSteps].reverse().find((step) => step.state === "completed")?.label ||
    "Draft Created";

  const filteredParticipants = useMemo(() => {
    const needle = participantSearch.trim().toLowerCase();
    return registrations.filter((row) => {
      const attendance = row.status === "attended" || row.checked_in_at ? "attended" : "absent";
      if (attendanceFilter !== "all" && attendance !== attendanceFilter) return false;
      if (!needle) return true;
      return (
        (row.student?.name || "").toLowerCase().includes(needle) ||
        (row.student?.email || "").toLowerCase().includes(needle) ||
        (row.student?.matrix_number || "").toLowerCase().includes(needle)
      );
    });
  }, [attendanceFilter, participantSearch, registrations]);

  const activityItems = useMemo(() => {
    const items = [
      event
        ? {
            id: "created",
            date: event.created_at,
            title: "Event created by Club Committee",
            detail: "Initial event paperwork record was created.",
          }
        : null,
      ...history.map((item) => ({
        id: item.id,
        date: item.created_at,
        title: `${humanRole(item.actor_role)} ${item.action || "reviewed"} paperwork`,
        detail: item.comments || `Status changed from ${item.from_status || "Not Provided"} to ${item.to_status || "Not Provided"}.`,
      })),
      status === "Published" || status === "Completed"
        ? {
            id: "published",
            date: lastUpdated,
            title: "Event published",
            detail: "Event is visible in the student registration workflow.",
          }
        : null,
    ].filter(Boolean) as { id: string; date?: string | null; title: string; detail: string }[];

    return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [event, history, lastUpdated, status]);

  const exportParticipants = () => {
    const header = ["Student Name", "Matric Number", "Email", "Registration Date", "Attendance Status"];
    const rows = filteredParticipants.map((row) => [
      row.student?.name || "Not Provided",
      row.student?.matrix_number || "Not Provided",
      row.student?.email || "Not Provided",
      formatDateTime(row.registered_at),
      row.status === "attended" || row.checked_in_at ? "Attended" : "Absent",
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${event ? eventCode(event) : "event"}-participants.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPaperworkFile = async (file: UploadedPaperworkFile) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert("Please log in again to open the paperwork file.");
      return;
    }

    const response = await fetch("/api/paperwork/signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ path: file.path }),
    });

    const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

    if (!response.ok || !payload.url) {
      alert(payload.error || "Unable to open paperwork file.");
      return;
    }

    window.open(payload.url, "_blank", "noopener,noreferrer");
  };

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
        <Link href="/committee/event?mode=events" className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-black text-white">
          Back to Event Details
        </Link>
      </motion.div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-black text-slate-950">Event Description</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{event.purpose || "Not Provided"}</p>
      </section>

      <section className="grid gap-6 border-t border-slate-200 pt-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-black text-slate-950">Event Information</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            {[
              ["Event ID", eventCode(event)],
              ["Event Name", event.title],
              ["Organizer", "Club Committee"],
              ["Program", "Not Provided"],
              ["Venue", event.location || "Not Provided"],
              ["Date", `${formatDate(event.start_date)} (${formatTime(event.start_date)} - ${formatTime(event.end_date)})`],
              ["Mode", event.location ? "Physical" : "Not Provided"],
              ["Language", "Not Provided"],
              ["Created By", "Club Committee"],
              ["Created Date", formatDateTime(event.created_at)],
              ["Last Updated", formatDateTime(lastUpdated)],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3">
                <dt className="font-semibold text-slate-500">{label}</dt>
                <dd className="font-bold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-950">Additional Information</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            {[
              ["Target Audience", "Not Provided"],
              ["Contact Person", "Not Provided"],
              ["Contact Email", "Not Provided"],
              ["Contact Phone", "Not Provided"],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3">
                <dt className="font-semibold text-slate-500">{label}</dt>
                <dd className="font-bold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="grid gap-6 border-t border-slate-200 pt-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-black text-slate-950">Event Objectives</h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">{objectiveText || "Not Provided"}</p>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-950">Event Highlights</h3>
          <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
            <li className="flex gap-2"><span className="text-amber-500">*</span>{event.title} program details are available in the submitted paperwork.</li>
            <li className="flex gap-2"><span className="text-amber-500">*</span>{event.location ? `Venue confirmed at ${event.location}.` : "Venue highlight is Not Provided."}</li>
            <li className="flex gap-2"><span className="text-amber-500">*</span>{event.max_students ? `${event.max_students} expected participants.` : "Expected participant highlight is Not Provided."}</li>
          </ul>
        </div>
      </section>
    </div>
  );

  const renderPaperwork = () => (
    <div className="space-y-4">
      {paperworkFile ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">File Name</th>
                <th className="px-4 py-3 text-left">File Type</th>
                <th className="px-4 py-3 text-left">Upload Date</th>
                <th className="px-4 py-3 text-left">File Size</th>
                <th className="px-4 py-3 text-left">Uploaded By</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-4 font-black text-slate-950">{paperworkFile.name}</td>
                <td className="px-4 py-4"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">PDF</span></td>
                <td className="px-4 py-4 font-semibold text-slate-600">{formatDateTime(event.created_at)}</td>
                <td className="px-4 py-4 font-semibold text-slate-600">{formatFileSize(paperworkFile.size)}</td>
                <td className="px-4 py-4 font-semibold text-slate-600">Club Committee</td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openPaperworkFile(paperworkFile)} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">View</button>
                    <button type="button" onClick={() => openPaperworkFile(paperworkFile)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">Download</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No paperwork uploaded yet."
          text="Upload paperwork from the Create Event module."
          action={<Link href="/committee/event?mode=paperwork" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-black text-white">Upload Paperwork</Link>}
        />
      )}
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-4">
      {progressSteps.map((step, index) => (
        <div key={step.label} className="relative flex gap-4">
          {index < progressSteps.length - 1 && <span className="absolute left-4 top-8 h-full w-px bg-slate-200" />}
          <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
            step.state === "completed" ? "bg-emerald-500 text-white" : step.state === "current" ? "bg-blue-600 text-white" : step.state === "rejected" ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400"
          }`}>
            {step.state === "completed" ? "✓" : step.state === "current" ? "●" : step.state === "rejected" ? "!" : "○"}
          </span>
          <div className={`flex-1 rounded-lg border p-4 ${
            step.state === "current" ? "border-blue-200 bg-blue-50" : step.state === "rejected" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-950">{step.label}</h3>
              <span className={`rounded-full px-2 py-1 text-xs font-black ${step.state === "completed" ? "bg-emerald-100 text-emerald-700" : step.state === "current" ? "bg-blue-100 text-blue-700" : step.state === "rejected" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                {step.state === "completed" ? "Completed" : step.state === "current" ? "Current" : step.state === "rejected" ? "Rejected" : "Pending"}
              </span>
            </div>
            <dl className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-3">
              <div><dt className="text-slate-400">Reviewer</dt><dd>{step.reviewer || "Not Provided"}</dd></div>
              <div><dt className="text-slate-400">Review Date</dt><dd>{formatDateTime(step.date)}</dd></div>
              <div><dt className="text-slate-400">Comments</dt><dd>{step.comments || "Not Provided"}</dd></div>
            </dl>
          </div>
        </div>
      ))}
    </div>
  );

  const renderParticipants = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Registered" value={String(registrations.length)} detail="Students registered" tone="blue" />
        <SummaryCard label="Checked In" value={String(checkedInCount)} detail="Arrival recorded" tone="emerald" />
        <SummaryCard label="Attended" value={String(attendedCount)} detail="Attendance confirmed" tone="violet" />
        <SummaryCard label="Absent" value={String(absentCount)} detail="No attendance record" tone="orange" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={participantSearch}
          onChange={(item) => setParticipantSearch(item.target.value)}
          placeholder="Search participant name, matric number, or email..."
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={attendanceFilter}
          onChange={(item) => setAttendanceFilter(item.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All Attendance</option>
          <option value="attended">Attended</option>
          <option value="absent">Absent</option>
        </select>
        <button type="button" onClick={exportParticipants} className="rounded-md border border-blue-200 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">
          Export Excel
        </button>
      </div>
      {filteredParticipants.length === 0 ? (
        <EmptyState title="No Participants Yet" text="No participants registered yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Student Name</th>
                <th className="px-4 py-3 text-left">Matric Number</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Registration Date</th>
                <th className="px-4 py-3 text-left">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredParticipants.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-4 font-black text-slate-950">{row.student?.name || "Not Provided"}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{row.student?.matrix_number || "Not Provided"}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{row.student?.email || "Not Provided"}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{formatDateTime(row.registered_at)}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${row.status === "attended" || row.checked_in_at ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {row.status === "attended" || row.checked_in_at ? "Attended" : "Absent"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderCertificates = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Generated" value={String(certificates.length)} detail="Certificate records" tone="blue" />
        <SummaryCard label="Issued" value={String(issuedCount)} detail="Approved certificates" tone="emerald" />
        <SummaryCard label="Downloaded" value={String(downloadedCount)} detail="Download status records" tone="violet" />
      </div>
      {certificates.length === 0 ? (
        <EmptyState title="No Certificates Generated" text="Certificates will be generated after event completion." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Student Name</th>
                <th className="px-4 py-3 text-left">Certificate ID</th>
                <th className="px-4 py-3 text-left">Issue Date</th>
                <th className="px-4 py-3 text-left">Verification Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {certificates.map((certificate) => {
                const user = certificate.user_id ? certificateUsers[certificate.user_id] : null;
                return (
                  <tr key={certificate.id}>
                    <td className="px-4 py-4 font-black text-slate-950">{user?.name || user?.email || "Not Provided"}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{certificate.certificate_no || certificate.id}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{formatDateTime(certificate.issued_at)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${certificate.certificate_hash ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {certificate.certificate_hash ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/certificate/${certificate.id}`} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">View</Link>
                        <Link href={`/certificate/${certificate.id}`} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">Download</Link>
                        <Link href={`/verify-certificate?certificateId=${certificate.certificate_no || certificate.id}`} className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700">Verify</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-4">
      {activityItems.length === 0 ? (
        <EmptyState title="No Activity Recorded" text="Activity will appear here after event workflow actions are completed." />
      ) : (
        activityItems.map((item) => (
          <div key={item.id} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="min-w-24 text-xs font-black text-slate-500">{formatDate(item.date)}</div>
            <div className="border-l border-slate-200 pl-4">
              <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">{item.detail}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === "Overview") return renderOverview();
    if (activeTab === "Paperwork") return renderPaperwork();
    if (activeTab === "Timeline") return renderTimeline();
    if (activeTab === "Participants") return renderParticipants();
    if (activeTab === "Certificates") return renderCertificates();
    return renderActivity();
  };

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
        <Link href="/committee" className="hover:text-blue-700">Club Committee</Link>
        <span>&gt;</span>
        <Link href="/committee/event?mode=events" className="hover:text-blue-700">Event Details</Link>
        <span>&gt;</span>
        <span className="text-slate-900">{event.title}</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{event.title}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${badgeClass(event.status)}`}>{status}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {eventCode(event)} | Created {formatDateTime(event.created_at)} | Last updated {formatDateTime(lastUpdated)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(status === "Draft" || status === "Rejected") && (
            <Link href="/committee/event?mode=paperwork" className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">Edit Event</Link>
          )}
          <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Download PDF</button>
          <details className="relative">
            <summary className="list-none rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">More Actions</summary>
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
              <Link href={`/committee/approval-status?eventId=${event.id}`} className="block rounded-md px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">View Approval Status</Link>
              <Link href="/committee/event?mode=paperwork" className="block rounded-md px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Upload Document</Link>
              {(status === "Published" || status === "Completed") && <Link href="/committee/certificates" className="block rounded-md px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Generate Certificate Draft</Link>}
            </div>
          </details>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Event Date" value={formatDate(event.start_date)} detail={`${formatTime(event.start_date)} - ${formatTime(event.end_date)}`} tone="blue" />
        <SummaryCard label="Venue" value={event.location || "Not Provided"} detail="Location details" tone="amber" />
        <SummaryCard label="Expected Participants" value={String(event.max_students || 0)} detail="Target capacity" tone="violet" />
        <SummaryCard label="Registered Participants" value={String(registrations.length)} detail="Current registrations" tone="emerald" />
        <SummaryCard label="Current Status" value={status} detail="Workflow state" tone={status === "Rejected" ? "orange" : "slate"} />
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Approval Progress</p>
          <p className="mt-2 text-sm font-black text-slate-950">{currentProgressLabel}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-2 text-xs font-black text-blue-700">{progressPercent}% complete</p>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-black transition ${
                  activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <motion.div
            key={activeTab}
            className="p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {renderTabContent()}
          </motion.div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-950">Approval Progress</h2>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">{progressPercent}%</span>
            </div>
            <div className="mt-4 space-y-4">
              {progressSteps.map((step, index) => (
                <div key={step.label} className="relative flex gap-3">
                  {index < progressSteps.length - 1 && <span className="absolute left-3 top-7 h-full w-px bg-slate-200" />}
                  <span className={`relative z-10 mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                    step.state === "completed" ? "bg-emerald-500 text-white" : step.state === "current" ? "bg-blue-600 text-white" : step.state === "rejected" ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400"
                  }`}>
                    {step.state === "completed" ? "✓" : step.state === "current" ? "●" : step.state === "rejected" ? "!" : "○"}
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-950">{step.label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(step.date)}</p>
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
                <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                  <span>PDF</span>
                  <span>{formatFileSize(paperworkFile.size)}</span>
                </div>
                <button type="button" onClick={() => openPaperworkFile(paperworkFile)} className="mt-3 inline-flex rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">Download</button>
              </div>
            ) : (
              <EmptyState title="No Paperwork Uploaded" text="Upload paperwork from the Create Event module." />
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-950">Quick Actions</h2>
            <div className="mt-4 grid gap-2">
              {(status === "Draft" || status === "Rejected") && <Link href="/committee/event?mode=paperwork" className="rounded-md border border-blue-200 px-3 py-2 text-center text-xs font-black text-blue-700 hover:bg-blue-50">Edit Event</Link>}
              <Link href="/committee/event?mode=paperwork" className="rounded-md border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 hover:bg-slate-50">Upload Document</Link>
              <Link href={`/committee/approval-status?eventId=${event.id}`} className="rounded-md border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 hover:bg-slate-50">View Approval Status</Link>
              {(status === "Published" || status === "Completed") && <Link href="/committee/certificates" className="rounded-md border border-emerald-200 px-3 py-2 text-center text-xs font-black text-emerald-700 hover:bg-emerald-50">Generate Certificate Draft</Link>}
            </div>
          </section>
        </aside>
      </div>
    </motion.div>
  );
}
