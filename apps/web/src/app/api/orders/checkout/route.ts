import { NextRequest, NextResponse } from "next/server";

const NEST_INTERNAL_URL =
  process.env.NEST_INTERNAL_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const body = await request.text();

  try {
    const res = await fetch(`${NEST_INTERNAL_URL}/api/v1/orders/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        "X-Internal-Token": process.env.INTERNAL_API_SECRET ?? "",
      },
      body,
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[orders-checkout-proxy]", error);
    return NextResponse.json({ error: "Proxy error" }, { status: 502 });
  }
}
