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

const matrixNumber = (process.argv[2] || "AI220385").trim().toUpperCase();
const eventTitle = (process.argv[3] || "congkak").trim();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { data: users, error: userError } = await supabase
  .from("users")
  .select("id, name, email, matrix_number, role")
  .eq("matrix_number", matrixNumber)
  .limit(1);

if (userError) throw userError;
const user = users?.[0];
if (!user) throw new Error(`No user found with matrix number ${matrixNumber}`);

const { data: events, error: eventError } = await supabase
  .from("events")
  .select("id, title, status, fee_amount")
  .ilike("title", eventTitle)
  .limit(1);

if (eventError) throw eventError;
const event = events?.[0];
if (!event) throw new Error(`No event found with title ${eventTitle}`);

if (event.status !== "Published") {
  const { error: publishError } = await supabase
    .from("events")
    .update({ status: "Published", rejection_reason: null })
    .eq("id", event.id);

  if (publishError) throw publishError;
}

const { data: existingRegistrations, error: existingError } = await supabase
  .from("event_registrations")
  .select("id")
  .eq("event_id", event.id)
  .eq("user_id", user.id)
  .limit(1);

if (existingError) throw existingError;

let registrationId = existingRegistrations?.[0]?.id;
const now = new Date().toISOString();

if (!registrationId) {
  const { data: inserted, error: insertError } = await supabase
    .from("event_registrations")
    .insert({
      event_id: event.id,
      user_id: user.id,
      registered_at: now,
      payment_status: "paid",
      payment_reference: `TEST-${Date.now()}`,
      payment_note: "Test payment marked paid by admin setup script.",
      payment_submitted_at: now,
      payment_verified_at: now,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  registrationId = inserted.id;
} else {
  const { error: updateError } = await supabase
    .from("event_registrations")
    .update({
      payment_status: "paid",
      payment_reference: `TEST-${Date.now()}`,
      payment_note: "Test payment marked paid by admin setup script.",
      payment_submitted_at: now,
      payment_verified_at: now,
    })
    .eq("id", registrationId);

  if (updateError) throw updateError;
}

console.log("Test registration and payment ready.");
console.log(`Student: ${user.name} (${user.matrix_number})`);
console.log(`Event: ${event.title}`);
console.log(`Registration ID: ${registrationId}`);
console.log("Payment status: paid");
