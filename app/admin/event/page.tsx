"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { appendEventPosterMarker, getEventPoster, stripEventPosterMarker, UploadedEventPoster } from "@/lib/eventPoster";
import { appendPaperworkFileMarker, formatFileSize, getPaperworkFile, UploadedPaperworkFile } from "@/lib/paperworkFile";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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
  pendingApproval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  closed: "Closed",
  completed: "Completed",
} as const;

const toDateTimeInputValue = (value?: string) => {
  if (!value) return "";
  if (value.includes("T")) return value.slice(0, 16);
  return `${value}T09:00`;
};

const toComparableDate = (value?: string) => {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value}T00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateRangesOverlap = (
  startA?: string,
  endA?: string,
  startB?: string,
  endB?: string,
) => {
  const aStart = toComparableDate(startA);
  const aEnd = toComparableDate(endA || startA);
  const bStart = toComparableDate(startB);
  const bEnd = toComparableDate(endB || startB);

  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
};

function AdminEventContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const mode = searchParams.get("mode");
  const isEventListMode = mode === "events" || mode === "edit";
  const isAdminRoute = pathname.startsWith("/admin");
  const eventRoute = isAdminRoute ? "/admin/event" : "/committee/event";
  const approvalRoute = isAdminRoute ? "/admin/approval-status" : "/committee/approval-status";
  const certificateRoute = isAdminRoute ? "/admin/certificates" : "/committee/certificates";
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
  const [selectedEventId, setSelectedEventId] = useState("");
  const [activeDetailsTab, setActiveDetailsTab] = useState("Overview");

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
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
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
      .update({ status: STATUSES.pendingApproval, rejection_reason: null })
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

  const newEventConflicts = useMemo(
    () =>
      events.filter((event) =>
        dateRangesOverlap(startDate, endDate || startDate, event.start_date, event.end_date),
      ),
    [endDate, events, startDate],
  );

  const publicEventCount = events.filter((event) => event.status === STATUSES.published).length;
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ||
    filteredEvents[0] ||
    events[0] ||
    null;
  const editingOriginalEvent = editingEvent
    ? events.find((event) => event.id === editingEvent.id)
    : null;
  const editingCurrentPoster =
    editingPosterRemoved ? null : getEventPoster(editingOriginalEvent?.objective);
  const editingEventConflicts = useMemo(
    () =>
      editingEvent
        ? events.filter(
            (event) =>
              event.id !== editingEvent.id &&
              dateRangesOverlap(
                editingEvent.start_date,
                editingEvent.end_date || editingEvent.start_date,
                event.start_date,
                event.end_date,
              ),
          )
        : [],
    [editingEvent, events],
  );

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
    if (status === STATUSES.pendingApproval) return "ds-badge bg-indigo-100 text-indigo-800";
    if (status === STATUSES.closed || status === STATUSES.completed) return "ds-badge-completed";
    if (status === STATUSES.draft) return "ds-badge bg-slate-100 text-slate-700";
    return "ds-badge-pending";
  };

  const statusLabel = (status: string) =>
    status === STATUSES.completed ? "Completed" : status;

  const formatEventDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatEventTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const detailId = (event?: Event | null) =>
    event ? `EVT-${event.created_at ? new Date(event.created_at).getFullYear() : "0000"}-${event.id.slice(0, 6).toUpperCase()}` : "EVT";

  const categoryForEvent = (event?: Event | null) => {
    const text = `${event?.title || ""} ${event?.purpose || ""}`.toLowerCase();
    if (text.includes("workshop")) return "Workshop";
    if (text.includes("talk") || text.includes("seminar")) return "Talk";
    if (text.includes("competition") || text.includes("challenge")) return "Competition";
    if (text.includes("training")) return "Training";
    return "Program";
  };

  const reviewStage = (event?: Event | null) => {
    if (!event) return "Draft";
    if (event.status === STATUSES.approved || event.status === STATUSES.published) return "Approved";
    if (event.status === STATUSES.rejected) return "Rejected";
    if (event.status === STATUSES.pendingApproval) return "Pending High Council";
    if (event.status === "Pending Club Advisor Approval") return "Pending Club Advisor";
    if (event.status === STATUSES.completed || event.status === STATUSES.closed) return "Completed";
    return event.status || "Draft";
  };

  const detailTabs = ["Overview", "Paperwork", "Timeline", "Participants", "Certificates", "Activity Log"];

  const detailTimeline = (event?: Event | null) => [
    {
      label: "Draft Created",
      detail: event ? `Created on ${formatEventDate(event.created_at)}` : "Waiting for paperwork",
      state: event ? "done" : "pending",
    },
    {
      label: "Submitted to High Council",
      detail: event?.status === STATUSES.draft ? "Submit paperwork for review" : "Paperwork submitted",
      state: event && event.status !== STATUSES.draft ? "done" : "pending",
    },
    {
      label: "Reviewed by High Council",
      detail: event?.status === STATUSES.rejected ? event.rejection_reason || "Changes requested" : "High Council review stage",
      state:
        event?.status === STATUSES.rejected
          ? "rejected"
          : event?.status === STATUSES.approved || event?.status === STATUSES.published || event?.status === STATUSES.completed || event?.status === STATUSES.closed
            ? "done"
            : event?.status === STATUSES.pendingApproval
              ? "current"
              : "pending",
    },
    {
      label: "Reviewed by Club Advisor",
      detail: "Final review before publishing",
      state:
        event?.status === STATUSES.approved || event?.status === STATUSES.published || event?.status === STATUSES.completed || event?.status === STATUSES.closed
          ? "done"
          : event?.status === "Pending Club Advisor Approval"
            ? "current"
            : "pending",
    },
    {
      label: "Published",
      detail: event?.status === STATUSES.published ? "Visible to students" : "Publish after approval",
      state: event?.status === STATUSES.published || event?.status === STATUSES.completed || event?.status === STATUSES.closed ? "current" : "pending",
    },
    {
      label: "Certificate Draft Generated",
      detail: "Available after event completion",
      state: event?.status === STATUSES.completed || event?.status === STATUSES.closed ? "current" : "pending",
    },
  ];

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
              Upload the completed UTHM paperwork in Word or PDF format. The High Council will open this exact file for review.
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

        {newEventConflicts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold">Schedule warning: overlapping event detected.</p>
            <p className="mt-1">
              This does not block submission. Please review the overlap before saving.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {newEventConflicts.slice(0, 3).map((event) => (
                <li key={event.id}>
                  {event.title} ({event.start_date} - {event.end_date})
                </li>
              ))}
              {newEventConflicts.length > 3 && <li>+{newEventConflicts.length - 3} more</li>}
            </ul>
          </div>
        )}

        <div className="flex flex-col justify-end gap-3 sm:flex-row">
          <button
            onClick={() => addEvent(STATUSES.draft)}
            disabled={submitting}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => addEvent(STATUSES.pendingApproval)}
            disabled={submitting}
            className="ds-btn-primary"
          >
            {submitting ? "Saving..." : "Submit Paperwork"}
          </button>
        </div>
      </div>
      )}

      <div id="event-details" className="scroll-mt-6 space-y-5">
        {selectedEvent && (
          <section className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Link href={`${eventRoute}?mode=events#event-details`} className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800">
                  <span aria-hidden="true">-&lt;</span>
                  Back to Event List
                </Link>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    Event Details &gt; {selectedEvent.title}
                  </h2>
                  <span className={statusBadgeClass(selectedEvent.status)}>{statusLabel(selectedEvent.status)}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Created on {formatEventDate(selectedEvent.created_at)}, {formatEventTime(selectedEvent.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEditingEvent(selectedEvent)}
                  className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50"
                >
                  <span aria-hidden="true">/</span>
                  Edit Event
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <span aria-hidden="true">v</span>
                  Download PDF
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  More
                  <span aria-hidden="true">...</span>
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Event Date", value: formatEventDate(selectedEvent.start_date), detail: `${formatEventTime(selectedEvent.start_date)} - ${formatEventTime(selectedEvent.end_date)}`, tone: "bg-blue-100 text-blue-700" },
                { label: "Venue", value: selectedEvent.location || "To be confirmed", detail: "Event location", tone: "bg-amber-100 text-amber-700" },
                { label: "Category", value: categoryForEvent(selectedEvent), detail: "Program category", tone: "bg-orange-100 text-orange-700" },
                { label: "Expected Participants", value: `${selectedEvent.max_students || 0}`, detail: "Students", tone: "bg-indigo-100 text-indigo-700" },
                { label: "Current Status", value: statusLabel(selectedEvent.status), detail: reviewStage(selectedEvent), tone: "bg-emerald-100 text-emerald-700" },
              ].map((card) => (
                <section key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${card.tone}`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h6" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{card.label}</p>
                      <p className="mt-1 truncate text-base font-black text-slate-950">{card.value}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{card.detail}</p>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3">
                  {detailTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveDetailsTab(tab)}
                      className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-black transition ${
                        activeDetailsTab === tab
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="p-4 sm:p-5">
                  {activeDetailsTab === "Overview" ? (
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-sm font-black text-slate-950">Event Description</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {selectedEvent.purpose || "No event description has been added yet."}
                        </p>
                      </section>

                      <div className="grid gap-6 border-t border-slate-200 pt-5 lg:grid-cols-2">
                        <section>
                          <h3 className="text-sm font-black text-slate-950">Event Information</h3>
                          <div className="mt-4 grid gap-3 text-sm">
                            {[
                              ["Event ID", detailId(selectedEvent)],
                              ["Organizer", "ITC Club Committee"],
                              ["Program", `${categoryForEvent(selectedEvent)} Series`],
                              ["Mode", selectedEvent.location ? "Physical" : "To be confirmed"],
                              ["Created Date", `${formatEventDate(selectedEvent.created_at)}, ${formatEventTime(selectedEvent.created_at)}`],
                              ["Last Updated", `${formatEventDate(selectedEvent.created_at)}, ${formatEventTime(selectedEvent.created_at)}`],
                            ].map(([label, value]) => (
                              <div key={label} className="grid grid-cols-[130px_1fr] gap-3">
                                <span className="font-semibold text-slate-500">{label}</span>
                                <span className="font-bold text-slate-800">{value}</span>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3 className="text-sm font-black text-slate-950">Additional Information</h3>
                          <div className="mt-4 grid gap-3 text-sm">
                            {[
                              ["Target Audience", "All ITC Students"],
                              ["Dress Code", "Smart Casual"],
                              ["Refreshments", "To be confirmed"],
                              ["Transportation", "To be confirmed"],
                              ["Contact Person", "ITC Club Committee"],
                              ["Contact Email", "itcclub@example.edu.my"],
                            ].map(([label, value]) => (
                              <div key={label} className="grid grid-cols-[130px_1fr] gap-3">
                                <span className="font-semibold text-slate-500">{label}</span>
                                <span className="font-bold text-slate-800">{value}</span>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>

                      <div className="grid gap-6 border-t border-slate-200 pt-5 lg:grid-cols-2">
                        <section>
                          <h3 className="text-sm font-black text-slate-950">Event Objectives</h3>
                          <div className="mt-4 space-y-3">
                            {(stripEventPosterMarker(selectedEvent.objective).split(/\n+/).filter(Boolean).slice(0, 4).length
                              ? stripEventPosterMarker(selectedEvent.objective).split(/\n+/).filter(Boolean).slice(0, 4)
                              : ["Provide a structured learning experience for participants.", "Encourage student participation and technical development.", "Support ITC Club program outcomes."]
                            ).map((item) => (
                              <p key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                                <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">✓</span>
                                {item}
                              </p>
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3 className="text-sm font-black text-slate-950">Event Highlights</h3>
                          <div className="mt-4 space-y-3">
                            {["Structured event paperwork", "Approval workflow tracking", "Participant registration support", "Certificate draft preparation"].map((item) => (
                              <p key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                                <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-black text-amber-700">*</span>
                                {item}
                              </p>
                            ))}
                          </div>
                        </section>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <p className="text-base font-black text-slate-950">{activeDetailsTab}</p>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        This tab summarizes the selected event while keeping the existing workflow routes unchanged.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-4">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-slate-950">Approval Progress</h3>
                    <span className="rounded-md bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-700">{detailId(selectedEvent)}</span>
                  </div>
                  <div className="space-y-1">
                    {detailTimeline(selectedEvent).map((step, index, items) => (
                      <div key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                        {index < items.length - 1 && (
                          <span className={`absolute left-3.5 top-8 h-[calc(100%-1rem)] border-l ${step.state === "done" ? "border-emerald-300" : "border-slate-200"}`} />
                        )}
                        <span className={`z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ring-4 ring-white ${
                          step.state === "done"
                            ? "bg-emerald-500 text-white"
                            : step.state === "current"
                              ? "bg-blue-600 text-white"
                              : step.state === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-500"
                        }`}>
                          {step.state === "done" ? "✓" : index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-950">{step.label}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-950">Participants Summary</h3>
                    <Link href={`${eventRoute}?mode=events#event-details`} className="text-xs font-black text-blue-700 hover:text-blue-800">View Participants</Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-md bg-blue-50 p-3">
                      <p className="text-lg font-black text-slate-950">0</p>
                      <p className="text-[11px] font-bold text-slate-500">Registered</p>
                    </div>
                    <div className="rounded-md bg-emerald-50 p-3">
                      <p className="text-lg font-black text-slate-950">0</p>
                      <p className="text-[11px] font-bold text-slate-500">Checked In</p>
                    </div>
                    <div className="rounded-md bg-amber-50 p-3">
                      <p className="text-lg font-black text-slate-950">{selectedEvent.max_students || 0}</p>
                      <p className="text-[11px] font-bold text-slate-500">Capacity</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-950">Attachments</h3>
                    <span className="text-xs font-black text-slate-400">View All</span>
                  </div>
                  {getPaperworkFile(selectedEvent.objective) ? (
                    <div className="rounded-md border border-slate-200 p-3 text-sm">
                      <p className="font-black text-slate-950">{getPaperworkFile(selectedEvent.objective)?.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatFileSize(getPaperworkFile(selectedEvent.objective)?.size || 0)}
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      No paperwork attachment found.
                    </p>
                  )}
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-950">Quick Actions</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <button type="button" onClick={() => startEditingEvent(selectedEvent)} className="rounded-md border border-blue-200 px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">Edit Event</button>
                    <Link href={`${eventRoute}?mode=paperwork`} className="rounded-md border border-blue-200 px-3 py-2 text-center text-sm font-black text-blue-700 hover:bg-blue-50">Upload Document</Link>
                    <Link href={`${approvalRoute}?eventId=${selectedEvent.id}`} className="rounded-md border border-blue-200 px-3 py-2 text-center text-sm font-black text-blue-700 hover:bg-blue-50">View Approval Status</Link>
                    <Link href={certificateRoute} className="rounded-md border border-blue-200 px-3 py-2 text-center text-sm font-black text-blue-700 hover:bg-blue-50">Generate Certificate Draft</Link>
                  </div>
                </section>
              </aside>
            </div>
          </section>
        )}

        <div className="ds-card p-6">
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
              <option value={STATUSES.pendingApproval}>Pending Approval</option>
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
                  <option value={STATUSES.pendingApproval}>Pending Approval</option>
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

            {editingEventConflicts.length > 0 && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">Schedule warning: overlapping event detected.</p>
                <p className="mt-1">
                  This warning does not block saving. Please review the overlap before continuing.
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {editingEventConflicts.slice(0, 3).map((event) => (
                    <li key={event.id}>
                      {event.title} ({event.start_date} - {event.end_date})
                    </li>
                  ))}
                  {editingEventConflicts.length > 3 && (
                    <li>+{editingEventConflicts.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

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
                          onClick={() => {
                            setSelectedEventId(event.id);
                            startEditingEvent(event);
                          }}
                          className="px-2 py-1 bg-slate-800 text-white rounded hover:bg-slate-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setSelectedEventId(event.id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          View
                        </button>
                        <Link
                          href={`${approvalRoute}?eventId=${event.id}`}
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
