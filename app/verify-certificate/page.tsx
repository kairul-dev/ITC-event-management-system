"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerifyResult = {
  certificateNo: string;
  configured: boolean;
  network: string;
  chainId?: number;
  contractAddress: string;
  explorerUrl?: string;
  foundLocal?: boolean;
  foundOnChain?: boolean;
  hashMatches?: boolean;
  message?: string;
  localCertificate?: {
    certificateNo: string;
    studentName: string;
    eventTitle: string;
    issuedAt: string;
    status: string;
    hash: string;
  } | null;
  onChainCertificate?: {
    studentName: string;
    eventTitle: string;
    hash: string;
    issueDate: number;
    issueDateText: string;
  };
  error?: string;
};

function formatHash(hash?: string) {
  if (!hash) return "-";
  return hash.match(/.{1,8}/g)?.join(" ") || hash;
}

function StatusBadge({ result }: { result: VerifyResult }) {
  if (!result.configured) {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">Sepolia not configured</span>;
  }

  if (!result.foundOnChain) {
    return <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">Not found on Sepolia</span>;
  }

  if (!result.foundLocal) {
    return <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">Found on Sepolia only</span>;
  }

  if (result.hashMatches) {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">Verified and matched</span>;
  }

  return <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">Hash mismatch</span>;
}

function VerifyCertificateContent() {
  const searchParams = useSearchParams();
  const [certificateNo, setCertificateNo] = useState(searchParams.get("certificateNo") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");

  const verifyCertificateNumber = async (value: string) => {
    const nextCertificateNo = value.trim();
    if (!nextCertificateNo) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/certificates/verify-sepolia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateNo: nextCertificateNo }),
      });
      const data = (await response.json()) as VerifyResult;

      if (!response.ok) {
        throw new Error(data.error || "Unable to verify certificate.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialCertificateNo = searchParams.get("certificateNo") || "";
    if (initialCertificateNo) {
      void verifyCertificateNumber(initialCertificateNo);
    }
  }, []);

  const verifyCertificate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await verifyCertificateNumber(certificateNo);
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-indigo-600">ITC Certificate Verification</p>
              <h1 className="mt-3 text-3xl font-bold">Verify Certificate on Sepolia</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Enter the certificate number to check the certificate stored in this system against the hash saved in the Ethereum Sepolia smart contract.
              </p>
            </div>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Login
            </a>
          </div>

          <form onSubmit={verifyCertificate} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              value={certificateNo}
              onChange={(event) => setCertificateNo(event.target.value)}
              placeholder="Example: CERT-1779247771947-2YGI90"
              className="min-h-12 flex-1 rounded-lg border border-slate-300 px-4 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="submit"
              disabled={loading || !certificateNo.trim()}
              className="min-h-12 rounded-lg bg-indigo-600 px-6 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </section>

        {result && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-mono text-sm text-slate-500">{result.certificateNo}</p>
                <h2 className="mt-1 text-2xl font-bold">Verification Result</h2>
              </div>
              <StatusBadge result={result} />
            </div>

            {result.message && (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {result.message}
              </div>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">System Record</h3>
                {result.localCertificate ? (
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="font-semibold text-slate-500">Student</dt>
                      <dd className="mt-1 text-slate-950">{result.localCertificate.studentName}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Event</dt>
                      <dd className="mt-1 text-slate-950">{result.localCertificate.eventTitle}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Issued</dt>
                      <dd className="mt-1 text-slate-950">{new Date(result.localCertificate.issuedAt).toLocaleString("en-MY")}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Hash</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-slate-700">{formatHash(result.localCertificate.hash)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">No matching certificate was found in this system.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Sepolia Record</h3>
                {result.foundOnChain && result.onChainCertificate ? (
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="font-semibold text-slate-500">Student</dt>
                      <dd className="mt-1 text-slate-950">{result.onChainCertificate.studentName || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Event</dt>
                      <dd className="mt-1 text-slate-950">{result.onChainCertificate.eventTitle || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Blockchain Issue Date</dt>
                      <dd className="mt-1 text-slate-950">{result.onChainCertificate.issueDateText || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Hash</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-slate-700">{formatHash(result.onChainCertificate.hash)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">No matching certificate was found on the Sepolia contract.</p>
                )}
              </div>
            </div>

            {result.explorerUrl && (
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Open Sepolia Contract
              </a>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default function VerifyCertificatePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-100 px-4 py-8" />}>
      <VerifyCertificateContent />
    </Suspense>
  );
}
