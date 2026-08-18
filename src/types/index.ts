/**
 * Core data types for the Historical Investment Horizon & Risk dashboard.
 *
 * These mirror the columns produced by the existing Python/notebook pipeline
 * (see scripts/update_data.py), so the shape here must stay in sync with the
 * JSON files under /public/data.
 */

/** One daily OHLCV bar plus the derived fields the notebook already computes. */
export interface DailyBar {
  date: string; // ISO "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dma5: number | null;
  dma10: number | null;
  dma20: number | null;
  dma30: number | null;
  dma50: number | null;
  dma100: number | null;
  dma200: number | null;
  change: number | null; // Close(t) - Close(t-1)
  returnPct: number | null; // % daily return
  dm: number | null; // directional move: +1 / -1
  range: number | null; // High - Low
  clv: number | null; // close location value: -1 / 0 / 1
  gap: number | null; // Open(t) - Close(t-1)
  gapDirection: number | null; // -1 / 0 / 1
  tr: number | null; // true range
}

/** Whether the underlying series reflects dividends or not. Documented, never assumed. */
export type ReturnBasis = "price-return" | "total-return";

/** Static metadata describing one selectable index/asset. */
export interface IndexMeta {
  id: string; // slug, e.g. "nifty50"
  name: string; // display name, e.g. "NIFTY 50"
  ticker: string; // source ticker, e.g. "^NSEI"
  currency: string; // e.g. "INR"
  returnBasis: ReturnBasis;
  dataFile: string; // JSON path under /data
  startDate: string; // first available date, ISO
  lastUpdated: string; // ISO date the file was generated
}

/** Registry of all indices the dashboard can display. */
export interface IndexRegistry {
  indices: IndexMeta[];
}

/** A supported investment horizon, expressed in intuitive + trading-day terms. */
export interface HorizonDef {
  id: string; // e.g. "1Y"
  label: string; // e.g. "1 Year"
  tradingDays: number; // e.g. 252
  years: number; // approximate calendar years, for CAGR math (H = tradingDays/252)
}

/** One historical rolling investment window: entry date -> exit date, H trading days apart. */
export interface RollingWindow {
  startDate: string;
  endDate: string;
  startIndex: number; // row index of the start bar
  endIndex: number; // row index of the end bar
  startPrice: number;
  endPrice: number;
  cumulativeReturn: number; // fraction, e.g. 0.10 for +10%
  cagr: number | null; // annualized, null when years < ~0.08 (horizons under ~1 month)
  maxDrawdown: number; // fraction, negative or zero, e.g. -0.25 for -25%
  peakDate: string; // date of the running peak used to compute maxDrawdown
  troughDate: string; // date of the trough used to compute maxDrawdown
}

/** Summary statistics for the return distribution of Index x Horizon. */
export interface ReturnDistributionStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  probabilityPositive: number; // fraction 0..1
  probabilityNegative: number;
  probabilityAbove5: number | null; // null if threshold doesn't make sense for horizon
  probabilityAbove10: number | null;
  probabilityAbove20: number | null;
}

/** Summary statistics for the max-drawdown distribution of Index x Horizon. */
export interface DrawdownDistributionStats {
  count: number;
  meanMaxDrawdown: number;
  medianMaxDrawdown: number;
  worstMaxDrawdown: number;
  bestMaxDrawdown: number; // smallest-magnitude drawdown observed (closest to 0)
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}

/** Full analytical bundle for one Index x Horizon combination. */
export interface HorizonAnalysis {
  indexId: string;
  horizonId: string;
  windows: RollingWindow[];
  returnStats: ReturnDistributionStats;
  drawdownStats: DrawdownDistributionStats;
}

export type ReturnMode = "cumulative" | "annualized";
