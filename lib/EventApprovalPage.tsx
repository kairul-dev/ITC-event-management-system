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

function timelineState(event: Event, step: string, history: ApprovalHistory[]) {
  const status = event.status;
  if (step === "Draft Created") return "done";
  if (step === "Submitted to High Council") return status === "Draft" ? "pending" : "done";
  if (step === "High Council Review") {
    if (history.some((item) => item.actor_role === "high_council")) return "done";
    return ["Pending Approval", "Pending High Council Approval"].includes(status) ? "current" : "pending";
  }
  if (step === "Club Advisor Review") {
    if (history.some((item) => item.actor_role === "club_advisor")) return "done";
    return status === "Pending Club Advisor Approval" ? "current" : "pending";
  }
  if (step === "Published") return ["Published", "Completed", "Closed"].includes(status) ? "done" : "pending";
  return "pending";
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

function UploadedPaperworkCard({
  file,
  onOpen,
}: {
  file: UploadedPaperworkFile;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">Attachment</p>
          <h3 className="mt-1 break-all text-sm font-black text-slate-950 sm:text-base">{file.name}</h3>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {formatFileSize(file.size)} uploaded on {formatDateTime(file.uploadedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
        >
          Open Attachment
        </button>
      </div>
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
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showWordPreview, setShowWordPreview] = useState(false);

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
    if (!selectedEventId || !exists) {
      setSelectedEventId(events[0].id);
      setRejectReason("");
      setShowWordPreview(false);
    }
  }, [events, selectedEventId]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700"></div>
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

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <main className="min-w-0 space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black text-slate-950">Workflow Timeline</h3>
                          <p className="text-sm font-semibold text-slate-500">Current approval stage and next handoff.</p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-5">
                        {["Draft Created", "Submitted to High Council", "High Council Review", "Club Advisor Review", "Published"].map((step) => {
                          const state = timelineState(selectedEvent, step, selectedHistory);
                          return (
                            <div
                              key={step}
                              className={`rounded-xl border p-3 ${
                                state === "done"
                                  ? "border-emerald-200 bg-emerald-50"
                                  : state === "current"
                                    ? "border-blue-200 bg-blue-50 ring-2 ring-blue-100"
                                    : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${
                                state === "done"
                                  ? "bg-emerald-600 text-white"
                                  : state === "current"
                                    ? "bg-blue-700 text-white"
                                    : "bg-slate-200 text-slate-500"
                              }`}>
                                {state === "done" ? "OK" : state === "current" ? "Now" : ""}
                              </div>
                              <p className="mt-3 text-sm font-black text-slate-950">{step}</p>
                              <p className="mt-1 text-xs font-semibold capitalize text-slate-500">{state}</p>
                            </div>
                          );
                        })}
                      </div>
                    </section>

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
                      <h3 className="text-lg font-black text-slate-950">Attachment Viewer</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Open the submitted file or inspect the generated Word-format preview.</p>
                      <div className="mt-4">
                        {uploadedPaperworkFile ? (
                          <UploadedPaperworkCard
                            file={uploadedPaperworkFile}
                            onOpen={() => openUploadedPaperworkFile(uploadedPaperworkFile)}
                          />
                        ) : (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-blue-950">Generated Paperwork Preview</p>
                                <p className="mt-1 text-sm font-semibold text-blue-700">No uploaded file is attached. Review the generated paperwork format.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowWordPreview(true)}
                                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
                              >
                                Open Preview
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-lg font-black text-slate-950">Paperwork Sections</h3>
                      <div className="mt-4 grid gap-3">
                        {paperworkSections.slice(0, 4).map((section, index) => (
                          <details key={`${section.title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4" open={index === 0}>
                            <summary className="cursor-pointer text-sm font-black uppercase tracking-wide text-slate-700">{section.title}</summary>
                            <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-6 text-slate-700">
                              {section.body || "-"}
                            </p>
                          </details>
                        ))}
                        {paperworkSections.length > 4 && (
                          <p className="text-xs font-semibold text-slate-500">
                            Showing 4 of {paperworkSections.length} sections. Open the attachment or Word preview for the full paperwork.
                          </p>
                        )}
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
