import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const OUTPUT_ROOT = path.join(process.cwd(), ".local-ai-video", "outputs");

type CacheRequest = {
  jobId?: string;
  videoUrl?: string;
};

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

function sanitizeId(value: string) {
  return value.replace(/[^a-z0-9._-]/gi, "-").slice(0, 120);
}

function getExtension(contentType: string | null, sourceUrl: string) {
  const pathname = new URL(sourceUrl).pathname.toLowerCase();

  if (pathname.endsWith(".webm") || contentType?.includes("webm")) {
    return "webm";
  }

  if (pathname.endsWith(".mov") || contentType?.includes("quicktime")) {
    return "mov";
  }

  if (pathname.endsWith(".m3u8") || contentType?.includes("mpegurl")) {
    return "m3u8";
  }

  return "mp4";
}

function runProcess(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };

      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(result.stderr || `${command} exited with code ${code}`));
      }
    });
  });
}

async function probeVideo(sourcePath: string) {
  try {
    const result = await runProcess("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      sourcePath,
    ]);

    return JSON.parse(result.stdout) as unknown;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ffprobe failed" };
  }
}

async function createPreview(sourcePath: string, previewPath: string) {
  await runProcess("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    sourcePath,
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
    "+faststart",
    previewPath,
  ]);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CacheRequest;
  const rawJobId = body.jobId?.trim();
  const rawVideoUrl = body.videoUrl?.trim();

  if (!rawJobId || !rawVideoUrl) {
    return NextResponse.json({ error: "Job id and video URL are required." }, { status: 400 });
  }

  let url: URL;

  try {
    url = new URL(rawVideoUrl);
  } catch {
    return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
  }

  if (url.protocol !== "https:" || isPrivateHost(url.hostname)) {
    return NextResponse.json({ error: "Only public HTTPS video URLs can be cached." }, { status: 400 });
  }

  const jobId = sanitizeId(rawJobId);
  const outputDir = path.join(OUTPUT_ROOT, jobId);
  await mkdir(outputDir, { recursive: true });

  const response = await fetch(url.toString());

  if (!response.ok) {
    return NextResponse.json({ error: `Could not download vendor video: HTTP ${response.status}` }, { status: response.status || 502 });
  }

  const extension = getExtension(response.headers.get("content-type"), url.toString());
  const sourceName = `source.${extension}`;
  const sourcePath = path.join(outputDir, sourceName);
  const previewName = "preview.mp4";
  const previewPath = path.join(outputDir, previewName);

  await writeFile(sourcePath, Buffer.from(await response.arrayBuffer()));
  const metadata = await probeVideo(sourcePath);

  try {
    await createPreview(sourcePath, previewPath);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not create browser preview.",
        sourceUrl: `/api/ai-video/local-file?jobId=${encodeURIComponent(jobId)}&file=${encodeURIComponent(sourceName)}`,
        metadata,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    jobId,
    sourceUrl: `/api/ai-video/local-file?jobId=${encodeURIComponent(jobId)}&file=${encodeURIComponent(sourceName)}`,
    previewUrl: `/api/ai-video/local-file?jobId=${encodeURIComponent(jobId)}&file=${encodeURIComponent(previewName)}`,
    metadata,
  });
}
