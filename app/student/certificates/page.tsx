"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type Certificate = {
  id: string;
  certificate_no: string;
  issued_at: string | null;
  event_id: string;
  status: string | null;
  feedbackSubmitted: boolean;
  event: {
    title: string;
  } | null;
};

type CertificateRow = {
  id: string;
  certificate_no: string;
  issued_at: string | null;
  event_id: string;
  status: string | null;
};

type EventRow = {
  id: string;
  title: string;
};

type FeedbackRow = {
  event_id: string;
};

type StatusFilter = "All" | "Issued" | "Pending" | "Expired" | "Revoked";

const filters: StatusFilter[] = ["All", "Issued", "Pending", "Expired", "Revoked"];

function Icon({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function inferCategory(title?: string | null) {
  const text = (title || "").toLowerCase();
  if (text.includes("workshop")) return "Workshop";
  if (text.includes("seminar") || text.includes("talk")) return "Seminar";
  if (text.includes("competition") || text.includes("tournament")) return "Competition";
  if (text.includes("career")) return "Career";
  if (text.includes("ai") || text.includes("web") || text.includes("cyber") || text.includes("tech")) return "Technical";
  return "Event";
}

function displayStatus(certificate: Certificate): StatusFilter {
  if (certificate.status === "revoked") return "Revoked";
  if (certificate.status === "expired") return "Expired";
  if (certificate.status === "issued" && certificate.feedbackSubmitted) return "Issued";
  return "Pending";
}

function statusBadgeClass(status: StatusFilter) {
  if (status === "Issued") return "bg-emerald-100 text-emerald-700";
  if (status === "Pending") return "bg-amber-100 text-amber-700";
  if (status === "Expired") return "bg-slate-100 text-slate-700";
  if (status === "Revoked") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

function SummaryCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <span className={`grid h-12 w-12 place-items-center rounded-lg ${tone}`}>
          <Icon>{icon}</Icon>
        </span>
        <div>
          <p className="text-2xl font-black text-slate-950">{value}</p>
          <p className="text-sm font-bold text-slate-600">{label}</p>
        </div>
      </div>
    </section>
  );
}

function CertificateThumb() {
  return (
    <div className="grid h-16 w-12 shrink-0 place-items-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 shadow-sm">
      <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" /></Icon>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-white" />)}
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-white" />
    </div>
  );
}

