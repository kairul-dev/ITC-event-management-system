import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabaseAdmin";

type RequestBody = {
  matrixNumber?: string;
  role?: string;
};

const allowedRoles = new Set(["student", "admin", "committee", "high_council", "club_advisor"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const matrixNumber = body.matrixNumber?.trim();
    const role = body.role?.trim();

    if (!matrixNumber) {
      return NextResponse.json({ error: "Matrix number is required." }, { status: 400 });
    }

    if (!role || !allowedRoles.has(role)) {
      return NextResponse.json({ error: "Invalid login role." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const isEmail = matrixNumber.includes("@");
    
    let query = supabase
      .from("users")
      .select("email, matrix_number")
      .eq("role", role);

    if (isEmail) {
      query = query.ilike("email", matrixNumber.toLowerCase().trim());
    } else {
      query = query.ilike("matrix_number", matrixNumber.toUpperCase().trim());
    }

    const { data, error } = await query.limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const email =
      Array.isArray(data) && data.length > 0
        ? data[0]?.email ?? null
        : null;

    if (!email) {
      return NextResponse.json(
        { error: "Matrix number not found for this login role." },
        { status: 404 }
      );
    }

    return NextResponse.json({ email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to find login account." },
      { status: 500 }
    );
  }
}
