import { useMemo, useState } from "react";
import type { DailyBar } from "../types";
import { HORIZONS } from "../calculations/horizons";
import { buildRollingWindows } from "../calculations/rollingReturns";
import { computeDrawdownStats, computeReturnStats } from "../calculations/statistics";
import { formatDrawdownPct, formatPct } from "../utils/format";

type SortKey = "avgReturn" | "medianReturn" | "positiveOutcomes" | "avgMaxDD" | "worstDD";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "avgReturn", label: "Avg Return" },
  { key: "medianReturn", label: "Median Return" },
  { key: "positiveOutcomes", label: "Positive Outcomes" },
  { key: "avgMaxDD", label: "Avg Max DD" },
  { key: "worstDD", label: "Worst DD" },
];

export function HorizonComparisonTable({ bars, activeHorizonId }: { bars: DailyBar[]; activeHorizonId: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("avgReturn");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    return HORIZONS.map((h) => {
      const windows = buildRollingWindows(bars, h);
      const returnStats = computeReturnStats(windows, h, false);
      const drawdownStats = computeDrawdownStats(windows);
      return {
        horizonId: h.id,
        label: h.label,
        observations: returnStats.count,
        avgReturn: returnStats.mean,
        medianReturn: returnStats.median,
        positiveOutcomes: returnStats.probabilityPositive,
        avgMaxDD: drawdownStats.meanMaxDrawdown,
        worstDD: drawdownStats.worstMaxDrawdown,
      };
    }).filter((r) => r.observations > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => (sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
    return copy;
  }, [rows, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Horizon</th>
          <th>Observations</th>
          {COLUMNS.map((c) => (
            <th key={c.key} onClick={() => toggleSort(c.key)}>
              {c.label}
              {sortKey === c.key ? (sortDesc ? " ▾" : " ▴") : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.horizonId} className={r.horizonId === activeHorizonId ? "highlighted" : ""}>
            <td>{r.label}</td>
            <td>{r.observations.toLocaleString()}</td>
            <td className={r.avgReturn >= 0 ? "value-positive" : "value-negative"}>{formatPct(r.avgReturn)}</td>
            <td className={r.medianReturn >= 0 ? "value-positive" : "value-negative"}>{formatPct(r.medianReturn)}</td>
            <td>{formatPct(r.positiveOutcomes)}</td>
            <td className="value-negative">{formatDrawdownPct(r.avgMaxDD)}</td>
            <td className="value-negative">{formatDrawdownPct(r.worstDD)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
