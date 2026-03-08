import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const NEST_INTERNAL_URL =
  process.env.NEST_INTERNAL_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const body = await request.text();

  try {
    const response = await fetch(
      `${NEST_INTERNAL_URL}/api/v1/payments/checkout/initiate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("cookie") ?? "",
          "X-Internal-Token": process.env.INTERNAL_API_SECRET ?? "",
        },
        body,
      },
    );
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[checkout-initiate]", error);
    return NextResponse.json(
      { error: "Checkout initialization failed" },
      { status: 502 },
    );
  }
}
