"use client";

import { useState } from "react";
import { BRAND_TRENDS, TREND_SERIES } from "@/lib/brands/insta360-trends";

// Five years of US search interest for Insta360, GoPro and DJI Osmo, one line
// each (fixed series order: blue, orange, aqua), with a hover crosshair, direct
// labels at the line ends, a legend, and the numbers as a table below.
const W = 720;
const H = 260;
const PAD = { top: 16, right: 92, bottom: 28, left: 34 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;
const MAX = Math.ceil(Math.max(...BRAND_TRENDS.flatMap((r) => [r[1], r[2], r[3]])) / 10) * 10;

const x = (i: number) => PAD.left + (i / (BRAND_TRENDS.length - 1)) * plotW;
const y = (v: number) => PAD.top + plotH - (v / MAX) * plotH;
const COLORS = ["var(--trend-1)", "var(--trend-2)", "var(--trend-3)"];

function monthLabel(month: string, long = false) {
  const [yr, m] = month.split("-").map(Number);
  return new Date(Date.UTC(yr, m - 1, 1)).toLocaleString("en-US", { month: long ? "long" : "short", year: "numeric", timeZone: "UTC" });
}

export function BrandTrendChart() {
  const [hover, setHover] = useState<number | null>(null);
  const last = BRAND_TRENDS.length - 1;
  const paths = ([1, 2, 3] as const).map((s) => BRAND_TRENDS.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(r[s]).toFixed(1)}`).join(""));
  const years = BRAND_TRENDS.map((r, i) => ({ i, month: r[0] })).filter((p) => p.month.endsWith("-01"));
  // End labels, nudged apart when two lines finish close together.
  const ends = ([1, 2, 3] as const)
    .map((s, k) => ({ k, y: y(BRAND_TRENDS[last][s]) }))
    .sort((a, b) => a.y - b.y)
    .map((e, idx, arr) => ({ ...e, y: idx > 0 && e.y - arr[idx - 1].y < 13 ? arr[idx - 1].y + 13 : e.y }));
  const row = hover === null ? null : BRAND_TRENDS[hover];

  const onMove = (event: React.PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const rel = ((event.clientX - box.left) / box.width) * plotW;
    setHover(Math.max(0, Math.min(last, Math.round((rel / plotW) * last))));
  };

  return (
    <figure className="brand-trend m-0">
      <style>{`
        .brand-trend { --trend-1:#2a78d6; --trend-2:#eb6834; --trend-3:#1baf7a; }
        .dark .brand-trend { --trend-1:#3987e5; --trend-2:#d95926; --trend-3:#199e70; }
      `}</style>
      <ul className="mb-3 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-xs text-muted-foreground" aria-label="Legend">
        {TREND_SERIES.map((name, k) => (
          <li key={name} className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-0.5 w-5 rounded-full" style={{ background: COLORS[k] }} />
            {name}
          </li>
        ))}
      </ul>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full text-muted-foreground"
          role="img"
          aria-label="US search interest by month since December 2021: GoPro is highest most of the time, with a spike in spring 2026; Insta360 and DJI Osmo rise every November and December."
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(MAX * f)} y2={y(MAX * f)} stroke="currentColor" strokeOpacity={0.15} />
              <text x={PAD.left - 6} y={y(MAX * f) + 4} textAnchor="end" fontSize="11" fill="currentColor">
                {Math.round(MAX * f)}
              </text>
            </g>
          ))}
          {years.map((p) => (
            <text key={p.month} x={x(p.i)} y={H - 8} textAnchor="middle" fontSize="11" fill="currentColor">
              {p.month.slice(0, 4)}
            </text>
          ))}
          {paths.map((d, k) => (
            <path key={k} d={d} fill="none" stroke={COLORS[k]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {ends.map((e) => (
            <text key={e.k} x={PAD.left + plotW + 8} y={e.y + 4} fontSize="11" fill="currentColor" className="text-foreground">
              {TREND_SERIES[e.k]}
            </text>
          ))}
          {hover !== null && row && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="currentColor" strokeOpacity={0.4} />
              {([1, 2, 3] as const).map((s, k) => (
                <circle key={s} cx={x(hover)} cy={y(row[s])} r={4} fill={COLORS[k]} stroke="var(--background, #fff)" strokeWidth={2} />
              ))}
            </g>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hover !== null && row && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: hover > last * 0.6 ? "translateX(-105%)" : "translateX(8px)" }}
          >
            <p className="font-semibold text-foreground">{monthLabel(row[0], true)}</p>
            {TREND_SERIES.map((name, k) => (
              <p key={name} className="mt-0.5 flex items-center gap-2 tabular-nums text-muted-foreground">
                <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[k] }} />
                {name} <span className="ml-auto pl-3 text-foreground">{row[k + 1]}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Google Trends, US web search, monthly average of weekly interest; 100 is the busiest single week for any of the three
        brands. The current month is partial.
      </figcaption>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show the numbers</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Month</th>
                {TREND_SERIES.map((name) => (
                  <th key={name} className="px-3 py-1.5 font-semibold">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...BRAND_TRENDS].reverse().map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  <td className="px-3 py-1">{monthLabel(r[0])}</td>
                  <td className="px-3 py-1">{r[1]}</td>
                  <td className="px-3 py-1">{r[2]}</td>
                  <td className="px-3 py-1">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
