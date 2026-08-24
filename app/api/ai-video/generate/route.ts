import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_VIDEO_URL = "https://openrouter.ai/api/v1/videos";
const MAX_OPENROUTER_VIDEO_PROMPT_CHARS = 4096;

type GenerateRequest = {
  apiKey?: string;
  model?: string;
  prompt?: string;
  aspect_ratio?: string;
  duration?: number;
  resolution?: string;
  seed?: number;
  generate_audio?: boolean;
  frame_images?: unknown[];
  input_references?: unknown[];
};

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const error = record.error;

    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object") {
      const errorRecord = error as Record<string, unknown>;

      if (typeof errorRecord.message === "string") {
        return errorRecord.message;
      }

      if (typeof errorRecord.detail === "string") {
        return errorRecord.detail;
      }
    }

    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as GenerateRequest;
  const apiKey = body.apiKey?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key is required." }, { status: 400 });
  }

  if (!body.model?.trim() || !body.prompt?.trim()) {
    return NextResponse.json({ error: "Model and prompt are required." }, { status: 400 });
  }

  if (body.prompt.trim().length > MAX_OPENROUTER_VIDEO_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `Compiled prompt is ${body.prompt.trim().length} characters. OpenRouter video prompts must be ${MAX_OPENROUTER_VIDEO_PROMPT_CHARS} characters or less.` },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {
    model: body.model.trim(),
    prompt: body.prompt.trim(),
  };

  for (const key of ["aspect_ratio", "duration", "resolution", "seed", "generate_audio"] as const) {
    if (body[key] !== undefined && body[key] !== "") {
      payload[key] = body[key];
    }
  }

  if (Array.isArray(body.frame_images) && body.frame_images.length > 0) {
    payload.frame_images = body.frame_images;
  } else if (Array.isArray(body.input_references) && body.input_references.length > 0) {
    payload.input_references = body.input_references;
  }

  const response = await fetch(OPENROUTER_VIDEO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": request.nextUrl.origin,
      "X-Title": "Phu AI Video Workspace",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text || "OpenRouter returned an empty response." };
  }

  if (!response.ok) {
    return NextResponse.json({ error: getErrorMessage(data, "OpenRouter rejected the generation request."), details: data }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}
