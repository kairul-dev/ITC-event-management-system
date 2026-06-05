export interface CertificateData {
  studentName: string;
  matricNumber: string;
  eventTitle: string;
  eventDate: string;
  certificateNo: string;
  issuedDate: string;
  verificationUrl: string;
  approvedBy: string;
  approverRole?: string;
  certificateType?: string;
  issuerName?: string;
  blockchainHash?: string;
}

export function CertificateTemplate({ data }: { data: CertificateData }) {
  return (
    <div
      id="certificate"
      className="flex w-full items-center justify-center bg-white p-4"
      style={{ aspectRatio: "297 / 210" }}
    >
      <div
        className="relative flex h-full w-full flex-col overflow-hidden border border-slate-300 bg-white p-8 shadow-2xl"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, rgba(37, 99, 235, 0.10), transparent 28%), linear-gradient(135deg, rgba(15, 23, 42, 0.035), transparent 38%), linear-gradient(45deg, rgba(37, 99, 235, 0.035) 25%, transparent 25%)",
          backgroundSize: "100% 100%, 100% 100%, 18px 18px",
        }}
      >
        <div className="pointer-events-none absolute inset-4 border-2 border-blue-900/80"></div>
        <div className="pointer-events-none absolute inset-7 border border-slate-300"></div>
        <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-blue-700/10"></div>
        <div className="absolute bottom-0 left-0 h-28 w-28 rounded-tr-full bg-blue-700/10"></div>

        <div className="relative z-10 flex h-full flex-col">
          <header className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-blue-700">ITC Club</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Universiti Tun Hussein Onn Malaysia
              </p>
            </div>
            <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Certificate ID</p>
              <p className="mt-1 max-w-[260px] break-all font-mono text-xs font-black text-slate-950">{data.certificateNo}</p>
            </div>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center px-6 py-3 text-center">
            <p className="rounded-full bg-blue-700 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-white">
              {data.certificateType || "Certificate of Participation"}
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-[0.08em] text-slate-950" style={{ fontFamily: "Georgia, serif" }}>
              Certificate
            </h1>
            <p className="mt-1 text-base font-semibold italic text-slate-600" style={{ fontFamily: "Georgia, serif" }}>
              Presented with appreciation to
            </p>

            <div className="mt-4 w-full max-w-3xl border-y-2 border-blue-900 py-3">
              <h2 className="break-words text-3xl font-black uppercase tracking-[0.08em] text-blue-950" style={{ fontFamily: "Georgia, serif" }}>
                {data.studentName}
              </h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                Matric Number: <span className="font-mono text-slate-950">{data.matricNumber}</span>
              </p>
            </div>

            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-700">
              for participating in <span className="font-black text-slate-950">{data.eventTitle}</span>.
            </p>

            <div className="mt-4 grid w-full max-w-4xl grid-cols-3 gap-2 text-left">
              <div className="rounded-lg border border-slate-200 bg-white/80 p-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Event Date</p>
                <p className="mt-1 text-xs font-black text-slate-950">{data.eventDate}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/80 p-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Issue Date</p>
                <p className="mt-1 text-xs font-black text-slate-950">{data.issuedDate}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/80 p-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Digitally Approved By</p>
                <p className="mt-1 text-xs font-black text-slate-950">{data.approvedBy}</p>
                <p className="text-[10px] font-bold text-slate-500">{data.approverRole || "Club Advisor"}</p>
              </div>
            </div>
          </main>

          <footer className="grid grid-cols-[1fr_1.35fr] gap-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Blockchain Verified</p>
              <p className="mt-1 text-xs font-black text-blue-950">Ethereum Sepolia Network</p>
              {data.blockchainHash && (
                <div className="mt-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Certificate Hash</p>
                  <p className="mt-1 whitespace-pre-wrap break-all font-mono text-[10px] leading-4 text-slate-800">
                    {data.blockchainHash}
                  </p>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Verify this certificate</p>
              <p className="mt-1.5 break-all font-mono text-[10px] font-bold leading-4 text-slate-950">{data.verificationUrl}</p>
              <p className="mt-2 text-[10px] font-semibold text-slate-500">
                The Certificate ID is the primary reference for public verification.
              </p>
            </div>
          </footer>

          <div className="mt-2 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span>{data.issuerName || "ITC Secure Document Verification System"}</span>
            <span>Digitally issued certificate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
