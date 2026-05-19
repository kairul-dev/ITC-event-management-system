"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PaymentRow = {
  id: string;
  user_id: string;
  event_id: string;
  registered_at: string;
  payment_status: "unpaid" | "pending" | "paid" | "rejected";
  payment_reference?: string | null;
  payment_note?: string | null;
  payment_submitted_at?: string | null;
  payment_verified_at?: string | null;
  student?: {
    name?: string | null;
    email?: string | null;
    matrix_number?: string | null;
  } | null;
  events?: {
    title?: string | null;
    fee_amount?: number | null;
  } | null;
};

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "pending" | "paid" | "rejected">("all");

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("event_registrations")
      .select(
        `
        id,
        user_id,
        event_id,
        registered_at,
        payment_status,
        payment_reference,
        payment_note,
        payment_submitted_at,
        payment_verified_at,
        student:users!fk_event_registrations_user (name, email, matrix_number),
        events (title, fee_amount)
      `
      )
      .order("registered_at", { ascending: false });

    if (error) {
      console.error("Error loading payment rows:", error);
      alert("Error loading payments: " + error.message);
      setRows([]);
    } else {
      setRows((data || []) as PaymentRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const rowStatus = row.payment_status || "unpaid";
      const matchesStatus = statusFilter === "all" ? true : rowStatus === statusFilter;
      if (!matchesStatus) return false;

      if (!q) return true;

      const name = (row.student?.name || "").toLowerCase();
      const email = (row.student?.email || "").toLowerCase();
      const matrix = (row.student?.matrix_number || "").toLowerCase();
      const eventTitle = (row.events?.title || "").toLowerCase();
      const reference = (row.payment_reference || "").toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        matrix.includes(q) ||
        eventTitle.includes(q) ||
        reference.includes(q)
      );
    });
  }, [rows, searchQuery, statusFilter]);

  const statusBadgeClass = (status: string) => {
    if (status === "paid") return "bg-green-100 text-green-800";
    if (status === "pending") return "bg-amber-100 text-amber-800";
    if (status === "rejected") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Card Payment Records</h1>
        <p className="text-sm text-gray-500">
          Track Stripe Checkout payments for student event registrations.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search by name, email, matrix, event, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "unpaid" | "pending" | "paid" | "rejected"
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-gray-600">Loading payments...</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-gray-600">No payment records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{row.student?.name || "-"}</div>
                      <div>{row.student?.email || "-"}</div>
                      <div className="text-xs text-gray-500">Matric: {row.student?.matrix_number || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">{row.events?.title || "-"}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">RM {Number(row.events?.fee_amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{row.payment_reference || "-"}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {row.payment_verified_at
                        ? new Date(row.payment_verified_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(row.payment_status || "unpaid")}`}>
                        {row.payment_status || "unpaid"}
                      </span>
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
