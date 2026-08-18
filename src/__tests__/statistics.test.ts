import { describe, expect, it } from "vitest";
import { computeDrawdownStats, computeReturnStats, mean, percentile, stdDev } from "../calculations/statistics";
import { getHorizon } from "../calculations/horizons";
import type { RollingWindow } from "../types";

function makeWindow(cumulativeReturn: number, maxDrawdown: number, cagr: number | null = null): RollingWindow {
  return {
    startDate: "2020-01-01",
    endDate: "2021-01-01",
    startIndex: 0,
    endIndex: 252,
    startPrice: 100,
    endPrice: 100 * (1 + cumulativeReturn),
    cumulativeReturn,
    cagr,
    maxDrawdown,
    peakDate: "2020-01-01",
    troughDate: "2020-06-01",
  };
}

describe("percentile", () => {
  it("matches linear-interpolation convention for a simple set", () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(percentile(sorted, 50)).toBe(3);
    expect(percentile(sorted, 0)).toBe(1);
    expect(percentile(sorted, 100)).toBe(5);
    expect(percentile(sorted, 25)).toBe(2);
  });
});

describe("mean / stdDev", () => {
  it("computes sample mean and sample std dev (n-1)", () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(mean(values)).toBeCloseTo(5, 10);
    expect(stdDev(values)).toBeCloseTo(2.13809, 4);
  });
});

describe("computeReturnStats", () => {
  const horizon = getHorizon("1Y");
  const windows = [
    makeWindow(0.1, -0.05),
    makeWindow(-0.05, -0.15),
    makeWindow(0.2, -0.02),
    makeWindow(-0.02, -0.08),
    makeWindow(0.05, -0.03),
  ];

  it("computes probability of positive/negative return", () => {
    const stats = computeReturnStats(windows, horizon, false);
    expect(stats.count).toBe(5);
    expect(stats.probabilityPositive).toBeCloseTo(0.6, 10);
    expect(stats.probabilityNegative).toBeCloseTo(0.4, 10);
  });

  it("only reports thresholds relevant to the horizon", () => {
    const stats = computeReturnStats(windows, horizon, false);
    // 1Y horizon -> thresholds [5, 10] per relevantThresholds()
    expect(stats.probabilityAbove5).not.toBeNull();
    expect(stats.probabilityAbove10).not.toBeNull();
    expect(stats.probabilityAbove20).toBeNull();
  });

  it("returns NaN-safe empty stats for zero windows", () => {
    const stats = computeReturnStats([], horizon, false);
    expect(stats.count).toBe(0);
    expect(Number.isNaN(stats.mean)).toBe(true);
  });
});

describe("computeDrawdownStats", () => {
  it("reports worst (most negative) and best (least negative) drawdown", () => {
    const windows = [makeWindow(0.1, -0.05), makeWindow(-0.05, -0.15), makeWindow(0.2, -0.02)];
    const stats = computeDrawdownStats(windows);
    expect(stats.worstMaxDrawdown).toBeCloseTo(-0.15, 10);
    expect(stats.bestMaxDrawdown).toBeCloseTo(-0.02, 10);
    expect(stats.meanMaxDrawdown).toBeLessThan(0); // always displayed as negative
  });
});
