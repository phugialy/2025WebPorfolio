import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/article-automation";
import { uploadArticleImage } from "@/lib/article-image-storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await request.json();
    const result = await uploadArticleImage({
      slug,
      role: body.role,
      alt: body.alt,
      prompt: body.prompt,
      sourceUrl: body.sourceUrl,
      dataUrl: body.dataUrl,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
