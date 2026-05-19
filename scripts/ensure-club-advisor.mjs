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

const [rawName, rawEmail, rawPassword] = process.argv.slice(2);
const name = (rawName || "suriawati").trim();
const email = (rawEmail || "suriawati@itc.local").trim().toLowerCase();
const password = rawPassword || "suriawati123";
const matrixNumber = `ADVISOR-${name.replace(/[^a-z0-9]+/gi, "").toUpperCase() || "USER"}`;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const findAuthUserByEmail = async () => {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }
};

let authUser = await findAuthUserByEmail();

if (!authUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "club_advisor" },
  });

  if (error) throw error;
  authUser = data.user;
} else {
  const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(authUser.user_metadata || {}), name, role: "club_advisor" },
  });

  if (error) throw error;
  authUser = data.user;
}

const { error: profileError } = await supabase.from("users").upsert(
  {
    id: authUser.id,
    name,
    email,
    matrix_number: matrixNumber,
    role: "club_advisor",
  },
  { onConflict: "id" }
);

if (profileError) throw profileError;

console.log(`Club advisor account ready: ${name} <${email}>`);
console.log("Login name:", name);
console.log("Login password:", password);
