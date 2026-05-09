import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEventReminderToAllStudents } from "@/lib/emailNotifications";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing eventId parameter" },
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

    // Get all students (role = student)
    const { data: students, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "student");

    if (studentError || !students) {
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    if (students.length === 0) {
      return NextResponse.json(
        { message: "No students to notify" },
        { status: 200 }
      );
    }

    // Send notifications to all students
    const studentData = students.map((s) => ({
      email: s.email,
      name: s.full_name || "Student",
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
      "new_event",
      studentData
    );

    // Log the broadcast event
    await supabaseAdmin.from("notification_logs").insert({
      event_id: eventId,
      notification_type: "new_event_broadcast",
      total_recipients: result.total,
      sent_count: result.sent,
      failed_count: result.failed,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        message: "Event broadcast notifications sent successfully",
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in broadcast notification API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
