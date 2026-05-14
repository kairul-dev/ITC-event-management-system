"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function PresidentHomePage() {
  const [stats, setStats] = useState({
    pendingEvents: 0,
    pendingCertificates: 0,
    approvedEvents: 0,
    approvedCertificates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentPendingEvents, setRecentPendingEvents] = useState<any[]>([]);
  const [recentPendingCerts, setRecentPendingCerts] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get events forwarded by high council for final approval
      const { count: pendingEventsCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "high_council_approved");

      // Get approved events count
      const { count: approvedEventsCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      // Get pending certificates count
      const { count: pendingCertsCount } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Get approved certificates count
      const { count: approvedCertsCount } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      // Get recent high-council-approved events
      const { data: pendingEvents } = await supabase
        .from("events")
        .select("*")
        .eq("status", "high_council_approved")
        .order("created_at", { ascending: false })
        .limit(5);

      // Get recent pending certificates
      const { data: pendingCerts } = await supabase
        .from("certificates")
        .select("*")
        .eq("status", "pending")
        .order("issued_at", { ascending: false })
        .limit(5);

      setStats({
        pendingEvents: pendingEventsCount || 0,
        pendingCertificates: pendingCertsCount || 0,
        approvedEvents: approvedEventsCount || 0,
        approvedCertificates: approvedCertsCount || 0,
      });
      setRecentPendingEvents(pendingEvents || []);
      setRecentPendingCerts(pendingCerts || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome, President!</h1>
        <p className="text-purple-100">Give final approval after high council review</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Events Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Awaiting Final Approval</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingEvents}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <Link href="/president/events" className="text-yellow-600 text-sm font-medium mt-4 inline-block hover:underline">
            Review events →
          </Link>
        </div>

        {/* Pending Certificates Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Pending Certificates</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingCertificates}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <Link href="/president/certificates" className="text-orange-600 text-sm font-medium mt-4 inline-block hover:underline">
            Review certificates →
          </Link>
        </div>

        {/* Approved Events Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Approved Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.approvedEvents}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Approved Certificates Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Approved Certificates</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.approvedCertificates}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/president/events"
            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="font-medium text-gray-900">Final Event Approval</span>
          </Link>
          <Link
            href="/president/certificates"
            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-gray-900">Approve/Reject Certificates</span>
          </Link>
        </div>
      </div>

      {/* Pending Events */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Events From High Council</h2>
          <Link href="/president/events" className="text-purple-600 text-sm font-medium hover:underline">
            View all →
          </Link>
        </div>
        {recentPendingEvents.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-gray-500">No high council approved events to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentPendingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Event Date: {new Date(event.event_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Created: {new Date(event.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Certificates */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Pending Certificates Review</h2>
          <Link href="/president/certificates" className="text-purple-600 text-sm font-medium hover:underline">
            View all →
          </Link>
        </div>
        {recentPendingCerts.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-gray-500">No pending certificates to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentPendingCerts.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{cert.certificate_no}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Issued: {new Date(cert.issued_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
