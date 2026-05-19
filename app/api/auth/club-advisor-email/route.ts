import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabaseAdmin";

type RequestBody = {
  name?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const advisorName = body.name?.trim();

    if (!advisorName) {
      return NextResponse.json({ error: "Advisor name is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("email")
      .ilike("name", advisorName)
      .in("role", ["club_advisor", "president"])
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const email = Array.isArray(data) && data.length > 0 ? data[0]?.email : null;

    if (!email) {
      return NextResponse.json({ error: "Club advisor name not found or invalid." }, { status: 404 });
    }

    return NextResponse.json({ email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to find club advisor account." },
      { status: 500 }
    );
  }
}
