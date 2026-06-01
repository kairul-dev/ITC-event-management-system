import { requireApiRole } from "@/lib/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type FeedbackRow = {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  comments: string | null;
  is_anonymous: boolean;
  submitted_at: string;
};

type EventRow = {
  id: string;
  title: string | null;
  status: string | null;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
};

export async function GET(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, ["admin", "committee"]);
    if (!roleCheck.ok) {
      return Response.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId") || "";
    const supabaseAdmin = getSupabaseAdminClient();

    const eventsQuery = supabaseAdmin
      .from("events")
      .select("id, title, status")
      .order("created_at", { ascending: false });

    const { data: eventsData, error: eventsError } = await eventsQuery;
    if (eventsError) {
      return Response.json({ error: eventsError.message }, { status: 400 });
    }

    let feedbackQuery = supabaseAdmin
      .from("event_feedback")
      .select("id, event_id, user_id, rating, comments, is_anonymous, submitted_at")
      .order("submitted_at", { ascending: false });

    if (eventId && eventId !== "all") {
      feedbackQuery = feedbackQuery.eq("event_id", eventId);
    }

    const { data: feedbackData, error: feedbackError } = await feedbackQuery;
    if (feedbackError) {
      return Response.json({ error: feedbackError.message }, { status: 400 });
    }

    const feedback = (feedbackData || []) as FeedbackRow[];
    const events = (eventsData || []) as EventRow[];
    const userIds = [...new Set(feedback.map((row) => row.user_id))];
    const eventMap = new Map(events.map((event) => [event.id, event]));
    const distribution = [1, 2, 3, 4, 5].reduce<Record<string, number>>((acc, rating) => {
      acc[String(rating)] = 0;
      return acc;
    }, {});

    for (const row of feedback) {
      distribution[String(row.rating)] += 1;
    }

    const averageRating =
      feedback.length > 0
        ? feedback.reduce((sum, row) => sum + Number(row.rating || 0), 0) / feedback.length
        : 0;

    let userMap = new Map<string, UserRow>();
    if (userIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from("users")
        .select("id, name, email")
        .in("id", userIds);
      userMap = new Map(((usersData || []) as UserRow[]).map((user) => [user.id, user]));
    }

    const recentComments = feedback
      .filter((row) => row.comments && row.comments.trim())
      .slice(0, 10)
      .map((row) => {
        const user = userMap.get(row.user_id);
        return {
          id: row.id,
          eventId: row.event_id,
          eventTitle: eventMap.get(row.event_id)?.title || "Event",
          rating: row.rating,
          comments: row.comments,
          submittedAt: row.submitted_at,
          isAnonymous: row.is_anonymous,
          studentName: row.is_anonymous ? "Anonymous" : user?.name || "Student",
          studentEmail: row.is_anonymous ? null : user?.email || null,
        };
      });

    return Response.json({
      events,
      selectedEventId: eventId || "all",
      averageRating,
      totalResponses: feedback.length,
      ratingDistribution: distribution,
      recentComments,
    });
  } catch (error) {
    console.error("Feedback analytics error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
