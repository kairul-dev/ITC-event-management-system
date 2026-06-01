import { requireApiRole } from "@/lib/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getPaperworkFile } from "@/lib/paperworkFile";

const BUCKET = "paperwork-files";

type SignedUrlRequest = {
  path?: string;
};

function canOpenPaperwork(role: string, status: string) {
  if (role === "admin") return true;
  if (role === "committee") return true;
  if (role === "high_council") return ["Pending Approval", "Pending High Council Approval", "Pending Club Advisor Approval", "Rejected"].includes(status);
  if (role === "club_advisor") return ["Pending Club Advisor Approval", "Approved", "Rejected"].includes(status);
  return false;
}

export async function POST(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, [
      "admin",
      "committee",
      "high_council",
      "club_advisor",
    ]);

    if (!roleCheck.ok) {
      return Response.json(
        { error: roleCheck.error },
        { status: roleCheck.status },
      );
    }

    const body = (await request.json()) as SignedUrlRequest;
    const path = body.path?.trim();

    if (!path) {
      return Response.json({ error: "Paperwork file path is required." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: events, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, status, objective, purpose")
      .in("status", [
        "Pending High Council Approval",
        "Pending Club Advisor Approval",
        "Pending Approval",
        "Approved",
        "Rejected",
      ]);

    if (eventError) {
      return Response.json({ error: eventError.message }, { status: 400 });
    }

    const matchingEvent = events?.find((event) => {
      const paperworkFile = getPaperworkFile(event.objective, event.purpose);
      return paperworkFile?.path === path;
    });

    if (!matchingEvent || !canOpenPaperwork(roleCheck.role, matchingEvent.status)) {
      return Response.json(
        { error: "You do not have permission to open this paperwork file." },
        { status: 403 },
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      return Response.json(
        { error: error?.message || "Unable to open paperwork file." },
        { status: 400 },
      );
    }

    return Response.json({ url: data.signedUrl });
  } catch (error) {
    console.error("Paperwork signed URL error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
