import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const NEST_INTERNAL_URL =
  process.env.NEST_INTERNAL_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${NEST_INTERNAL_URL}/api/v1/payments/providers`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        "X-Internal-Token": process.env.INTERNAL_API_SECRET ?? "",
      },
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[payment-providers-proxy]", error);
    return NextResponse.json(
      { error: "Failed to load payment providers" },
      { status: 502 },
    );
  }
}
