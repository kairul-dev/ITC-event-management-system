import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type CheckoutRequest = {
  registrationId?: string;
};

type RegistrationRow = {
  id: string;
  user_id: string;
  event_id: string;
  payment_status: "unpaid" | "pending" | "paid" | "rejected";
  events:
    | {
        title?: string | null;
        fee_amount?: number | null;
      }
    | {
        title?: string | null;
        fee_amount?: number | null;
      }[]
    | null;
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const pickEventData = (events: RegistrationRow["events"]) => {
  if (!events) return null;
  if (Array.isArray(events)) return events[0] || null;
  return events;
};

export async function POST(request: Request) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is missing." }, { status: 500 });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase URL or anon key is missing." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const supabaseAdmin = getSupabaseAdminClient();

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as CheckoutRequest;
    const registrationId = body.registrationId?.trim();

    if (!registrationId) {
      return NextResponse.json({ error: "Missing registration id." }, { status: 400 });
    }

    const { data: registration, error: registrationError } = await supabaseAdmin
      .from("event_registrations")
      .select("id, user_id, event_id, payment_status, events(title, fee_amount)")
      .eq("id", registrationId)
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    const row = registration as RegistrationRow;

    if (row.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (row.payment_status === "paid") {
      return NextResponse.json({ error: "Registration is already paid." }, { status: 400 });
    }

    const eventData = pickEventData(row.events);
    const feeAmount = Number(eventData?.fee_amount || 0);

    if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
      return NextResponse.json(
        { error: "This event has no payable fee." },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "myr",
            unit_amount: Math.round(feeAmount * 100),
            product_data: {
              name: eventData?.title || "Event Registration Fee",
              description: "Event payment",
            },
          },
        },
      ],
      metadata: {
        registration_id: row.id,
        event_id: row.event_id,
        user_id: user.id,
      },
      success_url: `${origin}/student/registered-events?payment=success`,
      cancel_url: `${origin}/student/registered-events?payment=cancel`,
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Unable to create checkout session." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Create checkout session error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Stripe checkout session.",
      },
      { status: 500 }
    );
  }
}
