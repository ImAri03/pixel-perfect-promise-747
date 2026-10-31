import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2, Sparkles, ArrowUpDown } from "lucide-react";
import { Card, Button, Change, PageHeader, Input } from "@/components/ui";
import { Drawer } from "@/components/Drawer";
import { StockPicker } from "@/components/StockPicker";
import { Sparkline } from "@/components/charts/charts";
import { watchlistStore } from "@/store/localStore";
import { getQuote, getSymbolMeta, getHistorySync } from "@/services/dataProvider";
import { volatility } from "@/lib/analytics";
import { fmtNum } from "@/lib/format";
import { streamAI } from "@/services/ai";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — Meridian" },
      { name: "description", content: "Follow NSE stocks with daily change, 20-day sparklines and AI takes." },
      { property: "og:title", content: "Watchlist — Meridian" },
      { property: "og:description", content: "Your NSE watchlist with sparklines and AI takes." },
    ],
  }),
  component: Watchlist,
});

function AITake({ symbol, vol }) {
  const [t, setT] = useState("");
  const [busy, setBusy] = useState(false);
  if (t) return <span className="font-serif text-xs">{t}</span>;
  return (
    <button disabled={busy} onClick={async () => { setBusy(true); await streamAI("take", { symbol, vol: vol.toFixed(0) }, setT); setBusy(false); }}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      <Sparkles className={`h-3.5 w-3.5 text-gold ${busy ? "animate-pulse" : ""}`} />{busy ? "Thinking…" : "AI take"}
    </button>
  );
}

function Watchlist() {
  const list = watchlistStore.useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ k: "symbol", d: 1 });
  const rows = useMemo(() => list.map((s) => {
    const h = getHistorySync(s);
    return { symbol: s, name: getSymbolMeta(s).name, ...getQuote(s), spark: h.slice(-20), vol: volatility(h.slice(-60)) };
  }), [list]);
  const shown = rows.filter((r) => !q || `${r.symbol} ${r.name}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (a[sort.k] > b[sort.k] ? 1 : -1) * sort.d);
  const Th = ({ k, children, right }) => (
    <th className={`px-3 py-3 font-medium ${right ? "text-right" : "text-left"}`}>
      <button className="inline-flex items-center gap-1" onClick={() => setSort((s) => ({ k, d: s.k === k ? -s.d : 1 }))}>{children}<ArrowUpDown className="h-3 w-3" /></button>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Following" title="Watchlist"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add stock</Button></PageHeader>
      {!list.length ? (
        <Card className="py-16 text-center"><h2 className="text-2xl font-light">Nothing on watch yet</h2><p className="mt-2 text-sm text-muted-foreground">Add companies you want to understand before you invest.</p><Button className="mt-6" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add a stock</Button></Card>
      ) : (
        <Card className="p-0 md:p-0">
          <div className="p-5"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search watchlist…" className="max-w-xs" /></div>
          <div className="overflow-x-auto">
            <table className="num w-full min-w-[760px] text-sm">
              <thead className="eyebrow border-y border-border bg-secondary/50"><tr><Th k="name">Company</Th><Th k="symbol">Symbol</Th><Th k="close" right>Last</Th><Th k="changePct" right>Day</Th><th className="px-3 py-3 text-left font-medium">20 days</th><th className="px-3 py-3 text-left font-medium">AI take</th><th /></tr></thead>
              <tbody className="divide-y divide-border">
                {shown.map((r) => (
                  <tr key={r.symbol} className="hover:bg-secondary/40">
                    <td className="px-3 py-3"><Link to="/stock/$symbol" params={{ symbol: r.symbol }} className="font-medium hover:text-primary">{r.name}</Link></td>
                    <td className="px-3 text-muted-foreground">{r.symbol}</td>
                    <td className="px-3 text-right">{fmtNum(r.close)}</td>
                    <td className="px-3 text-right"><Change value={r.changePct} /></td>
                    <td className="px-3"><Sparkline rows={r.spark} /></td>
                    <td className="max-w-64 px-3"><AITake symbol={r.symbol} vol={r.vol} /></td>
                    <td className="px-3 text-right"><button aria-label="Remove" onClick={() => watchlistStore.set((w) => w.filter((x) => x !== r.symbol))} className="rounded-full p-1.5 text-negative hover:bg-secondary"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Drawer open={open} onClose={() => setOpen(false)} title="Add to watchlist">
        <StockPicker exclude={list} onPick={(s) => { watchlistStore.set((w) => [...w, s]); setOpen(false); }} />
      </Drawer>
    </div>
  );
}
