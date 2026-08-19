import type { DailyBar } from "../types";
import { mean, median, percentile, stdDev } from "./statistics";

export type ConditionVariable =
  | "close"
  | "closeOverDma5"
  | "closeOverDma10"
  | "closeOverDma20"
  | "closeOverDma30"
  | "closeOverDma50"
  | "closeOverDma100"
  | "closeOverDma200"
  | "returnPct"
  | "change"
  | "volume"
  | "volumePercentile"
  | "range"
  | "rangePercentile"
  | "tr"
  | "trPercentile"
  | "clv"
  | "gap"
  | "gapDirection";

export type ConditionOperator = ">" | ">=" | "<" | "<=" | "=" | "!=";

export interface ConditionRule {
  id: string;
  variable: ConditionVariable;
  operator: ConditionOperator;
  value: number;
}

export interface ConditionOccurrence {
  index: number;
  bar: DailyBar;
  forwardReturns: Record<number, number | null>;
}

export interface ForwardReturnStats {
  horizon: number;
  count: number;
  mean: number;
  median: number;
  probabilityPositive: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  stdDev: number;
}

export interface EventStudyPoint {
  day: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
}

export const FORWARD_HORIZONS = [1, 5, 20, 60] as const;
export const EVENT_STUDY_DAYS = 20;

export const CONDITION_VARIABLES: { key: ConditionVariable; label: string; hint: string }[] = [
  { key: "close", label: "Close", hint: "Index closing price" },
  { key: "closeOverDma5", label: "Close / DMA_5", hint: "Close divided by 5-day average" },
  { key: "closeOverDma10", label: "Close / DMA_10", hint: "Close divided by 10-day average" },
  { key: "closeOverDma20", label: "Close / DMA_20", hint: "Close divided by 20-day average" },
  { key: "closeOverDma30", label: "Close / DMA_30", hint: "Close divided by 30-day average" },
  { key: "closeOverDma50", label: "Close / DMA_50", hint: "Close divided by 50-day average" },
  { key: "closeOverDma100", label: "Close / DMA_100", hint: "Close divided by 100-day average" },
  { key: "closeOverDma200", label: "Close / DMA_200", hint: "Close divided by 200-day average" },
  { key: "returnPct", label: "Return", hint: "Daily return, as decimal" },
  { key: "change", label: "Change", hint: "Close minus previous close" },
  { key: "volume", label: "Volume", hint: "Raw volume" },
  { key: "volumePercentile", label: "Volume percentile", hint: "0 to 100 rank in history" },
  { key: "range", label: "Range", hint: "High minus low" },
  { key: "rangePercentile", label: "Range percentile", hint: "0 to 100 rank in history" },
  { key: "tr", label: "TR", hint: "True range" },
  { key: "trPercentile", label: "TR percentile", hint: "0 to 100 rank in history" },
  { key: "clv", label: "CLV", hint: "Close location value" },
  { key: "gap", label: "Gap", hint: "Open minus previous close" },
  { key: "gapDirection", label: "Gap direction", hint: "-1 down, 0 flat, 1 up" },
];

interface PercentileLookups {
  volume: Map<number, number>;
  range: Map<number, number>;
  tr: Map<number, number>;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function percentileRanks(values: number[]): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const ranks = new Map<number, number>();
  if (sorted.length === 0) return ranks;

  for (const value of values) {
    if (ranks.has(value)) continue;
    let lastIndex = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i] <= value) {
        lastIndex = i;
        break;
      }
    }
    ranks.set(value, sorted.length === 1 ? 100 : (lastIndex / (sorted.length - 1)) * 100);
  }
  return ranks;
}

export function buildPercentileLookups(bars: DailyBar[]): PercentileLookups {
  return {
    volume: percentileRanks(bars.map((b) => b.volume).filter(isFiniteNumber)),
    range: percentileRanks(bars.map((b) => b.range).filter(isFiniteNumber)),
    tr: percentileRanks(bars.map((b) => b.tr).filter(isFiniteNumber)),
  };
}

