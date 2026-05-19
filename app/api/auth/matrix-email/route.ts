import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabaseAdmin";

type RequestBody = {
  matrixNumber?: string;
  role?: string;
};

const allowedRoles = new Set(["student", "admin", "high_council"]);

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
    const { data, error } = await supabase
      .from("users")
      .select("email, matrix_number")
      .eq("role", role)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalizedMatrixNumber = matrixNumber.toUpperCase();
    const email =
      Array.isArray(data) && data.length > 0
        ? data.find(
            (row) => row.matrix_number?.trim().toUpperCase() === normalizedMatrixNumber
          )?.email ?? null
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