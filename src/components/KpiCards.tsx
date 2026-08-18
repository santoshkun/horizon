import type { HorizonAnalysis } from "../types";
import { formatDrawdownPct, formatPct } from "../utils/format";

function signClass(v: number): "positive" | "negative" | "neutral" {
  if (v > 0) return "positive";
  if (v < 0) return "negative";
  return "neutral";
}

export function KpiCards({ analysis, horizonLabel }: { analysis: HorizonAnalysis; horizonLabel: string }) {
  const { returnStats: r, drawdownStats: d } = analysis;

  return (
    <div className="kpi-row">
      <div className="kpi-card">
        <div className="kpi-label">Historical Positive Outcomes</div>
        <div className={`kpi-value ${signClass(r.probabilityPositive - 0.5)}`}>
          {formatPct(r.probabilityPositive, 1)}
        </div>
        <div className="kpi-footnote">of {r.count.toLocaleString()} rolling {horizonLabel} windows</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Median Rolling Return</div>
        <div className={`kpi-value ${signClass(r.median)}`}>{formatPct(r.median, 1)}</div>
        <div className="kpi-footnote">mean {formatPct(r.mean, 1)}</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Average Max Drawdown</div>
        <div className="kpi-value negative">{formatDrawdownPct(d.meanMaxDrawdown, 1)}</div>
        <div className="kpi-footnote">median {formatDrawdownPct(d.medianMaxDrawdown, 1)}</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Worst Historical Drawdown</div>
        <div className="kpi-value negative">{formatDrawdownPct(d.worstMaxDrawdown, 1)}</div>
        <div className="kpi-footnote">within a single {horizonLabel} window</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Best Historical Return</div>
        <div className="kpi-value positive">{formatPct(r.max, 1)}</div>
        <div className="kpi-footnote">worst {formatPct(r.min, 1)}</div>
      </div>
    </div>
  );
}
