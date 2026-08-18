import type {
  DrawdownDistributionStats,
  HorizonDef,
  ReturnDistributionStats,
  RollingWindow,
} from "../types";
import { relevantThresholds } from "./horizons";

/** Linear-interpolation percentile (matches numpy/pandas default "linear" method). */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const rank = (p / 100) * (sortedAsc.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedAsc[lower];
  const weight = rank - lower;
  return sortedAsc[lower] * (1 - weight) + sortedAsc[upper] * weight;
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(sortedAsc: number[]): number {
  return percentile(sortedAsc, 50);
}

/** Sample standard deviation (n-1 denominator), matching pandas' default. */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return Math.sqrt(sumSq / (values.length - 1));
}

function probAbove(sortedAsc: number[], threshold: number): number {
  if (sortedAsc.length === 0) return NaN;
  const countAbove = sortedAsc.filter((v) => v > threshold).length;
  return countAbove / sortedAsc.length;
}

/**
 * Return-distribution statistics for one Index x Horizon.
 * `useCagr` selects whether the distribution is built from cumulative
 * window returns or annualized CAGR (windows without a CAGR, i.e. very
 * short horizons, are dropped from the CAGR distribution).
 */
export function computeReturnStats(
  windows: RollingWindow[],
  horizon: HorizonDef,
  useCagr: boolean,
): ReturnDistributionStats {
  const raw = useCagr
    ? windows.map((w) => w.cagr).filter((v): v is number => v !== null)
    : windows.map((w) => w.cumulativeReturn);
  const sorted = [...raw].sort((a, b) => a - b);
  const thresholds = relevantThresholds(horizon);

  return {
    count: sorted.length,
    mean: mean(sorted),
    median: median(sorted),
    stdDev: stdDev(sorted),
    min: sorted[0] ?? NaN,
    max: sorted[sorted.length - 1] ?? NaN,
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    probabilityPositive: probAbove(sorted, 0),
    probabilityNegative: sorted.length ? sorted.filter((v) => v < 0).length / sorted.length : NaN,
    probabilityAbove5: thresholds.includes(5) ? probAbove(sorted, 0.05) : null,
    probabilityAbove10: thresholds.includes(10) ? probAbove(sorted, 0.1) : null,
    probabilityAbove20: thresholds.includes(20) ? probAbove(sorted, 0.2) : null,
  };
}

export function computeDrawdownStats(windows: RollingWindow[]): DrawdownDistributionStats {
  const raw = windows.map((w) => w.maxDrawdown);
  const sorted = [...raw].sort((a, b) => a - b); // most negative first

  return {
    count: sorted.length,
    meanMaxDrawdown: mean(sorted),
    medianMaxDrawdown: median(sorted),
    worstMaxDrawdown: sorted[0] ?? NaN,
    bestMaxDrawdown: sorted[sorted.length - 1] ?? NaN,
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
  };
}
