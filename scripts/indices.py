"""
Central registry of indices/assets the data pipeline knows how to fetch.

Add a new index by adding one entry here — nothing else in the pipeline or
the analytical engine needs to change. `return_basis` must be set honestly:
Yahoo Finance's plain index tickers (^NSEI, ^GSPC, ^NDX, ^DJI, ^BSESN, etc.)
are PRICE indices — they do not reflect reinvested dividends. Only mark
"total-return" if the ticker is actually a total-return series (e.g. a
total-return index ticker or a fund/ETF NAV series that reinvests distributions).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class IndexConfig:
    id: str  # slug used in file names and the frontend registry
    name: str  # display name
    ticker: str  # yfinance ticker
    currency: str
    return_basis: str  # "price-return" | "total-return"
    base_start: str  # ISO date, first date to fetch if no local file exists


INDICES: list[IndexConfig] = [
    IndexConfig(
        id="nifty50",
        name="NIFTY 50",
        ticker="^NSEI",
        currency="INR",
        return_basis="price-return",
        base_start="2007-09-17",
    ),
    IndexConfig(
        id="niftybank",
        name="NIFTY Bank",
        ticker="^NSEBANK",
        currency="INR",
        return_basis="price-return",
        base_start="2000-01-03",
    ),
    IndexConfig(
        id="sensex",
        name="BSE Sensex",
        ticker="^BSESN",
        currency="INR",
        return_basis="price-return",
        base_start="1997-07-01",
    ),
    IndexConfig(
        id="sp500",
        name="S&P 500",
        ticker="^GSPC",
        currency="USD",
        return_basis="price-return",
        base_start="1990-01-01",
    ),
    IndexConfig(
        id="nasdaq100",
        name="NASDAQ 100",
        ticker="^NDX",
        currency="USD",
        return_basis="price-return",
        base_start="1990-01-01",
    ),
    IndexConfig(
        id="dowjones",
        name="Dow Jones Industrial Average",
        ticker="^DJI",
        currency="USD",
        return_basis="price-return",
        base_start="1990-01-01",
    ),
    IndexConfig(
        id="gold",
        name="Gold (Spot, USD)",
        ticker="GC=F",
        currency="USD",
        return_basis="price-return",
        base_start="2000-08-30",
    ),
]

# Only these run by default until their local xlsx/json files exist and have
# been reviewed — keeps the initial deployment scoped to what's actually
# validated, while the registry already supports the rest.
ACTIVE_INDEX_IDS = ["nifty50"]
