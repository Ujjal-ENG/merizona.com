# Payment Confirmation Cycle (Stripe + Next.js + NestJS)

This document explains how payment is initiated and confirmed in this project.

## 1) High-level Flow

1. Customer clicks **Pay** on checkout page.
2. Frontend calls Next.js route: `POST /api/checkout/initiate`.
3. Next.js route creates a Stripe Checkout Session.
4. Next.js route creates marketplace order(s) in NestJS with status `pending`.
5. Customer is redirected to Stripe hosted checkout.
6. Stripe sends webhook events to Next.js route: `POST /api/webhooks/stripe`.
7. Next.js verifies Stripe signature and forwards the verified event to NestJS: `POST /api/v1/webhooks/stripe`.
8. NestJS processes webhook idempotently and updates order status:
   - Paid events => `pending -> confirmed`
   - Failed/expired events => `pending -> cancelled`

## 2) Current Endpoints and Responsibilities

### Checkout Initiation

- **Frontend page**: `apps/web/src/app/(storefront)/checkout/page.tsx`
- **Next.js API**: `apps/web/src/app/api/checkout/initiate/route.ts`
  - Creates Stripe Checkout Session.
  - Calls NestJS `POST /api/v1/orders/checkout`.
  - Stores Stripe `checkout session id` in order field `paymentIntentId` (name kept for backward compatibility).

### Stripe Webhook Entry

- **Next.js webhook route**: `apps/web/src/app/api/webhooks/stripe/route.ts`
  - Reads raw request body.
  - Verifies Stripe signature with `STRIPE_WEBHOOK_SECRET`.
  - Forwards verified event JSON to NestJS with `X-Internal-Token`.

### Backend Webhook Processing

- **NestJS controller**: `apps/api/src/modules/webhooks/webhooks.controller.ts`
  - Endpoint: `POST /api/v1/webhooks/stripe`
  - Validates internal token.

- **NestJS service**: `apps/api/src/modules/webhooks/webhooks.service.ts`
  - Idempotency via `stripe_webhook_events` table.
  - Handles:
    - `checkout.session.completed` (when `payment_status === "paid"`)
    - `checkout.session.async_payment_succeeded`
    - `checkout.session.async_payment_failed`
    - `checkout.session.expired`

- **Order status updater**: `apps/api/src/modules/orders/orders.service.ts`
  - `markCheckoutSessionPaid(...)`
  - `markCheckoutSessionFailed(...)`

## 3) Why Backend Can Confirm Payment Reliably

Backend does **not** trust browser redirect (`success_url`) for confirmation.
It trusts **Stripe webhooks**, which are:

- Signed (verified by webhook secret)
- Sent server-to-server
- Retried by Stripe if delivery fails

This is the correct mechanism for authoritative payment status.

## 4) Idempotency and Duplicate Protection

Table: `stripe_webhook_events`

- Stores Stripe `eventId` with unique constraint.
- If Stripe retries same event, it is ignored safely.
- Prevents double status updates.

## 5) Status Mapping (Current)

- On successful payment:
  - `pending -> confirmed`
- On failed/expired payment:
  - `pending -> cancelled`

Only `pending` orders are auto-transitioned by webhook handlers.

## 6) Required Environment Variables

Set these in environment:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `INTERNAL_API_SECRET`
- `NEST_INTERNAL_URL` (for Next.js server-to-server calls)

## 7) Local Testing

1. Start app + API.
2. Start Stripe CLI forwarding:
   - Forward to `http://localhost:3000/api/webhooks/stripe`
3. Complete a test checkout.
4. Check:
   - `orders.status` changed from `pending` to `confirmed` on paid event.
   - `stripe_webhook_events` contains processed event id.

## 8) Notes / Future Hardening

- Rename `paymentIntentId` field to `checkoutSessionId` for clarity (optional migration).
- Optionally add explicit payment fields:
  - `paymentStatus`, `paidAt`, `failedAt`, `stripePaymentIntentId`.
- Add automated integration tests for webhook event types.
