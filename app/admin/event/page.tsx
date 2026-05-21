"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { appendEventPosterMarker, getEventPoster, stripEventPosterMarker, UploadedEventPoster } from "@/lib/eventPoster";
import { appendPaperworkFileMarker, formatFileSize, UploadedPaperworkFile } from "@/lib/paperworkFile";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
  location?: string;
  purpose?: string;
  objective?: string;
  rejection_reason?: string;
};

type EditableEvent = {
  id: string;
  title: string;
  location: string;
  purpose: string;
  objective: string;
  start_date: string;
  end_date: string;
  budget: string;
  fee_amount: string;
  max_students: string;
  status: string;
};

const STATUSES = {
  draft: "Draft",
  pendingHighCouncil: "Pending High Council Approval",
  pendingClubAdvisor: "Pending Club Advisor Approval",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  closed: "Closed",
  completed: "completed",
} as const;

const toDateTimeInputValue = (value?: string) => {
  if (!value) return "";
  if (value.includes("T")) return value.slice(0, 16);
  return `${value}T09:00`;
};

function AdminEventContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isEventListMode = mode === "events" || mode === "edit";
  const [title, setTitle] = useState("");
  const [organizedBy, setOrganizedBy] = useState("");
  const [purpose, setPurpose] = useState("");
  const [backgroundIntro, setBackgroundIntro] = useState("");
  const [pastApplicationHistory, setPastApplicationHistory] = useState("");
  const [pastAchievementRecord, setPastAchievementRecord] = useState("");
  const [objective, setObjective] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [participantEscortList, setParticipantEscortList] = useState("");
  const [strategicAlignment, setStrategicAlignment] = useState("");
  const [externalInvolvement, setExternalInvolvement] = useState("");
  const [impactDetails, setImpactDetails] = useState("");
  const [tentativeProgram, setTentativeProgram] = useState("");
  const [committeeDetails, setCommitteeDetails] = useState("");
  const [budgetBreakdown, setBudgetBreakdown] = useState("");
  const [otherNeeds, setOtherNeeds] = useState("");
  const [ifNotApprovedImpact, setIfNotApprovedImpact] = useState("");
  const [decisionRequest, setDecisionRequest] = useState("");
  const [sustainabilityDetails, setSustainabilityDetails] = useState("");
  const [location, setLocation] = useState("");
  const [activityDay, setActivityDay] = useState("");
  const [activityTime, setActivityTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [feeAmount, setFeeAmount] = useState("0");
  const [maxStudents, setMaxStudents] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterFileInputKey, setPosterFileInputKey] = useState(0);
  const [paperworkFile, setPaperworkFile] = useState<File | null>(null);
  const [paperworkFileInputKey, setPaperworkFileInputKey] = useState(0);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingEvent, setEditingEvent] = useState<EditableEvent | null>(null);
  const [editingPosterFile, setEditingPosterFile] = useState<File | null>(null);
  const [editingPosterFileInputKey, setEditingPosterFileInputKey] = useState(0);
  const [editingPosterRemoved, setEditingPosterRemoved] = useState(false);
  const [updatingEvent, setUpdatingEvent] = useState(false);
  const [publishingEventId, setPublishingEventId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEvents(data as Event[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadEvents]);

  const formatPaperworkDate = (value: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("ms-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const buildPaperworkHeader = () =>
    [
      "UNIVERSITI TUN HUSSEIN ONN MALAYSIA",
      "",
      "KERTAS KERJA",
      title.trim().toUpperCase(),
      "",
      "PEJABAT HAL EHWAL PELAJAR",
      "UNIVERSITI TUN HUSSEIN ONN MALAYSIA",
    ].join("\n");

  const buildPurposePayload = () => {
    const blocks: string[] = [];
    blocks.push(buildPaperworkHeader());
    blocks.push(
      [
        "1.0 TUJUAN",
        `Tujuan kertas kerja ini adalah untuk memohon pertimbangan dan kelulusan Pengarah Pejabat Hal Ehwal Pelajar mengenai cadangan ${title.trim()}.`,
        purpose.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
    blocks.push(
      `2.0 LATAR BELAKANG\n2.1 Pengenalan: ${backgroundIntro.trim()}\n2.2 Sejarah permohonan lepas: ${pastApplicationHistory.trim()}\n2.3 Rekod pencapaian lepas: ${pastAchievementRecord.trim()}`,
    );
    blocks.push(
      `3.0 NAMA AKTIVITI DAN PENGANJUR\n3.1 Nama Aktiviti: ${title.trim()}\n3.2 Nama Penganjur: ${organizedBy.trim()}`,
    );
    blocks.push(
      `4.0 BUTIRAN AKTIVITI\n4.1 Tarikh: ${formatPaperworkDate(startDate)} hingga ${formatPaperworkDate(endDate)}\n4.2 Hari: ${activityDay.trim()}\n4.3 Lokasi: ${location.trim()}\n4.4 Masa: ${activityTime.trim()}`,
    );
    blocks.push(`5.0 OBJEKTIF AKTIVITI\nObjektif aktiviti adalah seperti berikut:\n${objective.trim()}`);
    blocks.push(`6.0 PERNYATAAN MASALAH\n${problemStatement.trim()}`);
    blocks.push(
      `7.0 SENARAI PESERTA DAN PENGIRING\nBilangan Peserta: ${maxStudents}\nButiran Peserta/Pengiring:\n${participantEscortList.trim()}`,
    );
    blocks.push(
      `8.0 SASARAN PADANAN TERAS AKTIVITI DAN KEBERHASILAN GRADUAN\n${strategicAlignment.trim()}`,
    );
    return blocks.join("\n\n");
  };

  const buildObjectivePayload = () => {
    const blocks: string[] = [];
    blocks.push(
      `9.0 PENGLIBATAN INDUSTRI/ PERSATUAN/ AGENSI/ BADAN ORGANISASI LUAR SEBAGAI MENTOR/ PENASIHAT\n${externalInvolvement.trim() || "-"}`,
    );
    blocks.push(
      `10.0 KEBERHASILAN AKTIVITI / IMPAK\n10.1 Kepada Pelajar / Peserta:\n${impactDetails.trim() || "-"}\n10.2 Kepada Kelab / Universiti / Komuniti:\n-\n10.3 Kepada Kelestarian:\n${sustainabilityDetails.trim()}`,
    );
    blocks.push(`11.0 ATUR CARA AKTIVITI\n${tentativeProgram.trim()}`);
    blocks.push(`12.0 JAWATANKUASA AKTIVITI\n${committeeDetails.trim()}`);
    blocks.push(`13.0 ANGGARAN BELANJAWAN\nJumlah Keseluruhan (RM): ${budget}\nPerincian:\n${budgetBreakdown.trim()}`);
    blocks.push(`14.0 LAIN-LAIN\n${otherNeeds.trim()}`);
    blocks.push(`15.0 IMPLIKASI SEKIRANYA TIDAK DILULUSKAN\n${ifNotApprovedImpact.trim()}`);
    blocks.push(`16.0 KEPUTUSAN\n${decisionRequest.trim()}`);
    blocks.push(
      `LAMPIRAN 2\nCADANGAN AKTIVITI KELESTARIAN\n${sustainabilityDetails.trim()}`,
    );
    return blocks.join("\n\n");
  };

  const uploadPaperworkFile = async (file: File): Promise<UploadedPaperworkFile | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert("Please log in again before uploading paperwork.");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/paperwork/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(payload.error || "Unable to upload paperwork file.");
      return null;
    }

    return payload.file as UploadedPaperworkFile;
  };

  const uploadPosterFile = async (file: File): Promise<UploadedEventPoster | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert("Please log in again before uploading the event poster.");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/events/poster/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(payload.error || "Unable to upload event poster.");
      return null;
    }

    return payload.poster as UploadedEventPoster;
  };

  const addEvent = async (nextStatus: string) => {
    if (
      !title ||
      !purpose ||
      !location ||
      !startDate ||
      !endDate ||
      !budget ||
      !feeAmount ||
      !maxStudents ||
      !paperworkFile
    ) {
      alert("Please fill in the event details and upload the completed paperwork file.");
      return;
    }

    setSubmitting(true);
    const uploadedPoster = posterFile ? await uploadPosterFile(posterFile) : null;

    if (posterFile && !uploadedPoster) {
      setSubmitting(false);
      return;
    }

    const uploadedFile = await uploadPaperworkFile(paperworkFile);

    if (!uploadedFile) {
      setSubmitting(false);
      return;
    }

    const eventPayload = {
      title: title.trim(),
      location: location.trim(),
      purpose: purpose.trim(),
      objective: appendPaperworkFileMarker(
        uploadedPoster
          ? appendEventPosterMarker(objective.trim(), uploadedPoster)
          : objective.trim(),
        uploadedFile,
      ),
      start_date: startDate,
      end_date: endDate,
      budget: parseFloat(budget),
      fee_amount: parseFloat(feeAmount),
      max_students: parseInt(maxStudents, 10),
      status: nextStatus,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("events")
      .insert(eventPayload)
      .select("id")
      .limit(1);

    if (error) {
      alert(error.message);
      setSubmitting(false);
      return;
    }

    setTitle("");
    setOrganizedBy("");
    setPurpose("");
    setBackgroundIntro("");
    setPastApplicationHistory("");
    setPastAchievementRecord("");
    setObjective("");
    setProblemStatement("");
    setParticipantEscortList("");
    setStrategicAlignment("");
    setExternalInvolvement("");
    setImpactDetails("");
    setTentativeProgram("");
    setCommitteeDetails("");
    setBudgetBreakdown("");
    setOtherNeeds("");
    setIfNotApprovedImpact("");
    setDecisionRequest("");
    setSustainabilityDetails("");
    setLocation("");
    setActivityDay("");
    setActivityTime("");
    setStartDate("");
    setEndDate("");
    setBudget("");
    setFeeAmount("0");
    setMaxStudents("");
    setPosterFile(null);
    setPosterFileInputKey((value) => value + 1);
    setPaperworkFile(null);
    setPaperworkFileInputKey((value) => value + 1);

    await loadEvents();
    setSubmitting(false);
  };

  const resubmitEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .update({ status: STATUSES.pendingHighCouncil, rejection_reason: null })
      .eq("id", eventId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadEvents();
  };

  const deleteEvent = async (eventId: string) => {
    const confirmed = confirm("Delete this event and all related registrations/certificates?");
    if (!confirmed) return;

    await supabase.from("event_registrations").delete().eq("event_id", eventId);
    await supabase.from("certificates").delete().eq("event_id", eventId);

    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      alert(error.message);
      return;
    }

    await loadEvents();
  };

  const filteredEvents = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch = !needle || event.title.toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  const publicEventCount = events.filter((event) => event.status === STATUSES.published).length;
  const editingOriginalEvent = editingEvent
    ? events.find((event) => event.id === editingEvent.id)
    : null;
  const editingCurrentPoster =
    editingPosterRemoved ? null : getEventPoster(editingOriginalEvent?.objective);

  const startEditingEvent = (event: Event) => {
    setShowPreview(false);
    setEditingPosterFile(null);
    setEditingPosterFileInputKey((value) => value + 1);
    setEditingPosterRemoved(false);
    setEditingEvent({
      id: event.id,
      title: event.title || "",
      location: event.location || "",
      purpose: event.purpose || "",
      objective: stripEventPosterMarker(event.objective),
      start_date: toDateTimeInputValue(event.start_date),
      end_date: toDateTimeInputValue(event.end_date),
      budget: String(event.budget ?? 0),
      fee_amount: String(event.fee_amount ?? 0),
      max_students: String(event.max_students ?? 0),
      status: event.status || STATUSES.draft,
    });
  };

  const updateEvent = async () => {
    if (!editingEvent) return;

    if (
      !editingEvent.title.trim() ||
      !editingEvent.location.trim() ||
      !editingEvent.start_date ||
      !editingEvent.end_date ||
      !editingEvent.max_students.trim()
    ) {
      alert("Please fill in title, location, start date, end date, and capacity.");
      return;
    }

    setUpdatingEvent(true);
    const existingEvent = events.find((event) => event.id === editingEvent.id);
    const existingPoster = getEventPoster(existingEvent?.objective);
    const uploadedPoster = editingPosterFile ? await uploadPosterFile(editingPosterFile) : null;

    if (editingPosterFile && !uploadedPoster) {
      setUpdatingEvent(false);
      return;
    }

    const nextPoster = uploadedPoster || (editingPosterRemoved ? null : existingPoster);
    const nextObjective = nextPoster
      ? appendEventPosterMarker(editingEvent.objective.trim(), nextPoster)
      : stripEventPosterMarker(editingEvent.objective.trim());

    const { error } = await supabase
      .from("events")
      .update({
        title: editingEvent.title.trim(),
        location: editingEvent.location.trim(),
        purpose: editingEvent.purpose.trim(),
        objective: nextObjective,
        start_date: editingEvent.start_date,
        end_date: editingEvent.end_date,
        budget: parseFloat(editingEvent.budget || "0"),
        fee_amount: parseFloat(editingEvent.fee_amount || "0"),
        max_students: parseInt(editingEvent.max_students, 10),
        status: editingEvent.status,
        ...(editingEvent.status === STATUSES.rejected ? {} : { rejection_reason: null }),
      })
      .eq("id", editingEvent.id);

    setUpdatingEvent(false);

    if (error) {
      alert("Error updating event: " + error.message);
      return;
    }

    setEditingEvent(null);
    setEditingPosterFile(null);
    setEditingPosterFileInputKey((value) => value + 1);
    setEditingPosterRemoved(false);
    setShowPreview(false);
    await loadEvents();
  };

  const updateEventVisibility = async (event: Event, visible: boolean) => {
    if (visible && event.status !== STATUSES.approved) {
      alert("Only approved events can be shown on the main page.");
      return;
    }

    const confirmed = confirm(
      visible
        ? `Show "${event.title}" on the main page and student event list?`
        : `Hide "${event.title}" from the main page and student event list?`
    );
    if (!confirmed) return;

    setPublishingEventId(event.id);
    const { error } = await supabase
      .from("events")
      .update({ status: visible ? STATUSES.published : STATUSES.draft, rejection_reason: null })
      .eq("id", event.id);

    setPublishingEventId(null);

    if (error) {
      alert("Error updating event visibility: " + error.message);
      return;
    }

    await loadEvents();
  };

  const requiredChecks = useMemo(
    () => [
      title,
      purpose,
      location,
      startDate,
      endDate,
      budget,
      feeAmount,
      maxStudents,
      paperworkFile ? paperworkFile.name : "",
    ],
    [
      title,
      purpose,
      location,
      startDate,
      endDate,
      budget,
      feeAmount,
      maxStudents,
      paperworkFile,
    ],
  );
  const completedRequired = requiredChecks.filter((value) => value.trim().length > 0).length;
  const completionPercent = Math.round((completedRequired / requiredChecks.length) * 100);

  const statusBadgeClass = (status: string) => {
    if (status === STATUSES.published || status === STATUSES.approved) return "ds-badge-approved";
    if (status === STATUSES.rejected) return "ds-badge-rejected";
    if (status === STATUSES.pendingClubAdvisor) return "ds-badge bg-indigo-100 text-indigo-800";
    if (status === STATUSES.closed || status === STATUSES.completed) return "ds-badge-completed";
    if (status === STATUSES.draft) return "ds-badge bg-slate-100 text-slate-700";
    return "ds-badge-pending";
  };

  const statusLabel = (status: string) =>
    status === STATUSES.completed ? "Completed" : status;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isEventListMode ? "Events" : "Paperwork"}
        </h1>
        <p className="text-sm text-slate-600">
          {isEventListMode
            ? "Update existing event details shown across the public event pages."
            : "Upload the completed paperwork file and send it through the approval flow."}
        </p>
      </div>

      {!isEventListMode && (
      <div className="ds-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Submit Completed Paperwork</h2>
          <div className="w-full md:w-96">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Kelengkapan borang</span>
              <span>{completedRequired}/{requiredChecks.length} ({completionPercent}%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-slate-800" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="ds-label">Event Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="ds-input" />
          </div>
          <div className="lg:col-span-2">
            <label className="ds-label">Public Event Summary *</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              placeholder="Short description shown to students after the event is approved and published."
              className="ds-textarea"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="ds-label">Public Objective</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              placeholder="Optional objective shown on the event detail page."
              className="ds-textarea"
            />
          </div>
          <div>
            <label className="ds-label">Location *</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">Capacity *</label>
            <input type="number" min="1" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">Start Date & Time *</label>
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">End Date & Time *</label>
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">Total Budget (RM) *</label>
            <input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">Student Fee (RM) *</label>
            <input type="number" min="0" step="0.01" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className="ds-input" />
          </div>
          <div className="lg:col-span-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-5">
            <label className="ds-label">Event Poster Image</label>
            <input
              key={posterFileInputKey}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => setPosterFile(event.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-emerald-700"
            />
            <p className="mt-3 text-sm font-medium text-emerald-800">
              Optional public poster shown on the main page, event list, and event detail page.
            </p>
            {posterFile && (
              <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-800">
                Selected: {posterFile.name} ({formatFileSize(posterFile.size)})
              </p>
            )}
          </div>
          <div className="lg:col-span-2 rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 p-5">
            <label className="ds-label">Completed Paperwork File *</label>
            <input
              key={paperworkFileInputKey}
              type="file"
              accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              onChange={(event) => setPaperworkFile(event.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-violet-700"
            />
            <p className="mt-3 text-sm font-medium text-violet-800">
              Upload the completed UTHM paperwork in Word or PDF format. High Council and Club Advisor will open this exact file for review.
            </p>
            {paperworkFile && (
              <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-800">
                Selected: {paperworkFile.name} ({formatFileSize(paperworkFile.size)})
              </p>
            )}
          </div>
        </div>

        <div className="hidden">
        <div>
          <label className="ds-label">3.1 Nama Aktiviti *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="ds-input" />
        </div>

        <div>
          <label className="ds-label">3.2 Nama Penganjur *</label>
          <input value={organizedBy} onChange={(e) => setOrganizedBy(e.target.value)} className="ds-input" />
        </div>

        <div className="space-y-6">
          <div>
            <label className="ds-label">1.0 Tujuan *</label>
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} className="ds-textarea" />
          </div>
          <div>
            <label className="ds-label">5.0 Objektif Aktiviti *</label>
            <textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} className="ds-textarea" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="ds-label">2.1 Pengenalan *</label>
            <textarea value={backgroundIntro} onChange={(e) => setBackgroundIntro(e.target.value)} rows={3} className="ds-textarea" />
          </div>
          <div>
            <label className="ds-label">2.2 Sejarah Permohonan Lepas</label>
            <textarea value={pastApplicationHistory} onChange={(e) => setPastApplicationHistory(e.target.value)} rows={3} className="ds-textarea" />
          </div>
          <div>
            <label className="ds-label">2.3 Rekod Pencapaian Lepas</label>
            <textarea value={pastAchievementRecord} onChange={(e) => setPastAchievementRecord(e.target.value)} rows={3} className="ds-textarea" />
          </div>
        </div>

        <div>
          <label className="ds-label">6.0 Pernyataan Masalah *</label>
          <textarea value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} rows={3} className="ds-textarea" />
        </div>

        <div className="space-y-6">
          <div>
            <label className="ds-label">4.3 Lokasi *</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">4.4 Masa *</label>
            <input value={activityTime} onChange={(e) => setActivityTime(e.target.value)} className="ds-input" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="ds-label">4.1 Tarikh Mula *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">4.1 Tarikh Tamat *</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">4.2 Hari *</label>
            <input value={activityDay} onChange={(e) => setActivityDay(e.target.value)} className="ds-input" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="ds-label">7.0 Senarai Peserta dan Pengiring *</label>
            <textarea value={participantEscortList} onChange={(e) => setParticipantEscortList(e.target.value)} rows={3} className="ds-textarea" />
          </div>
          <div>
            <label className="ds-label">8.0 Padanan Teras & Keberhasilan Graduan *</label>
            <textarea value={strategicAlignment} onChange={(e) => setStrategicAlignment(e.target.value)} rows={3} className="ds-textarea" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="ds-label">9.0 Penglibatan Industri/Agensi</label>
            <textarea value={externalInvolvement} onChange={(e) => setExternalInvolvement(e.target.value)} rows={3} className="ds-textarea" />
          </div>
          <div>
            <label className="ds-label">10.0 Keberhasilan / Impak</label>
            <textarea value={impactDetails} onChange={(e) => setImpactDetails(e.target.value)} rows={3} className="ds-textarea" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="ds-label">11.0 Atur Cara Aktiviti *</label>
            <textarea value={tentativeProgram} onChange={(e) => setTentativeProgram(e.target.value)} rows={3} className="ds-textarea" />
          </div>
          <div>
            <label className="ds-label">12.0 Jawatankuasa Aktiviti *</label>
            <textarea value={committeeDetails} onChange={(e) => setCommitteeDetails(e.target.value)} rows={3} className="ds-textarea" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="ds-label">13.0 Jumlah Belanjawan (RM) *</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">Yuran Penyertaan (RM) *</label>
            <input type="number" min="0" step="0.01" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">Bil. Peserta *</label>
            <input type="number" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label className="ds-label">14.0 Lain-lain</label>
            <textarea value={otherNeeds} onChange={(e) => setOtherNeeds(e.target.value)} rows={1} className="ds-textarea" />
          </div>
        </div>

        <div>
          <label className="ds-label">13.0 Perincian Belanjawan *</label>
          <textarea value={budgetBreakdown} onChange={(e) => setBudgetBreakdown(e.target.value)} rows={3} className="ds-textarea" />
        </div>

        <div className="space-y-6">
          <div>
            <label className="ds-label">15.0 Implikasi Jika Tidak Diluluskan *</label>
            <textarea value={ifNotApprovedImpact} onChange={(e) => setIfNotApprovedImpact(e.target.value)} rows={3} className="ds-textarea" />
          </div>
          <div>
            <label className="ds-label">16.0 Keputusan / Permohonan Kelulusan *</label>
            <textarea value={decisionRequest} onChange={(e) => setDecisionRequest(e.target.value)} rows={3} className="ds-textarea" />
          </div>
        </div>

        <div>
          <label className="ds-label">Lampiran 2: Aktiviti Kelestarian *</label>
          <textarea value={sustainabilityDetails} onChange={(e) => setSustainabilityDetails(e.target.value)} rows={3} className="ds-textarea" />
        </div>
        </div>

        <div className="flex flex-col justify-end gap-3 sm:flex-row">
          <button
            onClick={() => addEvent(STATUSES.draft)}
            disabled={submitting}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => addEvent(STATUSES.pendingHighCouncil)}
            disabled={submitting}
            className="ds-btn-primary"
          >
            {submitting ? "Saving..." : "Submit Paperwork"}
          </button>
        </div>
      </div>
      )}

      <div id="event-details" className="ds-card scroll-mt-6 p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">All Events</h2>
            <p className="mt-1 text-sm text-slate-600">
              {publicEventCount} published event{publicEventCount === 1 ? "" : "s"} are visible to students.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px] lg:w-[620px]">
            <input
              type="text"
              placeholder="Search events by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ds-input"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ds-input"
            >
              <option value="all">All statuses</option>
              <option value={STATUSES.draft}>Draft</option>
              <option value={STATUSES.pendingHighCouncil}>Pending High Council Approval</option>
              <option value={STATUSES.pendingClubAdvisor}>Pending Club Advisor Approval</option>
              <option value={STATUSES.approved}>Approved</option>
              <option value={STATUSES.rejected}>Rejected</option>
              <option value={STATUSES.published}>Published</option>
              <option value={STATUSES.closed}>Closed</option>
              <option value={STATUSES.completed}>Completed</option>
            </select>
          </div>
        </div>

        {editingEvent && (
          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit Event Details</h3>
                <p className="text-sm text-slate-600">
                  Only Published events appear on the main page and student event list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setEditingPosterFile(null);
                  setEditingPosterFileInputKey((value) => value + 1);
                  setEditingPosterRemoved(false);
                  setShowPreview(false);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="ds-label">Event Title</label>
                <input
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">Location</label>
                <input
                  value={editingEvent.location}
                  onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={editingEvent.start_date}
                  onChange={(e) => setEditingEvent({ ...editingEvent, start_date: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={editingEvent.end_date}
                  onChange={(e) => setEditingEvent({ ...editingEvent, end_date: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">Fee Amount (RM)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingEvent.fee_amount}
                  onChange={(e) => setEditingEvent({ ...editingEvent, fee_amount: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={editingEvent.max_students}
                  onChange={(e) => setEditingEvent({ ...editingEvent, max_students: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">Budget (RM)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingEvent.budget}
                  onChange={(e) => setEditingEvent({ ...editingEvent, budget: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">Status</label>
                <select
                  value={editingEvent.status}
                  onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value })}
                  className="ds-input"
                >
                  <option value={STATUSES.draft}>Draft</option>
                  <option value={STATUSES.pendingHighCouncil}>Pending High Council Approval</option>
                  <option value={STATUSES.pendingClubAdvisor}>Pending Club Advisor Approval</option>
                  <option value={STATUSES.approved}>Approved</option>
                  <option value={STATUSES.rejected}>Rejected</option>
                  <option value={STATUSES.published}>Published</option>
                  <option value={STATUSES.closed}>Closed</option>
                  <option value={STATUSES.completed}>Completed</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="ds-label">Public Summary / Purpose</label>
                <textarea
                  rows={4}
                  value={editingEvent.purpose}
                  onChange={(e) => setEditingEvent({ ...editingEvent, purpose: e.target.value })}
                  className="ds-textarea"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="ds-label">Objective</label>
                <textarea
                  rows={4}
                  value={editingEvent.objective}
                  onChange={(e) => setEditingEvent({ ...editingEvent, objective: e.target.value })}
                  className="ds-textarea"
                />
              </div>
              <div className="lg:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <label className="ds-label">Event Poster Image</label>
                {editingCurrentPoster && (
                  <div className="mb-4 grid gap-4 md:grid-cols-[180px_1fr]">
                    <img
                      src={editingCurrentPoster.publicUrl}
                      alt={`${editingEvent.title || "Event"} poster`}
                      className="h-44 w-full rounded-lg border border-emerald-200 object-cover"
                    />
                    <div className="text-sm text-emerald-900">
                      <p className="font-bold">{editingCurrentPoster.name}</p>
                      <p className="mt-1 font-medium">
                        {formatFileSize(editingCurrentPoster.size)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPosterRemoved(true);
                          setEditingPosterFile(null);
                          setEditingPosterFileInputKey((value) => value + 1);
                        }}
                        className="mt-4 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                      >
                        Remove Poster
                      </button>
                    </div>
                  </div>
                )}
                <input
                  key={editingPosterFileInputKey}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    setEditingPosterFile(event.target.files?.[0] || null);
                    setEditingPosterRemoved(false);
                  }}
                  className="block w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-emerald-700"
                />
                {editingPosterFile && (
                  <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-800">
                    New poster: {editingPosterFile.name} ({formatFileSize(editingPosterFile.size)})
                  </p>
                )}
                {!editingCurrentPoster && !editingPosterFile && (
                  <p className="mt-3 text-sm font-medium text-emerald-800">
                    Add a poster to replace the default event image on public pages.
                  </p>
                )}
              </div>
            </div>

            {showPreview && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Same Page Preview
                </p>
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                  <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-violet-700 p-5 text-white">
                    {editingCurrentPoster && (
                      <img
                        src={editingCurrentPoster.publicUrl}
                        alt={`${editingEvent.title || "Event"} poster`}
                        className="mb-4 max-h-72 w-full rounded-lg object-cover"
                      />
                    )}
                    <p className="text-xs font-bold uppercase text-violet-200">
                      {editingEvent.start_date
                        ? new Date(editingEvent.start_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Date not set"}
                    </p>
                    <h4 className="mt-3 text-2xl font-black">{editingEvent.title || "Untitled event"}</h4>
                  </div>
                  <div className="grid gap-5 bg-white p-5 lg:grid-cols-[1fr_280px]">
                    <div>
                      <p className="text-sm leading-6 text-slate-600">
                        {editingEvent.purpose ||
                          editingEvent.objective ||
                          "Event summary will appear here for students and public visitors."}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                      <div className="grid gap-3">
                        <p>
                          <span className="block text-xs font-bold uppercase text-slate-500">Venue</span>
                          <span className="font-semibold text-slate-900">
                            {editingEvent.location || "Venue will be announced"}
                          </span>
                        </p>
                        <p>
                          <span className="block text-xs font-bold uppercase text-slate-500">Fee</span>
                          <span className="font-semibold text-slate-900">
                            {Number(editingEvent.fee_amount || 0) > 0
                              ? `RM ${Number(editingEvent.fee_amount).toFixed(2)}`
                              : "Free"}
                          </span>
                        </p>
                        <p>
                          <span className="block text-xs font-bold uppercase text-slate-500">Seats</span>
                          <span className="font-semibold text-slate-900">
                            {editingEvent.max_students || "0"} seats
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowPreview((value) => !value)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showPreview ? "Hide Preview" : "Preview Here"}
              </button>
              <button
                type="button"
                onClick={updateEvent}
                disabled={updatingEvent}
                className="ds-btn-primary"
              >
                {updatingEvent ? "Saving..." : "Save Event Changes"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-gray-500 py-4">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-gray-500 py-4">No events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Location</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Fee</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Detail</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{event.title}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{event.start_date} - {event.end_date}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{event.location || "-"}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">RM {Number(event.fee_amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      <span className={statusBadgeClass(event.status)}>{statusLabel(event.status)}</span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{event.rejection_reason || "-"}</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditingEvent(event)}
                          className="px-2 py-1 bg-slate-800 text-white rounded hover:bg-slate-900"
                        >
                          Edit
                        </button>
                        <Link
                          href={`/admin/report?eventId=${event.id}`}
                          className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Report
                        </Link>
                        {event.status === STATUSES.approved && (
                          <button
                            onClick={() => updateEventVisibility(event, true)}
                            disabled={publishingEventId === event.id}
                            className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {publishingEventId === event.id ? "Updating..." : "Show on Main Page"}
                          </button>
                        )}
                        {event.status !== STATUSES.approved &&
                          event.status !== STATUSES.published &&
                          event.status !== STATUSES.rejected && (
                            <span className="px-2 py-1 text-xs font-semibold text-slate-500">
                              Publish after approval
                            </span>
                          )}
                        {event.status === STATUSES.published && (
                          <button
                            onClick={() => updateEventVisibility(event, false)}
                            disabled={publishingEventId === event.id}
                            className="px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {publishingEventId === event.id ? "Updating..." : "Hide from Main Page"}
                          </button>
                        )}
                        {event.status === STATUSES.rejected && (
                          <button
                            onClick={() => resubmitEvent(event.id)}
                            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Resubmit
                          </button>
                        )}
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminEventPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 py-4">Loading events...</div>}>
      <AdminEventContent />
    </Suspense>
  );
}
