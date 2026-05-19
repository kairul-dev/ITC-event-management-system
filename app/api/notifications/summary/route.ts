import { requireApiRole } from "@/lib/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const approvalRoles = ["admin", "club_advisor", "president", "high_council", "student"];

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

    if (roleCheck.role === "high_council") {
      const { count, error } = await supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", "Pending High Council Approval");

      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }

      if ((count ?? 0) > 0) {
        items.push({
          id: "high-council-paperwork",
          title: "Paperwork needs review",
          message: `${count} event paperwork ${count === 1 ? "submission is" : "submissions are"} waiting for High Council approval.`,
          count: count ?? 0,
          type: "paperwork",
        });
      }
    }

    if (["club_advisor", "president"].includes(roleCheck.role)) {
      const [{ count: paperworkCount, error: paperworkError }, { count: certificateCount, error: certificateError }] =
        await Promise.all([
          supabaseAdmin
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("status", "Pending Club Advisor Approval"),
          supabaseAdmin
            .from("certificates")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
        ]);

      if (paperworkError || certificateError) {
        return Response.json(
          { error: paperworkError?.message || certificateError?.message },
          { status: 400 }
        );
      }

      if ((paperworkCount ?? 0) > 0) {
        items.push({
          id: "club-advisor-paperwork",
          title: "Paperwork needs approval",
          message: `${paperworkCount} event paperwork ${paperworkCount === 1 ? "submission is" : "submissions are"} waiting for final approval.`,
          count: paperworkCount ?? 0,
          type: "paperwork",
        });
      }

      if ((certificateCount ?? 0) > 0) {
        items.push({
          id: "club-advisor-certificates",
          title: "Certificates need approval",
          message: `${certificateCount} certificate ${certificateCount === 1 ? "is" : "are"} waiting for approval.`,
          count: certificateCount ?? 0,
          type: "certificate",
        });
      }
    }

    if (roleCheck.role === "admin") {
      const [
        { count: highCouncilCount, error: highCouncilError },
        { count: clubAdvisorCount, error: clubAdvisorError },
        { count: certificateCount, error: certificateError },
        { count: rejectedPaperworkCount, error: rejectedPaperworkError },
        { count: rejectedCertificateCount, error: rejectedCertificateError },
      ] = await Promise.all([
        supabaseAdmin
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("status", "Pending High Council Approval"),
        supabaseAdmin
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("status", "Pending Club Advisor Approval"),
        supabaseAdmin
          .from("certificates")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabaseAdmin
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("status", "Rejected"),
        supabaseAdmin
          .from("certificates")
          .select("id", { count: "exact", head: true })
          .eq("status", "rejected"),
      ]);

      if (
        highCouncilError ||
        clubAdvisorError ||
        certificateError ||
        rejectedPaperworkError ||
        rejectedCertificateError
      ) {
        return Response.json(
          {
            error:
              highCouncilError?.message ||
              clubAdvisorError?.message ||
              certificateError?.message ||
              rejectedPaperworkError?.message ||
              rejectedCertificateError?.message,
          },
          { status: 400 }
        );
      }

      const paperworkCount = (highCouncilCount ?? 0) + (clubAdvisorCount ?? 0);
      if (paperworkCount > 0) {
        items.push({
          id: "admin-paperwork",
          title: "Paperwork is awaiting approval",
          message: `${paperworkCount} event paperwork ${paperworkCount === 1 ? "submission is" : "submissions are"} still in the approval workflow.`,
          count: paperworkCount,
          type: "paperwork",
        });
      }

      if ((certificateCount ?? 0) > 0) {
        items.push({
          id: "admin-certificates",
          title: "Certificates are awaiting approval",
          message: `${certificateCount} certificate ${certificateCount === 1 ? "is" : "are"} pending Club Advisor approval.`,
          count: certificateCount ?? 0,
          type: "certificate",
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

      if ((rejectedCertificateCount ?? 0) > 0) {
        items.push({
          id: "admin-rejected-certificates",
          title: "Certificates rejected",
          message: `${rejectedCertificateCount} certificate ${rejectedCertificateCount === 1 ? "was" : "were"} rejected and may need regeneration.`,
          count: rejectedCertificateCount ?? 0,
          type: "certificate",
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
