import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "./supabaseAdmin";

type RoleCheckResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; status: number; error: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function requireApiRole(
  request: Request,
  allowedRoles: string[]
): Promise<RoleCheckResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "Supabase URL or anon key is missing." };
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return { ok: false, status: 401, error: "Missing auth token." };
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);

  if (authError || !user) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .limit(1);

  const role =
    Array.isArray(roleRows) && roleRows.length > 0 ? roleRows[0]?.role : null;

  if (roleError || !role || !allowedRoles.includes(role)) {
    return { ok: false, status: 403, error: "You do not have permission to perform this action." };
  }

  return { ok: true, userId: user.id, role };
}
