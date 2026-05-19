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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const { data: users, error: userError } = await supabase
  .from("users")
  .select("id, name, email, matrix_number, role")
  .eq("matrix_number", "AI220385");

if (userError) throw userError;
console.log("Student rows:", users);

const { data: events, error: eventError } = await supabase
  .from("events")
  .select("id,title,status,start_date,end_date,fee_amount,max_students,location")
  .order("start_date", { ascending: true });

if (eventError) throw eventError;

const now = Date.now();
const candidates = [];
for (const event of events ?? []) {
  const { count } = await supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  const published = event.status === "Published";
  const future = new Date(event.start_date).getTime() > now;
  const paid = Number(event.fee_amount || 0) > 0;

  console.log(
    `${event.title}: status=${event.status}, start=${event.start_date}, fee=${event.fee_amount}, registrations=${count ?? 0}/${event.max_students}, published=${published}, future=${future}, paid=${paid}`
  );

  if (published && future && paid && (count ?? 0) < event.max_students) {
    candidates.push({ ...event, registrations: count ?? 0 });
  }
}

console.log("Paid published future candidates:", candidates);
