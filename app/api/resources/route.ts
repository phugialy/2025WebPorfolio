import { NextResponse } from "next/server";
import { listActiveResourcesOrThrow } from "@/lib/affiliate";

// Every active product, for the blog's sponsor strip. It used to be read from
// Supabase on every blog visit; now kept for 5 minutes (editing a product clears
// it at once, see revalidateResources). A failed read throws instead of caching
// an empty list.
export const revalidate = 300;

export async function GET() {
  const resources = await listActiveResourcesOrThrow();
  return NextResponse.json(resources, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
