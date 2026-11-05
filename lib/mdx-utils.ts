// Shared between full articles and Field Notes -- both render free-typed
// content through next-mdx-remote/rsc, so both need the same guard against
// stray `{`/`}` being misread as a JSX expression by the MDX compiler.
// Links to our tracked affiliate redirect must always be marked as paid links
// and must not pass ranking credit, whatever the author wrote. The article
// renderer applies this to every link, so a plain markdown link is enough.
export function affiliateAnchorProps(href: string | undefined | null): {
  rel: string;
  target: string;
} | null {
  if (!href || !href.startsWith("/api/affiliate/go/")) return null;
  return { rel: "sponsored nofollow noopener noreferrer", target: "_blank" };
}

export function sanitizeMdxContent(content: string): string {
  const segments = content.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return segments
    .map((segment, i) => (i % 2 === 1 ? segment : segment.replace(/\{/g, "\\{").replace(/\}/g, "\\}")))
    .join("");
}

/**
 * Reduces a markdown-lite body to plain text for truncated teaser contexts
 * (list cards, inline article excerpts) where raw `**`/`_`/`- ` markers
 * would otherwise show up literally once line-clamped.
 */
export function stripMarkdownForTeaser(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
}
