import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, Cell, ComposedChart, Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { downsample, sma, drawdownSeries, rollingVolatility, returnHistogram, monthlyReturns, yearlyReturns } from "@/lib/analytics";
import { fmtNum, fmtPct, fmtDate, fmtCompact } from "@/lib/format";
import { Segmented } from "../ui";

export const SERIES_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
const axis = { stroke: "var(--color-muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };
const shortDate = (d) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

function TipBox({ children }) {
  return <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">{children}</div>;
}

function OhlcTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TipBox>
      <div className="mb-1 font-medium">{fmtDate(p.date)}</div>
      <div className="num grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
        <span>Open</span><span className="text-foreground">{fmtNum(p.open)}</span>
        <span>High</span><span className="text-foreground">{fmtNum(p.high)}</span>
        <span>Low</span><span className="text-foreground">{fmtNum(p.low)}</span>
        <span>Close</span><span className="text-foreground">{fmtNum(p.close)}</span>
        {p.vwap != null && <><span>VWAP</span><span className="text-foreground">{fmtNum(p.vwap)}</span></>}
        {p.volume != null && <><span>Volume</span><span className="text-foreground">{fmtCompact(p.volume)}</span></>}
        {p.deliverablePct != null && <><span>Delivery</span><span className="text-foreground">{p.deliverablePct.toFixed(1)}%</span></>}
      </div>
    </TipBox>
  );
}

function Candle(props) {
  const { x, y, width, height, payload } = props;
  if (!payload || payload.high === payload.low) return null;
  const { open, close, high, low } = payload;
  const ppu = height / (high - low);
  const up = close >= open;
  const color = up ? "var(--color-positive)" : "var(--color-negative)";
  const bodyTop = y + (high - Math.max(open, close)) * ppu;
  const bodyH = Math.max(1, Math.abs(open - close) * ppu);
  const cx = x + width / 2;
  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={x + width * 0.15} y={bodyTop} width={Math.max(1, width * 0.7)} height={bodyH} fill={color} />
    </g>
  );
}

