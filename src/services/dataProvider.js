/**
 * DATA PROVIDER — the single place UI talks to for market data.
 *
 * Mock mode (default): uses src/data/mock/*.
 * Local mode: set VITE_DATA_MODE=local and implement the endpoints below on your
 * local backend (e.g. FastAPI/Express over DuckDB/SQLite built from the 2.5GB JSON):
 *   GET {dataApiUrl}/symbols                      -> [{symbol,name,sector,...}]
 *   GET {dataApiUrl}/history/:symbol?from=&to=    -> raw NSE rows (dataset schema)
 * Rows are normalized by normalizeRow, so the backend can return the raw schema as-is.
 */
import { config } from "@/config/app";
import { SYMBOLS, INDICES } from "@/data/mock/symbols";
import { generateRawHistory } from "@/data/mock/generator";
import { normalizeRow } from "./normalize";

const isLocal = () => config.dataMode === "local";

async function getJson(path) {
  const res = await fetch(`${config.dataApiUrl}${path}`);
  if (!res.ok) throw new Error(`Data API ${res.status}`);
  return res.json();
}

export async function listSymbols() {
  if (isLocal()) return getJson("/symbols");
  return SYMBOLS;
}

export function getSymbolMeta(symbol) {
  return SYMBOLS.find((s) => s.symbol === symbol) || { symbol, name: symbol, sector: "—" };
}

export async function getHistory(symbol, { from, to } = {}) {
  let raw;
  if (isLocal()) {
    const q = new URLSearchParams({ ...(from && { from }), ...(to && { to }) });
    raw = await getJson(`/history/${encodeURIComponent(symbol)}?${q}`);
  } else {
    const meta = SYMBOLS.find((s) => s.symbol === symbol) || INDICES.find((s) => s.symbol === symbol);
    if (!meta) return [];
    raw = generateRawHistory(meta);
  }
  let rows = raw.map(normalizeRow).filter((r) => r.close !== null);
  if (from) rows = rows.filter((r) => r.date >= from);
  if (to) rows = rows.filter((r) => r.date <= to);
  return rows;
}

/** Synchronous mock helper for lightweight UI (sparklines, tickers). */
export function getHistorySync(symbol) {
  const meta = SYMBOLS.find((s) => s.symbol === symbol) || INDICES.find((s) => s.symbol === symbol);
  return meta ? generateRawHistory(meta).map(normalizeRow) : [];
}

export function getQuote(symbol) {
  const h = getHistorySync(symbol);
  const last = h[h.length - 1];
  if (!last) return null;
  const change = last.close - last.prevClose;
  return { ...last, change, changePct: (change / last.prevClose) * 100 };
}

export const getIndexQuotes = () => INDICES.map((i) => ({ ...getQuote(i.symbol), name: i.symbol }));
export const getAllQuotes = () => SYMBOLS.map((s) => ({ ...s, ...getQuote(s.symbol) }));
