/**
 * AI SERVICE — Gemini 2.5 Flash integration point.
 *
 * The Gemini key must NEVER be in the browser. After export, run a small local server
 * (see README "Gemini integration") exposing:
 *   POST {aiApiUrl}/ai/generate  body: { task, context }  -> text/plain stream
 * and set VITE_AI_API_URL. Until then, a mock streamer produces realistic analyst copy
 * from the same `context` so the UI is fully functional.
 */
import { config, isAiConfigured } from "@/config/app";

const MOCK = {
  brief: (c) =>
    `Indian equities ended the session on a measured note. ${c.leader} led the tape while ${c.laggard} lagged, suggesting rotation rather than broad risk-off. Banking breadth remains constructive; IT continues to consolidate after its recent run. For long-term investors, nothing in today's action changes the multi-year picture — volatility sits near its 1-year median and delivery percentages point to steady accumulation in large caps.`,
  stock: (c) =>
    `${c.symbol} has compounded at roughly ${c.cagr}% a year over the period studied, with annualised volatility near ${c.vol}%. The deepest drawdown was ${c.mdd}%, which frames the kind of patience the stock has historically demanded. Recent delivery percentages suggest holders are buying to keep rather than to trade. Consider position sizing relative to that drawdown history rather than recent momentum.`,
  compare: (c) =>
    `Over the selected window, ${c.best} delivered the strongest return while ${c.worst} trailed. Risk-adjusted, the gap narrows: volatility differences explain much of the dispersion. Valuation multiples diverge meaningfully, so the comparison is as much about what you pay as what you get. Key consideration: concentration in a single sector amplifies shared macro risk.`,
  portfolio: (c) =>
    `Your portfolio is up ${c.pnlPct}% overall. ${c.top} is the largest position at ${c.topWeight}% of value — worth monitoring for concentration. Sector exposure tilts toward ${c.topSector}. Diversification across uncorrelated sectors could lower overall drawdown without sacrificing much expected return.`,
  take: (c) => `${c.symbol}: steady trend, volatility ${c.vol}%. Hold-quality; watch valuation.`,
};

/**
 * Stream an AI response. onChunk receives incremental text.
 * @param {"brief"|"stock"|"compare"|"portfolio"|"take"} task
 */
export async function streamAI(task, context, onChunk, signal) {
  if (isAiConfigured()) {
    const res = await fetch(`${config.aiApiUrl}/ai/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, context, model: config.aiModel }),
      signal,
    });
    if (!res.ok || !res.body) throw new Error("AI service unavailable");
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      onChunk(text);
    }
    return text;
  }
  const full = (MOCK[task] || MOCK.brief)(context || {});
  const words = full.split(" ");
  let text = "";
  await new Promise((r) => setTimeout(r, 600));
  for (const w of words) {
    if (signal?.aborted) throw new Error("aborted");
    text += (text ? " " : "") + w;
    onChunk(text);
    await new Promise((r) => setTimeout(r, 22));
  }
  return text;
}
