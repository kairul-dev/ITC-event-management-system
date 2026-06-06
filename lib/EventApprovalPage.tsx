"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatFileSize, getPaperworkFile, stripPaperworkFileMarker, UploadedPaperworkFile } from "@/lib/paperworkFile";

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
  updated_at?: string;
  location?: string;
  purpose?: string;
  objective?: string;
  rejection_reason?: string;
  organizer?: string;
  club?: string;
  club_name?: string;
  created_by?: string;
  submitted_by?: string;
  poster_url?: string;
  image_url?: string;
};

type ApprovalHistory = {
  id: string;
  entity_id: string;
  action?: string | null;
  actor_role?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  comments?: string | null;
  created_at?: string | null;
};

type PaperworkSection = {
  title: string;
  body: string;
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRole(role?: string | null) {
  if (role === "high_council") return "High Council";
  if (role === "club_advisor") return "Club Advisor";
  if (role === "committee") return "Club Committee";
  if (role === "admin") return "Admin";
  return role || "System";
}

function parsePaperworkSections(...values: Array<string | undefined>) {
  const text = values
    .filter(Boolean)
    .join("\n\n")
    .replace(/\r\n/g, "\n")
    .trim();
  const cleanText = stripPaperworkFileMarker(text);

  if (!cleanText) return [];

  const headingPattern = /^(\d{1,2}\.0\s+[^\n]+|LAMPIRAN\s+[^\n]+)/gim;
  const matches = Array.from(cleanText.matchAll(headingPattern));

  const sections: PaperworkSection[] = [];

  if (matches[0]?.index && matches[0].index > 0) {
    const preamble = cleanText.slice(0, matches[0].index).trim();
    if (preamble) {
      sections.push({
        title: "Maklumat Kertas Kerja",
        body: preamble,
      });
    }
  }

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const nextStart = matches[index + 1]?.index ?? cleanText.length;
    const chunk = cleanText.slice(start, nextStart).trim();
    const lines = chunk.split("\n");
    const title = lines.shift()?.trim() || match[1];
    const body = lines.join("\n").trim();
    sections.push({ title, body });
  });

  if (sections.length === 0) {
    sections.push({ title: "Paperwork Details", body: cleanText });
  }

  return sections;
}

function DetailCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}

function formatCurrency(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "RM 0";
  return `RM ${value.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
}

function getOrganizer(event?: Event | null) {
  return event?.organizer || event?.club_name || event?.club || "ITC Club";
}

function getSubmittedBy(event?: Event | null) {
  return event?.submitted_by || event?.created_by || "Club Committee";
}

function normalizeReviewStatus(status: string) {
  if (status === "Pending Approval" || status === "Pending High Council Approval") return "Pending High Council Review";
  if (status === "Pending Club Advisor Approval") return "Forwarded to Club Advisor";
  return status;
}

function StatusBadge({ status }: { status: string }) {
  const label = normalizeReviewStatus(status);
  const className = label.includes("Pending")
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : label.includes("Forwarded")
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : label.includes("Rejected")
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : label.includes("Published") || label.includes("Approved")
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${className}`}>
      {label}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  description,
}: {
  label: string;
  value: number;
  tone: "amber" | "blue" | "rose" | "emerald";
  description: string;
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl border ${tones[tone]}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M8 4h8l3 3v13H5V4h3z" />
          </svg>
        </div>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function formatCoverDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();
}

function extractSectionValue(sections: PaperworkSection[], sectionTitle: string, pattern: RegExp) {
  const section = sections.find((item) => item.title.toUpperCase().includes(sectionTitle));
  const match = section?.body.match(pattern);
  return match?.[1]?.trim() || "";
}

