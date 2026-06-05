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
  contractUrl?: string;
  transactionHash?: string | null;
  transactionUrl?: string | null;
  foundLocal?: boolean;
  foundOnChain?: boolean;
  hashMatches?: boolean;
  valid?: boolean;
  message?: string;
  localCertificate?: {
    certificateNo: string;
    studentName: string;
    eventTitle: string;
    issuedAt: string;
    status: string;
    hash: string;
    calculatedHash?: string;
    transactionHash?: string | null;
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

const NETWORK_LABEL = "Ethereum Sepolia";

function formatHash(hash?: string) {
  if (!hash) return "-";
  return hash.match(/.{1,8}/g)?.join(" ") || hash;
}

function formatStudentName(name?: string) {
  if (!name) return "-";
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">Verified and Matched</span>;
  }

  return <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">Hash mismatch</span>;
}

function VerificationMessage({ result }: { result: VerifyResult }) {
  if (!result.foundLocal) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
        <p className="text-lg font-black">✗ Certificate does not exist.</p>
      </div>
    );
  }

  if (result.valid && result.hashMatches) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
        <p className="text-lg font-black">✓ Certificate is authentic.</p>
        <p className="mt-1 text-sm font-medium">The blockchain record matches the issued certificate.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
      <p className="text-lg font-black">✗ Certificate verification failed.</p>
      <p className="mt-1 text-sm font-medium">The blockchain record does not match the certificate.</p>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className={`mt-1 break-all text-sm text-slate-950 ${mono ? "font-mono leading-6" : "font-semibold"}`}>
        {value || "-"}
      </dd>
    </div>
  );
}

function VerifyCertificateContent() {
  const searchParams = useSearchParams();
  const initialSearchValue = searchParams.get("certificateNo") || searchParams.get("certificateId") || "";
  const [certificateNo, setCertificateNo] = useState(initialSearchValue);
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
    const initialCertificateNo = searchParams.get("certificateNo") || searchParams.get("certificateId") || "";
    if (initialCertificateNo) {
      void verifyCertificateNumber(initialCertificateNo);
    }
  }, []);

  const verifyCertificate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await verifyCertificateNumber(certificateNo);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-blue-800 p-6 text-white md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-blue-200">ITC Certificate Verification</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Public Verification Portal</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Validate issued certificates against the ITC system record and the Ethereum Sepolia blockchain anchor.
                </p>
              </div>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
              >
                Back to Login
              </a>
            </div>
          </div>
          <div className="p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Enter Certificate ID</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Enter the certificate number to check the certificate stored in this system against the hash saved in the Ethereum Sepolia smart contract.
              </p>
            </div>
          </div>

          <form onSubmit={verifyCertificate} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              value={certificateNo}
              onChange={(event) => setCertificateNo(event.target.value)}
              placeholder="Example: CERT-1779247771947-2YGI90"
              className="min-h-12 flex-1 rounded-lg border border-slate-300 px-4 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              disabled={loading || !certificateNo.trim()}
              className="min-h-12 rounded-lg bg-blue-700 px-6 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          </div>
        </section>

        {result && (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10 md:p-8">
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

            <div className="mt-6">
              <VerificationMessage result={result} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Certificate Information</h3>
                {result.localCertificate ? (
                  <dl className="mt-4">
                    <InfoRow label="Certificate ID" value={result.localCertificate.certificateNo || result.certificateNo} mono />
                    <InfoRow label="Student Name" value={formatStudentName(result.localCertificate.studentName)} />
                    <InfoRow label="Event Name" value={result.localCertificate.eventTitle} />
                    <InfoRow
                      label="Issue Date"
                      value={new Date(result.localCertificate.issuedAt).toLocaleString("en-MY")}
                    />
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">✗ Certificate does not exist.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Blockchain Information</h3>
                <dl className="mt-4">
                  <InfoRow
                    label="Certificate Hash"
                    value={formatHash(result.onChainCertificate?.hash || result.localCertificate?.hash || "")}
                    mono
                  />
                  <InfoRow label="Contract Address" value={result.contractAddress} mono />
                  <InfoRow label="Transaction Hash" value={result.transactionHash || result.localCertificate?.transactionHash || "Not recorded"} mono />
                  <InfoRow label="Network" value={NETWORK_LABEL} />
                </dl>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {(result.transactionUrl || result.transactionHash) && (
                <a
                  href={result.transactionUrl || `https://sepolia.etherscan.io/tx/${result.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  View Transaction on Etherscan
                </a>
              )}
              <a
                href={result.contractUrl || result.explorerUrl || `https://sepolia.etherscan.io/address/${result.contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                View Smart Contract on Etherscan
              </a>
            </div>
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
