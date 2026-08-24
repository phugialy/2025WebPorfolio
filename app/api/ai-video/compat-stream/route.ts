import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

export const runtime = "nodejs";

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
    return { error: "Only public HTTPS video URLs can be transcoded.", status: 400 as const };
  }

  return { url };
}

export async function GET(request: NextRequest) {
  const safeUrl = getSafeSourceUrl(request);

  if ("error" in safeUrl) {
    return NextResponse.json({ error: safeUrl.error }, { status: safeUrl.status });
  }

  const ffmpeg = spawn("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    safeUrl.url.toString(),
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "frag_keyframe+empty_moov+faststart",
    "-f",
    "mp4",
    "pipe:1",
  ]);

  request.signal.addEventListener("abort", () => {
    ffmpeg.kill("SIGKILL");
  });

  ffmpeg.stderr.on("data", (chunk) => {
    console.error(`ffmpeg preview error: ${String(chunk)}`);
  });

  ffmpeg.on("error", (error) => {
    console.error(`ffmpeg preview failed: ${error.message}`);
  });

  const stream = Readable.toWeb(ffmpeg.stdout) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, X-Requested-With",
      "Cache-Control": "no-store",
      "Content-Disposition": "inline",
      "Content-Type": "video/mp4",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, X-Requested-With",
    },
  });
}
