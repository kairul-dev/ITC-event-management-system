"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Certificate = {
  id: string;
  certificate_no: string;
  user_id: string;
  event_id: string;
  status: string;
  issued_at: string;
  events?: {
    title: string;
  };
  users?: {
    name: string;
    email: string;
  };
};

export default function PresidentCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Please log in again to view certificates.");
        setCertificates([]);
        setLoading(false);
        return;
      }

      // Use API endpoint to get pending certificates (uses admin client to bypass RLS)
      const response = await fetch("/api/certificates/pending", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error loading certificates:", errorData);
        alert("Error loading certificates: " + (errorData.error || "Unknown error"));
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCertificates(data);
    } catch (error) {
      console.error("Error:", error);
      alert("Error loading certificates: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const approveCertificate = async (id: string) => {
    setProcessingId(id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Please log in again to approve certificates.");
        setProcessingId(null);
        return;
      }

      // Use API endpoint to approve certificate (uses admin client)
      const response = await fetch("/api/certificates/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          certificateId: id,
          action: "approve",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error approving certificate:", errorData);
        alert("Error approving certificate: " + (errorData.error || "Unknown error"));
        setProcessingId(null);
        return;
      }

      const result = await response.json();

      // Get the certificate to access student email for sending notification
      const cert = certificates.find((c) => c.id === id);
      if (!cert) {
        setProcessingId(null);
        setCertificates((prev) => prev.filter((c) => c.id !== id));
        alert("Certificate approved successfully!");
        return;
      }

      let finalMessage = "Certificate approved and event marked as completed!";

      // Send email notification
      const emailResponse = await fetch("/api/certificates/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: cert.users?.name || "Student",
          studentEmail: cert.users?.email || "",
          eventTitle: cert.events?.title || "Event",
          certificateNo: cert.certificate_no,
          issuedDate: new Date(cert.issued_at).toLocaleDateString(),
          issuerName: "ITC",
        }),
      });

      if (!emailResponse.ok) {
        const emailError = await emailResponse.json().catch(() => ({}));
        console.warn("Certificate email failed:", emailError);
        finalMessage =
          "Certificate approved, but Gmail sending failed: " +
          (emailError.error || "Unknown email error");
      }

      // Remove the certificate from the list after approval
      setCertificates((prev) => prev.filter((c) => c.id !== id));
      setProcessingId(null);
      alert(finalMessage);
    } catch (error) {
      console.error("Error approving certificate:", error);
      alert("Error: " + (error instanceof Error ? error.message : String(error)));
      setProcessingId(null);
    }
  };

  const rejectCertificate = async (id: string) => {
    setProcessingId(id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Please log in again to reject certificates.");
        setProcessingId(null);
        return;
      }

      // Use API endpoint to reject certificate (uses admin client)
      const response = await fetch("/api/certificates/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          certificateId: id,
          action: "reject",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error rejecting certificate:", errorData);
        alert("Error rejecting certificate: " + (errorData.error || "Unknown error"));
        setProcessingId(null);
        return;
      }

      // Remove the certificate from the list after rejection
      setCertificates((prev) => prev.filter((c) => c.id !== id));
      setProcessingId(null);
      alert("Certificate rejected successfully");
    } catch (error) {
      console.error("Error rejecting certificate:", error);
      alert("Error: " + (error instanceof Error ? error.message : String(error)));
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Approve Certificates</h1>
        <p className="text-purple-100">Review and approve or reject pending certificates</p>
      </div>

      {/* Stats Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Pending Certificates</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{certificates.length}</p>
          </div>
          <div className="bg-orange-100 rounded-full p-4">
            <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Certificates List */}
      {certificates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Certificates</h3>
          <p className="text-gray-500">All certificates have been reviewed. Check back later for new submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{cert.certificate_no}</h3>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending Review
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {cert.events && (
                      <div className="flex items-center text-gray-600">
                        <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">
                          <strong>Event:</strong> {cert.events.title}
                        </span>
                      </div>
                    )}
                    {cert.users && (
                      <div className="flex items-center text-gray-600">
                        <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm">
                          <strong>Student:</strong> {cert.users.name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">
                        <strong>Issued:</strong> {new Date(cert.issued_at).toLocaleDateString()}
                      </span>
                    </div>
                    {cert.users && (
                      <div className="flex items-center text-gray-600">
                        <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">{cert.users.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 ml-6">
                  <button
                    onClick={() => approveCertificate(cert.id)}
                    disabled={processingId === cert.id}
                    className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {processingId === cert.id ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => rejectCertificate(cert.id)}
                    disabled={processingId === cert.id}
                    className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {processingId === cert.id ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
