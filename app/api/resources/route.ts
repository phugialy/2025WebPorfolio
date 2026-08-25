import { NextResponse } from "next/server";
import { listActiveResources } from "@/lib/affiliate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const resources = await listActiveResources();
  return NextResponse.json(resources, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
