"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PaperworkRow = {
  id: string;
  title: string;
  status?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  location?: string | null;
  rejection_reason?: string | null;
  approved_by?: string | null;
  created_by?: string | null;
};

type ApprovalHistoryRow = {
  id: string;
  entity_type: "event" | "certificate";
  entity_id: string;
  action: string;
  actor_id?: string | null;
  actor_role?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  comments?: string | null;
  created_at?: string | null;
};

type UserLookup = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type CertificateRow = {
  id: string;
  event_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  issued_at?: string | null;
};

const statusOptions = [
  "Draft",
  "Pending Approval",
  "Pending High Council Approval",
  "Pending Club Advisor Approval",
  "Approved",
  "Rejected",
  "Published",
];

const reviewLevels = ["High Council", "Club Advisor", "Completed", "Published"];

const timelineSteps = [
  "Draft Created",
  "Submitted to High Council",
  "High Council Review",
  "Club Advisor Review",
  "Published",
  "Certificate Draft Generated",
];

function Icon({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function paperworkId(row: PaperworkRow) {
  const year = row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear();
  return `PW-${year}-${row.id.slice(0, 6).toUpperCase()}`;
}

function displayStatus(status?: string | null) {
  if (!status) return "Draft";
  if (status === "Pending Approval" || status === "Pending High Council Approval") return "Pending High Council";
  if (status === "Pending Club Advisor Approval") return "Pending Club Advisor";
  return status;
}

function statusGroup(status?: string | null) {
  if (!status || status === "Draft") return "Draft";
  if (status === "Rejected") return "Rejected";
  if (status === "Approved") return "Approved";
  if (status === "Published") return "Published";
  if (status === "Pending Approval" || status === "Pending High Council Approval") return "Pending";
  if (status === "Pending Club Advisor Approval") return "Under Review";
  return "Under Review";
}

function statusBadge(status?: string | null) {
  const group = statusGroup(status);
  if (group === "Rejected") return "bg-red-100 text-red-700 ring-red-200";
  if (group === "Approved") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (group === "Published") return "bg-blue-100 text-blue-700 ring-blue-200";
  if (group === "Pending") return "bg-amber-100 text-amber-700 ring-amber-200";
  if (group === "Under Review") return "bg-blue-100 text-blue-700 ring-blue-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function reviewLevel(status?: string | null) {
  if (status === "Published") return "Published";
  if (status === "Approved") return "Completed";
  if (status === "Pending Club Advisor Approval") return "Club Advisor";
  if (status === "Rejected") return "High Council";
  if (status === "Pending Approval" || status === "Pending High Council Approval") return "High Council";
  return "High Council";
}

function reviewLevelIcon(level: string) {
  if (level === "Published") return "text-blue-700";
  if (level === "Completed") return "text-emerald-700";
  if (level === "Club Advisor") return "text-emerald-700";
  return "text-violet-700";
}

function latestHistory(history: ApprovalHistoryRow[]) {
  return history[0];
}

function stepIndex(row?: PaperworkRow, certificateCount = 0) {
  if (!row) return 0;
  if (certificateCount > 0 && (row.status === "Published" || row.status === "Approved")) return 5;
  if (row.status === "Published") return 4;
  if (row.status === "Approved") return 4;
  if (row.status === "Pending Club Advisor Approval") return 3;
  if (row.status === "Pending Approval" || row.status === "Pending High Council Approval") return 2;
  if (row.status === "Rejected") return 2;
  return 0;
}

function estimateNextResponse(value?: string | null) {
  if (!value) return "To be updated";
  const date = new Date(value);
  date.setDate(date.getDate() + 3);
  return formatDate(date.toISOString());
}

function actorName(actorId: string | null | undefined, usersById: Record<string, UserLookup>, fallback?: string | null) {
  if (actorId && usersById[actorId]) {
    return usersById[actorId].name || usersById[actorId].email || fallback || "Reviewer";
  }
  if (fallback === "high_council") return "High Council";
  if (fallback === "club_advisor") return "Club Advisor";
  if (fallback === "committee") return "Club Committee";
  return fallback || "Reviewer";
}

function StatCard({
  label,
  value,
  description,
  tone,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${tone}`}>
          <Icon>{icon}</Icon>
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{label}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </section>
  );
}

export default function CommitteeApprovalStatusPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaperworkRow[]>([]);
  const [historyByEvent, setHistoryByEvent] = useState<Record<string, ApprovalHistoryRow[]>>({});
  const [usersById, setUsersById] = useState<Record<string, UserLookup>>({});
  const [certificateCounts, setCertificateCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const loadRows = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data: profile } = user?.id
          ? await supabase.from("users").select("id,name,email,role").eq("id", user.id).maybeSingle()
          : { data: null };

        const isAdmin = (profile as UserLookup | null)?.role === "admin";
        let eventQuery = supabase
          .from("events")
          .select("id,title,status,created_at,start_date,location,rejection_reason,approved_by,created_by")
          .order("created_at", { ascending: false });

        if (user?.id && !isAdmin) {
          eventQuery = eventQuery.eq("created_by", user.id);
        }

        const { data: eventData, error } = await eventQuery;
        if (error) throw error;

        const eventRows = (eventData || []) as PaperworkRow[];
        const eventIds = eventRows.map((row) => row.id);

        let historyRows: ApprovalHistoryRow[] = [];
        if (eventIds.length > 0) {
          const { data: histories } = await supabase
            .from("approval_history")
            .select("id,entity_type,entity_id,action,actor_id,actor_role,from_status,to_status,comments,created_at")
            .eq("entity_type", "event")
            .in("entity_id", eventIds)
            .order("created_at", { ascending: false });
          historyRows = (histories || []) as ApprovalHistoryRow[];
        }

        let certificateRows: CertificateRow[] = [];
        if (eventIds.length > 0) {
          const { data: certificates } = await supabase
            .from("certificates")
            .select("id,event_id,status,created_at,issued_at")
            .in("event_id", eventIds);
          certificateRows = (certificates || []) as CertificateRow[];
        }

        const actorIds = new Set<string>();
        eventRows.forEach((row) => {
          if (row.approved_by) actorIds.add(row.approved_by);
          if (row.created_by) actorIds.add(row.created_by);
        });
        historyRows.forEach((history) => {
          if (history.actor_id) actorIds.add(history.actor_id);
        });

        let userMap: Record<string, UserLookup> = {};
        if (actorIds.size > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("id,name,email,role")
            .in("id", Array.from(actorIds));
          userMap = Object.fromEntries(((users || []) as UserLookup[]).map((item) => [item.id, item]));
        }

        const groupedHistory = historyRows.reduce<Record<string, ApprovalHistoryRow[]>>((acc, history) => {
          acc[history.entity_id] = acc[history.entity_id] || [];
          acc[history.entity_id].push(history);
          return acc;
        }, {});

        const groupedCertificates = certificateRows.reduce<Record<string, number>>((acc, certificate) => {
          if (!certificate.event_id) return acc;
          acc[certificate.event_id] = (acc[certificate.event_id] || 0) + 1;
          return acc;
        }, {});

        setRows(eventRows);
        setHistoryByEvent(groupedHistory);
        setCertificateCounts(groupedCertificates);
        setUsersById(userMap);
        setSelectedId((current) => current || eventRows[0]?.id || "");
      } catch (error) {
        console.error("Error loading committee approval status:", error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const id = paperworkId(row).toLowerCase();
      const matchesSearch = !needle || row.title.toLowerCase().includes(needle) || id.includes(needle);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter || statusGroup(row.status) === statusFilter;
      const matchesReview = reviewFilter === "all" || reviewLevel(row.status) === reviewFilter;
      const matchesDate = !dateFilter || (row.created_at || "").startsWith(dateFilter);
      return matchesSearch && matchesStatus && matchesReview && matchesDate;
    });
  }, [rows, searchQuery, statusFilter, reviewFilter, dateFilter]);

  const selectedRow = filteredRows.find((row) => row.id === selectedId) || filteredRows[0] || rows[0];
  const selectedHistory = selectedRow ? historyByEvent[selectedRow.id] || [] : [];
  const currentStep = stepIndex(selectedRow, selectedRow ? certificateCounts[selectedRow.id] || 0 : 0);
  const lastUpdate = selectedHistory[0]?.created_at || selectedRow?.created_at;

  const counts = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((row) => statusGroup(row.status) === "Pending").length,
      underReview: rows.filter((row) => statusGroup(row.status) === "Under Review").length,
      approved: rows.filter((row) => statusGroup(row.status) === "Approved").length,
      rejected: rows.filter((row) => statusGroup(row.status) === "Rejected").length,
      published: rows.filter((row) => statusGroup(row.status) === "Published").length,
    }),
    [rows],
  );

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setReviewFilter("all");
    setDateFilter("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Approval Status</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Track the approval progress of your event paperwork in real time.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
        >
          <Icon className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17h.01M12 13a3 3 0 1 0-3-3m3 11a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
          </Icon>
          How it works
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Total Paperwork"
          value={counts.total}
          description="All time"
          tone="bg-violet-100 text-violet-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h4" />}
        />
        <StatCard
          label="Pending"
          value={counts.pending}
          description="Awaiting review"
          tone="bg-amber-100 text-amber-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
        />
        <StatCard
          label="Under Review"
          value={counts.underReview}
          description="In review process"
          tone="bg-blue-100 text-blue-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m18-7h-6m3-3v6M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />}
        />
        <StatCard
          label="Approved"
          value={counts.approved}
          description="Successfully approved"
          tone="bg-emerald-100 text-emerald-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" />}
        />
        <StatCard
          label="Rejected"
          value={counts.rejected}
          description="Requires changes"
          tone="bg-red-100 text-red-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 9-6 6m0-6 6 6M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" />}
        />
        <StatCard
          label="Published"
          value={counts.published}
          description="Events published"
          tone="bg-sky-100 text-sky-700"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16M12 4l8 8-8 8" />}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_190px_auto]">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search event title or paperwork ID"
            className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{displayStatus(status)}</option>
            ))}
          </select>
          <select
            value={reviewFilter}
            onChange={(event) => setReviewFilter(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Review Level</option>
            {reviewLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <input
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            type="text"
            placeholder="Select date range"
            className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <Icon className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0 0 19 5M19 5v6h-6" />
            </Icon>
            Reset Filters
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">Your Paperwork</h2>
            <span className="text-sm font-semibold text-slate-500">
              Showing {filteredRows.length} of {rows.length}
            </span>
          </div>

          {loading ? (
            <div className="grid min-h-72 place-items-center text-sm font-semibold text-slate-500">Loading approval status...</div>
          ) : filteredRows.length === 0 ? (
            <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-100 text-blue-700">
                  <Icon>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />
                  </Icon>
                </div>
                <p className="mt-4 text-base font-black text-slate-950">No paperwork submitted yet.</p>
                <p className="mt-2 text-sm text-slate-500">Create event paperwork to begin the approval workflow.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 lg:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Event Title</th>
                      <th className="px-4 py-3 text-left">Submitted Date</th>
                      <th className="px-4 py-3 text-left">Current Status</th>
                      <th className="px-4 py-3 text-left">Review Level</th>
                      <th className="px-4 py-3 text-left">Last Updated</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredRows.map((row) => {
                      const history = historyByEvent[row.id] || [];
                      const latest = latestHistory(history);
                      const level = reviewLevel(row.status);
                      return (
                        <tr key={row.id} className={`cursor-pointer transition hover:bg-blue-50/50 ${selectedRow?.id === row.id ? "bg-blue-50/70" : ""}`} onClick={() => setSelectedId(row.id)}>
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700">{paperworkId(row)}</td>
                          <td className="max-w-[220px] px-4 py-3 font-bold text-slate-950">
                            <span className="line-clamp-2">{row.title}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">{formatDate(row.created_at)}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${statusBadge(row.status)}`}>
                              {displayStatus(row.status)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">
                            <span className="inline-flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${reviewLevelIcon(level)}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
                              </Icon>
                              {level}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">{formatDate(latest?.created_at || row.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); }} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">
                                Track
                              </button>
                              <Link onClick={(event) => event.stopPropagation()} href="/committee/event?mode=events#event-details" className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                View
                              </Link>
                              {(row.status === "Draft" || row.status === "Rejected") && (
                                <Link onClick={(event) => event.stopPropagation()} href="/committee/event?mode=paperwork" className="rounded-md border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50">
                                  Edit
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 lg:hidden">
                {filteredRows.map((row) => {
                  const latest = latestHistory(historyByEvent[row.id] || []);
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={`rounded-lg border p-4 text-left shadow-sm transition ${selectedRow?.id === row.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-500">{paperworkId(row)}</p>
                          <p className="mt-1 text-base font-black text-slate-950">{row.title}</p>
                        </div>
                        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${statusBadge(row.status)}`}>
                          {displayStatus(row.status)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                        <span>Submitted: {formatDate(row.created_at)}</span>
                        <span>Updated: {formatDate(latest?.created_at || row.created_at)}</span>
                        <span>Review: {reviewLevel(row.status)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Approval Progress</h2>
              {selectedRow ? (
                <>
                  <p className="mt-4 text-base font-black text-slate-950">{selectedRow.title}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">Submitted on {formatDate(selectedRow.created_at, true)}</p>
                </>
              ) : (
                <p className="mt-2 text-sm font-medium text-slate-500">Select paperwork to view its timeline.</p>
              )}
            </div>
            {selectedRow && (
              <span className="rounded-md bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-700">
                {paperworkId(selectedRow)}
              </span>
            )}
          </div>

          {selectedRow ? (
            <div className="space-y-1">
              {timelineSteps.map((step, index) => {
                const isRejected = selectedRow.status === "Rejected" && index === currentStep;
                const isCompleted = index < currentStep && !isRejected;
                const isCurrent = index === currentStep && !isRejected;
                const stepHistory = selectedHistory.find((item) => {
                  if (step === "High Council Review") return item.actor_role === "high_council" || item.to_status === "Pending Club Advisor Approval";
                  if (step === "Club Advisor Review") return item.actor_role === "club_advisor" || item.to_status === "Approved";
                  if (step === "Submitted to High Council") return item.action === "submitted" || item.action === "resubmitted";
                  return false;
                });

                return (
                  <div key={step} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < timelineSteps.length - 1 && (
                      <div className={`absolute left-4 top-9 h-[calc(100%-1.5rem)] border-l ${isCompleted ? "border-emerald-400" : isCurrent ? "border-blue-300" : "border-slate-200"}`} />
                    )}
                    <span
                      className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ring-4 ring-white ${
                        isRejected
                          ? "bg-red-100 text-red-700"
                          : isCompleted
                            ? "bg-emerald-500 text-white"
                            : isCurrent
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isCompleted ? (
                        <Icon className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </Icon>
                      ) : isRejected ? (
                        <Icon className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 9-6 6m0-6 6 6" />
                        </Icon>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className={`min-w-0 flex-1 rounded-lg border p-3 ${isCurrent ? "border-blue-300 bg-blue-50" : isRejected ? "border-red-200 bg-red-50" : "border-slate-100 bg-white"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-950">{step}</p>
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${isRejected ? "bg-red-100 text-red-700" : isCompleted ? "bg-emerald-100 text-emerald-700" : isCurrent ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                          {isRejected ? "Rejected" : isCompleted ? "Completed" : isCurrent ? "Current" : "Pending"}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                        <p>Reviewer: {stepHistory ? actorName(stepHistory.actor_id, usersById, stepHistory.actor_role) : index === 0 ? "Club Committee" : "Pending reviewer"}</p>
                        <p>Review date: {formatDate(stepHistory?.created_at || (index === 0 ? selectedRow.created_at : null), true)}</p>
                        {isRejected && (
                          <p className="font-semibold text-red-700">Comments: {selectedRow.rejection_reason || stepHistory?.comments || "Changes requested by reviewer."}</p>
                        )}
                        {isCurrent && !isRejected && (
                          <p>Estimated response: {estimateNextResponse(lastUpdate)}</p>
                        )}
                        {stepHistory?.comments && !isRejected && <p>Comments: {stepHistory.comments}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              No paperwork selected.
            </div>
          )}
        </aside>
      </div>

      <section className="flex flex-col justify-between gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-blue-700 ring-1 ring-blue-100">
            <Icon>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17h.01M12 13a3 3 0 1 0-3-3m3 11a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
            </Icon>
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-950">Need to make changes?</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              If your paperwork is rejected, you can edit and resubmit it. For pending or under review status, please wait for reviewer feedback.
            </p>
          </div>
        </div>
        <Link href="/committee/event?mode=paperwork" className="inline-flex shrink-0 items-center justify-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
          View Guidelines -&gt;
        </Link>
      </section>
    </div>
  );
}
