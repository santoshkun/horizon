import type { HorizonAnalysis } from "../types";
import { formatDrawdownPct, formatPct } from "../utils/format";

export function StatsTable({ analysis }: { analysis: HorizonAnalysis }) {
  const r = analysis.returnStats;
  const d = analysis.drawdownStats;

  const rows: [string, string][] = [
    ["Observations", r.count.toLocaleString()],
    ["Mean Return", formatPct(r.mean)],
    ["Median Return", formatPct(r.median)],
    ["Std. Deviation", formatPct(r.stdDev)],
    ["Minimum Return", formatPct(r.min)],
    ["10th Percentile", formatPct(r.p10)],
    ["25th Percentile", formatPct(r.p25)],
    ["75th Percentile", formatPct(r.p75)],
    ["90th Percentile", formatPct(r.p90)],
    ["Maximum Return", formatPct(r.max)],
    ["Positive Outcomes", formatPct(r.probabilityPositive)],
    ["Negative Outcomes", formatPct(r.probabilityNegative)],
  ];
  if (r.probabilityAbove5 !== null) rows.push(["P(Return > 5%)", formatPct(r.probabilityAbove5)]);
  if (r.probabilityAbove10 !== null) rows.push(["P(Return > 10%)", formatPct(r.probabilityAbove10)]);
  if (r.probabilityAbove20 !== null) rows.push(["P(Return > 20%)", formatPct(r.probabilityAbove20)]);

  rows.push(
    ["Average Max Drawdown", formatDrawdownPct(d.meanMaxDrawdown)],
    ["Median Max Drawdown", formatDrawdownPct(d.medianMaxDrawdown)],
    ["Worst Max Drawdown", formatDrawdownPct(d.worstMaxDrawdown)],
  );

  return (
    <table className="data-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
