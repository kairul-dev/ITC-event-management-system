import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireApiRole } from "@/lib/apiAuth";

export async function POST(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, ["admin", "club_advisor"]);
    if (!roleCheck.ok) {
      return Response.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    const body = await request.json();
    const { certificateId, action } = body; // action: "approve" or "reject"

    if (!certificateId || !action) {
      return Response.json({ error: "Missing certificateId or action" }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject") {
      return Response.json({ error: "Invalid certificate action" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Get the certificate to retrieve event_id
    const { data: certificate, error: fetchError } = await supabaseAdmin
      .from("certificates")
      .select("id, event_id, user_id, status")
      .eq("id", certificateId)
      .single();

    if (fetchError || !certificate) {
      return Response.json({ error: "Certificate not found" }, { status: 404 });
    }

    // Update certificate status
    const newStatus = action === "approve" ? "approved" : "rejected";
    const { error: updateError } = await supabaseAdmin
      .from("certificates")
      .update({ status: newStatus })
      .eq("id", certificateId);

    if (updateError) {
      console.error("Error updating certificate:", updateError);
      return Response.json({ error: updateError.message }, { status: 400 });
    }

    // If approving, also update event status to "completed"
    if (action === "approve") {
      const { error: eventError } = await supabaseAdmin
        .from("events")
        .update({ status: "completed" })
        .eq("id", certificate.event_id);

      if (eventError) {
        console.warn("Error updating event status:", eventError);
      }
    }

    return Response.json({ 
      success: true, 
      message: `Certificate ${newStatus} successfully`,
      certificateId,
      newStatus
    });
  } catch (err) {
    console.error("Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
