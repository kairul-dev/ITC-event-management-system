"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CertificateTemplate } from "@/lib/CertificateTemplate";
import { createCertificateBlockchainHash, formatBlockchainHash } from "@/lib/certificateBlockchain";

type CertificateDetail = {
  id: string;
  certificate_no: string;
  student_name: string;
  event_title: string;
  issued_at: string;
  status: string;
  blockchain_hash: string;
};

type LockedCertificate = {
  eventId: string;
  eventTitle: string;
  certificateNo: string;
};

type Html2PdfWorker = {
  set(options: unknown): Html2PdfWorker;
  from(element: HTMLElement): Html2PdfWorker;
  save(): Promise<void>;
};

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [lockedCertificate, setLockedCertificate] = useState<LockedCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadCertificate = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("certificates")
          .select("id, certificate_no, issued_at, status, user_id, event_id")
          .eq("id", params.id)
          .eq("user_id", user.id)
          .eq("status", "issued")
          .single();

        if (error) {
          console.error("Error loading certificate:", error.message, error.details);
          setLoading(false);
          return;
        }

        if (!data) {
          console.error("Certificate not found or not issued");
          setLoading(false);
          return;
        }

        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("name")
          .eq("id", data.user_id)
          .single();

        // Fetch event data
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("title")
          .eq("id", data.event_id)
          .single();

        if (userError) console.error("Error loading user:", userError.message);
        if (eventError) console.error("Error loading event:", eventError.message);

        const { data: feedbackData, error: feedbackError } = await supabase
          .from("event_feedback")
          .select("id")
          .eq("event_id", data.event_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (feedbackError) {
          console.error("Error loading feedback:", feedbackError.message);
        }

        if (!feedbackData) {
          setLockedCertificate({
            eventId: data.event_id,
            eventTitle: eventData?.title || "Event",
            certificateNo: data.certificate_no,
          });
          setLoading(false);
          return;
        }

        const blockchainHash = await createCertificateBlockchainHash({
          certificateId: data.id,
          certificateNo: data.certificate_no,
          studentName: userData?.name || "Student",
          eventTitle: eventData?.title || "Event",
          issuedAt: data.issued_at,
        });

        setCertificate({
          id: data.id,
          certificate_no: data.certificate_no,
          student_name: userData?.name || "Student",
          event_title: eventData?.title || "Event",
          issued_at: data.issued_at,
          status: data.status || "issued",
          blockchain_hash: blockchainHash,
        });
        setLockedCertificate(null);
        setLoading(false);
      } catch (err) {
        console.error("Error:", err);
        setLoading(false);
      }
    };

    if (params.id) {
      loadCertificate();
    }
  }, [params.id]);

  const downloadCertificate = async () => {
    if (!certificate) return;

    setDownloading(true);
    try {
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdf = (await import("html2pdf.js")).default;
      
      const element = document.getElementById("certificate-container");
      if (!element) {
        alert("Certificate element not found");
        setDownloading(false);
        return;
      }

      const opt = {
        margin: 10,
        filename: `certificate-${certificate.certificate_no}.pdf`,
        image: { type: "png" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { orientation: "landscape", unit: "mm", format: "a4" },
      };

      await (html2pdf() as Html2PdfWorker).set(opt).from(element).save();
    } catch (err) {
      console.error("Error downloading certificate:", err);
      alert("Error downloading certificate. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!certificate) {
    if (lockedCertificate) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="max-w-lg rounded-lg bg-white p-8 text-center shadow-md">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              Pending Feedback
            </span>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Certificate Locked</h1>
            <p className="mt-2 text-gray-600">
              Submit feedback for {lockedCertificate.eventTitle} to view and download certificate{" "}
              {lockedCertificate.certificateNo}.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.push(`/feedback/${lockedCertificate.eventId}`)}
                className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Submit Feedback
              </button>
              <button
                onClick={() => router.back()}
                className="rounded-lg bg-gray-200 px-5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 mb-4">The certificate you&apos;re looking for does not exist.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-lg shadow-md p-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Certificate of Achievement</h1>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">Student:</span> {certificate.student_name}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Event:</span> {certificate.event_title}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Certificate No:</span> {certificate.certificate_no}
            </p>
            <p className="mt-2 max-w-3xl break-all font-mono text-xs text-gray-600">
              <span className="font-sans font-medium">Blockchain Hash:</span>{" "}
              {formatBlockchainHash(certificate.blockchain_hash)}
            </p>
            <div className="mt-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  certificate.status === "issued"
                    ? "bg-green-100 text-green-800"
                    : certificate.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                Status: {certificate.status === "issued" ? "Issued" : certificate.status?.charAt(0).toUpperCase() + certificate.status?.slice(1)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6 md:mt-0">
            <button
              onClick={downloadCertificate}
              disabled={downloading}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <span className="animate-spin">⟳</span> Downloading...
                </>
              ) : (
                <>
                  <span>⬇</span> Download PDF
                </>
              )}
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition"
            >
              Back
            </button>
            <a
              href={`/verify-certificate?certificateNo=${encodeURIComponent(certificate.certificate_no)}`}
              className="px-6 py-3 text-center bg-white text-indigo-700 font-semibold rounded-lg border border-indigo-200 hover:bg-indigo-50 transition"
            >
              Verify Hash
            </a>
          </div>
        </div>
      </div>

      {/* Certificate Display */}
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8">
        <div id="certificate-container" className="flex justify-center bg-white">
          <CertificateTemplate
            data={{
              studentName: certificate.student_name,
              eventTitle: certificate.event_title,
              certificateNo: certificate.certificate_no,
              issuedDate: new Date(certificate.issued_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              issuerName: "ITC",
              blockchainHash: formatBlockchainHash(certificate.blockchain_hash),
            }}
          />
        </div>
      </div>

      {/* Info Footer */}
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Note:</span> This certificate uses a free SHA-256 blockchain-style verification hash. If the certificate number, student, event, issue date, or ID changes, the hash will no longer match.
          </p>
        </div>
      </div>
    </div>
  );
}
