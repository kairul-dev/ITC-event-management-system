"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  location?: string | null;
  fee_amount?: number | null;
  budget?: number | null;
  max_students?: number | null;
  purpose?: string | null;
  objective?: string | null;
  created_at?: string;
  approved_at?: string | null;
};

type RegistrationRow = {
  id: string;
  event_id: string;
  payment_status?: "unpaid" | "pending" | "paid" | "rejected" | null;
  payment_reference?: string | null;
  student?: {
    name?: string | null;
    email?: string | null;
    matrix_number?: string | null;
  } | null;
};

type EventReport = EventRow & {
  registrations: number;
  paidCount: number;
  pendingCount: number;
  unpaidCount: number;
  rejectedCount: number;
  revenue: number;
};

type SummaryTotals = {
  events: number;
  registrations: number;
  paid: number;
  pending: number;
  unpaid: number;
  rejected: number;
  revenue: number;
};

const toDateValue = (value: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatMoney = (value: number) => `RM ${value.toFixed(2)}`;

type ParsedSection = {
  title: string;
  body: string;
};

type Html2PdfFactory = () => {
  set: (options: Record<string, unknown>) => {
    from: (element: HTMLElement) => {
      save: () => Promise<void>;
    };
  };
};

const parseNumberedSections = (...sources: Array<string | null | undefined>) => {
  const text = sources.filter(Boolean).join("\n\n").trim();
  if (!text) return [] as ParsedSection[];

  const normalized = text.replace(/\r\n/g, "\n");
  const matches = [...normalized.matchAll(/(^|\n)(\d+\.\d?(?:\.\d+)?)\s+([^\n]+)\n([\s\S]*?)(?=\n\d+\.\d?(?:\.\d+)?\s+[^\n]+\n|$)/g)];

  return matches.map((match) => ({
    title: `${match[2]} ${match[3].trim()}`,
    body: match[4].trim(),
  }));
};

const formatMultiline = (value?: string | null) => {
  if (!value) return "-";
  return value.trim();
};

export default function AdminEventReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventReport[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  useEffect(() => {
    const eventIdFromUrl = searchParams.get("eventId");
    if (eventIdFromUrl) {
      setSelectedEventId(eventIdFromUrl);
    }
  }, [searchParams]);

  const loadReport = async () => {
    setLoading(true);

    const [eventsResult, registrationsResult] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, start_date, end_date, status, location, fee_amount, budget, max_students, purpose, objective, created_at, approved_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("event_registrations")
        .select(
          `
          id,
          event_id,
          payment_status,
          payment_reference,
          student:users!fk_event_registrations_user (name, email, matrix_number)
        `
        ),
    ]);

    if (eventsResult.error) {
      console.error("Error loading events report:", eventsResult.error);
      alert("Error loading events: " + eventsResult.error.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    if (registrationsResult.error) {
      console.error("Error loading registrations report:", registrationsResult.error);
      alert("Error loading registrations: " + registrationsResult.error.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    const registrationMap = new Map<
      string,
      { total: number; paid: number; pending: number; unpaid: number; rejected: number }
    >();

    const registrationRows = (registrationsResult.data || []) as RegistrationRow[];
    setRegistrations(registrationRows);

    for (const row of registrationRows) {
      const current = registrationMap.get(row.event_id) || {
        total: 0,
        paid: 0,
        pending: 0,
        unpaid: 0,
        rejected: 0,
      };

      current.total += 1;
      const status = row.payment_status || "unpaid";
      if (status === "paid") current.paid += 1;
      else if (status === "pending") current.pending += 1;
      else if (status === "rejected") current.rejected += 1;
      else current.unpaid += 1;

      registrationMap.set(row.event_id, current);
    }

    const reports: EventReport[] = ((eventsResult.data || []) as EventRow[]).map((event) => {
      const counts = registrationMap.get(event.id) || {
        total: 0,
        paid: 0,
        pending: 0,
        unpaid: 0,
        rejected: 0,
      };

      const fee = Number(event.fee_amount || 0);
      return {
        ...event,
        registrations: counts.total,
        paidCount: counts.paid,
        pendingCount: counts.pending,
        unpaidCount: counts.unpaid,
        rejectedCount: counts.rejected,
        revenue: counts.paid * fee,
      };
    });

    setEvents(reports);
    setLoading(false);
  };

  const filteredEvents = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const startFilter = toDateValue(fromDate);
    const endFilter = toDateValue(toDate);

    return events.filter((event) => {
      const matchesSelectedEvent = selectedEventId === "all" ? true : event.id === selectedEventId;
      const matchesText =
        !needle ||
        [event.title, event.status, event.location || ""].join(" ").toLowerCase().includes(needle);

      const eventDate = toDateValue(event.start_date);
      const matchesFrom = !startFilter || (eventDate ? eventDate >= startFilter : true);
      const matchesTo = !endFilter || (eventDate ? eventDate <= endFilter : true);

      return matchesSelectedEvent && matchesText && matchesFrom && matchesTo;
    });
  }, [events, searchQuery, fromDate, toDate, selectedEventId]);

  const totals = useMemo<SummaryTotals>(() => {
    return filteredEvents.reduce(
      (acc, event) => {
        acc.events += 1;
        acc.registrations += event.registrations;
        acc.paid += event.paidCount;
        acc.pending += event.pendingCount;
        acc.unpaid += event.unpaidCount;
        acc.rejected += event.rejectedCount;
        acc.revenue += event.revenue;
        return acc;
      },
      { events: 0, registrations: 0, paid: 0, pending: 0, unpaid: 0, rejected: 0, revenue: 0 }
    );
  }, [filteredEvents]);

  const statusClass = (status: string) => {
    if (status === "Published" || status === "Approved") return "bg-green-100 text-green-800";
    if (status.startsWith("Pending")) return "bg-amber-100 text-amber-800";
    if (status === "Closed") return "bg-blue-100 text-blue-800";
    if (status === "Rejected") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const clearFilters = () => {
    setSelectedEventId("all");
    setSearchQuery("");
    setFromDate("");
    setToDate("");
  };

  const exportExcel = async () => {
    setExportingExcel(true);
    try {
      const summarySheet = XLSX.utils.json_to_sheet([
        { metric: "Events", value: totals.events },
        { metric: "Registrations", value: totals.registrations },
        { metric: "Paid", value: totals.paid },
        { metric: "Pending", value: totals.pending },
        { metric: "Unpaid", value: totals.unpaid },
        { metric: "Rejected", value: totals.rejected },
        { metric: "Estimated Revenue", value: totals.revenue.toFixed(2) },
      ]);

      const reportRows = filteredEvents.map((event) => ({
        Title: event.title,
        Location: event.location || "-",
        Status: event.status,
        "Start Date": event.start_date,
        "End Date": event.end_date,
        Fee: Number(event.fee_amount || 0).toFixed(2),
        Registrations: event.registrations,
        Paid: event.paidCount,
        Pending: event.pendingCount,
        Unpaid: event.unpaidCount,
        Rejected: event.rejectedCount,
        Revenue: event.revenue.toFixed(2),
      }));

      const reportSheet = XLSX.utils.json_to_sheet(reportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, reportSheet, "Event Report");
      XLSX.writeFile(workbook, `event-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExportingExcel(false);
    }
  };

  const exportPdf = async () => {
    if (!reportRef.current) return;

    setExportingPdf(true);
    try {
      const mod = await import("html2pdf.js");
      const html2pdf = ((mod as { default?: Html2PdfFactory }).default || mod) as Html2PdfFactory;
      await html2pdf()
        .set({
          margin: 10,
          filename: `event-report-${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        })
        .from(reportRef.current)
        .save();
    } finally {
      setExportingPdf(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const openEventReport = (eventId: string) => {
    setSelectedEventId(eventId);
    router.replace(`/admin/report?eventId=${eventId}`);
  };

  const selectedEvent =
    selectedEventId === "all"
      ? null
      : events.find((event) => event.id === selectedEventId) || null;

  const selectedEventSections = useMemo(
    () => parseNumberedSections(selectedEvent?.purpose, selectedEvent?.objective),
    [selectedEvent?.purpose, selectedEvent?.objective]
  );

  const selectedEventStudents = useMemo(
    () =>
      registrations.filter((registration) => registration.event_id === selectedEventId),
    [registrations, selectedEventId]
  );

  return (
    <div className="space-y-6 print-report-root">
      <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Report</h1>
          <p className="text-sm text-gray-500">
            Summary of event registrations, payment status, and estimated revenue for admin review.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportExcel}
            disabled={exportingExcel || loading}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {exportingExcel ? "Exporting..." : "Export Excel"}
          </button>
          <button
            onClick={exportPdf}
            disabled={exportingPdf || loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {exportingPdf ? "Exporting..." : "Export PDF"}
          </button>
          <button
            onClick={printReport}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 no-print">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Events</p>
          <p className="text-2xl font-bold text-gray-900">{totals.events}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Registrations</p>
          <p className="text-2xl font-bold text-gray-900">{totals.registrations}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-bold text-green-700">{totals.paid}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{totals.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Unpaid / Rejected</p>
          <p className="text-2xl font-bold text-red-700">{totals.unpaid + totals.rejected}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-500">Estimated Revenue</p>
          <p className="text-2xl font-bold text-gray-900">RM {totals.revenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event title, status, or location..."
            className="lg:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-300"
          >
            Clear Filters
          </button>
          <span className="text-sm text-gray-500 self-center">
            Showing {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div ref={reportRef} className="bg-white rounded-lg shadow-md p-6 space-y-4 print-area">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Event Report Details</h2>
          <p className="text-sm text-gray-500">
            Scope: {selectedEventId === "all" ? "All events" : selectedEvent?.title || "Selected event"}
          </p>
          <p className="text-sm text-gray-500">
            Date range: {fromDate || "Any"} to {toDate || "Any"}
          </p>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading report...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-gray-600">No events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openEventReport(event.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openEventReport(event.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open report for ${event.title}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <div className="hover:underline">{event.title}</div>
                      <div className="text-xs text-gray-500">{event.location || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass(event.status)}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatMoney(Number(event.fee_amount || 0))}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{event.registrations}</td>
                    <td className="px-4 py-3 text-sm text-green-700 font-medium">{event.paidCount}</td>
                    <td className="px-4 py-3 text-sm text-amber-700 font-medium">{event.pendingCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{formatMoney(event.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedEventId !== "all" && (
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="rounded-2xl border border-slate-300 p-8 space-y-8 bg-white print:shadow-none">
              <div className="text-center border-b border-slate-300 pb-6">
                <p className="text-sm font-semibold tracking-[0.25em] text-slate-500 uppercase">
                  Kertas Kerja Permohonan Aktiviti
                </p>
                <h3 className="mt-3 text-3xl font-bold text-slate-900">
                  {selectedEvent?.title || "Untitled Event"}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Dokumen untuk cetakan selepas kelulusan presiden
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {selectedEvent?.status || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tarikh Aktiviti</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {selectedEvent
                      ? `${new Date(selectedEvent.start_date).toLocaleDateString()} - ${new Date(selectedEvent.end_date).toLocaleDateString()}`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lokasi</p>
                  <p className="mt-1 text-base text-slate-900">{selectedEvent?.location || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bilangan Peserta</p>
                  <p className="mt-1 text-base text-slate-900">{selectedEvent?.max_students || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yuran Penyertaan</p>
                  <p className="mt-1 text-base text-slate-900">
                    {formatMoney(Number(selectedEvent?.fee_amount || 0))}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah Belanjawan</p>
                  <p className="mt-1 text-base text-slate-900">
                    {formatMoney(Number(selectedEvent?.budget || 0))}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {selectedEventSections.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No formatted event sections are available for this record.
                  </div>
                ) : (
                  selectedEventSections.map((section) => (
                    <section key={section.title} className="space-y-2">
                      <h4 className="text-base font-bold uppercase tracking-wide text-slate-900">
                        {section.title}
                      </h4>
                      <div className="whitespace-pre-line text-sm leading-7 text-slate-700">
                        {formatMultiline(section.body)}
                      </div>
                    </section>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-slate-300">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Disediakan oleh</p>
                  <div className="mt-16 border-b border-slate-400" />
                  <p className="mt-2 text-sm text-slate-600">Pentadbir / Penganjur Aktiviti</p>
                  <p className="text-sm text-slate-500">
                    Tarikh cetakan: {new Date().toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Kelulusan Presiden</p>
                  <div className="mt-16 border-b border-slate-400" />
                  <p className="mt-2 text-sm text-slate-600">Status: {selectedEvent?.status || "-"}</p>
                  <p className="text-sm text-slate-500">
                    Tarikh kelulusan: {selectedEvent?.approved_at ? new Date(selectedEvent.approved_at).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">Registered Students</h3>
              <p className="text-sm text-gray-500">
                Students who registered for {selectedEvent?.title || "this event"}.
              </p>
            </div>

            {selectedEventStudents.length === 0 ? (
              <div className="text-gray-600">No students registered for this event.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matrix Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedEventStudents.map((registration) => (
                      <tr key={registration.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {registration.student?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {registration.student?.matrix_number || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {registration.student?.email || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            registration.payment_status === "paid"
                              ? "bg-green-100 text-green-800"
                              : registration.payment_status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : registration.payment_status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {registration.payment_status || "unpaid"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {registration.payment_reference || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
