"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Facebook, Linkedin, Link as LinkIcon, Send, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ArticleShareProps = {
  title: string;
  quote: string;
  url: string;
};

function buildShareText(quote: string, url: string) {
  return `"${quote}"\n\nRead the full note:\n${url}`;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

export function ArticleShare({ title, quote, url }: ArticleShareProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<"post" | "link" | "linkedin" | "facebook" | "">("");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shareText = useMemo(() => buildShareText(quote, url), [quote, url]);
  const encodedUrl = encodeURIComponent(url);
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && Boolean(navigator.share));
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setExpanded(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  const flashCopied = (type: typeof copied) => {
    setCopied(type);
    window.setTimeout(() => setCopied(""), 1700);
  };

  const handleCopy = async (type: "post" | "link", value: string) => {
    await copyText(value);
    flashCopied(type);
  };

  const copyAndOpen = async (type: "linkedin" | "facebook", href: string) => {
    await copyText(shareText);
    flashCopied(type);
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await handleCopy("post", shareText);
      return;
    }

    await navigator.share({
      title,
      text: `"${quote}"`,
      url,
    });
  };

  return (
    <div ref={rootRef} className="relative z-20 flex items-center justify-end gap-2">
      <div
        className={cn(
          "flex origin-right items-center gap-1 overflow-hidden rounded-full border border-border bg-background/85 p-1 shadow-sm backdrop-blur transition-all duration-300 ease-out",
          expanded ? "w-[236px] opacity-100 sm:w-[276px]" : "w-0 border-transparent p-0 opacity-0"
        )}
        aria-hidden={!expanded}
      >
        <ShareAction
          label="Copy quote and link"
          active={copied === "post"}
          onClick={() => handleCopy("post", shareText)}
        >
          {copied === "post" ? <Check /> : <Copy />}
        </ShareAction>
        {canNativeShare && (
          <ShareAction label="Share with device" onClick={nativeShare}>
            <Send />
          </ShareAction>
        )}
        <ShareAction
          label="Copy quote and open LinkedIn"
          active={copied === "linkedin"}
          onClick={() => copyAndOpen("linkedin", linkedInUrl)}
        >
          {copied === "linkedin" ? <Check /> : <Linkedin />}
        </ShareAction>
        <ShareAction
          label="Copy quote and open Facebook"
          active={copied === "facebook"}
          onClick={() => copyAndOpen("facebook", facebookUrl)}
        >
          {copied === "facebook" ? <Check /> : <Facebook />}
        </ShareAction>
        <ShareAction
          label="Copy article link"
          active={copied === "link"}
          onClick={() => handleCopy("link", url)}
        >
          {copied === "link" ? <Check /> : <LinkIcon />}
        </ShareAction>
      </div>

      {copied && (
        <span className="absolute right-12 top-9 rounded-full border border-emerald-500/30 bg-background px-2 py-1 text-[11px] font-medium text-emerald-500 shadow-sm">
          Copied
        </span>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-8 rounded-full border-border bg-background/85 px-3 text-xs shadow-sm backdrop-blur transition-colors",
          expanded && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
        )}
        aria-expanded={expanded}
        aria-label={expanded ? "Close share actions" : "Open share actions"}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? <X className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{expanded ? "Close" : "Share"}</span>
      </Button>
    </div>
  );
}

function ShareAction({
  label,
  active,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: React.ReactElement<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-emerald-500/10 text-emerald-500"
      )}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
