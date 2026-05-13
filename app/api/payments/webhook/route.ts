import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

type CheckoutSessionPayload = {
  id: string;
  metadata?: {
    registration_id?: string;
  } | null;
  payment_intent?: string | null;
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

const handleCompletedCheckout = async (session: CheckoutSessionPayload) => {
  const registrationId = session.metadata?.registration_id;
  if (!registrationId) return;

  const now = new Date().toISOString();
  await updatePaymentStatus(registrationId, {
    payment_status: "paid",
    payment_reference:
      typeof session.payment_intent === "string" && session.payment_intent
        ? session.payment_intent
        : session.id,
    payment_note: "Payment confirmed via Stripe Checkout sandbox.",
    payment_submitted_at: now,
    payment_verified_at: now,
  });
};

const handleFailedCheckout = async (session: CheckoutSessionPayload) => {
  const registrationId = session.metadata?.registration_id;
  if (!registrationId) return;

  await updatePaymentStatus(registrationId, {
    payment_status: "rejected",
    payment_reference:
      typeof session.payment_intent === "string" && session.payment_intent
        ? session.payment_intent
        : session.id,
    payment_note: "Stripe payment was not completed. Please retry.",
    payment_verified_at: null,
  });
};

export async function POST(request: Request) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is missing." }, { status: 500 });
    }

    if (!stripeWebhookSecret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET is missing." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe signature." },
        { status: 400 }
      );
    }

    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeWebhookSecret
    );

    if (event.type === "checkout.session.completed") {
      await handleCompletedCheckout(event.data.object as CheckoutSessionPayload);
    }

    if (event.type === "checkout.session.expired") {
      await handleFailedCheckout(event.data.object as CheckoutSessionPayload);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process webhook.",
      },
      { status: 400 }
    );
  }
}
