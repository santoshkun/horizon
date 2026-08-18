import { useMemo } from "react";
import type { DailyBar, HorizonAnalysis } from "../types";
import { buildRollingWindows } from "../calculations/rollingReturns";
import { computeDrawdownStats, computeReturnStats } from "../calculations/statistics";
import { getHorizon } from "../calculations/horizons";

// Cache of rolling windows per (indexId, horizonId) — the expensive O(n*H)
// pass over the bar array. Distribution stats are cheap by comparison and
// recomputed on demand (e.g. when toggling cumulative vs. annualized).
const windowCache = new Map<string, ReturnType<typeof buildRollingWindows>>();

export function useHorizonAnalysis(
  indexId: string | null,
  bars: DailyBar[] | null,
  horizonId: string,
  useCagr: boolean,
): HorizonAnalysis | null {
  return useMemo(() => {
    if (!indexId || !bars || bars.length === 0) return null;

    const horizon = getHorizon(horizonId);
    const cacheKey = `${indexId}:${horizonId}`;
    let windows = windowCache.get(cacheKey);
    if (!windows) {
      windows = buildRollingWindows(bars, horizon);
      windowCache.set(cacheKey, windows);
    }

    return {
      indexId,
      horizonId,
      windows,
      returnStats: computeReturnStats(windows, horizon, useCagr),
      drawdownStats: computeDrawdownStats(windows),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexId, bars, horizonId, useCagr]);
}