export default function StudentCertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [page, setPage] = useState(1);
  const pageSize = 8;

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
        .order("issued_at", { ascending: false });

      if (error) {
        console.error("Error loading certificates:", error.message, error.details);
        setCertificates([]);
        setLoading(false);
        return;
      }

      const certificateRows = (data || []) as CertificateRow[];
      if (certificateRows.length === 0) {
        setCertificates([]);
        setLoading(false);
        return;
      }

      const eventIds = [...new Set(certificateRows.map((certificate) => certificate.event_id).filter(Boolean))];
      const [{ data: eventsData }, { data: feedbackData }] = await Promise.all([
        supabase.from("events").select("id, title").in("id", eventIds),
        supabase.from("event_feedback").select("event_id").eq("user_id", user.id).in("event_id", eventIds),
      ]);

      const eventsMap = new Map(((eventsData || []) as EventRow[]).map((event) => [event.id, event]));
      const feedbackEventIds = new Set(((feedbackData || []) as FeedbackRow[]).map((row) => row.event_id));

      setCertificates(
        certificateRows.map((row) => {
          const eventData = eventsMap.get(row.event_id);
          return {
            id: row.id,
            certificate_no: row.certificate_no,
            issued_at: row.issued_at,
            event_id: row.event_id,
            status: row.status,
            feedbackSubmitted: feedbackEventIds.has(row.event_id),
            event: eventData ? { title: eventData.title } : null,
          };
        }),
      );
      setLoading(false);
    };

    void loadCertificates();
  }, [router]);

  const stats = useMemo(() => {
    const issued = certificates.filter((certificate) => displayStatus(certificate) === "Issued").length;
    const pending = certificates.filter((certificate) => displayStatus(certificate) === "Pending").length;
    const expired = certificates.filter((certificate) => displayStatus(certificate) === "Expired").length;
    return { total: certificates.length, issued, pending, expired };
  }, [certificates]);

  const filteredCertificates = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return certificates.filter((certificate) => {
      const status = displayStatus(certificate);
      const matchesStatus = filter === "All" || status === filter;
      const matchesSearch =
        !needle ||
        certificate.certificate_no.toLowerCase().includes(needle) ||
        (certificate.event?.title || "").toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [certificates, filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCertificates.length / pageSize));
  const pagedCertificates = filteredCertificates.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">My Certificates</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">View and download your earned certificates.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-96">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            </Icon>
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search certificates..."
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Filter</button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Certificates" value={stats.total} tone="bg-blue-100 text-blue-700" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />} />
        <SummaryCard label="Issued" value={stats.issued} tone="bg-emerald-100 text-emerald-700" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />} />
        <SummaryCard label="Pending" value={stats.pending} tone="bg-amber-100 text-amber-700" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />} />
        <SummaryCard label="Expired" value={stats.expired} tone="bg-violet-100 text-violet-700" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />} />
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setFilter(item);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${filter === item ? "bg-blue-700 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {filteredCertificates.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-black text-slate-950">No certificates earned yet.</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Complete ITC events to unlock certificates.</p>
          <Link href="/student/events" className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">Browse Events</Link>
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left">Certificate</th>
                  <th className="px-5 py-4 text-left">Event</th>
                  <th className="px-5 py-4 text-left">Issue Date</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pagedCertificates.map((certificate) => {
                  const status = displayStatus(certificate);
                  const issued = status === "Issued";
                  return (
                    <tr key={certificate.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CertificateThumb />
                          <div>
                            <p className="font-black text-slate-950">{certificate.event?.title || "Event Certificate"}</p>
                            <p className="mt-1 font-mono text-xs font-semibold text-slate-500">{certificate.certificate_no}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{certificate.event?.title || "Not provided"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{inferCategory(certificate.event?.title)}</p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600">{formatDate(certificate.issued_at)}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusBadgeClass(status)}`}>{status}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link href={issued ? `/certificate/${certificate.id}` : `/feedback/${certificate.event_id}`} className="rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">
                            {issued ? "View" : "Submit Feedback"}
                          </Link>
                          <Link href={issued ? `/certificate/${certificate.id}` : `/feedback/${certificate.event_id}`} className={`rounded-md border px-3 py-2 text-xs font-black ${issued ? "border-slate-200 text-slate-700 hover:bg-slate-50" : "border-amber-200 text-amber-700 hover:bg-amber-50"}`}>
                            {issued ? "Download" : "Pending"}
                          </Link>
                          <Link href={`/verify-certificate?certificateNo=${encodeURIComponent(certificate.certificate_no)}`} className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50">
                            Verify
                          </Link>
                        </div>
                        {!issued && <p className="mt-2 text-xs font-semibold text-amber-700">Certificate pending approval.</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 lg:hidden">
            {pagedCertificates.map((certificate) => {
              const status = displayStatus(certificate);
              const issued = status === "Issued";
              return (
                <article key={certificate.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex gap-3">
                    <CertificateThumb />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-950">{certificate.event?.title || "Event Certificate"}</p>
                      <p className="mt-1 font-mono text-xs font-semibold text-slate-500">{certificate.certificate_no}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
                    <p>Issued: {formatDate(certificate.issued_at)}</p>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusBadgeClass(status)}`}>{status}</span>
                  </div>
                  <Link href={issued ? `/certificate/${certificate.id}` : `/feedback/${certificate.event_id}`} className="mt-4 inline-flex rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">
                    {issued ? "View Certificate" : "Submit Feedback"}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {filteredCertificates.length > 0 && (
        <footer className="flex flex-col gap-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredCertificates.length)} of {filteredCertificates.length} certificates</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-md border border-slate-200 bg-white px-3 py-2 font-black text-slate-700 disabled:opacity-50">Prev</button>
            <button type="button" className="rounded-md bg-blue-700 px-3 py-2 font-black text-white">{page}</button>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-md border border-slate-200 bg-white px-3 py-2 font-black text-slate-700 disabled:opacity-50">Next</button>
          </div>
        </footer>
      )}
    </motion.div>
  );
}
