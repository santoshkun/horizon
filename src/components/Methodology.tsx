import type { IndexMeta } from "../types";

export function Methodology({ index }: { index: IndexMeta }) {
  return (
    <div className="methodology">
      <h4>Data</h4>
      <p>
        Historical daily OHLCV data for {index.name} (source ticker <code>{index.ticker}</code>), starting{" "}
        {index.startDate}. Updated via an incremental pipeline that appends only new trading days to the local
        cache.
      </p>

      <h4>Rolling return</h4>
      <p>
        For a horizon of H trading days, <code>Rolling Return(t, H) = Close(t + H) / Close(t) − 1</code>. Windows are
        indexed by trading-day offset, not calendar days, so exchange holidays don't distort the horizon length.
        Every valid start date in the dataset produces one historical observation.
      </p>

      <h4>Drawdown</h4>
      <p>
        For each rolling window, a running peak is tracked starting from the window's entry price.{" "}
        <code>Drawdown(t) = Price(t) / RunningPeak(t) − 1</code>. The maximum drawdown reported for a window is the
        worst (most negative) value of this quantity observed at any point <em>inside that window</em> — this is
        not the same as the all-time maximum drawdown of the full index history.
      </p>

      <h4>Price return vs. total return</h4>
      <p>
        This dataset reflects <strong>{index.returnBasis === "total-return" ? "total returns (dividends reinvested)" : "index price returns"}</strong>
        {index.returnBasis === "price-return" && (
          <>
            {" "}
            — the source ticker tracks index price level only and does not include reinvested dividends. Actual
            investor total returns (e.g. via an index fund) would typically be somewhat higher. Figures in this
            dashboard are labeled "historical index price returns" rather than "investment returns" for this reason.
          </>
        )}
      </p>

      <h4>Important caveats</h4>
      <ul>
        <li>Historical results are descriptive, not predictive — they are not a forecast of future performance.</li>
        <li>Index-level analysis ignores individual security selection, fees, and active management effects.</li>
        <li>Transaction costs are not included.</li>
        <li>Taxes are not included.</li>
        <li>
          Whether dividends are reflected depends entirely on the return basis of the source data (see above) —
          check the label before treating a figure as a total investment return.
        </li>
        <li>Rolling windows overlap heavily, so adjacent observations are highly correlated, not independent draws.</li>
        <li>Index composition changes over time (rebalancing, additions/removals), which this analysis does not adjust for.</li>
      </ul>

      <div className="caveat-box">
        This dashboard does not tell you what to invest in or what horizon is "optimal." It shows what has
        historically happened across different holding periods, and what an investor historically had to endure
        along the way, so you can reason about your own risk tolerance and time horizon.
      </div>
    </div>
  );
}
