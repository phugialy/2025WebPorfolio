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

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url");
  const name = request.nextUrl.searchParams.get("name") || "generated-video.mp4";

  if (!sourceUrl) {
    return NextResponse.json({ error: "Video URL is required." }, { status: 400 });
  }

  let url: URL;

  try {
    url = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
  }

  if (url.protocol !== "https:" || isPrivateHost(url.hostname)) {
    return NextResponse.json({ error: "Only public HTTPS video URLs can be downloaded." }, { status: 400 });
  }

  const response = await fetch(url.toString());

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "Could not download the video." }, { status: response.status || 502 });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Disposition": `attachment; filename="${name.replace(/[^a-z0-9_.-]/gi, "-")}"`,
      "Content-Type": response.headers.get("Content-Type") || "video/mp4",
    },
  });
}
