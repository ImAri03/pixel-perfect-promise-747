/**
 * Deterministic mock generator producing rows in the EXACT raw NSE dataset schema
 * (string values, possibly empty), e.g.
 * { Date, Symbol, Series, "Prev Close", Open, High, Low, Last, Close, VWAP, Volume,
 *   Turnover, Trades, "Deliverable Volume", "%Deliverble" }
 */
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();

/** Generate trading-day rows from `listed` until today, ending near `base` price. */
export function generateRawHistory({ symbol, base, listed = "2005-01-01" }) {
  if (cache.has(symbol)) return cache.get(symbol);
  const rand = seeded(symbol);
  const start = new Date(listed);
  const end = new Date();
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) days.push(d.toISOString().slice(0, 10));
  }
  // Random walk on log price; rescale so last close ~ base.
  const drift = 0.00045 + (rand() - 0.5) * 0.0004;
  const vol = 0.014 + rand() * 0.01;
  const logs = [0];
  for (let i = 1; i < days.length; i++) {
    const shock = (rand() + rand() + rand() - 1.5) * 2 * vol;
    const crash = rand() < 0.002 ? -0.06 * rand() : 0;
    logs.push(logs[i - 1] + drift + shock + crash);
  }
  const offset = Math.log(base) - logs[logs.length - 1];
  const rows = [];
  let prev = Math.exp(logs[0] + offset);
  const baseVol = 200000 + rand() * 4000000;
  for (let i = 0; i < days.length; i++) {
    const close = Math.exp(logs[i] + offset);
    const open = prev * (1 + (rand() - 0.5) * vol);
    const high = Math.max(open, close) * (1 + rand() * vol * 0.8);
    const low = Math.min(open, close) * (1 - rand() * vol * 0.8);
    const volume = Math.round(baseVol * (0.4 + rand() * 1.6) * (1 + Math.abs(close - prev) / prev * 20));
    const vwap = (high + low + close) / 3;
    const early = days[i] < "2002-01-01"; // older records often miss fields
    const delivPct = 30 + rand() * 45;
    rows.push({
      Date: days[i],
      Symbol: symbol,
      Series: "EQ",
      "Prev Close": prev.toFixed(2),
      Open: open.toFixed(2),
      High: high.toFixed(2),
      Low: low.toFixed(2),
      Last: early ? "" : close.toFixed(2),
      Close: close.toFixed(2),
      VWAP: vwap.toFixed(2),
      Volume: String(volume),
      Turnover: (volume * vwap * 100000).toFixed(1),
      Trades: early ? "" : String(Math.round(volume / (40 + rand() * 80))),
      "Deliverable Volume": early ? "" : String(Math.round((volume * delivPct) / 100)),
      "%Deliverble": early ? "" : (delivPct / 100).toFixed(4),
    });
    prev = close;
  }
  cache.set(symbol, rows);
  return rows;
}
