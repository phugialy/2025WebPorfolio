import { createSupabaseAdminClient } from "@/lib/supabase/server";

type ArticleImageAsset = {
  role: string;
  url: string;
  alt?: string;
  prompt?: string;
  path?: string;
  contentType?: string;
  createdAt?: string;
};

type UploadArticleImageInput = {
  slug: string;
  role?: string;
  alt?: string;
  prompt?: string;
  sourceUrl?: string;
  dataUrl?: string;
};

const maxImageBytes = 8 * 1024 * 1024;

function getBucketName() {
  return process.env.SUPABASE_ARTICLE_IMAGE_BUCKET || "article-images";
}

function roleToPathPart(role: string) {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

function isPrimaryImageRole(role: string) {
  return ["hero image", "main thumbnail", "thumbnail", "hero card"].includes(
    role.toLowerCase()
  );
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL");
  }

  const contentType = match[1];
  const bytes = Buffer.from(match[2], "base64");

  if (!contentType.startsWith("image/")) {
    throw new Error("Only image data URLs are supported");
  }

  if (bytes.byteLength > maxImageBytes) {
    throw new Error("Image is larger than the 8 MB limit");
  }

  return { bytes, contentType };
}

async function fetchRemoteImage(sourceUrl: string) {
  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Image fetch failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("Remote URL did not return an image");
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxImageBytes) {
    throw new Error("Image is larger than the 8 MB limit");
  }

  return { bytes: Buffer.from(arrayBuffer), contentType };
}

export async function uploadArticleImage(input: UploadArticleImageInput) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase write config is missing");
  }

  if (!input.sourceUrl && !input.dataUrl) {
    throw new Error("Provide either sourceUrl or dataUrl");
  }

  const role = input.role || "hero image";
  const image = input.dataUrl
    ? parseDataUrl(input.dataUrl)
    : await fetchRemoteImage(input.sourceUrl!);

  const ext = extensionFromContentType(image.contentType);
  const path = `${input.slug}/${Date.now()}-${roleToPathPart(role)}.${ext}`;
  const bucket = getBucketName();

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, image.bytes, {
      contentType: image.contentType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = publicUrlData.publicUrl;

  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id, title, hero_image_url, image_assets")
    .eq("slug", input.slug)
    .maybeSingle();

  if (articleError) {
    throw articleError;
  }

  if (!article) {
    throw new Error("Article not found");
  }

  const asset: ArticleImageAsset = {
    role,
    url: publicUrl,
    alt: input.alt || `${role} for ${article.title}`,
    prompt: input.prompt,
    path,
    contentType: image.contentType,
    createdAt: new Date().toISOString(),
  };

  const currentAssets = Array.isArray(article.image_assets)
    ? (article.image_assets as ArticleImageAsset[])
    : [];
  const nextAssets = [...currentAssets, asset].slice(-3);
  const shouldSetHero = isPrimaryImageRole(role) || !article.hero_image_url;

  const { error: updateError } = await supabase
    .from("articles")
    .update({
      image_assets: nextAssets,
      ...(shouldSetHero ? { hero_image_url: publicUrl } : {}),
    })
    .eq("id", article.id);

  if (updateError) {
    throw updateError;
  }

  return {
    asset,
    heroImageUrl: shouldSetHero ? publicUrl : article.hero_image_url,
  };
}
