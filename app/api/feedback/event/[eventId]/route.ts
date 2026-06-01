import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireApiUser } from "@/lib/apiAuth";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, title, status, start_date, end_date, location")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      return Response.json({ error: eventError.message }, { status: 400 });
    }

    if (!event) {
      return Response.json({ error: "Event not found." }, { status: 404 });
    }

    const authHeader = request.headers.get("authorization");
    const userCheck = authHeader ? await requireApiUser(request) : null;
    const response: Record<string, unknown> = {
      event,
      feedbackOpen: ["Completed", "Closed"].includes(String(event.status || "")),
      feedback: null,
      registration: null,
      certificate: null,
    };

    if (userCheck?.ok) {
      const [{ data: registration }, { data: feedback }, { data: certificate }] = await Promise.all([
        supabaseAdmin
          .from("event_registrations")
          .select("id, payment_status")
          .eq("event_id", eventId)
          .eq("user_id", userCheck.userId)
          .maybeSingle(),
        supabaseAdmin
          .from("event_feedback")
          .select("id, rating, comments, is_anonymous, submitted_at")
          .eq("event_id", eventId)
          .eq("user_id", userCheck.userId)
          .maybeSingle(),
        supabaseAdmin
          .from("certificates")
          .select("id, certificate_no, status")
          .eq("event_id", eventId)
          .eq("user_id", userCheck.userId)
          .eq("status", "issued")
          .maybeSingle(),
      ]);

      response.registration = registration;
      response.feedback = feedback;
      response.certificate = certificate;
    }

    return Response.json(response);
  } catch (error) {
    console.error("Feedback event load error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
