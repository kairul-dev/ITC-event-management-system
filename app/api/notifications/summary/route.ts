import { requireApiRole } from "@/lib/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const approvalRoles = ["admin", "committee", "high_council", "club_advisor", "student"];

export async function GET(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, approvalRoles);
    if (!roleCheck.ok) {
      return Response.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const items: Array<{
      id: string;
      title: string;
      message: string;
      count: number;
      type: "paperwork" | "certificate";
    }> = [];

    if (["high_council", "club_advisor"].includes(roleCheck.role)) {
      const queueStatus = roleCheck.role === "club_advisor" ? "Pending Club Advisor Approval" : "Pending Approval";
      const roleLabel = roleCheck.role === "club_advisor" ? "Club Advisor final approval" : "High Council review";
      const { count: paperworkCount, error: paperworkError } = await supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", queueStatus);

      if (paperworkError) {
        return Response.json({ error: paperworkError.message }, { status: 400 });
      }

      if ((paperworkCount ?? 0) > 0) {
        items.push({
          id: `${roleCheck.role}-paperwork`,
          title: "Paperwork needs approval",
          message: `${paperworkCount} event paperwork ${paperworkCount === 1 ? "submission is" : "submissions are"} waiting for ${roleLabel}.`,
          count: paperworkCount ?? 0,
          type: "paperwork",
        });
      }

    }

    if (roleCheck.role === "committee") {
      const [
        { count: pendingApprovalCount, error: pendingApprovalError },
        { count: rejectedPaperworkCount, error: rejectedPaperworkError },
      ] = await Promise.all([
        supabaseAdmin
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("status", "Pending Approval"),
        supabaseAdmin
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("status", "Rejected"),
      ]);

      if (
        pendingApprovalError ||
        rejectedPaperworkError
      ) {
        return Response.json(
          {
            error:
              pendingApprovalError?.message ||
              rejectedPaperworkError?.message,
          },
          { status: 400 }
        );
      }

      const paperworkCount = pendingApprovalCount ?? 0;
      if (paperworkCount > 0) {
        items.push({
          id: "admin-paperwork",
          title: "Paperwork is awaiting approval",
          message: `${paperworkCount} event paperwork ${paperworkCount === 1 ? "submission is" : "submissions are"} still in the approval workflow.`,
          count: paperworkCount,
          type: "paperwork",
        });
      }

      if ((rejectedPaperworkCount ?? 0) > 0) {
        items.push({
          id: "admin-rejected-paperwork",
          title: "Paperwork rejected",
          message: `${rejectedPaperworkCount} event paperwork ${rejectedPaperworkCount === 1 ? "submission was" : "submissions were"} rejected and may need revision.`,
          count: rejectedPaperworkCount ?? 0,
          type: "paperwork",
        });
      }

    }

    return Response.json({
      unreadCount: items.reduce((total, item) => total + item.count, 0),
      items,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load notifications." },
      { status: 500 }
    );
  }
}
