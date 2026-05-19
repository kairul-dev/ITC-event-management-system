import { requireApiRole } from "@/lib/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type ReviewRequest = {
  eventId?: string;
  nextStatus?: string;
  rejectionReason?: string | null;
};

const normalizeRole = (role: string) =>
  role.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

export async function POST(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, [
      "high_council",
      "club_advisor",
      "president",
    ]);

    if (!roleCheck.ok) {
      return Response.json(
        { error: roleCheck.error },
        { status: roleCheck.status }
      );
    }

    const body = (await request.json()) as ReviewRequest;
    const eventId = body.eventId?.trim();
    const nextStatus = body.nextStatus?.trim();
    const rejectionReason = body.rejectionReason?.trim() || null;

    if (!eventId || !nextStatus) {
      return Response.json(
        { error: "Missing eventId or nextStatus." },
        { status: 400 }
      );
    }

    if (nextStatus === "Rejected" && !rejectionReason) {
      return Response.json(
        { error: "Rejection reason is required." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, status")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return Response.json({ error: "Paperwork not found." }, { status: 404 });
    }

    const role = normalizeRole(roleCheck.role);
    const currentStatus = event.status;
    const isHighCouncilTransition =
      role === "high_council" &&
      currentStatus === "Pending High Council Approval" &&
      ["Pending Club Advisor Approval", "Rejected"].includes(nextStatus);
    const isClubAdvisorTransition =
      ["club_advisor", "president"].includes(role) &&
      currentStatus === "Pending Club Advisor Approval" &&
      ["Approved", "Rejected"].includes(nextStatus);

    if (!isHighCouncilTransition && !isClubAdvisorTransition) {
      return Response.json(
        { error: "This role cannot perform the requested paperwork transition." },
        { status: 403 }
      );
    }

    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from("events")
      .update({
        status: nextStatus,
        rejection_reason: nextStatus === "Rejected" ? rejectionReason : null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select("id, status, rejection_reason")
      .single();

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 400 });
    }

    return Response.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error("Review paperwork error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
