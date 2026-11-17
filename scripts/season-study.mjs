// Re-measures lib/holiday-fit.ts SEASON_STUDY from Google Trends (via SerpApi).
//
//   SERPAPI_KEY=... node scripts/season-study.mjs [from] [to]
//
// Costs one SerpApi search per 4 terms (5 searches for the 18 terms below). Reads last
// season's daily interest (default 2025-09-01 to 2026-01-10) and prints, for each term,
// its Sep-Oct level against "laptop" and how much each holiday window ran above that
// level. Paste the rows into SEASON_STUDY. Run it once a year, in September.
//
// Windows are the calendar equivalents of the HOLIDAYS windows in lib/deals-core.ts for
// the season being measured; edit WINDOWS when the year changes.

const key = process.env.SERPAPI_KEY;
if (!key) throw new Error("Set SERPAPI_KEY");
const [from = "2025-09-01", to = "2026-01-10"] = process.argv.slice(2);

const WINDOWS = {
  base: ["2025-09-01", "2025-10-31"],
  thanksgiving: ["2025-11-01", "2025-11-27"],
  blackfriday: ["2025-11-28", "2025-11-30"],
  cybermonday: ["2025-12-01", "2025-12-02"],
  christmas: ["2025-12-03", "2025-12-25"],
  newyear: ["2025-12-26", "2026-01-03"],
};
const TERMS = [
  "headphones", "wireless earbuds", "smartwatch", "smartphone",
  "4k monitor", "mini pc", "mechanical keyboard", "webcam",
  "external ssd", "espresso machine", "air fryer", "robot vacuum",
  "carry on luggage", "electric toothbrush", "standing desk", "gaming mouse",
];

const day = (ts) => new Date(Number(ts) * 1000).toISOString().slice(0, 10);
const mean = (points, term, [a, b]) => {
  const xs = points.filter((p) => day(p.timestamp) >= a && day(p.timestamp) <= b).map((p) => p.values.find((v) => v.query.toLowerCase() === term)?.extracted_value ?? NaN);
  return xs.reduce((s, x) => s + x, 0) / xs.length;
};

const rows = {};
for (let i = 0; i < TERMS.length; i += 4) {
  const chunk = TERMS.slice(i, i + 4);
  const url = `https://serpapi.com/search.json?engine=google_trends&data_type=TIMESERIES&geo=US&date=${encodeURIComponent(`${from} ${to}`)}&q=${encodeURIComponent(["laptop", ...chunk].join(","))}&api_key=${encodeURIComponent(key)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Trends request failed (${response.status}) for ${chunk.join(", ")}`);
  const points = (await response.json())?.interest_over_time?.timeline_data ?? [];
  const lap = mean(points, "laptop", WINDOWS.base);
  for (const term of chunk) {
    const base = mean(points, term, WINDOWS.base);
    const lift = (w) => Math.round((mean(points, term, WINDOWS[w]) / base) * 100) / 100;
    rows[term] = {
      level: Math.round((base / lap) * 100) / 100,
      lift: { thanksgiving: lift("thanksgiving"), blackfriday: lift("blackfriday"), cybermonday: lift("cybermonday"), christmas: lift("christmas"), newyear: lift("newyear") },
    };
  }
}
console.log(JSON.stringify(rows, null, 2));
console.log("\nA term whose level is 0 or near 0 is rounded away by Google next to laptops: leave its lift out (use 1).");
