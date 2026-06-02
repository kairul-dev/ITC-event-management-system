"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CertificateRow = {
  id: string;
  certificate_no: string;
  user_id: string;
  event_id: string;
  status: string | null;
  issued_at: string | null;
  events?: { title?: string | null };
  users?: { name?: string | null; email?: string | null };
};

export default function CertificateApprovalPage() {
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadCertificates = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setCertificates([]);
      setLoading(false);
      return;
    }

    const response = await fetch("/api/certificates/pending", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const payload = await response.json().catch(() => []);
    setCertificates(response.ok && Array.isArray(payload) ? payload : []);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCertificates();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const anchorCertificate = async (certificateId: string, token: string) => {
    const response = await fetch("/api/certificates/anchor-sepolia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ certificateId }),
    });

    return response.json().catch(() => null);
  };

  const updateCertificate = async (certificateId: string, action: "approve" | "reject") => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert("Please log in again.");
      return;
    }

    setProcessingId(certificateId);

    const response = await fetch("/api/certificates/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ certificateId, action }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(payload.error || "Unable to update certificate.");
      setProcessingId(null);
      return;
    }

    if (action === "approve") {
      const anchorResult = await anchorCertificate(certificateId, session.access_token);
      alert(
        anchorResult?.anchored
          ? `Certificate issued and anchored on Sepolia.\nTransaction: ${anchorResult.txHash}`
          : `Certificate issued. Sepolia anchor skipped: ${anchorResult?.reason || "not configured"}`,
      );
    } else {
      alert("Certificate draft rejected.");
    }

    setProcessingId(null);
    await loadCertificates();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Certificate Draft Approval</h1>
        <p className="text-sm text-slate-600">
          Review Club Committee certificate drafts before they are issued to students.
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">No certificate drafts waiting</h2>
          <p className="mt-2 text-sm text-slate-500">Approved drafts will become issued certificates.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Certificate</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Event</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {certificates.map((certificate) => (
                <tr key={certificate.id}>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{certificate.certificate_no}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    <div>{certificate.users?.name || "Student"}</div>
                    <div className="text-xs text-slate-500">{certificate.users?.email || "-"}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{certificate.events?.title || "Event"}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{certificate.status || "pending_approval"}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateCertificate(certificate.id, "reject")}
                        disabled={processingId === certificate.id}
                        className="rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => updateCertificate(certificate.id, "approve")}
                        disabled={processingId === certificate.id}
                        className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        {processingId === certificate.id ? "Processing..." : "Approve and Issue"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
