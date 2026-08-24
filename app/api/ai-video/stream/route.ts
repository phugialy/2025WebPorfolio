import { NextRequest, NextResponse } from "next/server";

function isPrivateHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function getSafeSourceUrl(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url");

  if (!sourceUrl) {
    return { error: "Video URL is required.", status: 400 as const };
  }

  let url: URL;

  try {
    url = new URL(sourceUrl);
  } catch {
    return { error: "Invalid video URL.", status: 400 as const };
  }

  if (url.protocol !== "https:" || isPrivateHost(url.hostname)) {
    return { error: "Only public HTTPS video URLs can be streamed.", status: 400 as const };
  }

  return { url };
}

function getStreamHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type, X-Requested-With",
    "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range, Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getStreamHeaders(),
  });
}

export async function GET(request: NextRequest) {
  const safeUrl = getSafeSourceUrl(request);

  if ("error" in safeUrl) {
    return NextResponse.json({ error: safeUrl.error }, { status: safeUrl.status, headers: getStreamHeaders() });
  }

  const range = request.headers.get("range");
  const response = await fetch(safeUrl.url.toString(), {
    headers: range ? { Range: range } : undefined,
  });

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "Could not stream the video." }, { status: response.status || 502, headers: getStreamHeaders() });
  }

  const headers = new Headers(getStreamHeaders());
  const passthroughHeaders = ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"];

  for (const header of passthroughHeaders) {
    const value = response.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  headers.set("Content-Type", headers.get("Content-Type") || "video/mp4");
  headers.set("Content-Disposition", "inline");
  headers.set("Cache-Control", "private, max-age=300");

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}

export async function HEAD(request: NextRequest) {
  const safeUrl = getSafeSourceUrl(request);

  if ("error" in safeUrl) {
    return new NextResponse(null, { status: safeUrl.status, headers: getStreamHeaders() });
  }

  const range = request.headers.get("range");
  const response = await fetch(safeUrl.url.toString(), {
    method: "HEAD",
    headers: range ? { Range: range } : undefined,
  });
  const headers = new Headers(getStreamHeaders());
  const passthroughHeaders = ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"];

  for (const header of passthroughHeaders) {
    const value = response.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  headers.set("Content-Type", headers.get("Content-Type") || "video/mp4");
  headers.set("Content-Disposition", "inline");
  headers.set("Cache-Control", "private, max-age=300");

  return new NextResponse(null, {
    status: response.status,
    headers,
  });
}
