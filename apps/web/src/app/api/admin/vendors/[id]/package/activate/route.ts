import { NextRequest, NextResponse } from "next/server";

const NEST_INTERNAL_URL =
  process.env.NEST_INTERNAL_URL ?? "http://localhost:3001";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Vendor id is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${NEST_INTERNAL_URL}/api/v1/admin/vendors/${id}/package/activate`,
      {
        method: "POST",
        headers: {
          Cookie: request.headers.get("cookie") ?? "",
          "X-Internal-Token": process.env.INTERNAL_API_SECRET ?? "",
        },
      },
    );

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[admin-vendor-package-activate-proxy]", error);
    return NextResponse.json({ error: "Proxy error" }, { status: 502 });
  }
}
