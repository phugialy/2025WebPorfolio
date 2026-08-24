import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_ORIGIN = "https://openrouter.ai";

type StatusRequest = {
  apiKey?: string;
  pollingUrl?: string;
};

function normalizePollingUrl(pollingUrl: string) {
  const normalized =
    pollingUrl.startsWith("http://") || pollingUrl.startsWith("https://")
      ? pollingUrl
      : `${OPENROUTER_ORIGIN}${pollingUrl.startsWith("/") ? "" : "/"}${pollingUrl}`;
  const url = new URL(normalized);

  if (url.origin !== OPENROUTER_ORIGIN) {
    throw new Error("Polling URL must be an OpenRouter URL.");
  }

  return url.toString();
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as StatusRequest;
  const apiKey = body.apiKey?.trim();
  const pollingUrl = body.pollingUrl?.trim();

  if (!apiKey || !pollingUrl) {
    return NextResponse.json({ error: "API key and polling URL are required." }, { status: 400 });
  }

  let normalizedPollingUrl: string;

  try {
    normalizedPollingUrl = normalizePollingUrl(pollingUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid polling URL." },
      { status: 400 },
    );
  }

  const response = await fetch(normalizedPollingUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const text = await response.text();
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text || "OpenRouter returned an empty response." };
  }

  return NextResponse.json(data, { status: response.status });
}
