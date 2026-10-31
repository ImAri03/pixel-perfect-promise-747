import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { X, Plus, Save, FolderOpen, Trash2, Pencil } from "lucide-react";
import { Card, CardHeader, Button, Segmented, PageHeader, Monogram, Input } from "@/components/ui";
import { StockPicker } from "@/components/StockPicker";
import { AIPanel } from "@/components/AIPanel";
import { CompareChart, SERIES_COLORS } from "@/components/charts/charts";
import { getHistorySync, getSymbolMeta } from "@/services/dataProvider";
import { sliceRange, normalizeSeries, periodReturn, volatility, maxDrawdown, cagr, RANGES } from "@/lib/analytics";
import { fmtNum, fmtPct, toneClass } from "@/lib/format";
import { canvasStore } from "@/store/localStore";

export const Route = createFileRoute("/canvas")({
  validateSearch: (s) => ({ s: typeof s.s === "string" ? s.s : undefined }),
  head: () => ({
    meta: [
      { title: "Canvas — compare NSE stocks — Meridian" },
      { name: "description", content: "Compare NSE stocks side-by-side with normalized charts, risk statistics and AI analysis." },
      { property: "og:title", content: "Canvas — Meridian" },
      { property: "og:description", content: "Side-by-side NSE stock comparison workspace." },
    ],
  }),
  component: Canvas,
});

const PRESETS = [
  { label: "Reliance vs TCS", s: ["RELIANCE", "TCS"] },
  { label: "HDFC vs ICICI vs SBI", s: ["HDFCBANK", "ICICIBANK", "SBIN"] },
  { label: "Banking vs IT", s: ["HDFCBANK", "ICICIBANK", "TCS", "INFY"] },
];

