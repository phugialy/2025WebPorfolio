import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { DealsAdminError, resetOverride, saveOverride } from "@/lib/deals-admin";
import { sanitizeOverride } from "@/lib/deals-core";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: unknown) {
  const status = error instanceof DealsAdminError ? error.status : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status });
}

// Change one product's override: { tags?, hidden?, pinned_rank? }.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminSession();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not a product id." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  const checked = sanitizeOverride((body && typeof body === "object" ? body : {}) as Record<string, unknown>);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  try {
    await saveOverride(id, checked.values);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

// Back to automatic: remove the override.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminSession();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not a product id." }, { status: 400 });
  try {
    await resetOverride(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
