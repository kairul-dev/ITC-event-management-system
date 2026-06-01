import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "./supabaseAdmin";

type RoleCheckResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; status: number; error: string };

type UserCheckResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; status: number; error: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function requireApiUser(request: Request): Promise<UserCheckResult> {
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

  return { ok: true, userId: user.id, email: user.email ?? null };
}

export async function requireApiRole(
  request: Request,
  allowedRoles: string[]
): Promise<RoleCheckResult> {
  const userCheck = await requireApiUser(request);
  if (!userCheck.ok) {
    return userCheck;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: roleRowsById, error: roleByIdError } = await supabaseAdmin
    .from("users")
    .select("role, status")
    .eq("id", userCheck.userId)
    .limit(1);

  const roleById =
    Array.isArray(roleRowsById) && roleRowsById.length > 0
      ? roleRowsById[0]?.role
      : null;

  let role = roleById;
  let status =
    Array.isArray(roleRowsById) && roleRowsById.length > 0
      ? roleRowsById[0]?.status
      : null;

  if (!role && userCheck.email) {
    const { data: roleRowsByEmail } = await supabaseAdmin
      .from("users")
      .select("role, status")
      .eq("email", userCheck.email)
      .limit(1);

    role =
      Array.isArray(roleRowsByEmail) && roleRowsByEmail.length > 0
        ? roleRowsByEmail[0]?.role
        : null;
    status =
      Array.isArray(roleRowsByEmail) && roleRowsByEmail.length > 0
        ? roleRowsByEmail[0]?.status
        : null;
  }

  const normalizedRole =
    typeof role === "string" ? role.trim().toLowerCase() : null;
  const normalizedStatus =
    typeof status === "string" ? status.trim().toLowerCase() : "active";

  if (
    roleByIdError ||
    !normalizedRole ||
    normalizedStatus === "locked" ||
    !allowedRoles.includes(normalizedRole)
  ) {
    return { ok: false, status: 403, error: "You do not have permission to perform this action." };
  }

  return { ok: true, userId: userCheck.userId, role: normalizedRole };
}
