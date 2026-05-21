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
  const { data: roleRowsById, error: roleByIdError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .limit(1);

  const roleById =
    Array.isArray(roleRowsById) && roleRowsById.length > 0
      ? roleRowsById[0]?.role
      : null;

  let role = roleById;

  if (!role && user.email) {
    const { data: roleRowsByEmail } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("email", user.email)
      .limit(1);

    role =
      Array.isArray(roleRowsByEmail) && roleRowsByEmail.length > 0
        ? roleRowsByEmail[0]?.role
        : null;
  }

  const normalizedRole =
    typeof role === "string" ? role.trim().toLowerCase() : null;

  if (
    roleByIdError ||
    !normalizedRole ||
    !allowedRoles.includes(normalizedRole)
  ) {
    return { ok: false, status: 403, error: "You do not have permission to perform this action." };
  }

  return { ok: true, userId: user.id, role: normalizedRole };
}
