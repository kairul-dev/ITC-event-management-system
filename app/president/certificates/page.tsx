import Link from "next/link";

export default function CertificateApprovalRemovedPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-violet-700">Certificate Workflow</p>
      <h1 className="mt-2 text-2xl font-black text-slate-950">Certificate approval is no longer required</h1>
      <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
        Admin now generates certificates directly. Once generated, approved certificates are immediately available to students in My Certificates.
      </p>
      <Link
        href="/club-advisor/events"
        className="mt-6 inline-flex rounded-lg bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800"
      >
        Review Paperwork
      </Link>
    </div>
  );
}
