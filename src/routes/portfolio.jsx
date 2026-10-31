import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { Card, CardHeader, Button, Chip, Stat, Input, PageHeader, Segmented } from "@/components/ui";
import { Drawer } from "@/components/Drawer";
import { StockPicker } from "@/components/StockPicker";
import { AIPanel } from "@/components/AIPanel";
import { Donut, CompareChart, SERIES_COLORS } from "@/components/charts/charts";
import { holdingsStore } from "@/store/localStore";
import { getQuote, getSymbolMeta, getHistorySync } from "@/services/dataProvider";
import { sliceRange, RANGES } from "@/lib/analytics";
import { fmtInr, fmtNum, fmtPct, toneClass } from "@/lib/format";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Meridian" },
      { name: "description", content: "Track holdings, P&L, allocation and portfolio performance versus NIFTY 50." },
      { property: "og:title", content: "Portfolio — Meridian" },
      { property: "og:description", content: "Holdings, P&L and allocation for Indian investors." },
    ],
  }),
  component: Portfolio,
});

function usePortfolio(holdings) {
  return useMemo(() => {
    const rows = holdings.map((h) => {
      const q = getQuote(h.symbol);
      const meta = getSymbolMeta(h.symbol);
      const invested = h.qty * h.avg;
      const current = h.qty * (q?.close ?? h.avg);
      return { ...h, name: meta.name, sector: meta.sector, price: q?.close, dayPct: q?.changePct ?? 0, invested, current, pnl: current - invested, pnlPct: ((current - invested) / invested) * 100 };
    });
    const invested = rows.reduce((a, r) => a + r.invested, 0);
    const current = rows.reduce((a, r) => a + r.current, 0);
    const day = rows.reduce((a, r) => a + r.current * (r.dayPct / (100 + r.dayPct)), 0);
    return { rows, invested, current, pnl: current - invested, pnlPct: invested ? ((current - invested) / invested) * 100 : 0, day };
  }, [holdings]);
}

function performance(holdings, range) {
  if (!holdings.length) return [];
  const series = holdings.map((h) => ({ h, rows: sliceRange(getHistorySync(h.symbol), range) }));
  const nifty = sliceRange(getHistorySync("NIFTY 50"), range);
  const maps = series.map((s) => new Map(s.rows.map((r) => [r.date, r.close])));
  let base = null, nBase = nifty[0]?.close;
  const lastSeen = series.map((s) => s.rows[0]?.close ?? s.h.avg);
  return nifty.map((n) => {
    const value = series.reduce((a, s, i) => { const v = maps[i].get(n.date); if (v) lastSeen[i] = v; return a + lastSeen[i] * s.h.qty; }, 0);
    if (base == null) base = value;
    return { date: n.date, Portfolio: (value / base) * 100, "NIFTY 50": (n.close / nBase) * 100 };
  });
}

const empty = { symbol: "", qty: "", avg: "", date: "" };

