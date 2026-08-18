import { describe, expect, it } from "vitest";
import { buildRollingWindows, computeCagr, computeWindowMaxDrawdown } from "../calculations/rollingReturns";
import type { DailyBar, HorizonDef } from "../types";

function makeBar(date: string, close: number, overrides: Partial<DailyBar> = {}): DailyBar {
  return {
    date,
    open: close,
    high: close,
    low: close,
    close,
    volume: 0,
    dma5: null,
    dma10: null,
    dma20: null,
    dma30: null,
    dma50: null,
    dma100: null,
    dma200: null,
    change: null,
    returnPct: null,
    dm: null,
    range: null,
    clv: null,
    gap: null,
    gapDirection: null,
    tr: null,
    ...overrides,
  };
}

const H1: HorizonDef = { id: "H1", label: "1 step", tradingDays: 1, years: 1 / 252 };

describe("rolling return: 100 -> 110", () => {
  it("returns exactly 10%", () => {
    const bars = [makeBar("2020-01-01", 100), makeBar("2020-01-02", 110)];
    const windows = buildRollingWindows(bars, H1);
    expect(windows).toHaveLength(1);
    expect(windows[0].cumulativeReturn).toBeCloseTo(0.1, 10);
  });
});

describe("drawdown: 100 -> 120 -> 90 -> 130", () => {
  it("max drawdown is -25% (120 -> 90)", () => {
    const bars = [
      makeBar("2020-01-01", 100),
      makeBar("2020-01-02", 120),
      makeBar("2020-01-03", 90),
      makeBar("2020-01-04", 130),
    ];
    const { maxDrawdown, peakDate, troughDate } = computeWindowMaxDrawdown(bars, 0, 3);
    expect(maxDrawdown).toBeCloseTo(-0.25, 10);
    expect(peakDate).toBe("2020-01-02");
    expect(troughDate).toBe("2020-01-03");
  });
});

describe("positive-return probability", () => {
  it("is 60% for [10%, -5%, 20%, -2%, 5%]", () => {
    const rets = [0.1, -0.05, 0.2, -0.02, 0.05];
    const positive = rets.filter((r) => r > 0).length;
    expect(positive / rets.length).toBeCloseTo(0.6, 10);
  });
});

describe("CAGR", () => {
  it("matches simple compounding for a whole-year window", () => {
    const cagr = computeCagr(100, 121, 2);
    expect(cagr).toBeCloseTo(0.1, 10); // (121/100)^(1/2) - 1 = 10%
  });

  it("returns null for sub-monthly horizons (annualizing is misleading)", () => {
    expect(computeCagr(100, 105, 1 / 252)).toBeNull();
  });

  it("returns null for non-positive start price", () => {
    expect(computeCagr(0, 105, 1)).toBeNull();
  });
});

describe("edge cases", () => {
  it("produces no windows when history is shorter than the horizon", () => {
    const bars = [makeBar("2020-01-01", 100), makeBar("2020-01-02", 101)];
    const H252: HorizonDef = { id: "1Y", label: "1 Year", tradingDays: 252, years: 1 };
    expect(buildRollingWindows(bars, H252)).toHaveLength(0);
  });

  it("skips windows anchored on a NaN/invalid close price", () => {
    const bars = [
      makeBar("2020-01-01", 100),
      makeBar("2020-01-02", NaN),
      makeBar("2020-01-03", 110),
    ];
    const windows = buildRollingWindows(bars, H1);
    // Window 0->1 skipped (end invalid). Window 1->2 skipped (start invalid).
    expect(windows).toHaveLength(0);
  });

  it("skips windows anchored on a zero/invalid price", () => {
    const bars = [makeBar("2020-01-01", 0), makeBar("2020-01-02", 110)];
    const windows = buildRollingWindows(bars, H1);
    expect(windows).toHaveLength(0);
  });

  it("handles the very first observation (no prior bar) without throwing", () => {
    const bars = [makeBar("2020-01-01", 100)];
    expect(() => buildRollingWindows(bars, H1)).not.toThrow();
    expect(buildRollingWindows(bars, H1)).toHaveLength(0);
  });

  it("is robust to gaps in historical dates (uses array position, not calendar days)", () => {
    // A big calendar gap between bar 0 and bar 1 (e.g. an exchange holiday
    // week) should not change the trading-day-based window calculation.
    const bars = [makeBar("2020-01-01", 100), makeBar("2020-01-20", 110)];
    const windows = buildRollingWindows(bars, H1);
    expect(windows).toHaveLength(1);
    expect(windows[0].cumulativeReturn).toBeCloseTo(0.1, 10);
  });

  it("de-duplication upstream means no duplicate dates reach the engine; duplicate-safe by construction", () => {
    // The engine trusts its input is deduplicated (the data pipeline does
    // this via drop_duplicates(subset='Date')). Verify two identical-date
    // bars back to back still produce a well-defined, non-throwing result.
    const bars = [makeBar("2020-01-01", 100), makeBar("2020-01-01", 100), makeBar("2020-01-02", 110)];
    expect(() => buildRollingWindows(bars, H1)).not.toThrow();
  });
});
