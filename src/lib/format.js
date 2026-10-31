const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const fmtNum = (n) => (n == null || Number.isNaN(n) ? "—" : inr.format(n));
export const fmtInr = (n) => (n == null ? "—" : `₹${inr.format(n)}`);
export const fmtPct = (n, sign = true) => (n == null || Number.isNaN(n) ? "—" : `${sign && n > 0 ? "+" : ""}${n.toFixed(2)}%`);
export function fmtCompact(n) {
  if (n == null) return "—";
  if (n >= 1e7) return `${inr.format(n / 1e7)} Cr`;
  if (n >= 1e5) return `${inr.format(n / 1e5)} L`;
  return inr0.format(n);
}
export const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const toneClass = (n) => (n > 0 ? "text-positive" : n < 0 ? "text-negative" : "text-muted-foreground");
