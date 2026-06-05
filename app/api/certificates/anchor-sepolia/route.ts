import { createHash } from "crypto";
import { ethers } from "ethers";
import { requireApiRole } from "@/lib/apiAuth";
import { buildCertificateBlockchainPayload } from "@/lib/certificateBlockchain";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type AnchorRequest = {
  certificateId?: string;
};

const SEPOLIA_CHAIN_ID = 11155111;
const DEFAULT_CERTIFICATE_CONTRACT = "0x837Dc6837647b28538EDa60B08f67f09f670bD5C";
const DEFAULT_CERTIFICATE_ABI = [
  "function addCertificate(string certId, string studentName, string courseName, string ipfsHash)",
  "function verifyCertificate(string certId) view returns (string, string, string, uint256)",
];

async function callCertificateContract({
  wallet,
  contractAddress,
  certId,
  studentName,
  courseName,
  ipfsHash,
}: {
  wallet: ethers.Wallet;
  contractAddress: string;
  certId: string;
  studentName: string;
  courseName: string;
  ipfsHash: string;
}) {
  const abi = process.env.SEPOLIA_CONTRACT_ABI
    ? JSON.parse(process.env.SEPOLIA_CONTRACT_ABI)
    : DEFAULT_CERTIFICATE_ABI;
  const contract = new ethers.Contract(contractAddress, abi, wallet);
  const functionName = process.env.SEPOLIA_CONTRACT_FUNCTION?.trim() || "addCertificate";
  const tx = await contract[functionName](certId, studentName, courseName, ipfsHash);
  return { tx, functionName };
}

export async function POST(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, ["club_advisor"]);
    if (!roleCheck.ok) {
      return Response.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    const body = (await request.json()) as AnchorRequest;
    const certificateId = body.certificateId?.trim();

    if (!certificateId) {
      return Response.json({ error: "Missing certificateId." }, { status: 400 });
    }

    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
    const contractAddress = process.env.SEPOLIA_CONTRACT_ADDRESS || DEFAULT_CERTIFICATE_CONTRACT;

    if (!rpcUrl || !privateKey) {
      return Response.json({
        anchored: false,
        network: "ethereum-sepolia",
        reason: "Sepolia is not configured. Add SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY to .env.local.",
      });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: certificate, error: certError } = await supabaseAdmin
      .from("certificates")
      .select("id, certificate_no, issued_at, user_id, event_id")
      .eq("id", certificateId)
      .single();

    if (certError || !certificate) {
      return Response.json({ error: "Certificate not found." }, { status: 404 });
    }

    const [{ data: user }, { data: event }] = await Promise.all([
      supabaseAdmin.from("users").select("name").eq("id", certificate.user_id).single(),
      supabaseAdmin.from("events").select("title").eq("id", certificate.event_id).single(),
    ]);

    const studentName = user?.name || "Student";
    const eventTitle = event?.title || "Event";
    const payload = buildCertificateBlockchainPayload({
      certificateId: certificate.id,
      certificateNo: certificate.certificate_no,
      studentName,
      eventTitle,
      issuedAt: certificate.issued_at,
    });
    const certificateHash = createHash("sha256").update(payload).digest("hex");

    const provider = new ethers.JsonRpcProvider(rpcUrl, SEPOLIA_CHAIN_ID);
    const wallet = new ethers.Wallet(privateKey, provider);
    const { tx: transaction, functionName } = await callCertificateContract({
      wallet,
      contractAddress,
      certId: certificate.certificate_no,
      studentName,
      courseName: eventTitle,
      ipfsHash: certificateHash,
    });

    await supabaseAdmin
      .from("certificates")
      .update({
        certificate_hash: certificateHash,
        transaction_hash: transaction.hash,
      })
      .eq("id", certificateId);

    return Response.json({
      anchored: true,
      network: "ethereum-sepolia",
      chainId: SEPOLIA_CHAIN_ID,
      contractAddress,
      functionName,
      certificateHash,
      txHash: transaction.hash,
      explorerUrl: `https://sepolia.etherscan.io/tx/${transaction.hash}`,
    });
  } catch (error) {
    console.error("Sepolia anchor error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
