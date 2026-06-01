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
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-violet-700">Uploaded Paperwork File</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{file.name}</h3>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {formatFileSize(file.size)} uploaded on {formatDateTime(file.uploadedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800"
        >
          Open Paperwork File
        </button>
      </div>
      <p className="mt-4 text-sm font-medium text-violet-800">
        Review this completed Word/PDF document, then approve or reject using the buttons below.
      </p>
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
            <p className="text-xs font-black uppercase tracking-wide text-violet-700">Word Format Preview</p>
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
        setEvents(data || []);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{reviewConfig.title}</h1>
        <p className="text-sm text-slate-600">{reviewConfig.description}</p>
      </div>

      <div className="ds-card p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{reviewConfig.countLabel}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{events.length}</p>
        </div>
        <span className="ds-badge-pending">Queue Open</span>
      </div>

      {events.length === 0 ? (
        <div className="ds-card p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">{reviewConfig.emptyTitle}</h3>
          <p className="text-slate-500">{reviewConfig.emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <aside className="xl:col-span-4 ds-card p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">{reviewConfig.countLabel}</h2>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {events.map((event) => {
                const isActive = selectedEventId === event.id;
                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setRejectReason("");
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className={`font-semibold ${isActive ? "text-white" : "text-slate-900"}`}>{event.title}</p>
                    <p className={`text-xs mt-1 ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                      {new Date(event.start_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {" - "}
                      {new Date(event.end_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <span className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActive ? "bg-slate-100 text-slate-900" : "bg-amber-100 text-amber-800"}`}>
                      {reviewConfig.queueBadge}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="xl:col-span-8 ds-card flex h-[calc(100vh-220px)] min-h-[620px] flex-col overflow-hidden p-6">
            {!selectedEvent ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">Select an event to review.</div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">{selectedEvent.title}</h2>
                      <p className="text-sm text-slate-600 mt-1">Submitted on {new Date(selectedEvent.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="ds-badge-pending">{reviewConfig.queueBadge}</span>
                      {uploadedPaperworkFile ? (
                        <button
                          type="button"
                          onClick={() => openUploadedPaperworkFile(uploadedPaperworkFile)}
                          className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100"
                        >
                          Open File
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowWordPreview(true)}
                          className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100"
                        >
                          View Word Format
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                    <DetailCard label="Start Date" value={formatDateTime(selectedEvent.start_date)} />
                    <DetailCard label="End Date" value={formatDateTime(selectedEvent.end_date)} />
                    <DetailCard label="Submitted" value={formatDateTime(selectedEvent.created_at)} />
                    <DetailCard
                      label="Total Budget"
                      value={typeof selectedEvent.budget === "number" ? `RM ${selectedEvent.budget.toLocaleString()}` : "-"}
                    />
                    <DetailCard
                      label="Student Fee"
                      value={typeof selectedEvent.fee_amount === "number" ? `RM ${Number(selectedEvent.fee_amount).toFixed(2)}` : "RM 0.00"}
                    />
                    <DetailCard label="Capacity" value={`${selectedEvent.max_students || 0} students`} />
                    <div className="md:col-span-2 xl:col-span-3">
                      <DetailCard label="Location" value={selectedEvent.location || "-"} />
                    </div>
                  </div>

                  <div className="space-y-4 pb-4">
                    {uploadedPaperworkFile ? (
                      <>
                        <UploadedPaperworkCard
                          file={uploadedPaperworkFile}
                          onOpen={() => openUploadedPaperworkFile(uploadedPaperworkFile)}
                        />
                        {(selectedEvent.purpose || selectedEvent.objective) && (
                          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Event Summary</h3>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                              {stripPaperworkFileMarker(selectedEvent.purpose) || "-"}
                            </p>
                            {stripPaperworkFileMarker(selectedEvent.objective) && (
                              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                                {stripPaperworkFileMarker(selectedEvent.objective)}
                              </p>
                            )}
                          </section>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                          <h3 className="text-sm font-black uppercase tracking-wide text-violet-800">Full Paperwork Preview</h3>
                          <p className="mt-1 text-sm font-medium text-violet-700">
                            Review all submitted paperwork sections before approving or rejecting.
                          </p>
                        </div>
                        {paperworkSections.map((section, index) => (
                          <section key={`${section.title}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">{section.title}</h3>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                              {section.body || "-"}
                            </p>
                          </section>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white pt-4">
                  <label className="ds-label">Rejection Reason (required to reject)</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="State why this submission does not meet approval criteria..."
                    className="ds-textarea"
                  />
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end mt-3">
                    <button
                      onClick={() => updateStatus(selectedEvent.id, "Rejected", rejectReason)}
                      disabled={processingId === selectedEvent.id}
                      className="px-5 py-2.5 rounded-xl text-white font-semibold bg-rose-700 hover:bg-rose-800 disabled:opacity-50"
                    >
                      {processingId === selectedEvent.id ? "Processing..." : reviewConfig.rejectLabel}
                    </button>
                    <button
                      onClick={() =>
                        updateStatus(
                          selectedEvent.id,
                          reviewConfig.approveStatus as "Approved" | "Pending Club Advisor Approval",
                        )
                      }
                      disabled={processingId === selectedEvent.id}
                      className="ds-btn-primary"
                    >
                      {processingId === selectedEvent.id ? "Processing..." : reviewConfig.approveLabel}
                    </button>
                  </div>
                </div>
              </>
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
