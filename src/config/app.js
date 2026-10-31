/**
 * Central configuration. All environment-driven switches live here.
 * See .env.example and README.md.
 */
export const config = {
  appName: "Meridian",
  // "mock" (default) or "local". "local" points the data provider at your own backend.
  dataMode: import.meta.env.VITE_DATA_MODE || "mock",
  // Base URL of your future local backend that serves the NSE dataset (DuckDB/SQLite etc.).
  dataApiUrl: import.meta.env.VITE_DATA_API_URL || "http://localhost:8000",
  // Base URL of the server endpoint that proxies Gemini. The key NEVER lives in the browser.
  aiApiUrl: import.meta.env.VITE_AI_API_URL || "",
  aiModel: "gemini-2.5-flash",
};

export const isAiConfigured = () => Boolean(config.aiApiUrl);
