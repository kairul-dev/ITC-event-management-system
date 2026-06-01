import { requireApiRole } from "@/lib/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type EventRow = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_by: string | null;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
};

export async function GET(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, [
      "admin",
      "committee",
      "high_council",
      "club_advisor",
    ]);

    if (!roleCheck.ok) {
      return Response.json({ error: roleCheck.error }, { status: roleCheck.status });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "all";
    const organizer = url.searchParams.get("organizer") || "all";
    const month = url.searchParams.get("month") || "";
    const supabaseAdmin = getSupabaseAdminClient();

    let query = supabaseAdmin
      .from("events")
      .select("id, title, start_date, end_date, status, created_by")
      .order("start_date", { ascending: true });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (organizer !== "all") {
      query = query.eq("created_by", organizer);
    }

    if (/^\d{4}-\d{2}$/.test(month)) {
      const start = `${month}-01`;
      const end = new Date(`${month}-01T00:00:00`);
      end.setMonth(end.getMonth() + 1);
      const endValue = end.toISOString().slice(0, 10);
      query = query.lte("start_date", endValue).gte("end_date", start);
    }

    const { data: eventsData, error: eventsError } = await query;
    if (eventsError) {
      return Response.json({ error: eventsError.message }, { status: 400 });
    }

    const events = (eventsData || []) as EventRow[];
    const organizerIds = [...new Set(events.map((event) => event.created_by).filter(Boolean))] as string[];
    let userMap = new Map<string, UserRow>();

    if (organizerIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from("users")
        .select("id, name, email")
        .in("id", organizerIds);
      userMap = new Map(((usersData || []) as UserRow[]).map((user) => [user.id, user]));
    }

    const enrichedEvents = events.map((event) => {
      const user = event.created_by ? userMap.get(event.created_by) : null;
      return {
        ...event,
        organizerName: user?.name || user?.email || "Unassigned",
      };
    });

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthStart = new Date(`${currentMonth}-01T00:00:00`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const statsSource = status === "all" && organizer === "all" ? enrichedEvents : events;
    const stats = {
      eventsThisMonth: statsSource.filter((event) => {
        if (!event.start_date) return false;
        const start = new Date(event.start_date);
        return start >= monthStart && start < monthEnd;
      }).length,
      pendingApprovals: statsSource.filter((event) =>
        ["Pending Approval", "Pending High Council Approval", "Pending Club Advisor Approval"].includes(event.status)
      ).length,
      upcomingEvents: statsSource.filter((event) => {
        if (!event.start_date) return false;
        return new Date(event.start_date) >= now;
      }).length,
      completedEvents: statsSource.filter((event) => event.status === "Completed").length,
    };

    const organizers = Array.from(userMap.values())
      .map((user) => ({
        id: user.id,
        name: user.name || user.email || "Unassigned",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({
      events: enrichedEvents,
      organizers,
      stats,
    });
  } catch (error) {
    console.error("Program calendar load error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
