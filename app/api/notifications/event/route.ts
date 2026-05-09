import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEventReminderToAllStudents } from "@/lib/emailNotifications";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase environment variables"
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, notificationType } = body;

    if (!eventId || !notificationType) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all registered students for this event
    const { data: registrations, error: registrationError } = await supabaseAdmin
      .from("event_registrations")
      .select("user_id")
      .eq("event_id", eventId);

    if (registrationError) {
      return NextResponse.json(
        { error: "Failed to fetch registrations" },
        { status: 500 }
      );
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json(
        { message: "No registered students for this event" },
        { status: 200 }
      );
    }

    // Get student details for all registered students
    const userIds = registrations.map((r) => r.user_id);
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profileError || !profiles) {
      return NextResponse.json(
        { error: "Failed to fetch student profiles" },
        { status: 500 }
      );
    }

    // Send notifications
    const studentData = profiles.map((p) => ({
      email: p.email,
      name: p.full_name || "Student",
    }));

    const result = await sendEventReminderToAllStudents(
      event.title,
      event.purpose || event.objective || "Check details for more information",
      new Date(event.start_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      notificationType as "new_event" | "closing_soon" | "spots_filling",
      studentData
    );

    return NextResponse.json(
      {
        message: "Notifications sent successfully",
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in event notification API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
