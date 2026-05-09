"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type RegisteredEvent = {
  id: string;
  registered_at: string;
  events: {
    id: string;
    title: string;
    start_date: string;
    status: string;
  };
};

type Certificate = {
  id: string;
  certificate_no: string;
  status: string;
  issued_at: string;
  events: {
    title: string;
  };
};

export default function StudentDashboard() {
  const [events, setEvents] = useState<RegisteredEvent[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    registeredEvents: 0,
    approvedCertificates: 0,
    pendingCertificates: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Get total count of registered events
      const { count: totalEvents, error: countError } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      console.log("Total events count:", totalEvents, "Error:", countError);

      // Load recent registered events for display
      const { data: eventsData, error: eventsError } = await supabase
        .from("event_registrations")
        .select(`
          id,
          registered_at,
          events (
            id,
            title,
            start_date,
            status
          )
        `)
        .eq("user_id", user.id)
        .order("registered_at", { ascending: false })
        .limit(5);

      console.log("Events data:", eventsData, "Error:", eventsError);

      if (!eventsError && eventsData) {
        setEvents(eventsData as any);
        setStats((prev) => ({ ...prev, registeredEvents: totalEvents || 0 }));
      }

      // Load certificates
      const { data: certsData, error: certsError } = await supabase
        .from("certificates")
        .select(`
          id,
          certificate_no,
          status,
          issued_at,
          events (
            title
          )
        `)
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false })
        .limit(5);

      if (!certsError && certsData) {
        setCertificates(certsData as any);
        const approved = certsData.filter((c: any) => c.status === "approved").length;
        const pending = certsData.filter((c: any) => c.status === "pending").length;
        setStats((prev) => ({
          ...prev,
          approvedCertificates: approved,
          pendingCertificates: pending,
        }));
      }
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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome to Student Portal!</h1>
        <p className="text-indigo-100">Track your events and certificates</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        {/* Registered Events Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Registered Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.registeredEvents}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <Link href="/student/registered-events" className="text-blue-600 text-sm font-medium mt-4 inline-block hover:underline">
            View all events →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/student/events"
            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
          >
            <svg className="w-6 h-6 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-gray-900">Browse Available Events</span>
          </Link>
          <Link
            href="/student/certificates"
            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
          >
            <svg className="w-6 h-6 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-gray-900">View My Certificates</span>
          </Link>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">My Recent Events</h2>
          <Link href="/student/registered-events" className="text-indigo-600 text-sm font-medium hover:underline">
            View all →
          </Link>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-gray-500">You haven't registered for any events yet.</p>
            <Link href="/student/events" className="mt-4 inline-block text-indigo-600 font-medium hover:underline">
              Browse available events →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.filter((event) => event.events).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{event.events.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Event Date: {new Date(event.events.start_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Registered: {new Date(event.registered_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at {new Date(event.registered_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Certificates */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">My Certificates</h2>
          <Link href="/student/certificates" className="text-indigo-600 text-sm font-medium hover:underline">
            View all →
          </Link>
        </div>
        {certificates.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-gray-500">You don't have any certificates yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{cert.certificate_no}</h3>
                  <p className="text-sm text-gray-500 mt-1">{cert.events?.title || "Event"}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Issued: {new Date(cert.issued_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
