export type CertificateBlockchainPayload = {
  certificateId: string;
  certificateNo: string;
  studentName: string;
  eventTitle: string;
  issuedAt: string;
};

function normalizeIssuedAt(issuedAt: string) {
  const value = issuedAt.trim();
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalizedValue = hasTimezone ? value : `${value}Z`;

  return new Date(normalizedValue).toISOString();
}

export function buildCertificateBlockchainPayload(payload: CertificateBlockchainPayload) {
  return [
    "ITC-CERTIFICATE-BLOCKCHAIN-V1",
    payload.certificateId,
    payload.certificateNo,
    payload.studentName.trim().toUpperCase(),
    payload.eventTitle.trim().toUpperCase(),
    normalizeIssuedAt(payload.issuedAt),
  ].join("|");
}

export async function createCertificateBlockchainHash(payload: CertificateBlockchainPayload) {
  const data = new TextEncoder().encode(buildCertificateBlockchainPayload(payload));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function formatBlockchainHash(hash: string) {
  if (!hash) return "-";
  return hash.match(/.{1,8}/g)?.join(" ") || hash;
}
