import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { ConditionOccurrence } from "../calculations/conditionExplorer";
import { formatDate, formatPct } from "../utils/format";

export function ForwardReturnTimelineChart({
  occurrences,
  horizon,
  height = 260,
}: {
  occurrences: ConditionOccurrence[];
  horizon: number;
  height?: number;
}) {
  const data = occurrences
    .map((occurrence) => ({
      date: occurrence.bar.date,
      value: occurrence.forwardReturns[horizon],
    }))
    .filter((d): d is { date: string; value: number } => d.value !== null && Number.isFinite(d.value));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-soft)" vertical={false} />
        <XAxis
          dataKey="date"
          name="Date"
          tickFormatter={(v: string) => v.slice(0, 4)}
          stroke="var(--text-tertiary)"
          fontSize={10.5}
          fontFamily="var(--mono)"
          tickLine={false}
          minTickGap={36}
        />
        <YAxis
          dataKey="value"
          name={`${horizon}D Forward Return`}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          stroke="var(--text-tertiary)"
          fontSize={10.5}
          fontFamily="var(--mono)"
          tickLine={false}
          width={44}
        />
        <ReferenceLine y={0} stroke="var(--text-tertiary)" />
        <Tooltip
          cursor={{ strokeDasharray: "2 3", stroke: "var(--text-tertiary)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <div className="tooltip-box">
                <div className="tooltip-row">
                  <span className="tooltip-label">Date</span>
                  <span>{formatDate(p.date)}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">{horizon}D</span>
                  <span className={p.value >= 0 ? "value-positive" : "value-negative"}>{formatPct(p.value)}</span>
                </div>
              </div>
            );
          }}
        />
        <Scatter data={data} fill="var(--accent)" fillOpacity={0.65} r={2.6} isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
