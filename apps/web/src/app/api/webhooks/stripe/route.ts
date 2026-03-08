import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const NEST_INTERNAL_URL =
  process.env.NEST_INTERNAL_URL ?? "http://localhost:3001";

/**
 * Stripe webhook proxy.
 * Verifies Stripe signature at the edge, then forwards the verified event payload
 * to NestJS over internal shared-secret auth.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      return NextResponse.json(
        { error: "Stripe webhook is not configured." },
        { status: 500 },
      );
    }

    const rawBody = await request.text();
    const stripe = new Stripe(stripeSecretKey);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid Stripe signature" },
        { status: 400 },
      );
    }

    const res = await fetch(`${NEST_INTERNAL_URL}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": process.env.INTERNAL_API_SECRET ?? "",
      },
      body: JSON.stringify(event),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[stripe-webhook-proxy]", err);
    return NextResponse.json({ error: "Proxy error" }, { status: 502 });
  }
}
