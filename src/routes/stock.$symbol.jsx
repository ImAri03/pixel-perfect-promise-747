import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, Layers } from "lucide-react";
import { Card, CardHeader, Segmented, Stat, Button, Change } from "@/components/ui";
import { AIPanel } from "@/components/AIPanel";
import { PriceChart, DrawdownChart, RollingVolChart, ReturnHistogram, YearlyBars, MonthlyHeatmap } from "@/components/charts/charts";
import { useHistory } from "@/lib/useHistory";
import { sliceRange, periodReturn, cagr, volatility, maxDrawdown, sharpe, RANGES } from "@/lib/analytics";
import { getSymbolMeta } from "@/services/dataProvider";
import { fmtNum, fmtPct, fmtCompact, fmtDate, toneClass } from "@/lib/format";
import { watchlistStore } from "@/store/localStore";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip } from "recharts";
import { downsample } from "@/lib/analytics";

export const Route = createFileRoute("/stock/$symbol")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.symbol} research — Meridian` },
      { name: "description", content: `Historical price, drawdown, volatility and delivery analysis for ${params.symbol} on NSE.` },
      { property: "og:title", content: `${params.symbol} research — Meridian` },
      { property: "og:description", content: `Long-term NSE research on ${params.symbol}.` },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const { symbol } = Route.useParams();
  const meta = getSymbolMeta(symbol);
  const { data: rows = [], isLoading } = useHistory(symbol);
  const [range, setRange] = useState("5Y");
  const view = useMemo(() => sliceRange(rows, range), [rows, range]);
  const watch = watchlistStore.useStore();
  const watched = watch.includes(symbol);
  const last = rows[rows.length - 1];

  const delivery = useMemo(() => downsample(view.filter((r) => r.deliverablePct != null), 160), [view]);

  if (isLoading) return <div className="skeleton h-96" />;
  if (!rows.length) return <Card>No data for {symbol}.</Card>;

  const s = { ret: periodReturn(view), cagr: cagr(view), vol: volatility(view), mdd: maxDrawdown(view), sharpe: sharpe(view) };
  const hi = Math.max(...view.map((r) => r.high ?? r.close));
  const lo = Math.min(...view.map((r) => r.low ?? r.close));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">NSE · {meta.sector} · data since {fmtDate(rows[0].date)}</div>
          <h1 className="text-3xl font-light md:text-4xl">{meta.name}</h1>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="num font-serif text-2xl">₹{fmtNum(last.close)}</span>
            <Change value={(last.close / last.prevClose - 1) * 100} />
            <span className="text-xs text-muted-foreground">{symbol} · {last.series}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => watchlistStore.set((w) => (watched ? w.filter((x) => x !== symbol) : [...w, symbol]))}>
            <Star className={`h-4 w-4 ${watched ? "fill-gold text-gold" : ""}`} />{watched ? "Watching" : "Watch"}
          </Button>
          <Link to="/canvas" search={{ s: symbol }} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm text-primary-foreground"><Layers className="h-4 w-4" />Compare</Link>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className={`num text-sm ${toneClass(s.ret)}`}>{fmtPct(s.ret)} over {range}</span>
          <Segmented options={RANGES} value={range} onChange={setRange} />
        </div>
        <PriceChart rows={view} height={380} />
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[["CAGR", fmtPct(s.cagr)], ["Volatility", `${s.vol.toFixed(1)}%`], ["Max drawdown", fmtPct(s.mdd)], ["Sharpe", s.sharpe.toFixed(2)], ["Period high", fmtNum(hi)], ["Period low", fmtNum(lo)]].map(([l, v]) => (
          <Card key={l} className="p-4 md:p-4"><Stat label={l} value={v} /></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-gold/30">
          <AIPanel task="stock" title="Analyst note · Meridian Intelligence" cta="Analyse this stock"
            context={{ symbol, cagr: s.cagr.toFixed(1), vol: s.vol.toFixed(1), mdd: s.mdd.toFixed(1) }} />
        </Card>
        <Card>
          <CardHeader eyebrow="Fundamentals" title="Snapshot" />
          <dl className="num grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Market cap</dt><dd className="text-right">{meta.mcap ? `₹${fmtCompact(meta.mcap * 1e7)}` : "—"}</dd>
            <dt className="text-muted-foreground">P/E</dt><dd className="text-right">{meta.pe ?? "—"}</dd>
            <dt className="text-muted-foreground">P/B</dt><dd className="text-right">{meta.pb ?? "—"}</dd>
            <dt className="text-muted-foreground">Dividend yield</dt><dd className="text-right">{meta.dy != null ? `${meta.dy}%` : "—"}</dd>
            <dt className="text-muted-foreground">Last VWAP</dt><dd className="text-right">{fmtNum(last.vwap)}</dd>
            <dt className="text-muted-foreground">Trades</dt><dd className="text-right">{fmtCompact(last.trades)}</dd>
          </dl>
          <p className="mt-4 text-[11px] text-muted-foreground">Fundamentals are sample values; the historical dataset covers price and volume only.</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader eyebrow="Risk" title="Drawdown from peak" /><DrawdownChart rows={view} /></Card>
        <Card><CardHeader eyebrow="Risk" title="Rolling 30-day volatility" /><RollingVolChart rows={view} /></Card>
        <Card><CardHeader eyebrow="Distribution" title="Daily return histogram" /><ReturnHistogram rows={view} /></Card>
        <Card>
          <CardHeader eyebrow="Conviction" title="Delivery % vs volume" />
          {delivery.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={delivery}>
                <XAxis dataKey="date" hide />
                <YAxis yAxisId="v" hide />
                <YAxis yAxisId="d" orientation="right" fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" width={36} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} labelFormatter={fmtDate} formatter={(v, n) => (n === "deliverablePct" ? [`${v.toFixed(1)}%`, "Delivery"] : [fmtCompact(v), "Volume"])} />
                <Bar yAxisId="v" dataKey="volume" fill="var(--color-muted-foreground)" opacity={0.25} />
                <Line yAxisId="d" dataKey="deliverablePct" stroke="var(--color-primary)" dot={false} strokeWidth={1.4} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">Delivery data isn't available for this period.</p>}
        </Card>
      </div>

      <Card><CardHeader eyebrow="Calendar" title="Annual returns" /><YearlyBars rows={rows} /></Card>
      <Card><CardHeader eyebrow="Seasonality" title="Monthly return heatmap" /><MonthlyHeatmap rows={rows} /></Card>
    </div>
  );
}
