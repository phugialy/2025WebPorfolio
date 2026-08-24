import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UploadReferenceRequest = {
  dataUrl?: string;
  filename?: string;
  conversationId?: string;
};

const maxImageBytes = 10 * 1024 * 1024;

function getBucketName() {
  return process.env.SUPABASE_AI_VIDEO_ASSET_BUCKET || "ai-video-assets";
}

function sanitizePathPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid image data URL.");
  }

  const contentType = match[1];
  const bytes = Buffer.from(match[2], "base64");

  if (!contentType.startsWith("image/")) {
    throw new Error("Only image references are supported.");
  }

  if (bytes.byteLength > maxImageBytes) {
    throw new Error("Reference image is larger than the 10 MB limit.");
  }

  return { bytes, contentType };
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase write config is missing." }, { status: 503 });
  }

  const body = (await request.json()) as UploadReferenceRequest;

  if (!body.dataUrl) {
    return NextResponse.json({ error: "Reference image data is required." }, { status: 400 });
  }

  let image;

  try {
    image = parseDataUrl(body.dataUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid image." }, { status: 400 });
  }

  const bucket = getBucketName();
  const ext = extensionFromContentType(image.contentType);
  const safeConversation = sanitizePathPart(body.conversationId || "workspace");
  const safeName = sanitizePathPart((body.filename || "reference").replace(/\.[a-z0-9]+$/i, "")) || "reference";
  const path = `${safeConversation}/${Date.now()}-${safeName}.${ext}`;

  let { error: uploadError } = await supabase.storage.from(bucket).upload(path, image.bytes, {
    contentType: image.contentType,
    upsert: true,
  });

  if (uploadError?.message.toLowerCase().includes("bucket not found")) {
    const { error: bucketError } = await supabase.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      fileSizeLimit: maxImageBytes,
    });

    if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
      return NextResponse.json({ error: bucketError.message }, { status: 500 });
    }

    const retry = await supabase.storage.from(bucket).upload(path, image.bytes, {
      contentType: image.contentType,
      upsert: true,
    });
    uploadError = retry.error;
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return NextResponse.json({
    bucket,
    path,
    publicUrl: data.publicUrl,
  });
}
