import type { HorizonDef } from "../types";

/**
 * Centralized trading-day mapping for every supported investment horizon.
 *
 * This is the ONLY place these numbers are defined. Everything else
 * (calculations, charts, UI labels) must import from here rather than
 * hard-coding trading-day counts.
 *
 * Convention: ~252 trading days per calendar year (standard convention for
 * NSE/US equity markets alike), so:
 *   1M  ≈ 21   (252 / 12)
 *   3M  ≈ 63   (252 / 4)
 *   6M  ≈ 126  (252 / 2)
 *   1Y  ≈ 252
 *   2Y  ≈ 504
 *   3Y  ≈ 756
 *   5Y  ≈ 1260
 *   7Y  ≈ 1764
 *   10Y ≈ 2520
 */
export const TRADING_DAYS_PER_YEAR = 252;

export const HORIZONS: HorizonDef[] = [
  { id: "1M", label: "1 Month", tradingDays: 21, years: 21 / TRADING_DAYS_PER_YEAR },
  { id: "3M", label: "3 Months", tradingDays: 63, years: 63 / TRADING_DAYS_PER_YEAR },
  { id: "6M", label: "6 Months", tradingDays: 126, years: 126 / TRADING_DAYS_PER_YEAR },
  { id: "1Y", label: "1 Year", tradingDays: 252, years: 1 },
  { id: "2Y", label: "2 Years", tradingDays: 504, years: 2 },
  { id: "3Y", label: "3 Years", tradingDays: 756, years: 3 },
  { id: "5Y", label: "5 Years", tradingDays: 1260, years: 5 },
  { id: "7Y", label: "7 Years", tradingDays: 1764, years: 7 },
  { id: "10Y", label: "10 Years", tradingDays: 2520, years: 10 },
];

export const DEFAULT_HORIZON_ID = "5Y";

export function getHorizon(id: string): HorizonDef {
  const h = HORIZONS.find((h) => h.id === id);
  if (!h) throw new Error(`Unknown horizon id: ${id}`);
  return h;
}

/**
 * A horizon "makes sense" for a probability-above-X threshold only when the
 * threshold is a plausible outcome for that timeframe. We suppress e.g.
 * "probability of return > 20%" for a 1-month horizon, where >20% moves are
 * so rare the statistic is more noise than signal, and suppress it going the
 * other way for very long horizons where it's almost always true and not
 * informative on its own (still shown in the stats table, just deprioritized
 * in the headline probability call-outs).
 */
export function relevantThresholds(horizon: HorizonDef): number[] {
  const thresholds: number[] = [];
  if (horizon.years <= 0.3) thresholds.push(5);
  else if (horizon.years <= 1) thresholds.push(5, 10);
  else if (horizon.years <= 3) thresholds.push(5, 10, 20);
  else thresholds.push(10, 20);
  return thresholds;
}