export function conditionValue(bar: DailyBar, variable: ConditionVariable, lookups: PercentileLookups): number | null {
  switch (variable) {
    case "close":
      return bar.close;
    case "closeOverDma5":
      return isFiniteNumber(bar.dma5) && bar.dma5 !== 0 ? bar.close / bar.dma5 : null;
    case "closeOverDma10":
      return isFiniteNumber(bar.dma10) && bar.dma10 !== 0 ? bar.close / bar.dma10 : null;
    case "closeOverDma20":
      return isFiniteNumber(bar.dma20) && bar.dma20 !== 0 ? bar.close / bar.dma20 : null;
    case "closeOverDma30":
      return isFiniteNumber(bar.dma30) && bar.dma30 !== 0 ? bar.close / bar.dma30 : null;
    case "closeOverDma50":
      return isFiniteNumber(bar.dma50) && bar.dma50 !== 0 ? bar.close / bar.dma50 : null;
    case "closeOverDma100":
      return isFiniteNumber(bar.dma100) && bar.dma100 !== 0 ? bar.close / bar.dma100 : null;
    case "closeOverDma200":
      return isFiniteNumber(bar.dma200) && bar.dma200 !== 0 ? bar.close / bar.dma200 : null;
    case "returnPct":
      return bar.returnPct;
    case "change":
      return bar.change;
    case "volume":
      return bar.volume;
    case "volumePercentile":
      return lookups.volume.get(bar.volume) ?? null;
    case "range":
      return bar.range;
    case "rangePercentile":
      return isFiniteNumber(bar.range) ? lookups.range.get(bar.range) ?? null : null;
    case "tr":
      return bar.tr;
    case "trPercentile":
      return isFiniteNumber(bar.tr) ? lookups.tr.get(bar.tr) ?? null : null;
    case "clv":
      return bar.clv;
    case "gap":
      return bar.gap;
    case "gapDirection":
      return bar.gapDirection;
  }
}

function compare(actual: number, operator: ConditionOperator, expected: number): boolean {
  switch (operator) {
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    case "=":
      return actual === expected;
    case "!=":
      return actual !== expected;
  }
}

export function matchesConditions(bar: DailyBar, conditions: ConditionRule[], lookups: PercentileLookups): boolean {
  return conditions.every((condition) => {
    const actual = conditionValue(bar, condition.variable, lookups);
    return isFiniteNumber(actual) && compare(actual, condition.operator, condition.value);
  });
}

export function findConditionOccurrences(bars: DailyBar[], conditions: ConditionRule[]): ConditionOccurrence[] {
  const lookups = buildPercentileLookups(bars);
  const maxForwardHorizon = Math.max(...FORWARD_HORIZONS);

  return bars
    .map((bar, index) => {
      if (index + maxForwardHorizon >= bars.length || !matchesConditions(bar, conditions, lookups)) return null;
      const forwardReturns = Object.fromEntries(
        FORWARD_HORIZONS.map((horizon) => {
          const future = bars[index + horizon];
          const value = future && bar.close > 0 ? future.close / bar.close - 1 : null;
          return [horizon, isFiniteNumber(value) ? value : null];
        }),
      ) as Record<number, number | null>;
      return { index, bar, forwardReturns };
    })
    .filter((occurrence): occurrence is ConditionOccurrence => occurrence !== null);
}

export function computeForwardReturnStats(occurrences: ConditionOccurrence[], horizon: number): ForwardReturnStats {
  const values = occurrences
    .map((occurrence) => occurrence.forwardReturns[horizon])
    .filter(isFiniteNumber)
    .sort((a, b) => a - b);

  return {
    horizon,
    count: values.length,
    mean: mean(values),
    median: median(values),
    probabilityPositive: values.length ? values.filter((value) => value > 0).length / values.length : NaN,
    p10: percentile(values, 10),
    p25: percentile(values, 25),
    p75: percentile(values, 75),
    p90: percentile(values, 90),
    min: values[0] ?? NaN,
    max: values[values.length - 1] ?? NaN,
    stdDev: stdDev(values),
  };
}

export function buildEventStudy(bars: DailyBar[], occurrences: ConditionOccurrence[], days = EVENT_STUDY_DAYS): EventStudyPoint[] {
  return Array.from({ length: days + 1 }, (_, day) => {
    const values = occurrences
      .map((occurrence) => {
        const start = bars[occurrence.index];
        const current = bars[occurrence.index + day];
        return start && current && start.close > 0 ? (current.close / start.close) * 100 : null;
      })
      .filter(isFiniteNumber)
      .sort((a, b) => a - b);

    return {
      day,
      median: values.length ? median(values) : null,
      p25: values.length ? percentile(values, 25) : null,
      p75: values.length ? percentile(values, 75) : null,
    };
  });
}
