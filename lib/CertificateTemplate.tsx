export interface CertificateData {
  studentName: string;
  eventTitle: string;
  certificateNo: string;
  issuedDate: string;
  issuerName?: string;
}

export function CertificateTemplate({ data }: { data: CertificateData }) {
  return (
    <div
      id="certificate"
      className="w-full flex items-center justify-center bg-white p-8"
      style={{ aspectRatio: "16/12" }}
    >
      <div
        className="relative w-full h-full bg-gradient-to-br from-amber-50 via-white to-amber-50 border-8 border-amber-900 flex flex-col items-center justify-center p-12 shadow-2xl"
        style={{
          backgroundImage:
            "linear-gradient(45deg, rgba(217, 119, 6, 0.03) 25%, transparent 25%), linear-gradient(-45deg, rgba(217, 119, 6, 0.03) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(217, 119, 6, 0.03) 75%), linear-gradient(-45deg, transparent 75%, rgba(217, 119, 6, 0.03) 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      >
        {/* Decorative corner elements */}
        <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-amber-900"></div>
        <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-amber-900"></div>
        <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-amber-900"></div>
        <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-amber-900"></div>

        {/* Certificate Content */}
        <div className="text-center space-y-4 max-w-2xl">
          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-amber-900 tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
              Certificate
            </h1>
            <p className="text-2xl text-amber-800 italic" style={{ fontFamily: "Georgia, serif" }}>
              of Achievement
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="h-px bg-amber-900 flex-grow"></div>
            <div className="w-3 h-3 bg-amber-900 rounded-full"></div>
            <div className="h-px bg-amber-900 flex-grow"></div>
          </div>

          {/* Body Text */}
          <p className="text-lg text-amber-900 mt-6">This is to certify that</p>

          {/* Student Name */}
          <h2
            className="text-5xl font-bold text-amber-900 py-4 border-b-2 border-t-2 border-amber-900"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {data.studentName}
          </h2>

          {/* Achievement Text */}
          <p className="text-lg text-amber-900 mt-4">
            has successfully completed and demonstrated exceptional achievement in
          </p>

          {/* Event Title */}
          <p className="text-3xl font-bold text-amber-800" style={{ fontFamily: "Georgia, serif" }}>
            {data.eventTitle}
          </p>

          {/* Details Grid */}
          <div className="grid grid-cols-3 gap-8 mt-8 pt-6 border-t-2 border-amber-900">
            <div>
              <p className="text-xs uppercase text-amber-700 font-semibold">Certificate No.</p>
              <p className="text-sm font-mono text-amber-900 mt-1">{data.certificateNo}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-amber-700 font-semibold">Date Issued</p>
              <p className="text-sm text-amber-900 mt-1">{data.issuedDate}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-amber-700 font-semibold">Issued By</p>
              <p className="text-sm text-amber-900 mt-1">{data.issuerName || "ITC"}</p>
            </div>
          </div>

          {/* Signature Area */}
          <div className="mt-8 pt-6">
            <p className="text-sm text-amber-700 italic">Authorized by</p>
          </div>
        </div>
      </div>
    </div>
  );
}
