import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function sample(table, cols = "*") {
  const { data, error } = await supabase.from(table).select(cols).limit(1);
  if (error) {
    console.log(`\n[${table}] ERROR: ${error.message}`);
    return;
  }
  console.log(`\n[${table}] columns:`, data && data[0] ? Object.keys(data[0]) : "(empty table)");
  if (data && data[0]) console.log(`[${table}] sample:`, JSON.stringify(data[0], null, 2));
}

async function counts(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  console.log(`[count] ${table}: ${error ? error.message : count}`);
}

for (const t of ["users", "events", "event_registrations", "certificates", "approval_history", "feedback"]) {
  await counts(t);
}
for (const t of ["users", "events", "event_registrations", "certificates", "approval_history"]) {
  await sample(t);
}

// distinct certificate statuses
const { data: certs } = await supabase.from("certificates").select("status");
console.log("\ncertificate statuses in use:", [...new Set((certs || []).map((c) => c.status))]);
const { data: evs } = await supabase.from("events").select("status");
console.log("event statuses in use:", [...new Set((evs || []).map((e) => e.status))]);
const { data: us } = await supabase.from("users").select("role");
console.log("user roles in use:", [...new Set((us || []).map((u) => u.role))]);
