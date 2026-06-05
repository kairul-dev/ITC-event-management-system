import { createHash } from "crypto";
import { ethers } from "ethers";
import { buildCertificateBlockchainPayload } from "@/lib/certificateBlockchain";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type VerifyRequest = {
  certificateNo?: string;
};

const SEPOLIA_CHAIN_ID = 11155111;
const DEFAULT_CERTIFICATE_CONTRACT = "0x837Dc6837647b28538EDa60B08f67f09f670bD5C";
const DEFAULT_CERTIFICATE_ABI = [
  "function verifyCertificate(string certId) view returns (string, string, string, uint256)",
];

function normalizeHash(value?: string | null) {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

function buildHash({
  certificateId,
  certificateNo,
  studentName,
  eventTitle,
  issuedAt,
}: {
  certificateId: string;
  certificateNo: string;
  studentName: string;
  eventTitle: string;
  issuedAt: string;
}) {
  const payload = buildCertificateBlockchainPayload({
    certificateId,
    certificateNo,
    studentName,
    eventTitle,
    issuedAt,
  });

  return createHash("sha256").update(payload).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRequest;
    const certificateNo = body.certificateNo?.trim();

    if (!certificateNo) {
      return Response.json({ error: "Missing certificate number." }, { status: 400 });
    }

    const contractAddress = process.env.SEPOLIA_CONTRACT_ADDRESS || DEFAULT_CERTIFICATE_CONTRACT;
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: certificate } = await supabaseAdmin
      .from("certificates")
      .select("id, certificate_no, issued_at, status, user_id, event_id, certificate_hash, transaction_hash")
      .eq("certificate_no", certificateNo)
      .maybeSingle();

    let localCertificate = null;
    let localHash = "";

    if (certificate) {
      const [{ data: user }, { data: event }] = await Promise.all([
        supabaseAdmin.from("users").select("name, matrix_number").eq("id", certificate.user_id).single(),
        supabaseAdmin.from("events").select("title").eq("id", certificate.event_id).single(),
      ]);

      const studentName = user?.name || "Student";
      const eventTitle = event?.title || "Event";
      localHash = buildHash({
        certificateId: certificate.id,
        certificateNo: certificate.certificate_no,
        studentName,
        eventTitle,
        issuedAt: certificate.issued_at,
      });

      localCertificate = {
        id: certificate.id,
        certificateNo: certificate.certificate_no,
        studentName,
        matricNumber: user?.matrix_number || null,
        eventTitle,
        issuedAt: certificate.issued_at,
        status: certificate.status,
        hash: certificate.certificate_hash || localHash,
        calculatedHash: localHash,
        transactionHash: certificate.transaction_hash,
      };
    }

    if (!rpcUrl) {
      return Response.json({
        certificateNo,
        configured: false,
        network: "ethereum-sepolia",
        contractAddress,
        localCertificate,
        localHash,
        transactionHash: certificate?.transaction_hash || null,
        message: "Sepolia is not configured. Add SEPOLIA_RPC_URL to .env.local.",
      });
    }

    const abi = process.env.SEPOLIA_CONTRACT_ABI
      ? JSON.parse(process.env.SEPOLIA_CONTRACT_ABI)
      : DEFAULT_CERTIFICATE_ABI;
    const provider = new ethers.JsonRpcProvider(rpcUrl, SEPOLIA_CHAIN_ID);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const result = await contract.verifyCertificate(certificateNo);

    const issueDate =
      typeof result[3] === "bigint" ? Number(result[3]) : Number.parseInt(String(result[3] || "0"), 10);
    const onChainCertificate = {
      studentName: String(result[0] || ""),
      eventTitle: String(result[1] || ""),
      hash: String(result[2] || ""),
      issueDate,
      issueDateText: issueDate > 0 ? new Date(issueDate * 1000).toLocaleString("en-MY") : "",
    };
    const foundOnChain =
      Boolean(onChainCertificate.studentName) ||
      Boolean(onChainCertificate.eventTitle) ||
      Boolean(onChainCertificate.hash) ||
      issueDate > 0;
    const isIssued = localCertificate?.status === "issued";
    const hashMatches =
      Boolean(foundOnChain && localHash) &&
      normalizeHash(onChainCertificate.hash) === normalizeHash(localHash);

    return Response.json({
      certificateNo,
      configured: true,
      network: "ethereum-sepolia",
      chainId: SEPOLIA_CHAIN_ID,
      contractAddress,
      explorerUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
      transactionHash: certificate?.transaction_hash || null,
      transactionUrl: certificate?.transaction_hash
        ? `https://sepolia.etherscan.io/tx/${certificate.transaction_hash}`
        : null,
      contractUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
      localCertificate,
      onChainCertificate,
      foundLocal: Boolean(localCertificate),
      foundOnChain,
      hashMatches,
      valid: Boolean(isIssued && hashMatches),
    });
  } catch (error) {
    console.error("Sepolia verify error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
