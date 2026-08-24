"""
Data pipeline: Yahoo Finance -> incremental Excel cache -> derived fields ->
static JSON consumed by the React dashboard.

This is a generalization of the original notebook (combined.ipynb) to
support multiple indices without changing its methodology:

  - update_daily_data(): identical incremental-fetch logic to the notebook's
    `update_daily_data`, parameterized by index instead of hard-coded to
    nifty_daily.xlsx / ^NSEI.
  - calculate_moving_averages(): identical DMA_5/10/20/30/50/100/200 logic.
  - the change / return / DM / Range / CLV / Gap / Gap_Direction / TR block:
    copied verbatim from the notebook's third cell, just wrapped in a function.

Nothing about the existing formulas was altered. What's new is (a) looping
this over a registry of indices instead of one hard-coded ticker, and
(b) a final step that writes browser-ready JSON in the shape the frontend's
`DailyBar` type expects, plus an `index-registry.json` manifest.

Run with network access (this sandbox cannot reach Yahoo Finance):

    pip install -r scripts/requirements.txt
    python scripts/update_data.py
"""

import json
import os
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

try:
    import yfinance as yf
except ImportError:  # not needed for sample-data generation / unit-testing the derived-field logic
    yf = None

from indices import ACTIVE_INDEX_IDS, INDICES, IndexConfig

PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_DIR = os.path.join(PROJECT_DIR, "data_raw")
OUT_DIR = os.path.join(PROJECT_DIR, "public", "data")
MA_PERIODS = [5, 10, 20, 30, 50, 100, 200]


# ---------------------------------------------------------------------------
# Step 1: incremental fetch (same logic as the notebook's update_daily_data)
# ---------------------------------------------------------------------------
def update_daily_data(file_path: str, ticker: str, base_start: str):
    try:
        df_existing = pd.read_excel(file_path)
        df_existing["Date"] = pd.to_datetime(df_existing["Date"])
        print(f"📘 Loaded existing file: {file_path}")
    except FileNotFoundError:
        print(f"⚠️ File not found: {file_path}. Creating new file from scratch...")
        df_existing = pd.DataFrame()

    if not df_existing.empty:
        last_date = df_existing["Date"].max().date()
        start_date = last_date + timedelta(days=1)
        print(f"⏳ Last date in file: {last_date}")
    else:
        start_date = datetime.strptime(base_start, "%Y-%m-%d").date()

    today = datetime.now().date()

    if start_date > today:
        print("✅ Already up-to-date. No new data to fetch.")
        return

    if yf is None:
        raise RuntimeError("yfinance is not installed. Run `pip install -r scripts/requirements.txt`.")

    print(f"📡 Fetching data for {ticker} from {start_date} to {today}...")
    new_data = yf.Ticker(ticker).history(start=start_date, end=today + timedelta(days=1), interval="1d")

    if new_data.empty:
        print("⚠️ No new data available.")
        return

    new_data.index = new_data.index.tz_localize(None)
    new_data.reset_index(inplace=True)
    drop_cols = [c for c in ["Dividends", "Stock Splits"] if c in new_data.columns]
    new_data.drop(columns=drop_cols, inplace=True, errors="ignore")

    df_updated = pd.concat([df_existing, new_data], ignore_index=True)
    df_updated.drop_duplicates(subset="Date", keep="last", inplace=True)
    df_updated.sort_values(by="Date", inplace=True)

    df_updated.to_excel(file_path, index=False)
    print(f"✅ Updated data saved to {file_path}")
    print(f"📅 Last available date: {df_updated['Date'].max().date()}")


# ---------------------------------------------------------------------------
# Step 2: moving averages (same logic as the notebook's calculate_moving_averages)
# ---------------------------------------------------------------------------
def calculate_moving_averages(file_path: str, price_column: str = "Close") -> pd.DataFrame:
    df = pd.read_excel(file_path)
    if "Date" not in df.columns:
        raise KeyError("No 'Date' column found in Excel file.")
    df["Date"] = pd.to_datetime(df["Date"])
    df.sort_values(by="Date", inplace=True)

    if price_column not in df.columns:
        raise KeyError(f"'{price_column}' column not found. Available: {list(df.columns)}")

    for period in MA_PERIODS:
        df[f"DMA_{period}"] = df[price_column].rolling(window=period).mean()

    return df


