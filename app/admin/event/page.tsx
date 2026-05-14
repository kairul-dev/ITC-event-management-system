"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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

export default function AdminEventPage() {
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

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEvents(data as Event[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

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

  const addEvent = async () => {
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
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const { data: insertedEvents, error } = await supabase
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
      .update({ status: "pending", rejection_reason: null })
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
    if (!needle) return events;
    return events.filter((event) => event.title.toLowerCase().includes(needle));
  }, [events, searchQuery]);

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
    if (status === "approved") return "ds-badge-approved";
    if (status === "rejected") return "ds-badge-rejected";
    if (status === "high_council_approved") return "ds-badge bg-indigo-100 text-indigo-800";
    if (status === "completed") return "ds-badge-completed";
    return "ds-badge-pending";
  };

  const statusLabel = (status: string) => {
    if (status === "high_council_approved") return "sent to president";
    return status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Manage Events</h1>
        <p className="text-sm text-slate-600">Isi borang kertas kerja rasmi berdasarkan format UTHM.</p>
      </div>

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

        <div className="flex justify-end">
          <button
            onClick={addEvent}
            disabled={submitting}
            className="ds-btn-primary"
          >
            {submitting ? "Saving..." : "Submit Paperwork"}
          </button>
        </div>
      </div>

      <div className="ds-card p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">All Events</h2>
          <input
            type="text"
            placeholder="Search events by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-3 ds-input"
          />
        </div>

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
                        <Link
                          href={`/admin/report?eventId=${event.id}`}
                          className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Report
                        </Link>
                        {event.status === "rejected" && (
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
