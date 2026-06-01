import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type UpdateRoleRequest = {
  userId?: string;
  role?: string;
  status?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const allowedRoles = new Set(["student", "admin", "committee", "high_council", "club_advisor"]);
const allowedStatuses = new Set(["active", "locked"]);

export async function PATCH(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase URL or anon key is missing." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
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
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: roleRowsById, error: roleByIdError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .limit(1);

    const currentRole =
      Array.isArray(roleRowsById) && roleRowsById.length > 0
        ? roleRowsById[0]?.role
        : null;

    let fallbackRole: string | null = null;

    if (currentRole !== "admin" && user.email) {
      const { data: roleRowsByEmail } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("email", user.email)
        .limit(1);

      fallbackRole =
        Array.isArray(roleRowsByEmail) && roleRowsByEmail.length > 0
          ? roleRowsByEmail[0]?.role
          : null;
    }

    if (roleByIdError || (currentRole !== "admin" && fallbackRole !== "admin")) {
      return NextResponse.json({ error: "Only admins can update user roles." }, { status: 403 });
    }

    const body = (await request.json()) as UpdateRoleRequest;
    const userId = body.userId?.trim();
    const role = body.role?.trim();
    const status = body.status?.trim();

    if (!userId || (!role && !status)) {
      return NextResponse.json({ error: "Missing user id, role, or status." }, { status: 400 });
    }

    if (role && !allowedRoles.has(role)) {
      return NextResponse.json({ error: "Invalid role selected." }, { status: 400 });
    }

    if (status && !allowedStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid account status selected." }, { status: 400 });
    }

    const updates: { role?: string; status?: string } = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select("id, role, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update user role." },
      { status: 500 }
    );
  }
}
