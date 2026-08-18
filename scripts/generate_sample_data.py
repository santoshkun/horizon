"""
Generates a SYNTHETIC daily OHLCV series standing in for NIFTY 50, so the
dashboard has real data to render out of the box.

Why this exists: this sandbox has no network route to Yahoo Finance, so
`update_data.py` (the real pipeline) cannot be executed here. Rather than
ship a dashboard with an empty data directory, this script builds a
plausible daily series calibrated to two REAL anchor points taken directly
from the attached notebook's own printed output:

  - 2007-09-17 close: 4494.649902  (notebook df.head() output)
  - 2026-07-29 close: 24250.199219 (notebook cell-2 stdout tail)

and a regime-switching random walk in between (including 2008-09-like and
2020-03-like crash regimes) so the drawdown/rolling-return machinery has
realistic structure to analyze. Every value between those two anchors is
FABRICATED, not real market history — the dashboard labels this clearly
(see IndexMeta.lastUpdated / a "sample data" banner) and the whole point of
`update_data.py` is to replace this file with a real fetch once it's run
somewhere with network access to Yahoo Finance.

This script deliberately reuses the real pipeline functions
(calculate_moving_averages, add_derived_fields, export_json) from
update_data.py, so the JSON this produces validates that code path too.
"""

import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from update_data import MA_PERIODS, add_derived_fields, export_json  # noqa: E402

RAW_DIR = os.path.join(os.path.dirname(__file__), "data_raw")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")

START_DATE = "2007-09-17"
END_DATE = "2026-07-29"
START_CLOSE = 4494.649902  # real, from notebook
END_CLOSE = 24250.199219  # real, from notebook

rng = np.random.default_rng(seed=20070917)


def build_regime_multipliers(n: int) -> np.ndarray:
    """Daily log-return drift/vol multipliers: 1.0 = calm bull, spikes = crash regimes."""
    vol_mult = np.ones(n)
    drift_mult = np.ones(n)

    def apply_window(start_frac, end_frac, vol_m, drift_m):
        s, e = int(n * start_frac), int(n * end_frac)
        vol_mult[s:e] = vol_m
        drift_mult[s:e] = drift_m

    # 2008 Global Financial Crisis-like drawdown (~first 5% -> ~7% of history)
    apply_window(0.045, 0.075, 3.2, -14.0)
    # 2011 European debt-crisis-like wobble
    apply_window(0.16, 0.19, 1.8, -3.0)
    # 2013 taper-tantrum-like wobble
    apply_window(0.24, 0.26, 1.6, -2.0)
    # 2015-16 slowdown-like dip
    apply_window(0.31, 0.34, 1.5, -2.0)
    # 2020 COVID crash-like shock (sharp, short)
    apply_window(0.585, 0.60, 4.5, -20.0)
    # 2022 rate-hike-cycle-like drawdown
    apply_window(0.72, 0.75, 1.8, -3.0)

    return drift_mult, vol_mult


def generate_close_series(n: int) -> np.ndarray:
    base_daily_drift = 0.00035  # ~9% annualized before regime adjustments
    base_daily_vol = 0.011  # ~17.5% annualized

    drift_mult, vol_mult = build_regime_multipliers(n)
    daily_drift = base_daily_drift * drift_mult
    daily_vol = base_daily_vol * vol_mult

    shocks = rng.standard_t(df=5, size=n) * daily_vol  # fat tails vs pure normal
    log_returns = daily_drift + shocks

    log_prices = np.log(START_CLOSE) + np.cumsum(log_returns)
    # Rescale so the path lands exactly on the real END_CLOSE anchor, distributing
    # the correction proportionally across time (keeps early history shape intact).
    target_log_end = np.log(END_CLOSE)
    actual_log_end = log_prices[-1]
    correction = np.linspace(0, target_log_end - actual_log_end, n)
    log_prices = log_prices + correction

    return np.exp(log_prices)


def build_ohlcv(dates: pd.DatetimeIndex) -> pd.DataFrame:
    n = len(dates)
    close = generate_close_series(n)
    close[0] = START_CLOSE
    close[-1] = END_CLOSE

    prev_close = np.roll(close, 1)
    prev_close[0] = START_CLOSE

    intraday_vol = np.abs(rng.standard_t(df=5, size=n)) * 0.006 + 0.002
    open_ = prev_close * (1 + rng.normal(0, 0.002, n))
    high = np.maximum(open_, close) * (1 + intraday_vol)
    low = np.minimum(open_, close) * (1 - intraday_vol)
    volume = rng.integers(150_000, 480_000, n)

    df = pd.DataFrame(
        {
            "Date": dates,
            "Open": open_,
            "High": high,
            "Low": low,
            "Close": close,
            "Volume": volume,
        }
    )
    df.loc[0, ["Open", "High", "Low"]] = START_CLOSE
    return df


def calculate_moving_averages_inline(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for period in MA_PERIODS:
        df[f"DMA_{period}"] = df["Close"].rolling(window=period).mean()
    return df


def main():
    dates = pd.bdate_range(START_DATE, END_DATE)  # business days, sample-only approximation of NSE trading days
    df = build_ohlcv(dates)
    df = calculate_moving_averages_inline(df)
    df = add_derived_fields(df)

    os.makedirs(RAW_DIR, exist_ok=True)
    xlsx_path = os.path.join(RAW_DIR, "nifty50_daily_SAMPLE.xlsx")
    df.to_excel(xlsx_path, index=False)

    export_json(df, os.path.join(OUT_DIR, "nifty50.json"))

    registry = {
        "indices": [
            {
                "id": "nifty50",
                "name": "NIFTY 50 (SAMPLE DATA)",
                "ticker": "^NSEI",
                "currency": "INR",
                "returnBasis": "price-return",
                "dataFile": "nifty50.json",
                "startDate": df["Date"].min().strftime("%Y-%m-%d"),
                "lastUpdated": "SAMPLE",
            }
        ]
    }
    import json

    with open(os.path.join(OUT_DIR, "index-registry.json"), "w") as f:
        json.dump(registry, f, indent=2)

    print(f"Generated {len(df)} sample bars: {df['Date'].min().date()} -> {df['Date'].max().date()}")
    print(f"Start close {df['Close'].iloc[0]:.2f}, end close {df['Close'].iloc[-1]:.2f}")


if __name__ == "__main__":
    main()
