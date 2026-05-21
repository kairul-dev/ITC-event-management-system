"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Certificate = {
  id: string;
  certificate_no: string;
  issued_at: string;
  event: {
    title: string;
    event_date: string;
  } | null;
};

type CertificateRow = {
  id: string;
  certificate_no: string;
  issued_at: string;
  event_id: string;
};

type EventRow = {
  id: string;
  title: string;
};

export default function StudentCertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCertificates = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("certificates")
        .select("id, certificate_no, issued_at, event_id, user_id, status")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("issued_at", { ascending: false });

      if (error) {
        console.error("Error loading certificates:", error.message, error.details);
        setCertificates([]);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setCertificates([]);
        setLoading(false);
        return;
      }

      // Fetch events separately to avoid RLS issues
      const certificateRows = (data || []) as CertificateRow[];
      const eventIds = [...new Set(certificateRows.map((certificate) => certificate.event_id))];
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, title")
        .in("id", eventIds);

      if (eventsError) {
        console.error("Error loading events:", eventsError.message);
      }

      const eventsMap = new Map(((eventsData || []) as EventRow[]).map((event) => [event.id, event]));

      const normalized: Certificate[] = certificateRows.map((row) => {
        const eventData = eventsMap.get(row.event_id);
        return {
          id: row.id,
          certificate_no: row.certificate_no,
          issued_at: row.issued_at,
          event: eventData
            ? {
                title: eventData.title,
                event_date: "",
              }
            : null,
        };
      });

      setCertificates(normalized);
      setLoading(false);
    };

    void loadCertificates();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Certificates</h1>
        <p className="text-sm text-gray-500">
          View certificates issued for your completed events.
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No certificates yet
          </h2>
          <p className="text-gray-500 text-sm">
            You will see your certificates here once events have been approved
            and certificates issued.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certificate No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issued At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {certificates.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {c.event?.title ?? "Event"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {c.event?.event_date && c.event.event_date.trim()
                        ? new Date(c.event.event_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {c.certificate_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(c.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/certificate/${c.id}`)}
                        className="px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
