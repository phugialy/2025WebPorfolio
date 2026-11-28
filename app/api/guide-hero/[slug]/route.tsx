import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/articles";
import { guideHeroKind, isGuide, type GuideHeroKind } from "@/lib/guide-hero";

// The drawn cover for a holiday buying guide that has no picture of its own
// (see lib/guide-hero.ts): 1200x675, the article hero's 16:9, also used as the
// link-preview image. Only guides get one, so the route cannot be used to
// stamp arbitrary text on the brand.

const WIDTH = 1200;
const HEIGHT = 675;
const INK = "#0a0b0c";
const PAPER = "#f6f6f4";
const GOLD = "#ffc400";
const MUTED = "#9a9ca3";

// The site's faces: Newsreader for the title, Inter for the labels. Google
// serves a TTF (which the image renderer needs) when the request carries no
// browser user agent. If a font cannot be fetched the cover still renders, in
// the renderer's bundled sans.
async function loadGoogleFont(query: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${query}`)).text();
    const src = /src: url\((https:[^)]+\.ttf)\)/.exec(css)?.[1];
    if (!src) return null;
    const font = await fetch(src);
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

const stroke = { fill: "none", strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Drawing({ kind }: { kind: GuideHeroKind }) {
  const gold = { ...stroke, stroke: GOLD };
  const paper = { ...stroke, stroke: PAPER };
  const shapes: Record<GuideHeroKind, React.ReactNode> = {
    monitor: (
      <g>
        <path d="M18 62 Q120 40 222 62 L222 158 Q120 136 18 158 Z" {...paper} />
        <path d="M44 120 Q120 104 196 120" {...gold} />
        <path d="M120 150 L120 196 M84 204 L156 204" {...paper} />
      </g>
    ),
    "mini-pc": (
      <g>
        <rect x="46" y="46" width="148" height="148" rx="26" {...paper} />
        <path d="M78 92 L162 92 M78 112 L162 112 M78 132 L130 132" {...gold} />
        <circle cx="160" cy="164" r="7" {...gold} />
      </g>
    ),
    keyboard: (
      <g>
        <rect x="14" y="78" width="98" height="92" rx="16" {...paper} transform="rotate(-8 63 124)" />
        <rect x="128" y="78" width="98" height="92" rx="16" {...paper} transform="rotate(8 177 124)" />
        <path d="M34 112 L92 104 M38 138 L96 130 M148 104 L206 112 M144 130 L202 138" {...gold} />
      </g>
    ),
    headphones: (
      <g>
        <path d="M46 146 L46 120 A74 74 0 0 1 194 120 L194 146" {...paper} />
        <rect x="30" y="134" width="40" height="70" rx="16" {...gold} />
        <rect x="170" y="134" width="40" height="70" rx="16" {...gold} />
      </g>
    ),
    webcam: (
      <g>
        <circle cx="120" cy="104" r="62" {...paper} />
        <circle cx="120" cy="104" r="26" {...gold} />
        <path d="M86 170 L154 170 L138 204 L102 204 Z" {...paper} />
      </g>
    ),
    camera: (
      <g>
        <rect x="30" y="70" width="180" height="120" rx="22" {...paper} />
        <circle cx="120" cy="130" r="38" {...gold} />
        <path d="M58 58 L96 58" {...paper} />
      </g>
    ),
    generic: (
      <g>
        <rect x="42" y="96" width="156" height="106" rx="10" {...paper} />
        <path d="M30 82 L210 82 L210 104 L30 104 Z M120 82 L120 202" {...gold} />
        <path d="M120 82 C100 40 66 52 82 76 M120 82 C140 40 174 52 158 76" {...gold} />
      </g>
    ),
  };
  return (
    <svg width="300" height="300" viewBox="0 0 240 240">
      {shapes[kind]}
    </svg>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getPostBySlug>>;
  try {
    post = await getPostBySlug(slug);
  } catch {
    // Never cache a database hiccup as a missing cover.
    return new Response("Unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  }
  if (!post || !isGuide(post.tags)) return new Response("Not found", { status: 404 });

  // ?mark=1: the drawing alone, 4:3, for narrow thumbnail slots where the full
  // cover would be cropped through its title.
  if (new URL(request.url).searchParams.get("mark") === "1") {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: INK, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: GOLD, display: "flex" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 340, height: 340, borderRadius: 999, border: "2px solid #2a2c31" }}>
            <Drawing kind={guideHeroKind(post.tags)} />
          </div>
        </div>
      ),
      { width: 800, height: 600 }
    );
  }

  const [display, label] = await Promise.all([loadGoogleFont("Newsreader:opsz,wght@72,600"), loadGoogleFont("Inter:wght@500")]);
  const fonts = [
    ...(label ? [{ name: "Inter", data: label, weight: 500 as const, style: "normal" as const }] : []),
    ...(display ? [{ name: "Newsreader", data: display, weight: 600 as const, style: "normal" as const }] : []),
  ];
  const title = post.title;
  const titleSize = title.length > 62 ? 56 : title.length > 44 ? 64 : 74;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: label && display ? "Inter" : undefined, background: INK, padding: "72px 72px 64px", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: GOLD, display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 680 }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 5, color: GOLD, textTransform: "uppercase" }}>
            Holiday buying guide
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: label && display ? "Newsreader" : undefined,
              fontSize: titleSize,
              lineHeight: 1.08,
              color: PAPER,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 24, color: MUTED }}>
            <span style={{ color: PAPER }}>phugialy.com</span>
            <span style={{ margin: "0 14px" }}>·</span>
            <span>What to check before you buy</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 340,
              height: 340,
              borderRadius: 999,
              border: `2px solid #2a2c31`,
            }}
          >
            <Drawing kind={guideHeroKind(post.tags)} />
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      // Only with both faces in hand: a partial list would drop the bundled sans the other text falls back to.
      fonts: display && label ? fonts : undefined,
    }
  );
}
