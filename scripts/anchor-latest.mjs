import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { ethers } from "ethers";

function loadEnv(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) return;
      let [, key, val] = m;
      // strip optional quotes
      if (val.startsWith("\"") && val.endsWith("\"")) val = val.slice(1, -1);
      if (val.startsWith("\'") && val.endsWith("\'")) val = val.slice(1, -1);
      // Always override so local .env values are used for this script
      process.env[key] = val;
    });
  } catch (err) {
    // ignore
  }
}

const envPath = path.resolve(process.cwd(), ".env.local");
loadEnv(envPath);
console.log("Loaded env file:", envPath);
const rawKey = process.env.SEPOLIA_PRIVATE_KEY || "";
console.log("SEPOLIA_PRIVATE_KEY (redacted):", rawKey ? `***${rawKey.slice(-6)}` : "(none)");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.SEPOLIA_CONTRACT_ADDRESS || "0x837Dc6837647b28538EDa60B08f67f09f670bD5C";
const SEPOLIA_CHAIN_ID = 11155111;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase admin credentials in environment.");
  process.exit(1);
}

if (!RPC_URL || !PRIVATE_KEY) {
  console.error("Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // find latest approved certificate
  const { data: certs, error: certErr } = await supabase
    .from("certificates")
    .select("id, certificate_no, issued_at, user_id, event_id")
    .eq("status", "approved")
    .order("issued_at", { ascending: false })
    .limit(1);

  if (certErr) {
    console.error("Supabase certificates query error:", certErr.message);
    process.exit(1);
  }

  if (!certs || certs.length === 0) {
    console.error("No approved certificates found.");
    process.exit(1);
  }

  const certificate = certs[0];

  const [{ data: user }, { data: event }] = await Promise.all([
    supabase.from("users").select("name").eq("id", certificate.user_id).single(),
    supabase.from("events").select("title").eq("id", certificate.event_id).single(),
  ]);

  const studentName = user?.name || "Student";
  const eventTitle = event?.title || "Event";

  const payload = [
    "ITC-CERTIFICATE-BLOCKCHAIN-V1",
    certificate.id,
    certificate.certificate_no,
    studentName.trim().toUpperCase(),
    eventTitle.trim().toUpperCase(),
    new Date(certificate.issued_at).toISOString(),
  ].join("|");

  const certificateHash = createHash("sha256").update(payload).digest("hex");

  console.log("Anchoring certificate:", certificate.id, certificate.certificate_no);
  console.log("Student:", studentName);
  console.log("Event:", eventTitle);
  console.log("Payload:", payload);
  console.log("Certificate hash:", certificateHash);

  const provider = new ethers.JsonRpcProvider(RPC_URL, SEPOLIA_CHAIN_ID);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const DEFAULT_CERTIFICATE_ABI = [
    "function addCertificate(string certId, string studentName, string courseName, string ipfsHash)",
    "function verifyCertificate(string certId) view returns (string, string, string, uint256)",
  ];

  const abi = process.env.SEPOLIA_CONTRACT_ABI ? JSON.parse(process.env.SEPOLIA_CONTRACT_ABI) : DEFAULT_CERTIFICATE_ABI;

  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
  const functionName = process.env.SEPOLIA_CONTRACT_FUNCTION?.trim() || "addCertificate";

  try {
    const tx = await contract[functionName](certificate.certificate_no, studentName, eventTitle, certificateHash);
    console.log("Transaction sent:", tx.hash);
    console.log(`Explorer: https://sepolia.etherscan.io/tx/${tx.hash}`);
    // optionally wait for confirmation
    // const receipt = await tx.wait();
    // console.log('Confirmed in block', receipt.blockNumber);
  } catch (err) {
    console.error("Error sending transaction:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