function WordPaperworkPreview({
  event,
  sections,
  onClose,
}: {
  event: Event;
  sections: PaperworkSection[];
  onClose: () => void;
}) {
  const headerSection = sections.find((section) => section.title === "Maklumat Kertas Kerja");
  const bodySections = sections.filter((section) => section.title !== "Maklumat Kertas Kerja");
  const activityName =
    extractSectionValue(sections, "NAMA AKTIVITI", /3\.1\s+Nama Aktiviti:\s*(.+)/i) ||
    event.title;
  const organizer =
    extractSectionValue(sections, "NAMA AKTIVITI", /3\.2\s+Nama Penganjur:\s*(.+)/i) ||
    "PEJABAT HAL EHWAL PELAJAR";
  const place =
    extractSectionValue(sections, "BUTIRAN AKTIVITI", /4\.3\s+Lokasi:\s*(.+)/i) ||
    event.location ||
    "-";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 px-4 py-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col rounded-xl bg-slate-100 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Word Format Preview</p>
            <h2 className="text-lg font-black text-slate-950">{event.title}</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
          <div className="space-y-8">
            <article className="relative mx-auto flex min-h-[1123px] w-full max-w-[794px] flex-col bg-white px-[96px] py-[96px] font-sans text-[13px] font-bold leading-7 text-black shadow-xl print:shadow-none">
              <div className="mx-auto mt-[42px] flex w-full items-center justify-center gap-5">
                <div className="relative h-[98px] w-[78px] rounded-b-[26px] rounded-t-lg border-[3px] border-[#152d73] bg-[#f6f7fb]">
                  <div className="absolute left-1/2 top-3 h-12 w-12 -translate-x-1/2 rotate-45 rounded border-2 border-red-700 bg-white" />
                  <div className="absolute bottom-3 left-1/2 h-7 w-12 -translate-x-1/2 rounded-t-full bg-[#152d73]" />
                  <div className="absolute left-1/2 top-8 h-4 w-10 -translate-x-1/2 rounded bg-[#152d73]" />
                </div>
                <div className="leading-none">
                  <p className="text-[88px] font-black tracking-[-0.08em] text-[#05036d]">UTHM</p>
                  <p className="-mt-1 text-center text-[15px] font-bold tracking-normal text-[#333]">
                    Universiti Tun Hussein Onn Malaysia
                  </p>
                </div>
              </div>

              <div className="mt-16 text-center uppercase">
                <p>UNIVERSITI TUN HUSSEIN ONN MALAYSIA</p>
                <p className="mt-5">KERTAS KERJA</p>
                <p className="mx-auto mt-5 max-w-[560px] leading-7">
                  {activityName}
                </p>
                <p className="mt-5">TEMPAT:</p>
                <p className="mx-auto mt-3 max-w-[560px] leading-7">{place}</p>
                <p className="mt-5">ANJURAN:</p>
                <p className="mx-auto mt-3 max-w-[560px] leading-7">{organizer}</p>
                <p className="mt-3">DENGAN KERJASAMA</p>
                <p className="mt-3">MAJLIS PERWAKILAN PELAJAR UTHM</p>
                <p className="mt-5">TARIKH:</p>
                <p className="mt-3">{formatCoverDate(event.start_date)}</p>
              </div>

              <p className="absolute bottom-10 left-0 right-0 text-center text-sm font-normal text-slate-500">1</p>
            </article>

            <article className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-white px-16 py-14 text-[13px] leading-7 text-black shadow-xl print:shadow-none">
              <header className="text-center font-serif">
                <p className="font-bold uppercase tracking-wide">UNIVERSITI TUN HUSSEIN ONN MALAYSIA</p>
                <div className="my-8">
                  <p className="font-bold uppercase">KERTAS KERJA</p>
                  <p className="mt-4 font-bold uppercase">{event.title}</p>
                </div>
                <p className="font-bold uppercase">PEJABAT HAL EHWAL PELAJAR</p>
                <p className="font-bold uppercase">UNIVERSITI TUN HUSSEIN ONN MALAYSIA</p>
              </header>

              {headerSection?.body && (
                <section className="mt-10 border-t border-slate-200 pt-5 font-serif whitespace-pre-line">
                  {headerSection.body
                    .split("\n")
                    .filter((line) => {
                      const normalized = line.trim().toUpperCase();
                      return (
                        normalized &&
                        normalized !== "UNIVERSITI TUN HUSSEIN ONN MALAYSIA" &&
                        normalized !== "KERTAS KERJA" &&
                        normalized !== event.title.toUpperCase() &&
                        normalized !== "PEJABAT HAL EHWAL PELAJAR"
                      );
                    })
                    .join("\n")}
                </section>
              )}

              <section className="mt-8 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 font-serif">
                <p className="font-bold">Tajuk</p>
                <p>{event.title}</p>
                <p className="font-bold">Tarikh</p>
                <p>{formatDateTime(event.start_date)} hingga {formatDateTime(event.end_date)}</p>
                <p className="font-bold">Lokasi</p>
                <p>{event.location || "-"}</p>
                <p className="font-bold">Belanjawan</p>
                <p>{typeof event.budget === "number" ? `RM ${event.budget.toLocaleString()}` : "-"}</p>
                <p className="font-bold">Bil. Peserta</p>
                <p>{event.max_students || 0}</p>
              </section>

              <div className="mt-10 space-y-7 font-serif">
                {bodySections.map((section, index) => (
                  <section key={`${section.title}-${index}`} className="break-inside-avoid">
                    <h3 className="font-bold uppercase">{section.title}</h3>
                    <div className="mt-2 whitespace-pre-line text-justify">
                      {section.body || "-"}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventApprovalPage() {
  const pathname = usePathname();
  const isClubAdvisor = pathname.startsWith("/club-advisor");
  const reviewConfig = useMemo(
    () =>
      isClubAdvisor
        ? {
            queueStatuses: ["Pending Club Advisor Approval"],
            approveStatus: "Approved",
            title: "Club Advisor Final Review",
            description: "Give final approval or rejection for paperwork forwarded by the High Council.",
            countLabel: "Pending Final Approval",
            emptyTitle: "No Paperwork Awaiting Final Approval",
            emptyDescription: "All forwarded Club Committee paperwork has been reviewed.",
            queueBadge: "Club Advisor Review",
            approveLabel: "Give Final Approval",
            rejectLabel: "Reject Paperwork",
          }
        : {
            queueStatuses: ["Pending Approval", "Pending High Council Approval"],
            approveStatus: "Pending Club Advisor Approval",
            title: "High Council Event Review",
            description: "Review Club Committee event submissions before forwarding them to the Club Advisor.",
            countLabel: "Pending High Council Review",
            emptyTitle: "No Events Awaiting High Council Review",
            emptyDescription: "All submitted Club Committee events have been reviewed.",
            queueBadge: "High Council Review",
            approveLabel: "Forward to Club Advisor",
            rejectLabel: "Reject Paperwork",
          },
    [isClubAdvisor],
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    forwarded: 0,
    rejected: 0,
    published: 0,
  });
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showWordPreview, setShowWordPreview] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; url: string } | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .in("status", reviewConfig.queueStatuses)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading events:", error);
        alert("Error loading events: " + error.message);
      } else {
        const eventRows = (data || []) as Event[];
        setEvents(eventRows);

        const { data: countRows, error: countError } = await supabase
          .from("events")
          .select("id,status");

        if (!countError) {
          const statuses = (countRows || []) as Pick<Event, "id" | "status">[];
          setStatusCounts({
            pending: statuses.filter((event) => reviewConfig.queueStatuses.includes(event.status)).length,
            forwarded: statuses.filter((event) => event.status === "Pending Club Advisor Approval").length,
            rejected: statuses.filter((event) => event.status === "Rejected").length,
            published: statuses.filter((event) => event.status === "Published").length,
          });
        }

        if (eventRows.length > 0) {
          const { data: historyRows, error: historyError } = await supabase
            .from("approval_history")
            .select("id,entity_id,action,actor_role,from_status,to_status,comments,created_at")
            .eq("entity_type", "event")
            .in("entity_id", eventRows.map((event) => event.id))
            .order("created_at", { ascending: false });

          if (historyError) {
            console.error("Error loading approval history:", historyError.message);
            setApprovalHistory([]);
          } else {
            setApprovalHistory((historyRows || []) as ApprovalHistory[]);
          }
        } else {
          setApprovalHistory([]);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [reviewConfig.queueStatuses]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const selectedHistory = useMemo(
    () => approvalHistory.filter((item) => item.entity_id === selectedEventId),
    [approvalHistory, selectedEventId],
  );
  const paperworkSections = useMemo(
    () => parsePaperworkSections(selectedEvent?.purpose, selectedEvent?.objective),
    [selectedEvent?.purpose, selectedEvent?.objective],
  );
  const uploadedPaperworkFile = useMemo(
    () => getPaperworkFile(selectedEvent?.purpose, selectedEvent?.objective),
    [selectedEvent?.purpose, selectedEvent?.objective],
  );

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId(null);
      setRejectReason("");
      setShowWordPreview(false);
      return;
    }

    const exists = events.some((event) => event.id === selectedEventId);
    if (!isClubAdvisor && !selectedEventId) {
      return;
    }

    if (!selectedEventId || !exists) {
      setSelectedEventId(events[0].id);
      setRejectReason("");
      setShowWordPreview(false);
    }
  }, [events, isClubAdvisor, selectedEventId]);

  const updateStatus = async (
    id: string,
    status: "Approved" | "Pending Approval" | "Pending Club Advisor Approval" | "Rejected",
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
        setSelectedEventId(null);
        setPreviewAttachment(null);
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
      setSelectedEventId(null);
      setPreviewAttachment(null);
      setRejectReason("");
      setProcessingId(null);
    } catch (error) {
      console.error("Error updating status:", error);
      setProcessingId(null);
    }
  };

  const openUploadedPaperworkFile = async (file: UploadedPaperworkFile) => {
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

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.url) {
      alert(payload.error || "Unable to open paperwork file.");
      return;
    }

    window.open(payload.url, "_blank", "noopener,noreferrer");
  };

  const previewUploadedPaperworkFile = async (file: UploadedPaperworkFile) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert("Please log in again to preview the paperwork file.");
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

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.url) {
      alert(payload.error || "Unable to preview paperwork file.");
      return;
    }

    setPreviewAttachment({ name: file.name, url: payload.url });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!isClubAdvisor) {
    if (!selectedEvent) {
      return (
        <div className="space-y-6">
          <header className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Review Paperwork</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
                Review submitted event proposals and forward approved events to the Club Advisor.
              </p>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Pending Review" value={statusCounts.pending} tone="amber" description="Awaiting High Council action" />
            <SummaryCard label="Forwarded" value={statusCounts.forwarded} tone="blue" description="Sent to Club Advisor" />
            <SummaryCard label="Rejected" value={statusCounts.rejected} tone="rose" description="Returned for correction" />
            <SummaryCard label="Published" value={statusCounts.published} tone="emerald" description="Approved and live" />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Paperwork Queue</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {events.length} event{events.length === 1 ? "" : "s"} waiting for High Council review.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                  Pending High Council Review
                </span>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-950">No paperwork is waiting for High Council review.</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">All submitted event proposals have been reviewed.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Event Name", "Club / Organizer", "Submission Date", "Event Date", "Budget", "Status", "Action"].map((heading) => (
                          <th key={heading} className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {events.map((event) => (
                        <tr key={event.id} className="transition hover:bg-blue-50/40">
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-950">{event.title}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">ID: {event.id.slice(0, 8)}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">{getOrganizer(event)}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">{formatShortDate(event.created_at)}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">{formatShortDate(event.start_date)}</td>
                          <td className="px-5 py-4 text-sm font-black text-slate-900">{formatCurrency(event.budget)}</td>
                          <td className="px-5 py-4"><StatusBadge status={event.status} /></td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEventId(event.id);
                                setRejectReason("");
                                setPreviewAttachment(null);
                              }}
                              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white shadow-sm shadow-blue-900/10 transition hover:bg-blue-800"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 p-4 lg:hidden">
                  {events.map((event) => (
                    <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-black text-slate-950">{event.title}</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{getOrganizer(event)}</p>
                        </div>
                        <StatusBadge status={event.status} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <DetailCard label="Submitted" value={formatShortDate(event.created_at)} />
                        <DetailCard label="Event Date" value={formatShortDate(event.start_date)} />
                        <DetailCard label="Budget" value={formatCurrency(event.budget)} />
                        <DetailCard label="Venue" value={event.location || "Not set"} />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventId(event.id);
                          setRejectReason("");
                          setPreviewAttachment(null);
                        }}
                        className="mt-4 w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800"
                      >
                        Review
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      );
    }

    const purposeText = stripPaperworkFileMarker(selectedEvent.purpose) || "No purpose has been provided for this event.";
    const objectiveText = stripPaperworkFileMarker(selectedEvent.objective) || "No objectives have been provided for this event.";
    const attachmentRows = uploadedPaperworkFile ? [uploadedPaperworkFile] : [];

    return (
      <div className="space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
              <span>Home</span>
              <span className="text-slate-300">/</span>
              <span>High Council</span>
              <span className="text-slate-300">/</span>
              <span>Review Paperwork</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900">{selectedEvent.title}</span>
            </nav>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Review Event Paperwork</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Carefully review the event details and attached documents before taking action.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedEventId(null);
              setRejectReason("");
              setPreviewAttachment(null);
            }}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
          >
            <span aria-hidden="true">&larr;</span>
            Back to Pending List
          </button>
        </header>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
          <main className="min-w-0 space-y-4 xl:w-2/5 xl:shrink-0">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-8 8h10a2 2 0 002-2V7l-4-4H7a2 2 0 00-2 2v13a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-black text-slate-950">Event Summary</h2>
              </div>
              <div className="space-y-3">
                <DetailCard label="Event Name" value={selectedEvent.title} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailCard label="Club" value={getOrganizer(selectedEvent)} />
                  <DetailCard label="Submitted By" value={getSubmittedBy(selectedEvent)} />
                  <DetailCard label="Submission Date" value={formatDateTime(selectedEvent.created_at)} />
                  <DetailCard label="Status" value={<StatusBadge status={selectedEvent.status} />} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                  </svg>
                </div>
                <h2 className="text-lg font-black text-slate-950">Program Details</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-black text-slate-950">Purpose</p>
                  <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-700">{purposeText}</p>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">Objectives</p>
                  <div className="mt-2 space-y-2">
                    {objectiveText.split(/\n|\*|-/).map((item) => item.trim()).filter(Boolean).slice(0, 4).map((item, index) => (
                      <div key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700">
                        <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-[9px] font-black text-emerald-700">OK</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">Expected Outcome</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">
                    Participants will gain knowledge and practical experience from the proposed programme activities.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z" />
                  </svg>
                </div>
                <h2 className="text-lg font-black text-slate-950">Logistics & Budget</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  ["Start Date", formatShortDate(selectedEvent.start_date)],
                  ["End Date", formatShortDate(selectedEvent.end_date)],
                  ["Time", `${new Date(selectedEvent.start_date).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })} - ${new Date(selectedEvent.end_date).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}`],
                  ["Location", selectedEvent.location || "Not provided"],
                  ["Expected Participants", `${selectedEvent.max_students || 0} Participants`],
                  ["Estimated Budget", formatCurrency(selectedEvent.budget)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <span className="font-semibold text-slate-600">{label}</span>
                    <span className={`text-right font-black ${label === "Estimated Budget" ? "text-emerald-700" : "text-slate-900"}`}>{value}</span>
                  </div>
                ))}
              </div>
            </section>

          </main>

          <aside className="min-w-0 space-y-4 xl:w-3/5 xl:shrink-0">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828a4 4 0 10-5.657-5.657L5.757 10.757a6 6 0 108.486 8.486L20 13.485" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-black text-slate-950">Attached Documents</h2>
                </div>
                <span className="text-sm font-bold text-slate-500">{attachmentRows.length || 1} file</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <p className="px-2 py-2 text-xs font-black uppercase tracking-wide text-slate-500">File List</p>
                  {uploadedPaperworkFile ? (
                    <button
                      type="button"
                      onClick={() => previewUploadedPaperworkFile(uploadedPaperworkFile)}
                      className="w-full rounded-lg border border-blue-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <p className="truncate text-sm font-black text-slate-950">{uploadedPaperworkFile.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatFileSize(uploadedPaperworkFile.size)}</p>
                      <span className="mt-3 inline-flex rounded-full bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">Selected</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowWordPreview(true)}
                      className="w-full rounded-lg border border-blue-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <p className="text-sm font-black text-slate-950">Generated Paperwork Preview</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Built from submitted event fields</p>
                      <span className="mt-3 inline-flex rounded-full bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">Preview available</span>
                    </button>
                  )}
                  {uploadedPaperworkFile && (
                    <div className="mt-3 grid gap-2">
                      <button
                        type="button"
                        onClick={() => previewUploadedPaperworkFile(uploadedPaperworkFile)}
                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => openUploadedPaperworkFile(uploadedPaperworkFile)}
                        className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"
                      >
                        Download
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                    <p className="truncate text-sm font-black text-slate-950">
                      {previewAttachment?.name || uploadedPaperworkFile?.name || "Generated Paperwork Preview"}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <span>Preview</span>
                      <span>100%</span>
                    </div>
                  </div>
                  {previewAttachment?.url && previewAttachment.name.toLowerCase().endsWith(".pdf") ? (
                    <iframe title={previewAttachment.name} src={previewAttachment.url} className="h-[520px] w-full bg-white" />
                  ) : (
                    <div className="grid h-[520px] place-items-center bg-white px-6 text-center">
                      <div>
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h6M6 3h9l3 3v15H6V3z" />
                          </svg>
                        </div>
                        <h3 className="mt-4 text-base font-black text-slate-950">Document preview ready</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                          Select a file from the list to preview the submitted paperwork in this document viewer.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h6M6 3h9l3 3v15H6V3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Review Notes <span className="font-semibold text-slate-500">(Optional)</span></h2>
                  <p className="text-xs font-semibold text-slate-500">Notes are visible to the Club Committee when sent with a rejection or revision request.</p>
                </div>
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Write your review notes here..."
                className="min-h-16 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-2 text-right text-xs font-semibold text-slate-500">{rejectReason.length} / 1000 characters</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/70">
              <h2 className="text-lg font-black text-slate-950">Take Action</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateStatus(selectedEvent.id, "Rejected", rejectReason)}
                  disabled={processingId === selectedEvent.id}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-4 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject
                  <span className="mt-1 block text-xs font-semibold text-rose-600">Do not approve this event</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(selectedEvent.id, "Pending Club Advisor Approval")}
                  disabled={processingId === selectedEvent.id}
                  className="rounded-xl bg-emerald-600 px-3 py-4 text-sm font-black text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processingId === selectedEvent.id ? "Processing..." : "Approve & Forward"}
                  <span className="mt-1 block text-xs font-semibold text-emerald-50">Send to Club Advisor</span>
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Approval History</h2>
              <div className="mt-4 space-y-3">
                {selectedHistory.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500">
                    No approval history recorded yet.
                  </p>
                ) : (
                  selectedHistory.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black capitalize text-slate-950">{item.action || "reviewed"}</p>
                        <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-black text-slate-600">
                          {formatRole(item.actor_role)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(item.created_at || undefined)}</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                        {item.from_status || "Not provided"} -&gt; {item.to_status || "Not provided"}
                      </p>
                      {item.comments && <p className="mt-2 text-sm leading-6 text-slate-700">{item.comments}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>

        {showWordPreview && !uploadedPaperworkFile && (
          <WordPaperworkPreview
            event={selectedEvent}
            sections={paperworkSections}
            onClose={() => setShowWordPreview(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">Approval Workspace</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{reviewConfig.title}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">{reviewConfig.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs font-black uppercase text-amber-700">{reviewConfig.countLabel}</p>
              <p className="mt-1 text-2xl font-black text-amber-950">{events.length}</p>
            </div>
            <span className="self-center rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700">Queue Open</span>
          </div>
        </div>
      </header>

      {events.length === 0 ? (
        <div className="ds-card p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">{reviewConfig.emptyTitle}</h3>
          <p className="text-slate-500">{reviewConfig.emptyDescription}</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950">Paperwork Queue</h2>
                <p className="text-xs font-semibold text-slate-500">{events.length} awaiting action</p>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700">{events.length}</span>
            </div>
            <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {events.map((event) => {
                const isActive = selectedEventId === event.id;
                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setRejectReason("");
                    }}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      isActive
                        ? "border-blue-700 bg-blue-700 text-white shadow-md shadow-blue-900/10"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className={`line-clamp-2 text-sm font-black ${isActive ? "text-white" : "text-slate-900"}`}>{event.title}</p>
                    <p className={`text-xs mt-1 ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                      {formatShortDate(event.start_date)} to {formatShortDate(event.end_date)}
                    </p>
                    <span className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-black ${isActive ? "bg-white/95 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                      {reviewConfig.queueBadge}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0">
            {!selectedEvent ? (
              <div className="grid min-h-96 place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-500">Select an event to review.</div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">{reviewConfig.queueBadge}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{selectedEvent.status}</span>
                      </div>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{selectedEvent.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Submitted {formatDateTime(selectedEvent.created_at)} | {selectedEvent.location || "Venue not set"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                      <button
                        type="button"
                        onClick={() => updateStatus(selectedEvent.id, "Rejected", rejectReason)}
                        disabled={processingId === selectedEvent.id}
                        className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId === selectedEvent.id ? "Processing..." : reviewConfig.rejectLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateStatus(
                            selectedEvent.id,
                            reviewConfig.approveStatus as "Approved" | "Pending Club Advisor Approval",
                          )
                        }
                        disabled={processingId === selectedEvent.id}
                        className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId === selectedEvent.id ? "Processing..." : reviewConfig.approveLabel}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <DetailCard label="Event Date" value={`${formatShortDate(selectedEvent.start_date)} - ${formatShortDate(selectedEvent.end_date)}`} />
                    <DetailCard label="Venue" value={selectedEvent.location || "Not set"} />
                    <DetailCard label="Capacity" value={`${selectedEvent.max_students || 0} students`} />
                    <DetailCard label="Student Fee" value={typeof selectedEvent.fee_amount === "number" ? `RM ${Number(selectedEvent.fee_amount).toFixed(2)}` : "RM 0.00"} />
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <main className="min-w-0 space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-black text-slate-950">Event Summary</h3>
                          <p className="text-sm font-semibold text-slate-500">Key details needed for approval decision.</p>
                        </div>
                        {uploadedPaperworkFile ? (
                          <button
                            type="button"
                            onClick={() => openUploadedPaperworkFile(uploadedPaperworkFile)}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
                          >
                            Open Attachment
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowWordPreview(true)}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100"
                          >
                            View Word Format
                          </button>
                        )}
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <DetailCard label="Start" value={formatDateTime(selectedEvent.start_date)} />
                        <DetailCard label="End" value={formatDateTime(selectedEvent.end_date)} />
                        <DetailCard label="Submitted" value={formatDateTime(selectedEvent.created_at)} />
                        <DetailCard label="Budget" value={typeof selectedEvent.budget === "number" ? `RM ${selectedEvent.budget.toLocaleString()}` : "-"} />
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Purpose</h4>
                          <p className="mt-2 line-clamp-6 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {stripPaperworkFileMarker(selectedEvent.purpose) || "No purpose summary provided."}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Objective</h4>
                          <p className="mt-2 line-clamp-6 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {stripPaperworkFileMarker(selectedEvent.objective) || "No objective summary provided."}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-950">Attachment Viewer</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">Review the submitted paperwork in the enlarged document workspace.</p>
                        </div>
                        {uploadedPaperworkFile ? (
                          <button
                            type="button"
                            onClick={() => openUploadedPaperworkFile(uploadedPaperworkFile)}
                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
                          >
                            Open Attachment
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowWordPreview(true)}
                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
                          >
                            Open Preview
                          </button>
                        )}
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">File List</p>
                          {uploadedPaperworkFile ? (
                            <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3 shadow-sm">
                              <p className="break-all text-sm font-black text-slate-950">{uploadedPaperworkFile.name}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {formatFileSize(uploadedPaperworkFile.size)} uploaded on {formatDateTime(uploadedPaperworkFile.uploadedAt)}
                              </p>
                              <div className="mt-3 grid gap-2">
                                <button
                                  type="button"
                                  onClick={() => previewUploadedPaperworkFile(uploadedPaperworkFile)}
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                                >
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openUploadedPaperworkFile(uploadedPaperworkFile)}
                                  className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"
                                >
                                  Open Attachment
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3 shadow-sm">
                              <p className="text-sm font-black text-slate-950">Generated Paperwork Preview</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">Built from submitted event details.</p>
                              <button
                                type="button"
                                onClick={() => setShowWordPreview(true)}
                                className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"
                              >
                                Open Preview
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                            <p className="truncate text-sm font-black text-slate-950">
                              {previewAttachment?.name || uploadedPaperworkFile?.name || "Generated Paperwork Preview"}
                            </p>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">Document Review</span>
                          </div>
                          {previewAttachment?.url && previewAttachment.name.toLowerCase().endsWith(".pdf") ? (
                            <iframe title={previewAttachment.name} src={previewAttachment.url} className="h-[680px] w-full bg-white" />
                          ) : (
                            <div className="h-[680px] overflow-y-auto bg-white p-6">
                              <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Paperwork Preview</p>
                                <h4 className="mt-3 text-2xl font-black text-slate-950">{selectedEvent.title}</h4>
                                <p className="mt-2 text-sm font-semibold text-slate-500">
                                  {formatShortDate(selectedEvent.start_date)} - {formatShortDate(selectedEvent.end_date)} | {selectedEvent.location || "Venue not set"}
                                </p>
                                <div className="mt-6 space-y-5">
                                  {paperworkSections.slice(0, 5).map((section, index) => (
                                    <div key={`${section.title}-${index}`} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                                      <p className="text-sm font-black text-slate-950">{section.title}</p>
                                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{section.body || "-"}</p>
                                    </div>
                                  ))}
                                  {paperworkSections.length === 0 && (
                                    <p className="text-sm leading-7 text-slate-700">No generated paperwork content is available for preview.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </main>

                  <aside className="space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-lg font-black text-slate-950">Review Notes</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Required only when rejecting paperwork.</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={6}
                        placeholder="State why this submission does not meet approval criteria..."
                        className="mt-4 min-h-36 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-lg font-black text-slate-950">Decision</h3>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                          <p className="text-sm font-black text-emerald-900">{reviewConfig.approveLabel}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">
                            Approving moves this paperwork to the next configured workflow stage.
                          </p>
                        </div>
                        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                          <p className="text-sm font-black text-rose-900">{reviewConfig.rejectLabel}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-rose-700">
                            Rejection keeps the paperwork out of the next stage and requires a clear note.
                          </p>
                        </div>
                        <p className="text-xs font-semibold leading-5 text-slate-500">
                          Use the approval actions in the page header after completing your review.
                        </p>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-lg font-black text-slate-950">Approval History</h3>
                      <div className="mt-4 space-y-3">
                        {selectedHistory.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500">
                            No approval history recorded yet.
                          </p>
                        ) : (
                          selectedHistory.map((item) => (
                            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-black capitalize text-slate-950">{item.action || "reviewed"}</p>
                                <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-black text-slate-600">
                                  {formatRole(item.actor_role)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(item.created_at || undefined)}</p>
                              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                                {item.from_status || "Not provided"} -&gt; {item.to_status || "Not provided"}
                              </p>
                              {item.comments && <p className="mt-2 text-sm leading-6 text-slate-700">{item.comments}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </aside>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
      {selectedEvent && showWordPreview && !uploadedPaperworkFile && (
        <WordPaperworkPreview
          event={selectedEvent}
          sections={paperworkSections}
          onClose={() => setShowWordPreview(false)}
        />
      )}
    </div>
  );
}
