import { describe, expect, it } from "vitest";
import {
  buildPercentileLookups,
  conditionValue,
  matchesConditions,
  findConditionOccurrences,
  computeForwardReturnStats,
  buildEventStudy,
  type ConditionRule,
} from "../calculations/conditionExplorer";
import type { DailyBar } from "../types";

function makeBar(date: string, close: number, overrides: Partial<DailyBar> = {}): DailyBar {
  return {
    date,
    open: close,
    high: close * 1.02,
    low: close * 0.98,
    close,
    volume: 100000,
    dma5: close,
    dma10: close,
    dma20: close,
    dma30: close,
    dma50: close,
    dma100: close,
    dma200: close,
    change: 0,
    returnPct: 0,
    dm: 0,
    range: close * 0.04,
    clv: 0,
    gap: 0,
    gapDirection: 0,
    tr: close * 0.04,
    ...overrides,
  };
}

describe("conditionValue and percentile lookups", () => {
  it("computes percentile lookups correctly", () => {
    const bars = [
      makeBar("2020-01-01", 100, { volume: 100, range: 2 }),
      makeBar("2020-01-02", 105, { volume: 200, range: 4 }),
      makeBar("2020-01-03", 110, { volume: 300, range: 6 }),
    ];
    const lookups = buildPercentileLookups(bars);
    expect(lookups.volume.get(100)).toBe(0);
    expect(lookups.volume.get(200)).toBe(50);
    expect(lookups.volume.get(300)).toBe(100);

    expect(conditionValue(bars[1], "volumePercentile", lookups)).toBe(50);
    expect(conditionValue(bars[1], "close", lookups)).toBe(105);
  });
});

describe("matchesConditions", () => {
  const bars = [
    makeBar("2020-01-01", 100, { returnPct: -2.5, dma20: 105, clv: -1, volume: 500000 }),
    makeBar("2020-01-02", 98, { returnPct: -0.5, dma20: 104, clv: 0, volume: 200000 }),
  ];
  const lookups = buildPercentileLookups(bars);

  it("filters bars based on multiple rules", () => {
    const rules: ConditionRule[] = [
      { id: "1", variable: "returnPct", operator: "<", value: -2.0 },
      { id: "2", variable: "closeOverDma20", operator: "<", value: 1.0 },
    ];
    expect(matchesConditions(bars[0], rules, lookups)).toBe(true);
    expect(matchesConditions(bars[1], rules, lookups)).toBe(false);
  });
});

describe("findConditionOccurrences & forward return stats", () => {
  it("calculates forward returns correctly", () => {
    const bars: DailyBar[] = Array.from({ length: 70 }, (_, i) => {
      const price = 100 * Math.pow(1.001, i);
      const dayStr = String(i + 1).padStart(2, "0");
      return makeBar(`2020-01-${dayStr}`, price, {
        returnPct: i === 0 ? -3.0 : 0.1,
      });
    });

    const rules: ConditionRule[] = [
      { id: "r1", variable: "returnPct", operator: "<", value: -2.0 },
    ];

    const occurrences = findConditionOccurrences(bars, rules);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].index).toBe(0);

    const ret1 = occurrences[0].forwardReturns[1];
    expect(ret1).toBeCloseTo(0.001, 4);

    const stats1 = computeForwardReturnStats(occurrences, 1);
    expect(stats1.count).toBe(1);
    expect(stats1.probabilityPositive).toBe(1);
  });
});

describe("buildEventStudy", () => {
  it("indexes day 0 to 100 and tracks path", () => {
    const bars: DailyBar[] = Array.from({ length: 80 }, (_, i) => {
      const dayStr = String(i + 1).padStart(2, "0");
      return makeBar(`2020-01-${dayStr}`, 100 + i, {
        returnPct: i === 0 ? -3.0 : 1.0,
      });
    });

    const rules: ConditionRule[] = [
      { id: "r1", variable: "returnPct", operator: "<", value: -2.0 },
    ];

    const occurrences = findConditionOccurrences(bars, rules);
    const study = buildEventStudy(bars, occurrences, 10);
    expect(study[0].median).toBe(100);
    expect(study[1].median).toBeCloseTo(101, 1);
  });
});
