import { createReadStream, statSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

export const runtime = "nodejs";

const OUTPUT_ROOT = path.join(process.cwd(), ".local-ai-video", "outputs");

function getSafePath(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId") || "";
  const file = request.nextUrl.searchParams.get("file") || "";

  if (!/^[a-z0-9._-]+$/i.test(jobId) || !/^[a-z0-9._-]+$/i.test(file)) {
    return null;
  }

  const target = path.resolve(OUTPUT_ROOT, jobId, file);

  if (!target.startsWith(path.resolve(OUTPUT_ROOT))) {
    return null;
  }

  return target;
}

function getContentType(file: string) {
  if (file.endsWith(".webm")) {
    return "video/webm";
  }

  if (file.endsWith(".mov")) {
    return "video/quicktime";
  }

  return "video/mp4";
}

export async function GET(request: NextRequest) {
  const target = getSafePath(request);

  if (!target) {
    return NextResponse.json({ error: "Invalid local video path." }, { status: 400 });
  }

  let stats;

  try {
    stats = statSync(target);
  } catch {
    return NextResponse.json({ error: "Local video file was not found." }, { status: 404 });
  }

  const range = request.headers.get("range");
  const filename = path.basename(target);
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=300",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Content-Type": getContentType(filename),
  });

  if (range) {
    const match = range.match(/bytes=(\d+)-(\d*)/);
    const start = match ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : stats.size - 1;
    const safeEnd = Math.min(end, stats.size - 1);

    headers.set("Content-Length", String(safeEnd - start + 1));
    headers.set("Content-Range", `bytes ${start}-${safeEnd}/${stats.size}`);

    return new NextResponse(Readable.toWeb(createReadStream(target, { start, end: safeEnd })) as ReadableStream, {
      status: 206,
      headers,
    });
  }

  headers.set("Content-Length", String(stats.size));

  return new NextResponse(Readable.toWeb(createReadStream(target)) as ReadableStream, {
    headers,
  });
}
