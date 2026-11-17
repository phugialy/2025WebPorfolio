// Hard spec checks on an Amazon listing title, for niches defined by numbers.
// A model can be talked into approving "close enough"; a title that does not say
// 34-inch and 165Hz does not get as far as the model.

/** Sizes written as 34", 34-inch, 34 inch, 34in. Returns every size in the title. */
export function inchSizes(title: string): number[] {
  const sizes: number[] = [];
  for (const m of title.matchAll(/(\d{2}(?:\.\d)?)\s*-?\s*(?:inch(?:es)?\b|in\b|"|”|″)/gi)) sizes.push(Number(m[1]));
  return sizes;
}

/** Refresh rates written as 165Hz, 165 Hz, 165-Hz. Returns every rate in the title. */
export function refreshRates(title: string): number[] {
  const rates: number[] = [];
  for (const m of title.matchAll(/(\d{2,3})\s*-?\s*hz\b/gi)) rates.push(Number(m[1]));
  return rates;
}

export const CURVED_GAMING_MONITOR_SPEC = {
  inchesMin: 31,
  inchesMax: 34.9,
  hzMin: 160,
  hzMax: 240,
  label: "a curved gaming monitor, 31 to 34 inches, with a 160 to 240 Hz refresh rate",
} as const;

/** Curved, 31-34 inches and 160-240 Hz, all stated in the title. A title that leaves one out does not pass. */
export function isCurvedGamingMonitor(title: string): boolean {
  const spec = CURVED_GAMING_MONITOR_SPEC;
  if (!/\bcurved\b/i.test(title)) return false;
  if (!inchSizes(title).some((s) => s >= spec.inchesMin && s <= spec.inchesMax)) return false;
  return refreshRates(title).some((hz) => hz >= spec.hzMin && hz <= spec.hzMax);
}