function Canvas() {
  const { s } = Route.useSearch();
  const [symbols, setSymbols] = useState(s ? [s] : ["RELIANCE", "TCS"]);
  const [range, setRange] = useState("1Y");
  const [type, setType] = useState("line");
  const [view, setView] = useState("chart");
  const [adding, setAdding] = useState(false);
  const saved = canvasStore.useStore();

  const series = useMemo(() => Object.fromEntries(symbols.map((x) => [x, sliceRange(getHistorySync(x), range)])), [symbols, range]);
  const data = useMemo(() => normalizeSeries(series), [series]);
  const colors = symbols.map((_, i) => SERIES_COLORS[i % 5]);
  const stats = symbols.map((x) => {
    const r = series[x], m = getSymbolMeta(x);
    return { x, m, ret: periodReturn(r), cagr: cagr(r), hi: Math.max(...r.map((d) => d.high ?? d.close)), lo: Math.min(...r.map((d) => d.low ?? d.close)), vol: volatility(r), mdd: maxDrawdown(r) };
  });
  const sorted = [...stats].sort((a, b) => b.ret - a.ret);

  const saveCanvas = () => {
    const name = window.prompt("Name this canvas", symbols.join(" vs "));
    if (name) canvasStore.set((c) => [...c, { id: crypto.randomUUID(), name, symbols, range, at: Date.now() }]);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Comparison workspace" title="Canvas">
        <Button variant="outline" onClick={saveCanvas} disabled={!symbols.length}><Save className="h-4 w-4" />Save canvas</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => <button key={p.label} onClick={() => setSymbols(p.s)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground">{p.label}</button>)}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((st, i) => (
          <Card key={st.x} className="relative p-4 md:p-4" style={{ borderTop: `3px solid ${colors[i]}` }}>
            <button onClick={() => setSymbols((xs) => xs.filter((y) => y !== st.x))} aria-label="Remove" className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
            <div className="flex items-center gap-2"><Monogram symbol={st.x} color={colors[i]} /><div className="min-w-0"><div className="text-sm font-medium">{st.x}</div><div className="truncate text-xs text-muted-foreground">{st.m.name}</div></div></div>
            <div className={`num mt-3 font-serif text-xl ${toneClass(st.ret)}`}>{fmtPct(st.ret)}</div>
          </Card>
        ))}
        {symbols.length < 5 && (
          <Card className="p-4 md:p-4">
            {adding ? <StockPicker exclude={symbols} onPick={(x) => { setSymbols((xs) => [...xs, x]); setAdding(false); }} /> : (
              <button onClick={() => setAdding(true)} className="flex h-full min-h-20 w-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"><Plus className="h-5 w-5" />Add stock</button>
            )}
          </Card>
        )}
      </div>

      {symbols.length > 0 && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented options={[{ value: "chart", label: "Chart" }, { value: "stats", label: "Statistics" }]} value={view} onChange={setView} />
            <div className="flex flex-wrap gap-2">
              {view === "chart" && <Segmented options={[{ value: "line", label: "Line" }, { value: "area", label: "Area" }, { value: "bar", label: "Bar" }]} value={type} onChange={setType} />}
              <Segmented options={RANGES} value={range} onChange={setRange} />
            </div>
          </div>
          {view === "chart" ? (
            <>
              <CompareChart data={data} symbols={symbols} colors={colors} type={type} />
              <div className="mt-3 flex flex-wrap gap-4 text-xs">{symbols.map((x, i) => <span key={x} className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: colors[i] }} />{x}</span>)}<span className="text-muted-foreground">Rebased to 100 at period start</span></div>
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="num w-full min-w-[640px] text-sm">
                <thead className="eyebrow"><tr><th className="py-2 text-left font-medium">Metric</th>{stats.map((st, i) => <th key={st.x} className="py-2 text-right font-medium" style={{ color: colors[i] }}>{st.x}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {[["Period return", (s) => <span className={toneClass(s.ret)}>{fmtPct(s.ret)}</span>], ["CAGR", (s) => fmtPct(s.cagr)], ["Highest price", (s) => fmtNum(s.hi)], ["Lowest price", (s) => fmtNum(s.lo)], ["Volatility (ann.)", (s) => `${s.vol.toFixed(1)}%`], ["Max drawdown", (s) => fmtPct(s.mdd)], ["Market cap (₹ Cr)", (s) => fmtNum(s.m.mcap)], ["P/E", (s) => s.m.pe ?? "—"], ["P/B", (s) => s.m.pb ?? "—"], ["Dividend yield", (s) => (s.m.dy != null ? `${s.m.dy}%` : "—")]].map(([l, f]) => (
                    <tr key={l}><td className="py-2.5 text-muted-foreground">{l}</td>{stats.map((st) => <td key={st.x} className="py-2.5 text-right">{f(st)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {symbols.length > 1 && (
        <Card className="border-gold/30">
          <AIPanel key={symbols.join()} task="compare" title="Comparison · Meridian Intelligence" cta="Compare with AI" context={{ best: sorted[0]?.x, worst: sorted[sorted.length - 1]?.x }} />
        </Card>
      )}

      <Card>
        <CardHeader eyebrow="Library" title="Saved canvases" />
        {!saved.length ? <p className="text-sm text-muted-foreground">Save a comparison to return to it later.</p> : (
          <ul className="divide-y divide-border">
            {saved.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <div className="flex-1"><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.symbols.join(" · ")} · {c.range}</div></div>
                <Button size="sm" variant="ghost" onClick={() => { setSymbols(c.symbols); setRange(c.range); }}><FolderOpen className="h-3.5 w-3.5" />Load</Button>
                <Button size="sm" variant="ghost" onClick={() => { const n = window.prompt("Rename", c.name); if (n) canvasStore.set((cs) => cs.map((x) => (x.id === c.id ? { ...x, name: n } : x))); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => canvasStore.set((cs) => cs.filter((x) => x.id !== c.id))}><Trash2 className="h-3.5 w-3.5 text-negative" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
