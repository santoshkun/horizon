import type { DailyBar, HorizonDef, RollingWindow } from "../types";

/**
 * Rolling Return(t, H) = Close(t + H) / Close(t) - 1
 *
 * We use TRADING-DAY horizons (index offsets into the sorted daily bar
 * array), not calendar-day approximations, per the project spec. This means
 * a "1 Year" window is exactly 252 trading days ahead of the start bar,
 * regardless of how many calendar days that spans (holidays, etc.).
 *
 * Bars with a null/zero/invalid close are skipped as valid START or END
 * points for a window (see isValidBar below), which also naturally handles
 * gaps and missing dates: since we index by array position rather than
 * calendar date, gaps simply don't produce artificial windows.
 */

function isValidBar(bar: DailyBar | undefined): bar is DailyBar {
  return !!bar && Number.isFinite(bar.close) && bar.close > 0;
}

/** CAGR = (End/Start)^(1/years) - 1. Returns null when years is too small to annualize meaningfully. */
export function computeCagr(startPrice: number, endPrice: number, years: number): number | null {
  if (years < 1 / 12) return null; // don't annualize sub-monthly windows
  if (startPrice <= 0) return null;
  return Math.pow(endPrice / startPrice, 1 / years) - 1;
}

/**
 * Maximum drawdown *inside* a single rolling window (not the full-history
 * max drawdown). Running peak resets at the start of the window.
 *
 * Drawdown(t) = Price(t) / RunningPeak(t) - 1
 *
 * Returns the most negative (or zero) drawdown value found in the window,
 * plus the peak/trough dates that produced it.
 */
export function computeWindowMaxDrawdown(
  bars: DailyBar[],
  startIdx: number,
  endIdx: number,
): { maxDrawdown: number; peakDate: string; troughDate: string } {
  let runningPeak = bars[startIdx].close;
  let runningPeakDate = bars[startIdx].date;
  let worstDrawdown = 0;
  let worstPeakDate = bars[startIdx].date;
  let worstTroughDate = bars[startIdx].date;

  for (let i = startIdx; i <= endIdx; i++) {
    const bar = bars[i];
    if (!isValidBar(bar)) continue;
    if (bar.close > runningPeak) {
      runningPeak = bar.close;
      runningPeakDate = bar.date;
    }
    const dd = bar.close / runningPeak - 1;
    if (dd < worstDrawdown) {
      worstDrawdown = dd;
      worstPeakDate = runningPeakDate;
      worstTroughDate = bar.date;
    }
  }

  return { maxDrawdown: worstDrawdown, peakDate: worstPeakDate, troughDate: worstTroughDate };
}

/**
 * Build every historical rolling window of length H trading days for a
 * given bar series. One window per valid start index i, spanning
 * [i, i + H]. Requires at least H+1 valid bars from i onward.
 */
export function buildRollingWindows(bars: DailyBar[], horizon: HorizonDef): RollingWindow[] {
  const H = horizon.tradingDays;
  const windows: RollingWindow[] = [];

  if (bars.length <= H) return windows; // insufficient history for this horizon

  for (let i = 0; i <= bars.length - 1 - H; i++) {
    const startBar = bars[i];
    const endBar = bars[i + H];
    if (!isValidBar(startBar) || !isValidBar(endBar)) continue;

    const cumulativeReturn = endBar.close / startBar.close - 1;
    const cagr = computeCagr(startBar.close, endBar.close, horizon.years);
    const { maxDrawdown, peakDate, troughDate } = computeWindowMaxDrawdown(bars, i, i + H);

    windows.push({
      startDate: startBar.date,
      endDate: endBar.date,
      startIndex: i,
      endIndex: i + H,
      startPrice: startBar.close,
      endPrice: endBar.close,
      cumulativeReturn,
      cagr,
      maxDrawdown,
      peakDate,
      troughDate,
    });
  }

  return windows;
}
