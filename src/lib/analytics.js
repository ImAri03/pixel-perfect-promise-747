/** Pure analytics on normalized bars ({date, close, ...}). */
export const RANGES = ["1M", "6M", "YTD", "1Y", "5Y", "10Y", "Max"];

export function sliceRange(rows, range) {
  if (!rows.length || range === "Max") return rows;
  const end = new Date(rows[rows.length - 1].date);
  const d = new Date(end);
  if (range === "YTD") d.setMonth(0, 1);
  else {
    const m = { "5D": [0, 7], "1M": [1], "6M": [6], "1Y": [12], "5Y": [60], "10Y": [120] }[range];
    if (m[1]) d.setDate(d.getDate() - m[1]);
    else d.setMonth(d.getMonth() - m[0]);
  }
  const iso = d.toISOString().slice(0, 10);
  return rows.filter((r) => r.date >= iso);
}

/** Thin long series so charts stay fast. */
export function downsample(rows, max = 400) {
  if (rows.length <= max) return rows;
  const step = rows.length / max;
  const out = [];
  for (let i = 0; i < max; i++) out.push(rows[Math.floor(i * step)]);
  out.push(rows[rows.length - 1]);
  return out;
}

export function sma(rows, n, key = "close") {
  let sum = 0;
  return rows.map((r, i) => {
    sum += r[key];
    if (i >= n) sum -= rows[i - n][key];
    return i >= n - 1 ? sum / n : null;
  });
}

export function dailyReturns(rows) {
  return rows.slice(1).map((r, i) => r.close / rows[i].close - 1);
}

export function periodReturn(rows) {
  if (rows.length < 2) return 0;
  return (rows[rows.length - 1].close / rows[0].close - 1) * 100;
}

export function cagr(rows) {
  if (rows.length < 2) return 0;
  const years = (new Date(rows[rows.length - 1].date) - new Date(rows[0].date)) / 3.156e10;
  if (years <= 0) return 0;
  return (Math.pow(rows[rows.length - 1].close / rows[0].close, 1 / years) - 1) * 100;
}

export function volatility(rows) {
  const r = dailyReturns(rows);
  if (!r.length) return 0;
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / r.length;
  return Math.sqrt(v) * Math.sqrt(252) * 100;
}

export function rollingVolatility(rows, n = 30) {
  const out = [];
  for (let i = n; i < rows.length; i++) out.push({ date: rows[i].date, vol: volatility(rows.slice(i - n, i + 1)) });
  return out;
}

export function drawdownSeries(rows) {
  let peak = -Infinity;
  return rows.map((r) => {
    peak = Math.max(peak, r.close);
    return { date: r.date, dd: (r.close / peak - 1) * 100 };
  });
}

export const maxDrawdown = (rows) => Math.min(0, ...drawdownSeries(rows).map((d) => d.dd));

export function sharpe(rows, rf = 0.065) {
  const vol = volatility(rows) / 100;
  return vol ? (cagr(rows) / 100 - rf) / vol : 0;
}

/** Year x month return grid for heatmaps. */
export function monthlyReturns(rows) {
  const byMonth = new Map();
  for (const r of rows) {
    const k = r.date.slice(0, 7);
    const e = byMonth.get(k) || { first: r.close, last: r.close };
    e.last = r.close;
    byMonth.set(k, e);
  }
  const keys = [...byMonth.keys()];
  const grid = {};
  keys.forEach((k, i) => {
    const prev = i > 0 ? byMonth.get(keys[i - 1]).last : byMonth.get(k).first;
    const [y, m] = k.split("-");
    grid[y] = grid[y] || Array(12).fill(null);
    grid[y][Number(m) - 1] = (byMonth.get(k).last / prev - 1) * 100;
  });
  return grid;
}

export function yearlyReturns(rows) {
  const g = {};
  for (const r of rows) {
    const y = r.date.slice(0, 4);
    g[y] = g[y] || { first: r.prevClose ?? r.close, last: r.close };
    g[y].last = r.close;
  }
  return Object.entries(g).map(([year, v]) => ({ year, ret: (v.last / v.first - 1) * 100 }));
}

export function returnHistogram(rows, bins = 30) {
  const r = dailyReturns(rows).map((x) => x * 100);
  const lo = -6, hi = 6, w = (hi - lo) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({ bucket: +(lo + i * w + w / 2).toFixed(2), count: 0 }));
  for (const x of r) out[Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / w)))].count++;
  return out;
}

export function normalizeSeries(seriesBySymbol) {
  const symbols = Object.keys(seriesBySymbol);
  if (!symbols.length) return [];
  const base = seriesBySymbol[symbols[0]];
  const maps = symbols.map((s) => new Map(seriesBySymbol[s].map((r) => [r.date, r.close])));
  const firsts = symbols.map((s) => seriesBySymbol[s][0]?.close);
  return base.map((r) => {
    const row = { date: r.date };
    symbols.forEach((s, i) => {
      const v = maps[i].get(r.date);
      if (v != null && firsts[i]) row[s] = (v / firsts[i]) * 100;
    });
    return row;
  });
}
