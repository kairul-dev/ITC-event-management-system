"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { stripPaperworkFileMarker } from "@/lib/paperworkFile";

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

type Html2PdfFactory = () => {
  set: (options: Record<string, unknown>) => {
    from: (element: HTMLElement) => {
      save: () => Promise<void>;
    };
  };
};

const formatMultiline = (value?: string | null) => {
  if (!value) return "-";
  return stripPaperworkFileMarker(value).trim();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const applyCleanSheetLayout = (
  sheet: XLSX.WorkSheet,
  columnWidths: number[],
  autoFilterRange?: string,
) => {
  sheet["!cols"] = columnWidths.map((wch) => ({ wch }));
  if (autoFilterRange) {
    sheet["!autofilter"] = { ref: autoFilterRange };
  }

  for (const address of Object.keys(sheet)) {
    if (address.startsWith("!")) continue;
    const cell = sheet[address] as XLSX.CellObject & {
      s?: { alignment?: { wrapText?: boolean; vertical?: string } };
    };
    cell.s = {
      ...(cell.s || {}),
      alignment: {
        ...(cell.s?.alignment || {}),
        wrapText: true,
        vertical: "top",
      },
    };
  }
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

      const eventReportHeader = [
        "Title",
        "Location",
        "Status",
        "Start Date",
        "End Date",
        "Fee (RM)",
        "Registered",
        "Paid",
        "Pending",
        "Unpaid",
        "Rejected",
        "Revenue (RM)",
      ];
      const eventReportRows = filteredEvents.map((event) => [
        event.title,
        event.location || "-",
        event.status,
        event.start_date,
        event.end_date,
        Number(event.fee_amount || 0).toFixed(2),
        event.registrations,
        event.paidCount,
        event.pendingCount,
        event.unpaidCount,
        event.rejectedCount,
        event.revenue.toFixed(2),
      ]);
      const eventTitleById = new Map(events.map((event) => [event.id, event.title]));
      const registrationRows = registrations
        .filter((registration) =>
          selectedEventId === "all" ? true : registration.event_id === selectedEventId
        )
        .map((registration, index) => [
          index + 1,
          eventTitleById.get(registration.event_id) || registration.event_id,
          registration.student?.name || "-",
          registration.student?.matrix_number || "-",
          registration.student?.email || "-",
          registration.payment_status || "unpaid",
          registration.payment_reference || "-",
        ]);
      const registrationHeader = [
        "No",
        "Event",
        "Name",
        "Matrix Number",
        "Email",
        "Payment Status",
        "Payment Reference",
      ];

      const reportSheetRows = [
        ["Event Report"],
        [],
        eventReportHeader,
        ...eventReportRows,
        [],
        ["Registered Students"],
        ...(registrationRows.length > 0 ? [registrationHeader, ...registrationRows] : [["No registered students found for the selected report scope."]]),
      ];

      const reportSheet = XLSX.utils.aoa_to_sheet(reportSheetRows);
      const registrationsSheet = XLSX.utils.aoa_to_sheet([
        registrationHeader,
        ...registrationRows,
      ]);
      reportSheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
        { s: { r: eventReportRows.length + 4, c: 0 }, e: { r: eventReportRows.length + 4, c: 6 } },
      ];
      reportSheet["!rows"] = reportSheetRows.map((_, index) => ({
        hpt: index === 0 || index === eventReportRows.length + 4 ? 24 : 36,
      }));
      registrationsSheet["!rows"] = [
        { hpt: 28 },
        ...registrationRows.map(() => ({ hpt: 36 })),
      ];
      applyCleanSheetLayout(summarySheet, [24, 18], "A1:B8");
      applyCleanSheetLayout(
        reportSheet,
        [34, 24, 24, 18, 18, 12, 14, 10, 12, 12, 12, 14],
        `A3:L${Math.max(eventReportRows.length + 3, 3)}`,
      );
      applyCleanSheetLayout(
        registrationsSheet,
        [8, 34, 24, 18, 32, 18, 34],
        `A1:G${Math.max(registrationRows.length + 1, 1)}`,
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, reportSheet, "Event Report");
      XLSX.utils.book_append_sheet(workbook, registrationsSheet, "Registered Students");
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="lg:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {selectedEventId !== "all" && selectedEvent && (
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="rounded-2xl border border-slate-300 bg-white p-8 space-y-7 print:rounded-none print:border-slate-400 print:shadow-none">
              <div className="border-b border-slate-300 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  ITC Event Management System
                </p>
                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-3xl font-bold text-slate-950">
                      Event Report
                    </h3>
                    <p className="mt-1 text-xl font-semibold text-slate-800">
                      {selectedEvent.title}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600 md:text-right">
                    <p>Generated: {formatDateTime(new Date().toISOString())}</p>
                    <p>Status: {selectedEvent.status}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                {[
                  ["Students Joined", selectedEvent.registrations],
                  ["Capacity", selectedEvent.max_students || 0],
                  ["Paid", selectedEvent.paidCount],
                  ["Pending Payment", selectedEvent.pendingCount],
                  ["Unpaid", selectedEvent.unpaidCount],
                  ["Rejected Payment", selectedEvent.rejectedCount],
                  ["Fee", formatMoney(Number(selectedEvent.fee_amount || 0))],
                  ["Revenue", formatMoney(selectedEvent.revenue)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatDateTime(selectedEvent.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatDateTime(selectedEvent.end_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                  <p className="mt-1 font-semibold text-slate-900">{selectedEvent.location || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Budget</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatMoney(Number(selectedEvent.budget || 0))}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatDateTime(selectedEvent.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatDateTime(selectedEvent.approved_at)}</p>
                </div>
              </div>

            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">Registered Students ({selectedEventStudents.length})</h3>
              <p className="text-sm text-gray-500">
                Students who registered for {selectedEvent.title}.
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
