import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { LayoutDashboard, Briefcase, Layers, Star, Settings, Search, Moon, Sun, LineChart } from "lucide-react";
import { Logo } from "../Logo";
import { MarketTicker } from "./MarketTicker";
import { SYMBOLS } from "@/data/mock/symbols";
import { profileStore } from "@/store/localStore";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/canvas", label: "Canvas", icon: Layers },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/settings", label: "Settings", icon: Settings },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("meridian.theme", next ? "dark" : "light");
  };
  return (
    <button onClick={toggle} aria-label="Toggle theme" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function Palette({ open, setOpen }) {
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setOpen]);
  if (!open) return null;
  const go = (to, params) => { setOpen(false); navigate({ to, params }); };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <Command className="card-surface w-full max-w-lg overflow-hidden p-0" onClick={(e) => e.stopPropagation()} label="Search">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Command.Input autoFocus placeholder="Search NSE symbols, companies or pages…" className="h-12 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="p-4 text-sm text-muted-foreground">No matches.</Command.Empty>
          <Command.Group heading="Stocks" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
            {SYMBOLS.map((s) => (
              <Command.Item key={s.symbol} value={`${s.symbol} ${s.name}`} onSelect={() => go("/stock/$symbol", { symbol: s.symbol })}
                className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-secondary">
                <span className="flex items-center gap-2"><LineChart className="h-3.5 w-3.5 text-muted-foreground" />{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.symbol}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
            {NAV.map((n) => (
              <Command.Item key={n.to} onSelect={() => go(n.to)} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-secondary">
                <n.icon className="h-3.5 w-3.5" />{n.label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

export function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const profile = profileStore.useStore();
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card/60 px-4 py-6 lg:flex">
        <Link to="/" className="px-2"><Logo /></Link>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
              className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground">
              <n.icon className="h-4 w-4" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-xl border border-border p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-serif text-accent-foreground">{profile.name[0]}</span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{profile.name}</div>
            <div className="truncate text-xs text-muted-foreground">investor@meridian.app</div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <Link to="/" className="lg:hidden"><Logo /></Link>
            <button onClick={() => setOpen(true)} className="ml-auto flex h-9 w-full max-w-sm items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary lg:ml-0">
              <Search className="h-4 w-4" /><span className="flex-1 text-left">Search stocks…</span>
              <kbd className="hidden rounded border border-border px-1.5 text-[10px] md:inline">⌘K</kbd>
            </button>
            <div className="ml-auto"><ThemeToggle /></div>
          </div>
          <MarketTicker />
        </header>
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-8 md:px-8 lg:pb-16">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-card/95 py-2 backdrop-blur lg:hidden">
        {NAV.slice(0, 4).map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] text-muted-foreground data-[status=active]:text-primary">
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
      <Palette open={open} setOpen={setOpen} />
    </div>
  );
}
