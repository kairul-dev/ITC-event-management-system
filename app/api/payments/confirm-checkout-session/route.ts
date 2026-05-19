import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ConfirmRequest = {
  sessionId?: string;
};

type CheckoutSessionPayload = {
  id: string;
  payment_status?: string | null;
  payment_intent?: string | null;
  metadata?: {
    registration_id?: string;
    user_id?: string;
  } | null;
};

const updatePaymentStatus = async (
  registrationId: string,
  payload: {
    payment_status: "unpaid" | "pending" | "paid" | "rejected";
    payment_reference?: string | null;
    payment_note?: string | null;
    payment_submitted_at?: string;
    payment_verified_at?: string | null;
  }
) => {
  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from("event_registrations")
    .update(payload)
    .eq("id", registrationId);

  if (error) {
    throw new Error(error.message);
  }
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

    const body = (await request.json()) as ConfirmRequest;
    const sessionId = body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing checkout session id." }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const checkoutSession = (await stripe.checkout.sessions.retrieve(sessionId)) as CheckoutSessionPayload;

    if (!checkoutSession.metadata?.registration_id) {
      return NextResponse.json(
        { error: "Checkout session is missing registration metadata." },
        { status: 400 }
      );
    }

    if (checkoutSession.metadata.user_id && checkoutSession.metadata.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment has not been completed yet." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await updatePaymentStatus(checkoutSession.metadata.registration_id, {
      payment_status: "paid",
      payment_reference:
        typeof checkoutSession.payment_intent === "string" && checkoutSession.payment_intent
          ? checkoutSession.payment_intent
          : checkoutSession.id,
      payment_note: "Payment confirmed via Stripe Checkout.",
      payment_submitted_at: now,
      payment_verified_at: now,
    });

    return NextResponse.json({ received: true, payment_status: "paid" });
  } catch (error) {
    console.error("Stripe payment confirmation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to confirm Stripe payment.",
      },
      { status: 400 }
    );
  }
}