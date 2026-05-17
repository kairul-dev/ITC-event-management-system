"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
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

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingEvent, setEditingEvent] = useState<EditableEvent | null>(null);
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

  const buildPurposePayload = () => {
    const blocks: string[] = [];
    blocks.push(`1.0 TUJUAN\n${purpose.trim()}`);
    blocks.push(
      `2.0 LATAR BELAKANG\n2.1 Pengenalan: ${backgroundIntro.trim()}\n2.2 Sejarah permohonan lepas: ${pastApplicationHistory.trim()}\n2.3 Rekod pencapaian lepas: ${pastAchievementRecord.trim()}`,
    );
    blocks.push(
      `3.0 NAMA AKTIVITI DAN PENGANJUR\n3.1 Nama Aktiviti: ${title.trim()}\n3.2 Nama Penganjur: ${organizedBy.trim()}`,
    );
    blocks.push(
      `4.0 BUTIRAN AKTIVITI\n4.1 Tarikh: ${startDate} hingga ${endDate}\n4.2 Hari: ${activityDay.trim()}\n4.3 Lokasi: ${location.trim()}\n4.4 Masa: ${activityTime.trim()}`,
    );
    blocks.push(`5.0 OBJEKTIF AKTIVITI\n${objective.trim()}`);
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
    blocks.push(`9.0 PENGLIBATAN INDUSTRI / PERSATUAN / AGENSI LUAR\n${externalInvolvement.trim()}`);
    blocks.push(`10.0 KEBERHASILAN AKTIVITI / IMPAK\n${impactDetails.trim()}`);
    blocks.push(`11.0 ATUR CARA AKTIVITI\n${tentativeProgram.trim()}`);
    blocks.push(`12.0 JAWATANKUASA AKTIVITI\n${committeeDetails.trim()}`);
    blocks.push(`13.0 ANGGARAN BELANJAWAN\nJumlah Keseluruhan (RM): ${budget}\nPerincian:\n${budgetBreakdown.trim()}`);
    blocks.push(`14.0 LAIN-LAIN\n${otherNeeds.trim()}`);
    blocks.push(`15.0 IMPLIKASI SEKIRANYA TIDAK DILULUSKAN\n${ifNotApprovedImpact.trim()}`);
    blocks.push(`16.0 KEPUTUSAN\n${decisionRequest.trim()}`);
    blocks.push(`LAMPIRAN 2 (AKTIVITI KELESTARIAN)\n${sustainabilityDetails.trim()}`);
    return blocks.join("\n\n");
  };

  const addEvent = async (nextStatus: string) => {
    if (
      !title ||
      !organizedBy ||
      !purpose ||
      !backgroundIntro ||
      !objective ||
      !problemStatement ||
      !participantEscortList ||
      !strategicAlignment ||
      !tentativeProgram ||
      !committeeDetails ||
      !budgetBreakdown ||
      !ifNotApprovedImpact ||
      !decisionRequest ||
      !sustainabilityDetails ||
      !location ||
      !activityDay ||
      !activityTime ||
      !startDate ||
      !endDate ||
      !budget ||
      !feeAmount ||
      !maxStudents
    ) {
      alert("Please fill in all required paperwork fields.");
      return;
    }

    setSubmitting(true);
    const eventPayload = {
      title,
      location,
      purpose: buildPurposePayload(),
      objective: buildObjectivePayload(),
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

  const startEditingEvent = (event: Event) => {
    setShowPreview(false);
    setEditingEvent({
      id: event.id,
      title: event.title || "",
      location: event.location || "",
      purpose: event.purpose || "",
      objective: event.objective || "",
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
    const { error } = await supabase
      .from("events")
      .update({
        title: editingEvent.title.trim(),
        location: editingEvent.location.trim(),
        purpose: editingEvent.purpose.trim(),
        objective: editingEvent.objective.trim(),
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
    setShowPreview(false);
    await loadEvents();
  };

  const updateEventVisibility = async (event: Event, visible: boolean) => {
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
      organizedBy,
      purpose,
      backgroundIntro,
      objective,
      problemStatement,
      participantEscortList,
      strategicAlignment,
      tentativeProgram,
      committeeDetails,
      budgetBreakdown,
      ifNotApprovedImpact,
      decisionRequest,
      sustainabilityDetails,
      location,
      activityDay,
      activityTime,
      startDate,
      endDate,
      budget,
      feeAmount,
      maxStudents,
    ],
    [
      title,
      organizedBy,
      purpose,
      backgroundIntro,
      objective,
      problemStatement,
      participantEscortList,
      strategicAlignment,
      tentativeProgram,
      committeeDetails,
      budgetBreakdown,
      ifNotApprovedImpact,
      decisionRequest,
      sustainabilityDetails,
      location,
      activityDay,
      activityTime,
      startDate,
      endDate,
      budget,
      feeAmount,
      maxStudents,
    ],
  );
  const completedRequired = requiredChecks.filter((value) => value.trim().length > 0).length;
  const completionPercent = Math.round((completedRequired / requiredChecks.length) * 100);

  const statusBadgeClass = (status: string) => {
    if (status === STATUSES.published || status === STATUSES.approved) return "ds-badge-approved";
    if (status === STATUSES.rejected) return "ds-badge-rejected";
    if (status === STATUSES.pendingClubAdvisor) return "ds-badge bg-indigo-100 text-indigo-800";
    if (status === STATUSES.closed) return "ds-badge-completed";
    if (status === STATUSES.draft) return "ds-badge bg-slate-100 text-slate-700";
    return "ds-badge-pending";
  };

  const statusLabel = (status: string) => status;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isEventListMode ? "Events" : "Paperwork"}
        </h1>
        <p className="text-sm text-slate-600">
          {isEventListMode
            ? "Update existing event details shown across the public event pages."
            : "Isi borang kertas kerja rasmi berdasarkan format UTHM."}
        </p>
      </div>

      {!isEventListMode && (
      <div className="ds-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Borang Kertas Kerja Aktiviti</h2>
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
            </div>

            {showPreview && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Same Page Preview
                </p>
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                  <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-violet-700 p-5 text-white">
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
                        {event.status !== STATUSES.published && (
                          <button
                            onClick={() => updateEventVisibility(event, true)}
                            disabled={publishingEventId === event.id}
                            className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {publishingEventId === event.id ? "Updating..." : "Show on Main Page"}
                          </button>
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
