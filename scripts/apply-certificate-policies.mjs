import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: `${__dirname}/../.env.local` });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyPolicies() {
  try {
    console.log("Applying certificate RLS policies...");
    console.log("Supabase URL:", supabaseUrl);

    // Get the raw SQL statements to execute
    const sqlStatements = [
      `DROP POLICY IF EXISTS "Club advisors and presidents can read certificates" ON public.certificates;`,
      `CREATE POLICY "Club advisors and presidents can read certificates"
ON public.certificates
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role IN ('club_advisor', 'admin')
  )
);`,
      `DROP POLICY IF EXISTS "Club advisors and presidents can update certificates" ON public.certificates;`,
      `CREATE POLICY "Club advisors and presidents can update certificates"
ON public.certificates
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role IN ('club_advisor', 'admin')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role IN ('club_advisor', 'admin')
  )
);`,
      `DROP POLICY IF EXISTS "Admin can insert certificates" ON public.certificates;`,
      `CREATE POLICY "Admin can insert certificates"
ON public.certificates
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role = 'admin'
  )
);`,
      `DROP POLICY IF EXISTS "Students can read their own certificates" ON public.certificates;`,
      `CREATE POLICY "Students can read their own certificates"
ON public.certificates
FOR SELECT
USING (
  (auth.uid() = user_id AND status = 'approved') OR
  auth.uid() IN (
    SELECT id FROM public.users 
    WHERE role IN ('club_advisor', 'admin')
  )
);`,
    ];

    // Since Supabase JS client doesn't support raw SQL execution,
    // use fetch directly to the REST API with service role key
    const sqlQuery = sqlStatements.join("\n");

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: sqlQuery }),
    });

    if (!response.ok) {
      console.log("Note: Direct SQL execution may not be available. Trying alternative approach...");
      
      // Alternative: Check current policies and report
      const { data: policies, error } = await supabase
        .from("information_schema.table_constraints")
        .select("*")
        .eq("table_name", "certificates");

      console.log("Current policies status:", policies || error);
      console.log("Policies need to be applied manually via Supabase Dashboard or CLI");
      return;
    }

    const result = await response.json();
    console.log("Policies applied successfully!");
    console.log("Result:", result);
  } catch (err) {
    console.error("Error applying policies:", err);
    console.log("\nTo apply policies manually:");
    console.log("1. Go to Supabase Dashboard > SQL Editor");
    console.log("2. Run the migration file: supabase/migrations/20260519_certificates_rls_policies.sql");
    process.exit(1);
  }
}

applyPolicies();
