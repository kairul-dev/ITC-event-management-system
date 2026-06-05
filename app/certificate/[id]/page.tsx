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
  matric_number: string;
  event_title: string;
  event_date: string;
  issued_at: string;
  issued_date: string;
  approved_by_name: string;
  status: string;
  blockchain_hash: string;
  transaction_hash: string | null;
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

const BLOCKCHAIN_NETWORK = "Ethereum Sepolia";
const DEFAULT_PUBLIC_ORIGIN = "https://itc-secure-document-verification-sy.vercel.app";

function formatStudentName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Student";
}

function formatCertificateName(name: string) {
  return formatStudentName(name).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatEventPeriod(startDate?: string | null, endDate?: string | null) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start === "Not provided") return "Not provided";
  if (end === "Not provided" || start === end) return start;
  return `${start} - ${end}`;
}

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [lockedCertificate, setLockedCertificate] = useState<LockedCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copiedValue, setCopiedValue] = useState("");
  const [publicOrigin, setPublicOrigin] = useState(DEFAULT_PUBLIC_ORIGIN);

  useEffect(() => {
    setPublicOrigin(window.location.origin || DEFAULT_PUBLIC_ORIGIN);
  }, []);

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
          .select("id, certificate_no, issued_at, status, approved_by, user_id, event_id, certificate_hash, transaction_hash")
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
          .select("name, matrix_number")
          .eq("id", data.user_id)
          .single();

        // Fetch event data
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("title, start_date, end_date")
          .eq("id", data.event_id)
          .single();

        const { data: approverData, error: approverError } = data.approved_by
          ? await supabase
              .from("users")
              .select("name")
              .eq("id", data.approved_by)
              .maybeSingle()
          : { data: null, error: null };

        if (userError) console.error("Error loading user:", userError.message);
        if (eventError) console.error("Error loading event:", eventError.message);
        if (approverError) console.error("Error loading approver:", approverError.message);

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

        const computedBlockchainHash = await createCertificateBlockchainHash({
          certificateId: data.id,
          certificateNo: data.certificate_no,
          studentName: userData?.name || "Student",
          eventTitle: eventData?.title || "Event",
          issuedAt: data.issued_at,
        });

        setCertificate({
          id: data.id,
          certificate_no: data.certificate_no,
          student_name: formatCertificateName(userData?.name || "Student"),
          matric_number: (userData?.matrix_number || "Not provided").toUpperCase(),
          event_title: eventData?.title || "Event",
          event_date: formatEventPeriod(eventData?.start_date, eventData?.end_date),
          issued_at: data.issued_at,
          issued_date: formatDate(data.issued_at),
          approved_by_name: formatStudentName(approverData?.name || "Club Advisor"),
          status: data.status || "issued",
          blockchain_hash: data.certificate_hash || computedBlockchainHash,
          transaction_hash: data.transaction_hash || null,
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

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(label);
      window.setTimeout(() => setCopiedValue(""), 1600);
    } catch (err) {
      console.error("Unable to copy value:", err);
      alert("Unable to copy. Please copy the value manually.");
    }
  };

  const CopyButton = ({ label, value }: { label: string; value: string }) => (
    <button
      type="button"
      onClick={() => copyToClipboard(label, value)}
      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    >
      {copiedValue === label ? "Copied" : label === "Blockchain Hash" ? "Copy Hash" : "Copy"}
    </button>
  );

  const verificationUrl = certificate
    ? `${publicOrigin}/verify-certificate?certificateNo=${encodeURIComponent(certificate.certificate_no)}`
    : "";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!certificate) {
    if (lockedCertificate) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50 p-6">
          <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-950/10">
            <span className="ds-badge-locked">
              Pending Feedback
            </span>
            <h1 className="mt-4 text-2xl font-black text-slate-950">Certificate Locked</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Submit feedback for {lockedCertificate.eventTitle} to view and download certificate{" "}
              {lockedCertificate.certificateNo}.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.push(`/feedback/${lockedCertificate.eventId}`)}
                className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700"
              >
                Submit Feedback
              </button>
              <button
                onClick={() => router.back()}
                className="ds-btn-secondary"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-black text-slate-950">Certificate Not Found</h1>
          <p className="mb-4 text-slate-600">The certificate you&apos;re looking for does not exist.</p>
          <button
            onClick={() => router.back()}
            className="ds-btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Issued Certificate</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Certificate of Achievement</h1>
            <p className="mt-3 text-slate-600">
              <span className="font-medium">Student Name:</span> {certificate.student_name}
            </p>
            <p className="text-slate-600">
              <span className="font-medium">Matric Number:</span> {certificate.matric_number}
            </p>
            <p className="text-slate-600">
              <span className="font-medium">Event:</span> {certificate.event_title}
            </p>
            <p className="text-slate-600">
              <span className="font-medium">Event Date:</span> {certificate.event_date}
            </p>
            <p className="text-slate-600">
              <span className="font-medium">Issue Date:</span> {certificate.issued_date}
            </p>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-slate-600">Certificate ID</span>
                  <CopyButton label="Certificate ID" value={certificate.certificate_no} />
                </div>
                <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-950">{certificate.certificate_no}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-slate-600">Blockchain Hash</span>
                  <CopyButton label="Blockchain Hash" value={certificate.blockchain_hash} />
                </div>
                <p className="mt-2 whitespace-pre-wrap break-all font-mono text-xs leading-6 text-slate-700">
                  {formatBlockchainHash(certificate.blockchain_hash)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-slate-600">Verification URL</span>
                  <CopyButton label="Verification URL" value={verificationUrl} />
                </div>
                <p className="mt-2 break-all font-mono text-xs text-slate-700">{verificationUrl}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <span className="font-semibold text-blue-800">Blockchain Verified</span>
                <p className="mt-1 font-bold text-blue-950">{BLOCKCHAIN_NETWORK}</p>
              </div>
            </div>
            <div className="mt-3">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${
                  certificate.status === "issued"
                    ? "bg-emerald-100 text-emerald-800"
                    : certificate.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                Status: {certificate.status === "issued" ? "Issued" : certificate.status?.charAt(0).toUpperCase() + certificate.status?.slice(1)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:mt-0">
            <button
              onClick={downloadCertificate}
              disabled={downloading}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? (
                <>
                  Downloading...
                </>
              ) : (
                <>
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-lg bg-slate-700 px-6 py-3 font-bold text-white transition hover:bg-slate-800"
            >
              Back
            </button>
            <a
              href={`/verify-certificate?certificateNo=${encodeURIComponent(certificate.certificate_no)}`}
              className="rounded-lg border border-blue-200 bg-white px-6 py-3 text-center font-bold text-blue-700 transition hover:bg-blue-50"
            >
              Verify Certificate
            </a>
          </div>
        </div>
      </div>

      {/* Certificate Display */}
      <div className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/10 md:p-8">
        <div id="certificate-container" className="flex justify-center bg-white">
          <CertificateTemplate
            data={{
              studentName: certificate.student_name,
              matricNumber: certificate.matric_number,
              eventTitle: certificate.event_title,
              eventDate: certificate.event_date,
              certificateNo: certificate.certificate_no,
              issuedDate: certificate.issued_date,
              verificationUrl,
              approvedBy: certificate.approved_by_name,
              approverRole: "Club Advisor",
              certificateType: "Certificate of Participation",
              issuerName: "ITC Secure Document Verification System",
              blockchainHash: formatBlockchainHash(certificate.blockchain_hash),
            }}
          />
        </div>
      </div>

      {/* Info Footer */}
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Blockchain proof:</span> This certificate is verified by comparing the issued certificate hash with the record anchored on the Ethereum Sepolia smart contract.
          </p>
        </div>
      </div>
    </div>
  );
}

