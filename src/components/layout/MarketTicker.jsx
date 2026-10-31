import { useMemo } from "react";
import { getIndexQuotes, getAllQuotes } from "@/services/dataProvider";
import { fmtNum, fmtPct, toneClass } from "@/lib/format";

function marketStatus() {
  const ist = new Date(Date.now() + (5.5 * 60 + new Date().getTimezoneOffset()) * 60000);
  const d = ist.getDay(), m = ist.getHours() * 60 + ist.getMinutes();
  if (d === 0 || d === 6) return "Market Closed";
  if (m >= 540 && m < 555) return "Pre-open";
  if (m >= 555 && m < 930) return "Market Open";
  return "Market Closed";
}

export function MarketTicker() {
  const items = useMemo(() => {
    const movers = getAllQuotes().sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 6);
    return [...getIndexQuotes(), ...movers.map((m) => ({ ...m, name: m.symbol }))];
  }, []);
  const status = marketStatus();
  const row = items.map((q) => (
    <span key={q.name} className="num inline-flex items-center gap-2 px-5 text-xs">
      <span className="font-medium">{q.name}</span>
      <span>{fmtNum(q.close)}</span>
      <span className={toneClass(q.change)}>{q.change >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(q.change))} ({fmtPct(q.changePct)})</span>
    </span>
  ));
  return (
    <div className="flex h-9 items-center border-t border-border text-foreground">
      <span className="flex shrink-0 items-center gap-1.5 border-r border-border px-4 text-[11px] font-medium">
        <span className={`h-1.5 w-1.5 rounded-full ${status === "Market Open" ? "bg-positive" : "bg-gold"}`} />{status}
      </span>
      <div className="relative flex-1 overflow-hidden" suppressHydrationWarning>
        <div className="animate-marquee flex w-max whitespace-nowrap hover:[animation-play-state:paused]">{row}{row}</div>
      </div>
    </div>
  );
}
