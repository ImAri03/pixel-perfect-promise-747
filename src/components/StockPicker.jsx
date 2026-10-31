import { useMemo, useState } from "react";
import { SYMBOLS } from "@/data/mock/symbols";
import { Input } from "./ui";

/** Search NSE symbols by symbol or company name. */
export function StockPicker({ onPick, exclude = [], placeholder = "Search NSE symbol or company" }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return SYMBOLS.filter((x) => !exclude.includes(x.symbol) && (!s || x.symbol.toLowerCase().includes(s) || x.name.toLowerCase().includes(s))).slice(0, 6);
  }, [q, exclude]);
  return (
    <div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      <div className="mt-2 max-h-56 overflow-y-auto">
        {results.map((r) => (
          <button key={r.symbol} onClick={() => { onPick(r.symbol); setQ(""); }} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary">
            <span>{r.name}</span><span className="text-xs text-muted-foreground">{r.symbol}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
