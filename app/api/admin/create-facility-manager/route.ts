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
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdminClient();

    // Create auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authUser.user?.id) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create corresponding database record with facility_manager role
    const { error: dbError } = await adminClient
      .from("users")
      .insert({
        id: authUser.user.id,
        name: String(name).trim(),
        email: email.toLowerCase(),
        role: "facility_manager",
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      // Try to clean up the auth user if database insertion fails
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Facility manager created successfully",
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating facility manager:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
