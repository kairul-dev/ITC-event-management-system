"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function HighCouncilHomePage() {
  const [stats, setStats] = useState({
    pendingEvents: 0,
    pendingCertificates: 0,
    approvedEvents: 0,
    approvedCertificates: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      const [pendingEvents, approvedEvents, pendingCertificates, approvedCertificates] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("certificates").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("certificates").select("*", { count: "exact", head: true }).eq("status", "approved"),
      ]);

      setStats({
        pendingEvents: pendingEvents.count || 0,
        approvedEvents: approvedEvents.count || 0,
        pendingCertificates: pendingCertificates.count || 0,
        approvedCertificates: approvedCertificates.count || 0,
      });
      setLoading(false);
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-slate-900 to-amber-700 p-6 text-white">
        <h1 className="mb-2 text-3xl font-bold">Welcome, High Council</h1>
        <p className="text-amber-100">Review event and certificate approvals for ITC operations.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pending Events", stats.pendingEvents, "border-yellow-500"],
          ["Pending Certificates", stats.pendingCertificates, "border-orange-500"],
          ["Approved Events", stats.approvedEvents, "border-green-500"],
          ["Approved Certificates", stats.approvedCertificates, "border-blue-500"],
        ].map(([label, value, border]) => (
          <div key={label} className={`rounded-lg border-l-4 ${border} bg-white p-6 shadow-md`}>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/high-council/events"
            className="rounded-lg border-2 border-gray-200 p-4 font-medium text-gray-900 transition hover:border-amber-500 hover:bg-amber-50"
          >
            Approve or reject events
          </Link>
          <Link
            href="/high-council/certificates"
            className="rounded-lg border-2 border-gray-200 p-4 font-medium text-gray-900 transition hover:border-amber-500 hover:bg-amber-50"
          >
            Approve or reject certificates
          </Link>
        </div>
      </div>
    </div>
  );
}
