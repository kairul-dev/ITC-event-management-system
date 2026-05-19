import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");

if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { data: events, error: eventsError } = await supabase
  .from("events")
  .select("id, title, status, created_at")
  .order("created_at", { ascending: false });

if (eventsError) throw eventsError;

const { data: registrations, error: registrationsError } = await supabase
  .from("event_registrations")
  .select("id, event_id, user_id, payment_status, users!fk_event_registrations_user(name,email)")
  .order("registered_at", { ascending: false });

if (registrationsError) throw registrationsError;

const { data: certificates, error: certificatesError } = await supabase
  .from("certificates")
  .select("id, event_id, user_id, certificate_no, status, issued_at")
  .order("issued_at", { ascending: false });

if (certificatesError) throw certificatesError;

console.log("Events:", events?.length ?? 0);
for (const event of events ?? []) {
  const eventRegistrations = (registrations ?? []).filter((row) => row.event_id === event.id);
  const eventCertificates = (certificates ?? []).filter((row) => row.event_id === event.id);
  console.log(`- ${event.title} [${event.status || "no status"}]: ${eventRegistrations.length} registration(s), ${eventCertificates.length} certificate(s)`);
}

console.log("Total registrations:", registrations?.length ?? 0);
console.log("Total certificates:", certificates?.length ?? 0);
