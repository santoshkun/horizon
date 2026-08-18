# Historical Investment Horizon & Risk Dashboard

A static, client-side dashboard that answers one question:

> Given an investment horizon, what have equity indices historically delivered over that timeframe, and what drawdown did an investor historically have to tolerate along the way?

This is a **descriptive historical analysis tool**, not a forecasting or stock-picking application. It does not tell you what to invest in or which horizon is "optimal" — it shows historical rolling-return and drawdown distributions so you can reason about your own horizon and risk tolerance.

## ⚠️ Sample data notice

The checked-in `public/data/nifty50.json` contains daily NIFTY 50 OHLCV history fetched from Yahoo Finance, plus the DMA and derived factor columns used by the dashboard.

To replace it with real data, run the pipeline anywhere with network access:

```bash
pip install -r scripts/requirements.txt
python scripts/update_data.py
```

This fetches real OHLCV data via `yfinance`, computes the same DMA/return/drawdown-support fields as the original notebook, and writes `public/data/nifty50.json` + `public/data/index-registry.json`. Commit the result, or let the scheduled `update-data.yml` GitHub Action do it for you.

## Stack

- React + TypeScript + Vite (static, client-side — no backend)
- [Recharts](https://recharts.org/) for visualization
- [Vitest](https://vitest.dev/) for the analytics engine's test suite
- Data pipeline: Python (pandas + yfinance), decoupled from the frontend

## Project structure

```
src/
  calculations/   # rolling returns, CAGR, drawdown, distribution stats, horizon config
  types/          # shared TypeScript data model
  data/           # fetch + normalize JSON from /public/data
  hooks/          # data loading + memoized analysis hooks
  charts/         # Recharts components (histogram, time series, scatter)
  components/     # UI: header, KPI cards, tables, price chart, methodology
  __tests__/      # analytics engine unit tests
scripts/
  indices.py               # registry of indices the pipeline can fetch
  update_data.py            # Yahoo Finance -> Excel cache -> derived fields -> JSON
  generate_sample_data.py   # synthetic fallback used when Yahoo Finance is unreachable
public/data/
  index-registry.json  # which indices are available
  <index-id>.json       # per-index daily bars
```

## Local development

```bash
git clone <this-repo>
cd horizon-dashboard
npm install
npm run dev       # http://localhost:5173
```

Run the test suite:

```bash
npx vitest run
```

Type-check:

```bash
npx tsc -b
```

Production build:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## Adding another index

1. Add an entry to `scripts/indices.py` (`INDICES` list) with its Yahoo Finance ticker, currency, and **honest** `return_basis` (`"price-return"` unless you've verified the ticker reflects reinvested dividends — most plain index tickers like `^NSEI`, `^GSPC`, `^NDX` do not).
2. Add its `id` to `ACTIVE_INDEX_IDS`.
3. Run `python scripts/update_data.py` with network access.
4. The new index automatically appears in the dashboard's index selector — no frontend code changes needed. The analytical engine (`src/calculations/`) is generic over any `DailyBar[]` series.

## Deploying to GitHub Pages

The included `.github/workflows/deploy.yml` builds and deploys automatically on every push to `main`:

1. In your repo settings, under **Pages**, set the source to **GitHub Actions**.
2. Push to `main`. The workflow runs the test suite, type-checks, builds with the correct base path (`/<repo-name>/`), and deploys.
3. Your dashboard will be live at `https://<your-username>.github.io/<repo-name>/`.

`.github/workflows/update-data.yml` optionally refreshes the data on a weekday schedule by running the Python pipeline and committing the result — enable it once real data is flowing.

## Methodology summary

- **Rolling return(t, H)** = `Close(t+H) / Close(t) − 1`, using trading-day offsets (not calendar days), so exchange holidays don't distort horizon length.
- **Drawdown** is computed *inside each rolling window* — a running peak resets at the window's start, not at the start of index history. This is deliberately different from (and more relevant than) the single all-time max drawdown of the full series.
- Horizon-to-trading-day mapping lives in one place: `src/calculations/horizons.ts`.
- Full caveats (price-return vs. total-return, no transaction costs/taxes, overlapping-window correlation, etc.) are shown in-app under **Methodology**.

## Testing

`src/__tests__/` covers the calculation engine against the manually-verified examples from the project spec:

- 100 → 110 ⇒ +10% rolling return
- 100 → 120 → 90 → 130 ⇒ −25% max drawdown
- `[10%, −5%, 20%, −2%, 5%]` ⇒ 60% positive-return probability
- Edge cases: missing/NaN prices, zero/invalid prices, insufficient history for a horizon, the first observation, and calendar gaps between trading days.
