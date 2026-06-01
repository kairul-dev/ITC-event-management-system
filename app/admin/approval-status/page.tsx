"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PaperworkRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  start_date?: string | null;
  location?: string | null;
  rejection_reason?: string | null;
};

const workflow = [
  "Draft",
  "Pending Approval",
  "Pending High Council Approval",
  "Pending Club Advisor Approval",
  "Approved",
  "Published",
  "Closed",
];

function badgeClass(status: string) {
  if (status === "Rejected") return "bg-red-100 text-red-700";
  if (status === "Approved" || status === "Published") return "bg-emerald-100 text-emerald-700";
  if (status.startsWith("Pending")) return "bg-amber-100 text-amber-700";
  if (status === "Closed") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ApprovalStatusPage() {
  const [rows, setRows] = useState<PaperworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadRows = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("id,title,status,created_at,start_date,location,rejection_reason")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading approval status:", error);
        setRows([]);
      } else {
        setRows((data || []) as PaperworkRow[]);
      }

      setLoading(false);
    };

    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredRows = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesSearch =
        !needle ||
        row.title.toLowerCase().includes(needle) ||
        (row.location || "").toLowerCase().includes(needle);

      return matchesStatus && matchesSearch;
    });
  }, [rows, searchQuery, statusFilter]);

  const counts = useMemo(
    () =>
      rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {}),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">Approval Status</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track paperwork from Club Committee submission through High Council review, Club Advisor final approval, and publishing.
          </p>
        </div>
        <Link
          href="/committee/event?mode=paperwork"
          className="w-fit rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
        >
          Create Paperwork
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {["Draft", "Pending Approval", "Pending High Council Approval", "Pending Club Advisor Approval", "Approved", "Published", "Rejected", "Closed"].map((status) => (
          <section key={status} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{status}</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-950">{counts[status] || 0}</p>
          </section>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_260px]">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search paperwork title or venue..."
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Statuses</option>
            {workflow.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading approval status...</div>
        ) : filteredRows.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No paperwork found.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Paperwork</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-left">Event Date</th>
                  <th className="px-4 py-3 text-left">Venue</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Feedback</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-950">{row.title}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.start_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{row.location || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${badgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">
                      <span className="line-clamp-2">{row.rejection_reason || "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href="/committee/event?mode=events#event-details"
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
