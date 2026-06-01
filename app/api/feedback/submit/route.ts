import { requireApiRole } from "@/lib/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type FeedbackRequest = {
  eventId?: string;
  rating?: number;
  comments?: string;
  isAnonymous?: boolean;
};

export async function POST(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, ["student"]);
    if (!roleCheck.ok) {
      return Response.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    const body = (await request.json()) as FeedbackRequest;
    const eventId = body.eventId?.trim();
    const rating = Number(body.rating);
    const comments = (body.comments || "").trim();

    if (!eventId) {
      return Response.json({ error: "Missing event." }, { status: 400 });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, status")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      return Response.json({ error: eventError.message }, { status: 400 });
    }

    if (!event) {
      return Response.json({ error: "Event not found." }, { status: 404 });
    }

    if (!["Completed", "Closed"].includes(String(event.status || ""))) {
      return Response.json(
        { error: "Feedback opens after the event is completed." },
        { status: 409 },
      );
    }

    const { data: registration, error: registrationError } = await supabaseAdmin
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", roleCheck.userId)
      .maybeSingle();

    if (registrationError) {
      return Response.json({ error: registrationError.message }, { status: 400 });
    }

    if (!registration) {
      return Response.json(
        { error: "You must be registered for this event before submitting feedback." },
        { status: 403 },
      );
    }

    const { data: existingFeedback } = await supabaseAdmin
      .from("event_feedback")
      .select("id, submitted_at")
      .eq("event_id", eventId)
      .eq("user_id", roleCheck.userId)
      .maybeSingle();

    if (existingFeedback) {
      return Response.json({
        ok: true,
        alreadySubmitted: true,
        feedback: existingFeedback,
      });
    }

    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from("event_feedback")
      .insert({
        event_id: eventId,
        user_id: roleCheck.userId,
        registration_id: registration.id,
        rating,
        comments: comments || null,
        is_anonymous: Boolean(body.isAnonymous),
      })
      .select("id, submitted_at")
      .single();

    if (feedbackError) {
      return Response.json({ error: feedbackError.message }, { status: 400 });
    }

    return Response.json({ ok: true, alreadySubmitted: false, feedback });
  } catch (error) {
    console.error("Feedback submit error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
