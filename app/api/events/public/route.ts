import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getEventPoster, stripEventPosterMarker } from "@/lib/eventPoster";

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  budget?: number | null;
  max_students: number;
  fee_amount?: number | null;
  location?: string | null;
  purpose?: string | null;
  objective?: string | null;
  poster_url?: string | null;
};

async function withRegistrationCount(event: EventRow) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { count } = await supabaseAdmin
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  const poster = getEventPoster(event.objective);

  return {
    ...event,
    objective: stripEventPosterMarker(event.objective),
    poster_url: poster?.publicUrl || null,
    registered_count: count || 0,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  const limitParam = Number(searchParams.get("limit") || "0");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : null;

  const supabaseAdmin = getSupabaseAdminClient();
  let query = supabaseAdmin
    .from("events")
    .select("id,title,start_date,end_date,budget,max_students,fee_amount,location,purpose,objective")
    .eq("status", "Published")
    .order("start_date", { ascending: true });

  if (id) {
    query = query.eq("id", id);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const events = await Promise.all(((data || []) as EventRow[]).map(withRegistrationCount));

  if (id) {
    return Response.json(events[0] || null);
  }

  return Response.json(events);
}
