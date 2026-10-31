/** Meridian UI primitives (JavaScript). */
import { cn } from "@/lib/cn";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { fmtPct, toneClass } from "@/lib/format";

export function Card({ className, children, ...p }) {
  return <section className={cn("card-surface p-5 md:p-6", className)} {...p}>{children}</section>;
}

export function CardHeader({ eyebrow, title, action, className }) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        {title && <h2 className="text-xl font-medium">{title}</h2>}
      </div>
      {action}
    </div>
  );
}

const btn = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  outline: "border border-border bg-card hover:bg-secondary",
  ghost: "hover:bg-secondary",
  gold: "bg-gold/15 text-foreground border border-gold/40 hover:bg-gold/25",
};
export function Button({ variant = "primary", size = "md", className, ...p }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        btn[variant],
        className,
      )}
      {...p}
    />
  );
}

export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cn("inline-flex rounded-full border border-border bg-secondary p-0.5", className)}>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150",
              value === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function Change({ value, className }) {
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("num inline-flex items-center gap-0.5 font-medium", toneClass(value), className)}>
      <Icon className="h-3.5 w-3.5" />
      {fmtPct(value)}
    </span>
  );
}

export function Chip({ value }) {
  return (
    <span className={cn("num rounded-full px-2 py-0.5 text-xs font-medium", value >= 0 ? "bg-positive/12 text-positive" : "bg-negative/12 text-negative")}>
      {fmtPct(value)}
    </span>
  );
}

export function Monogram({ symbol, color }) {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-serif text-sm"
      style={color ? { borderColor: color, color } : undefined}
    >
      {symbol[0]}
    </span>
  );
}

export function Stat({ label, value, sub, className }) {
  return (
    <div className={className}>
      <div className="eyebrow">{label}</div>
      <div className="num mt-1 font-serif text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-xs">{sub}</div>}
    </div>
  );
}

export function Input({ className, ...p }) {
  return <input className={cn("h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30", className)} {...p} />;
}

export function PageHeader({ eyebrow, title, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-3xl font-light md:text-4xl">{title}</h1>
        <div className="meridian-line mt-4 w-24" />
      </div>
      {children}
    </div>
  );
}