/** Main research chart: candle / line / area, SMA overlays, volume pane, period-start meridian line. */
export function PriceChart({ rows, height = 340, defaultType = "area" }) {
  const [type, setType] = useState(defaultType);
  const [ind, setInd] = useState({ sma20: false, sma50: true, sma200: false, vwap: false });
  const data = useMemo(() => {
    const s20 = sma(rows, 20), s50 = sma(rows, 50), s200 = sma(rows, 200);
    const full = rows.map((r, i) => ({ ...r, range: [r.low, r.high], sma20: s20[i], sma50: s50[i], sma200: s200[i] }));
    return downsample(full, type === "candle" ? 120 : 400);
  }, [rows, type]);
  if (!data.length) return <div className="skeleton" style={{ height }} />;
  const start = data[0].close;
  const up = data[data.length - 1].close >= start;
  const stroke = up ? "var(--color-positive)" : "var(--color-negative)";
  const toggles = [["sma20", "SMA 20"], ["sma50", "SMA 50"], ["sma200", "SMA 200"], ["vwap", "VWAP"]];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented options={[{ value: "area", label: "Area" }, { value: "line", label: "Line" }, { value: "candle", label: "Candles" }]} value={type} onChange={setType} />
        <div className="flex flex-wrap gap-1.5">
          {toggles.map(([k, l]) => (
            <button key={k} onClick={() => setInd((s) => ({ ...s, [k]: !s[k] }))}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${ind[k] ? "border-gold bg-gold/15" : "border-border text-muted-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.6} vertical={false} />
          <XAxis dataKey="date" {...axis} tickFormatter={shortDate} minTickGap={50} />
          <YAxis yAxisId="p" {...axis} domain={["auto", "auto"]} width={60} tickFormatter={(v) => fmtCompact(v)} orientation="right" />
          <YAxis yAxisId="v" hide domain={[0, (m) => m * 4]} />
          <Tooltip content={<OhlcTip />} cursor={{ stroke: "var(--color-muted-foreground)", strokeDasharray: "3 3" }} />
          <Bar yAxisId="v" dataKey="volume" fill="var(--color-muted-foreground)" opacity={0.18} isAnimationActive={false} />
          <ReferenceLine yAxisId="p" y={start} stroke="var(--color-gold)" strokeDasharray="4 4" strokeOpacity={0.8} />
          {type === "area" && <Area yAxisId="p" type="monotone" dataKey="close" stroke={stroke} strokeWidth={1.6} fill="url(#pc-fill)" animationDuration={900} />}
          {type === "line" && <Line yAxisId="p" type="monotone" dataKey="close" stroke={stroke} strokeWidth={1.6} dot={false} animationDuration={900} />}
          {type === "candle" && <Bar yAxisId="p" dataKey="range" shape={<Candle />} isAnimationActive={false} />}
          {ind.sma20 && <Line yAxisId="p" dataKey="sma20" stroke="var(--color-chart-3)" strokeWidth={1} dot={false} isAnimationActive={false} />}
          {ind.sma50 && <Line yAxisId="p" dataKey="sma50" stroke="var(--color-gold)" strokeWidth={1} dot={false} isAnimationActive={false} />}
          {ind.sma200 && <Line yAxisId="p" dataKey="sma200" stroke="var(--color-chart-5)" strokeWidth={1} dot={false} isAnimationActive={false} />}
          {ind.vwap && <Line yAxisId="p" dataKey="vwap" stroke="var(--color-chart-4)" strokeWidth={1} strokeDasharray="2 2" dot={false} isAnimationActive={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Sparkline({ rows, width = 96, height = 32 }) {
  const data = rows.map((r) => ({ v: r.close }));
  const up = data.length > 1 && data[data.length - 1].v >= data[0].v;
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line dataKey="v" dot={false} strokeWidth={1.4} stroke={up ? "var(--color-positive)" : "var(--color-negative)"} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DrawdownChart({ rows, height = 180 }) {
  const data = useMemo(() => downsample(drawdownSeries(rows), 300), [rows]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 0, right: 4 }}>
        <XAxis dataKey="date" {...axis} tickFormatter={shortDate} minTickGap={60} />
        <YAxis {...axis} width={44} tickFormatter={(v) => `${v.toFixed(0)}%`} orientation="right" />
        <Tooltip content={({ active, payload }) => active && payload?.length ? <TipBox>{fmtDate(payload[0].payload.date)} · <b>{fmtPct(payload[0].value)}</b></TipBox> : null} />
        <ReferenceLine y={0} stroke="var(--color-border)" />
        <Area dataKey="dd" stroke="var(--color-negative)" fill="var(--color-negative)" fillOpacity={0.15} strokeWidth={1.2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RollingVolChart({ rows, height = 180 }) {
  const data = useMemo(() => downsample(rollingVolatility(downsample(rows, 1500), 30), 300), [rows]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 4 }}>
        <XAxis dataKey="date" {...axis} tickFormatter={shortDate} minTickGap={60} />
        <YAxis {...axis} width={44} tickFormatter={(v) => `${v.toFixed(0)}%`} orientation="right" />
        <Tooltip content={({ active, payload }) => active && payload?.length ? <TipBox>{fmtDate(payload[0].payload.date)} · <b>{payload[0].value.toFixed(1)}% ann.</b></TipBox> : null} />
        <Line dataKey="vol" stroke="var(--color-gold)" dot={false} strokeWidth={1.3} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ReturnHistogram({ rows, height = 180 }) {
  const data = useMemo(() => returnHistogram(rows), [rows]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 4 }}>
        <XAxis dataKey="bucket" {...axis} tickFormatter={(v) => `${v}%`} interval={4} />
        <YAxis hide />
        <Tooltip content={({ active, payload }) => active && payload?.length ? <TipBox>{payload[0].payload.bucket}% · {payload[0].value} days</TipBox> : null} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((d) => <Cell key={d.bucket} fill={d.bucket >= 0 ? "var(--color-positive)" : "var(--color-negative)"} fillOpacity={0.75} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function YearlyBars({ rows, height = 200 }) {
  const data = useMemo(() => yearlyReturns(rows), [rows]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 4 }}>
        <XAxis dataKey="year" {...axis} minTickGap={16} />
        <YAxis {...axis} width={44} tickFormatter={(v) => `${v.toFixed(0)}%`} orientation="right" />
        <ReferenceLine y={0} stroke="var(--color-border)" />
        <Tooltip content={({ active, payload }) => active && payload?.length ? <TipBox>{payload[0].payload.year} · <b>{fmtPct(payload[0].value)}</b></TipBox> : null} cursor={{ fill: "var(--color-secondary)" }} />
        <Bar dataKey="ret" radius={[3, 3, 0, 0]}>
          {data.map((d) => <Cell key={d.year} fill={d.ret >= 0 ? "var(--color-positive)" : "var(--color-negative)"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
export function MonthlyHeatmap({ rows, years = 12 }) {
  const grid = useMemo(() => monthlyReturns(rows), [rows]);
  const ys = Object.keys(grid).slice(-years).reverse();
  const color = (v) => {
    if (v == null) return "transparent";
    const a = Math.min(1, Math.abs(v) / 10);
    return `color-mix(in oklab, ${v >= 0 ? "var(--color-positive)" : "var(--color-negative)"} ${Math.round(a * 85 + 8)}%, var(--color-card))`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="num w-full border-separate text-[11px]" style={{ borderSpacing: 3 }}>
        <thead><tr><th />{MONTHS.map((m, i) => <th key={i} className="font-normal text-muted-foreground">{m}</th>)}</tr></thead>
        <tbody>
          {ys.map((y) => (
            <tr key={y}>
              <td className="pr-2 text-muted-foreground">{y}</td>
              {grid[y].map((v, i) => (
                <td key={i} title={v == null ? "" : `${MONTHS[i]} ${y}: ${fmtPct(v)}`} className="h-7 min-w-8 rounded-md text-center" style={{ background: color(v) }}>
                  {v == null ? "" : v.toFixed(0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Donut({ data, height = 220, valueFormatter = fmtCompact }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
          {data.map((d, i) => <Cell key={d.name} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
        </Pie>
        <Tooltip content={({ active, payload }) => active && payload?.length ? <TipBox>{payload[0].name} · <b>{valueFormatter(payload[0].value)}</b></TipBox> : null} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Normalized (base 100) multi-series comparison. */
export function CompareChart({ data, symbols, colors, type = "line", height = 360 }) {
  const thin = useMemo(() => downsample(data, 400), [data]);
  const common = { data: thin, margin: { top: 8, right: 4, left: 0, bottom: 0 } };
  const inner = (
    <>
      <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.6} vertical={false} />
      <XAxis dataKey="date" {...axis} tickFormatter={shortDate} minTickGap={50} />
      <YAxis {...axis} width={48} orientation="right" domain={["auto", "auto"]} />
      <ReferenceLine y={100} stroke="var(--color-gold)" strokeDasharray="4 4" label={{ value: "Period start", fill: "var(--color-muted-foreground)", fontSize: 10, position: "insideTopLeft" }} />
      <Tooltip content={({ active, payload }) => active && payload?.length ? (
        <TipBox>
          <div className="mb-1 font-medium">{fmtDate(payload[0].payload.date)}</div>
          {payload.map((p) => <div key={p.dataKey} className="num flex justify-between gap-4"><span style={{ color: p.color }}>{p.dataKey}</span><span>{fmtPct(p.value - 100)}</span></div>)}
        </TipBox>
      ) : null} />
    </>
  );
  if (type === "bar") {
    const last = thin[thin.length - 1] || {};
    const bars = symbols.map((s) => ({ s, ret: (last[s] ?? 100) - 100 }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={bars}>
          <XAxis dataKey="s" {...axis} />
          <YAxis {...axis} width={48} tickFormatter={(v) => `${v.toFixed(0)}%`} orientation="right" />
          <ReferenceLine y={0} stroke="var(--color-gold)" strokeDasharray="4 4" />
          <Tooltip content={({ active, payload }) => active && payload?.length ? <TipBox>{payload[0].payload.s} · <b>{fmtPct(payload[0].value)}</b></TipBox> : null} cursor={{ fill: "var(--color-secondary)" }} />
          <Bar dataKey="ret" radius={[6, 6, 0, 0]}>{bars.map((b, i) => <Cell key={b.s} fill={colors[i]} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "area" ? (
        <AreaChart {...common}>{inner}{symbols.map((s, i) => <Area key={s} dataKey={s} stroke={colors[i]} fill={colors[i]} fillOpacity={0.08} strokeWidth={1.6} connectNulls />)}</AreaChart>
      ) : (
        <LineChart {...common}>{inner}{symbols.map((s, i) => <Line key={s} dataKey={s} stroke={colors[i]} dot={false} strokeWidth={1.6} connectNulls />)}</LineChart>
      )}
    </ResponsiveContainer>
  );
}
