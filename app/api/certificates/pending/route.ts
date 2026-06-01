import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireApiRole } from "@/lib/apiAuth";

type CertificateRow = {
  id: string;
  certificate_no: string;
  user_id: string;
  event_id: string;
  status: string | null;
  issued_at: string | null;
};

type EventRow = {
  id: string;
  title: string | null;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
};

export async function GET(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, ["club_advisor"]);
    if (!roleCheck.ok) {
      return Response.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Get pending certificates for club advisors to review
    // Using admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from("certificates")
      .select("id, certificate_no, user_id, event_id, status, issued_at")
      .eq("status", "pending_approval")
      .order("issued_at", { ascending: false });

    if (error) {
      console.error("Error loading certificates:", error);
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Get event and user data
    if (data && data.length > 0) {
      const certificates = data as CertificateRow[];
      const eventIds = [...new Set(certificates.map((certificate) => certificate.event_id))];
      const userIds = [...new Set(certificates.map((certificate) => certificate.user_id))];

      const { data: eventsData } = await supabaseAdmin
        .from("events")
        .select("id, title")
        .in("id", eventIds);

      const { data: usersData } = await supabaseAdmin
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

      // Enrich certificates with event and user data
      const events = (eventsData ?? []) as EventRow[];
      const users = (usersData ?? []) as UserRow[];
      const enriched = certificates.map((cert) => ({
        ...cert,
        events: events.find((event) => event.id === cert.event_id),
        users: users.find((user) => user.id === cert.user_id),
      }));

      return Response.json(enriched);
    }

    return Response.json([]);
  } catch (err) {
    console.error("Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
