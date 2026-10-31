/** Tiny persisted store (localStorage) usable with useSyncExternalStore. */
import { useSyncExternalStore } from "react";

export function createStore(key, initial) {
  let state = initial;
  let loaded = false;
  const listeners = new Set();
  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) state = JSON.parse(raw);
    } catch {}
  };
  const get = () => (load(), state);
  const set = (updater) => {
    load();
    state = typeof updater === "function" ? updater(state) : updater;
    try { window.localStorage.setItem(key, JSON.stringify(state)); } catch {}
    listeners.forEach((l) => l());
  };
  const subscribe = (l) => (listeners.add(l), () => listeners.delete(l));
  const useStore = () => useSyncExternalStore(subscribe, get, () => initial);
  return { get, set, useStore };
}

export const holdingsStore = createStore("meridian.holdings", [
  { id: "h1", symbol: "RELIANCE", qty: 25, avg: 2410, date: "2022-03-14" },
  { id: "h2", symbol: "TCS", qty: 12, avg: 3320, date: "2021-11-02" },
  { id: "h3", symbol: "HDFCBANK", qty: 40, avg: 1520, date: "2023-01-20" },
  { id: "h4", symbol: "ITC", qty: 150, avg: 312, date: "2022-07-08" },
  { id: "h5", symbol: "SUNPHARMA", qty: 30, avg: 1040, date: "2023-05-11" },
]);
export const watchlistStore = createStore("meridian.watchlist", ["INFY", "ICICIBANK", "MARUTI", "LT", "BHARTIARTL"]);
export const canvasStore = createStore("meridian.canvases", []);
export const profileStore = createStore("meridian.profile", { name: "Investor" });
