import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Get Supabase admin client with service role
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdminClient();

    // Delete database record first (cascades to availability records)
    const { error: dbError } = await adminClient
      .from("users")
      .delete()
      .eq("id", userId);

    if (dbError) {
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Delete auth user
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

    if (authError) {
      // Database record already deleted, but this is a warning
      console.warn(
        `Auth user ${userId} deletion failed: ${authError.message}, but database record was deleted`
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Facility manager deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting facility manager:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
