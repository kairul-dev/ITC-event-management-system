import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireApiRole } from "@/lib/apiAuth";

export async function GET(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, ["admin", "club_advisor"]);
    if (!roleCheck.ok) {
      return Response.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Get pending certificates for club advisors to review
    // Using admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from("certificates")
      .select("id, certificate_no, user_id, event_id, status, issued_at")
      .eq("status", "pending")
      .order("issued_at", { ascending: false });

    if (error) {
      console.error("Error loading certificates:", error);
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Get event and user data
    if (data && data.length > 0) {
      const eventIds = [...new Set(data.map((c: any) => c.event_id))];
      const userIds = [...new Set(data.map((c: any) => c.user_id))];

      const { data: eventsData } = await supabaseAdmin
        .from("events")
        .select("id, title")
        .in("id", eventIds);

      const { data: usersData } = await supabaseAdmin
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

      // Enrich certificates with event and user data
      const enriched = data.map((cert: any) => ({
        ...cert,
        events: eventsData?.find((e: any) => e.id === cert.event_id),
        users: usersData?.find((u: any) => u.id === cert.user_id),
      }));

      return Response.json(enriched);
    }

    return Response.json([]);
  } catch (err) {
    console.error("Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
