/** Convert a raw NSE dataset row (strings, blanks) into a clean numeric bar. Missing -> null. */
const num = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function normalizeRow(r) {
  return {
    date: r.Date,
    symbol: r.Symbol,
    series: r.Series,
    prevClose: num(r["Prev Close"]),
    open: num(r.Open),
    high: num(r.High),
    low: num(r.Low),
    last: num(r.Last),
    close: num(r.Close),
    vwap: num(r.VWAP),
    volume: num(r.Volume),
    turnover: num(r.Turnover),
    trades: num(r.Trades),
    deliverableVolume: num(r["Deliverable Volume"]),
    // dataset stores this as a fraction (0–1); expose as percent
    deliverablePct: num(r["%Deliverble"]) === null ? null : num(r["%Deliverble"]) * 100,
  };
}
