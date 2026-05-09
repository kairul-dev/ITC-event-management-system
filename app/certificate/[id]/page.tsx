"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CertificateTemplate } from "@/lib/CertificateTemplate";

type CertificateDetail = {
  id: string;
  certificate_no: string;
  student_name: string;
  event_title: string;
  issued_at: string;
  status: string;
};

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
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
          .eq("status", "approved")
          .single();

        if (error) {
          console.error("Error loading certificate:", error.message, error.details);
          setLoading(false);
          return;
        }

        if (!data) {
          console.error("Certificate not found or not approved");
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

        setCertificate({
          id: data.id,
          certificate_no: data.certificate_no,
          student_name: userData?.name || "Student",
          event_title: eventData?.title || "Event",
          issued_at: data.issued_at,
          status: data.status || "issued",
        });
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

      await (html2pdf() as any).set(opt).from(element).save();
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 mb-4">The certificate you're looking for does not exist.</p>
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
            <div className="mt-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  certificate.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : certificate.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                Status: {certificate.status === "approved" ? "Completed" : certificate.status?.charAt(0).toUpperCase() + certificate.status?.slice(1)}
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
            }}
          />
        </div>
      </div>

      {/* Info Footer */}
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Note:</span> This is an official certificate issued by the organization. The PDF version contains a verification code for authenticity verification.
          </p>
        </div>
      </div>
    </div>
  );
}
