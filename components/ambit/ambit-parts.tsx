import Link from "next/link";
import { ArrowUpRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AMBIT_CONSULTANT_NAME,
  AMBIT_COPY,
  AMBIT_DISCLOSURE_PATH,
  AMBIT_LOGO_SRC,
  AMBIT_ORANGE,
  AMBIT_REP_LINE,
} from "@/lib/ambit-brand";

// The official Independent Consultant logo, never recolored, cropped or
// restyled -- Ambit's guidelines forbid altering it. It always sits on a fixed
// white chip so its colors stay legible on both themes (their rule: choose the
// most legible logo for the background).
export function AmbitLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-xl bg-white px-4 py-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={AMBIT_LOGO_SRC}
        alt="Ambit Energy Independent Consultant"
        className="h-8 w-auto sm:h-9"
      />
    </span>
  );
}

// Required next to every Ambit placement: who the relationship is with, that
// compensation may be involved, and the Texas REP name/number.
export function AmbitFinePrint({ full = false, className }: { full?: boolean; className?: string }) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      {AMBIT_CONSULTANT_NAME} is an Independent Consultant of Ambit Energy and may be compensated
      if you enroll through this link.
      {full &&
        " Independent Consultants are independent representatives of Ambit Energy and do not represent your utility or any government agency."}{" "}
      {AMBIT_REP_LINE}.{" "}
      <Link href={AMBIT_DISCLOSURE_PATH} className="underline hover:text-foreground">
        Disclosure
      </Link>
    </p>
  );
}

// Black text on Ambit orange: white-on-#F47920 is only ~2.9:1, this is ~7:1.
export function AmbitButton({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      style={{ backgroundColor: AMBIT_ORANGE }}
      className={cn(
        "group inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-[#08090B] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className
      )}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}

export function SponsoredLabel({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className
      )}
    >
      <Zap className="h-3 w-3" style={{ color: AMBIT_ORANGE }} aria-hidden="true" />
      {AMBIT_COPY.sponsoredLabel}
    </p>
  );
}