function Portfolio() {
  const holdings = holdingsStore.useStore();
  const p = usePortfolio(holdings);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ k: "current", d: -1 });
  const [range, setRange] = useState("1Y");
  const [alloc, setAlloc] = useState("stock");
  const perf = useMemo(() => performance(holdings, range), [holdings, range]);

  const openAdd = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (h) => { setForm({ symbol: h.symbol, qty: String(h.qty), avg: String(h.avg), date: h.date || "" }); setEditId(h.id); setOpen(true); };
  const save = () => {
    const rec = { symbol: form.symbol, qty: Number(form.qty), avg: Number(form.avg), date: form.date };
    if (!rec.symbol || !(rec.qty > 0) || !(rec.avg > 0)) return;
    holdingsStore.set((hs) => (editId ? hs.map((h) => (h.id === editId ? { ...h, ...rec } : h)) : [...hs, { id: crypto.randomUUID(), ...rec }]));
    setOpen(false);
  };

  const rows = p.rows
    .filter((r) => !q || r.symbol.toLowerCase().includes(q.toLowerCase()) || r.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a[sort.k] > b[sort.k] ? 1 : -1) * sort.d);
  const allocData = useMemo(() => {
    if (alloc === "stock") return p.rows.map((r) => ({ name: r.symbol, value: r.current }));
    const m = {}; p.rows.forEach((r) => (m[r.sector] = (m[r.sector] || 0) + r.current));
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [p.rows, alloc]);
  const top = [...p.rows].sort((a, b) => b.current - a.current)[0];

  const Th = ({ k, children, right }) => (
    <th className={`px-3 py-3 font-medium ${right ? "text-right" : "text-left"}`}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ k, d: s.k === k ? -s.d : -1 }))}>{children}<ArrowUpDown className="h-3 w-3" /></button>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Your holdings" title="Portfolio"><Button onClick={openAdd}><Plus className="h-4 w-4" />Add holding</Button></PageHeader>

      {!holdings.length ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <svg width="120" height="60" viewBox="0 0 120 60" className="mb-6"><line x1="0" y1="40" x2="120" y2="40" stroke="var(--color-border)" strokeDasharray="4 4" /><path d="M5 50 C40 48, 60 30, 110 10" stroke="var(--color-primary)" strokeWidth="2" fill="none" /><circle cx="110" cy="10" r="4" fill="var(--color-gold)" /></svg>
          <h2 className="text-2xl font-light">Start from your meridian</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Add a holding to see P&L, allocation and how you compare with the NIFTY 50.</p>
          <Button className="mt-6" onClick={openAdd}><Plus className="h-4 w-4" />Add your first holding</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card><Stat label="Current value" value={fmtInr(p.current)} sub={<span className="text-muted-foreground">{holdings.length} holdings</span>} /></Card>
            <Card><Stat label="Invested" value={fmtInr(p.invested)} /></Card>
            <Card><Stat label="Total P&L" value={<span className={toneClass(p.pnl)}>{fmtInr(p.pnl)}</span>} sub={<Chip value={p.pnlPct} />} /></Card>
            <Card><Stat label="Today" value={<span className={toneClass(p.day)}>{fmtInr(p.day)}</span>} sub={<Chip value={(p.day / (p.current - p.day)) * 100} />} /></Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader eyebrow="Performance" title="Portfolio vs NIFTY 50" action={<Segmented options={RANGES.slice(0, 5)} value={range} onChange={setRange} />} />
              <CompareChart data={perf} symbols={["Portfolio", "NIFTY 50"]} colors={[SERIES_COLORS[0], SERIES_COLORS[1]]} type="area" height={300} />
            </Card>
            <Card>
              <CardHeader eyebrow="Allocation" title="Where your money sits" action={<Segmented options={[{ value: "stock", label: "Stock" }, { value: "sector", label: "Sector" }]} value={alloc} onChange={setAlloc} />} />
              <Donut data={allocData} height={200} valueFormatter={fmtInr} />
              <ul className="mt-3 space-y-1.5 text-sm">
                {allocData.map((d, i) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[i % 5] }} />
                    <span className="flex-1">{d.name}</span>
                    <span className="num text-muted-foreground">{((d.value / p.current) * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="border-gold/30">
            <AIPanel task="portfolio" title="Portfolio review · Meridian Intelligence" cta="Review my portfolio"
              context={() => ({ pnlPct: p.pnlPct.toFixed(1), top: top?.symbol, topWeight: ((top?.current / p.current) * 100).toFixed(1), topSector: top?.sector })} />
          </Card>

          <Card className="p-0 md:p-0">
            <div className="flex items-center justify-between gap-3 p-5">
              <h2 className="text-xl">Holdings</h2>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="max-w-xs" />
            </div>
            <div className="overflow-x-auto">
              <table className="num w-full min-w-[860px] text-sm">
                <thead className="eyebrow border-y border-border bg-secondary/50">
                  <tr><Th k="symbol">Stock</Th><Th k="qty" right>Qty</Th><Th k="avg" right>Avg buy</Th><Th k="price" right>Price</Th><Th k="invested" right>Invested</Th><Th k="current" right>Current</Th><Th k="pnl" right>P&L</Th><Th k="pnlPct" right>P&L %</Th><th /></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-3 py-3"><Link to="/stock/$symbol" params={{ symbol: r.symbol }} className="font-medium hover:text-primary">{r.symbol}</Link><div className="text-xs text-muted-foreground">{r.name}</div></td>
                      <td className="px-3 text-right">{r.qty}</td>
                      <td className="px-3 text-right">{fmtNum(r.avg)}</td>
                      <td className="px-3 text-right">{fmtNum(r.price)}</td>
                      <td className="px-3 text-right">{fmtNum(r.invested)}</td>
                      <td className="px-3 text-right">{fmtNum(r.current)}</td>
                      <td className={`px-3 text-right ${toneClass(r.pnl)}`}>{fmtNum(r.pnl)}</td>
                      <td className="px-3 text-right"><Chip value={r.pnlPct} /></td>
                      <td className="px-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(r)} aria-label="Edit" className="rounded-full p-1.5 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => holdingsStore.set((hs) => hs.filter((h) => h.id !== r.id))} aria-label="Delete" className="rounded-full p-1.5 text-negative hover:bg-secondary"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title={editId ? "Edit holding" : "Add holding"}>
        <div className="space-y-5">
          {form.symbol ? (
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div><div className="font-medium">{form.symbol}</div><div className="text-xs text-muted-foreground">{getSymbolMeta(form.symbol).name} · LTP {fmtNum(getQuote(form.symbol)?.close)}</div></div>
              {!editId && <button className="text-xs underline" onClick={() => setForm({ ...form, symbol: "" })}>Change</button>}
            </div>
          ) : <StockPicker onPick={(s) => setForm({ ...form, symbol: s, avg: form.avg || getQuote(s)?.close.toFixed(2) })} />}
          <label className="block"><span className="eyebrow">Quantity</span><Input type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="mt-1.5" /></label>
          <label className="block"><span className="eyebrow">Average buy price (₹)</span><Input type="number" min="0" step="0.01" value={form.avg} onChange={(e) => setForm({ ...form, avg: e.target.value })} className="mt-1.5" /></label>
          <label className="block"><span className="eyebrow">Purchase date</span><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1.5" /></label>
          {form.qty && form.avg && <p className="num text-sm text-muted-foreground">Invested: {fmtInr(form.qty * form.avg)}</p>}
          <Button className="w-full" onClick={save} disabled={!form.symbol || !form.qty || !form.avg}>{editId ? "Save changes" : "Add to portfolio"}</Button>
        </div>
      </Drawer>
    </div>
  );
}
