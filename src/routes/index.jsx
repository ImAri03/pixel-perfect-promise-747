import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Card, CardHeader, Segmented, Change, Stat } from "@/components/ui";
import { AIPanel } from "@/components/AIPanel";
import { PriceChart, Sparkline } from "@/components/charts/charts";
import { useHistory } from "@/lib/useHistory";
import { sliceRange, periodReturn, RANGES } from "@/lib/analytics";
import { getAllQuotes, getHistorySync, getSymbolMeta } from "@/services/dataProvider";
import { SYMBOLS, INDICES } from "@/data/mock/symbols";
import { fmtNum, fmtCompact, fmtPct, toneClass } from "@/lib/format";
import { profileStore } from "@/store/localStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Meridian" },
      { name: "description", content: "Indian market overview, AI market brief, research charts and top NSE movers." },
      { property: "og:title", content: "Dashboard — Meridian" },
      { property: "og:description", content: "Indian market overview, AI market brief and NSE movers." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const profile = profileStore.useStore();
  const [hello, setHello] = useState("Welcome back");
  useEffect(() => setHello(greeting()), []);
  const [symbol, setSymbol] = useState("NIFTY 50");
  const [range, setRange] = useState("1Y");
  const { data: rows = [] } = useHistory(symbol);
  const view = useMemo(() => sliceRange(rows, range), [rows, range]);
  const last = view[view.length - 1];
  const ret = periodReturn(view);

  const quotes = useMemo(() => getAllQuotes(), []);
  const [tab, setTab] = useState("gainers");
  const movers = useMemo(() => {
    const q = [...quotes];
    if (tab === "gainers") return q.sort((a, b) => b.changePct - a.changePct).slice(0, 6);
    if (tab === "losers") return q.sort((a, b) => a.changePct - b.changePct).slice(0, 6);
    return q.sort((a, b) => b.volume - a.volume).slice(0, 6);
  }, [quotes, tab]);

  const sectors = useMemo(() => {
    const m = {};
    quotes.forEach((q) => { (m[q.sector] = m[q.sector] || []).push(q.changePct); });
    return Object.entries(m).map(([s, v]) => ({ sector: s, chg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length })).sort((a, b) => b.chg - a.chg);
  }, [quotes]);

  const breadth = quotes.filter((q) => q.changePct > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="text-3xl font-light md:text-4xl" suppressHydrationWarning>{hello}, {profile.name}.</h1>
          <div className="meridian-line mt-4 w-24" />
        </div>
        <div className="flex gap-8">
          <Stat label="Breadth" value={`${breadth}/${quotes.length}`} sub={<span className="text-muted-foreground">advancing</span>} />
          <Stat label="Coverage" value="2,200+" sub={<span className="text-muted-foreground">NSE symbols · since 1996</span>} />
        </div>
      </div>

      <Card className="relative overflow-hidden border-gold/30">
        <AIPanel task="brief" title="Market Brief · Meridian Intelligence" cta="Generate brief" sentiment="Neutral"
          context={() => ({ leader: movers[0]?.symbol, laggard: [...quotes].sort((a, b) => a.changePct - b.changePct)[0]?.symbol })} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="eyebrow cursor-pointer bg-transparent outline-none">
                {[...INDICES, ...SYMBOLS].map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}
              </select>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="num font-serif text-3xl">{fmtNum(last?.close)}</span>
                <span className={`num text-sm ${toneClass(ret)}`}>{fmtPct(ret)} · {range}</span>
              </div>
            </div>
            <Segmented options={RANGES} value={range} onChange={setRange} />
          </div>
          <PriceChart rows={view} />
          {last && (
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-5">
              {[["Open", last.open], ["High", last.high], ["Low", last.low], ["Close", last.close], ["Volume", last.volume]].map(([l, v]) => (
                <div key={l}><div className="eyebrow">{l}</div><div className="num mt-1 text-sm">{l === "Volume" ? fmtCompact(v) : fmtNum(v)}</div></div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader eyebrow="Today" title="Market movers" />
          <Segmented options={[{ value: "gainers", label: "Gainers" }, { value: "losers", label: "Losers" }, { value: "active", label: "Active" }]} value={tab} onChange={setTab} className="mb-3" />
          <ul className="divide-y divide-border">
            {movers.map((m) => (
              <li key={m.symbol}>
                <Link to="/stock/$symbol" params={{ symbol: m.symbol }} className="flex items-center gap-3 py-3 transition-colors hover:text-primary">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{m.symbol}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.name}</div>
                  </div>
                  <Sparkline rows={getHistorySync(m.symbol).slice(-20)} width={64} height={24} />
                  <div className="w-20 text-right">
                    <div className="num text-sm">{fmtNum(m.close)}</div>
                    <Change value={m.changePct} className="text-xs" />
                  </div>
                  <Sparkles className="h-3.5 w-3.5 text-gold opacity-60" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader eyebrow="Sector heat" title="Where the day moved" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {sectors.map((s) => {
            const a = Math.min(1, Math.abs(s.chg) / 3);
            return (
              <div key={s.sector} className="rounded-xl border border-border p-4"
                style={{ background: `color-mix(in oklab, ${s.chg >= 0 ? "var(--color-positive)" : "var(--color-negative)"} ${Math.round(a * 30 + 4)}%, var(--color-card))` }}>
                <div className="text-sm font-medium">{s.sector}</div>
                <div className="num mt-1 font-serif text-xl">{fmtPct(s.chg)}</div>
                <div className="text-[11px] text-muted-foreground">{s.n} stocks</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