# ---------------------------------------------------------------------------
# Step 3: derived fields (same logic as the notebook's third cell)
# ---------------------------------------------------------------------------
def add_derived_fields(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["change"] = df["Close"] - df["Close"].shift(1)
    df["return"] = (df["change"] / df["Close"].shift(1)) * 100

    df["DM"] = np.where(df["change"] > 0, 1, -1)
    df["Range"] = df["High"] - df["Low"]

    df["CLV"] = np.select(
        [
            df["Close"] >= (df["High"] - df["Range"] / 3),
            df["Close"] <= (df["Low"] + df["Range"] / 3),
        ],
        [1, -1],
        default=0,
    )

    df["Gap"] = df["Open"] - df["Close"].shift(1)
    df["Gap_Direction"] = np.where(df["Gap"] > 0, 1, np.where(df["Gap"] < 0, -1, 0))

    df["TR"] = np.maximum(
        df["High"] - df["Low"],
        np.maximum(
            (df["High"] - df["Close"].shift(1)).abs(),
            (df["Low"] - df["Close"].shift(1)).abs(),
        ),
    )
    return df


# ---------------------------------------------------------------------------
# Step 4: export to the JSON shape the frontend expects
# ---------------------------------------------------------------------------
def _none_if_nan(v):
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    return v


def export_json(df: pd.DataFrame, out_path: str):
    records = []
    for _, row in df.iterrows():
        records.append(
            {
                # Keep the frontend-friendly keys below, plus the original
                # notebook column names so the exported JSON is self-describing
                # and preserves every requested factor.
                "Date": row["Date"].strftime("%Y-%m-%d"),
                "Open": _none_if_nan(row["Open"]),
                "High": _none_if_nan(row["High"]),
                "Low": _none_if_nan(row["Low"]),
                "Close": _none_if_nan(row["Close"]),
                "Volume": _none_if_nan(row.get("Volume", 0)) or 0,
                "DMA_5": _none_if_nan(row["DMA_5"]),
                "DMA_10": _none_if_nan(row["DMA_10"]),
                "DMA_20": _none_if_nan(row["DMA_20"]),
                "DMA_30": _none_if_nan(row["DMA_30"]),
                "DMA_50": _none_if_nan(row["DMA_50"]),
                "DMA_100": _none_if_nan(row["DMA_100"]),
                "DMA_200": _none_if_nan(row["DMA_200"]),
                "return": _none_if_nan(row["return"]),
                "DM": _none_if_nan(row["DM"]),
                "Range": _none_if_nan(row["Range"]),
                "CLV": _none_if_nan(row["CLV"]),
                "Gap": _none_if_nan(row["Gap"]),
                "Gap_Direction": _none_if_nan(row["Gap_Direction"]),
                "TR": _none_if_nan(row["TR"]),
                "date": row["Date"].strftime("%Y-%m-%d"),
                "open": _none_if_nan(row["Open"]),
                "high": _none_if_nan(row["High"]),
                "low": _none_if_nan(row["Low"]),
                "close": _none_if_nan(row["Close"]),
                "volume": _none_if_nan(row.get("Volume", 0)) or 0,
                "dma5": _none_if_nan(row["DMA_5"]),
                "dma10": _none_if_nan(row["DMA_10"]),
                "dma20": _none_if_nan(row["DMA_20"]),
                "dma30": _none_if_nan(row["DMA_30"]),
                "dma50": _none_if_nan(row["DMA_50"]),
                "dma100": _none_if_nan(row["DMA_100"]),
                "dma200": _none_if_nan(row["DMA_200"]),
                "change": _none_if_nan(row["change"]),
                "returnPct": _none_if_nan(row["return"]),
                "dm": _none_if_nan(row["DM"]),
                "range": _none_if_nan(row["Range"]),
                "clv": _none_if_nan(row["CLV"]),
                "gap": _none_if_nan(row["Gap"]),
                "gapDirection": _none_if_nan(row["Gap_Direction"]),
                "tr": _none_if_nan(row["TR"]),
            }
        )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(records, f, separators=(",", ":"))
    print(f"✅ Wrote {len(records)} bars to {out_path}")


def process_index(cfg: IndexConfig):
    os.makedirs(RAW_DIR, exist_ok=True)
    xlsx_path = os.path.join(RAW_DIR, f"{cfg.id}_daily.xlsx")

    update_daily_data(xlsx_path, cfg.ticker, cfg.base_start)
    df = calculate_moving_averages(xlsx_path, price_column="Close")
    df = add_derived_fields(df)

    data_file = f"{cfg.id}.json"
    export_json(df, os.path.join(OUT_DIR, data_file))
    return df, data_file


def write_registry(entries: list[dict]):
    registry = {"indices": entries}
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "index-registry.json"), "w") as f:
        json.dump(registry, f, indent=2)
    print(f"✅ Wrote registry with {len(entries)} indices")


def main():
    entries = []
    active = [c for c in INDICES if c.id in ACTIVE_INDEX_IDS]
    for cfg in active:
        df, data_file = process_index(cfg)
        entries.append(
            {
                "id": cfg.id,
                "name": cfg.name,
                "ticker": cfg.ticker,
                "currency": cfg.currency,
                "returnBasis": cfg.return_basis,
                "dataFile": data_file,
                "startDate": df["Date"].min().strftime("%Y-%m-%d"),
                "lastUpdated": datetime.now().date().isoformat(),
            }
        )
    write_registry(entries)


if __name__ == "__main__":
    main()
