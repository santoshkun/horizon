import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReturnDistributionStats } from "../types";
import { buildHistogram } from "../utils/histogram";
import { formatPct } from "../utils/format";

export function ReturnDistributionChart({
  values,
  stats,
  height = 280,
}: {
  values: number[];
  stats: ReturnDistributionStats;
  height?: number;
}) {
  const bins = buildHistogram(values, 32);
  const data = bins.map((b) => ({
    midpoint: b.midpoint,
    count: b.count,
    positive: b.positive,
    label: `${(b.binStart * 100).toFixed(0)}% to ${(b.binEnd * 100).toFixed(0)}%`,
  }));

  const markers: { key: string; value: number; label: string }[] = [
    { key: "min", value: stats.min, label: "Min" },
    { key: "p10", value: stats.p10, label: "P10" },
    { key: "median", value: stats.median, label: "Median" },
    { key: "mean", value: stats.mean, label: "Mean" },
    { key: "p90", value: stats.p90, label: "P90" },
    { key: "max", value: stats.max, label: "Max" },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-soft)" vertical={false} />
        <XAxis
          dataKey="midpoint"
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          stroke="var(--text-tertiary)"
          fontSize={10.5}
          fontFamily="var(--mono)"
          tickLine={false}
        />
        <YAxis stroke="var(--text-tertiary)" fontSize={10.5} fontFamily="var(--mono)" tickLine={false} width={34} />
        <Tooltip
          cursor={{ fill: "var(--bg-2)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <div className="tooltip-box">
                <div>{p.label}</div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Observations</span>
                  <span>{p.count}</span>
                </div>
              </div>
            );
          }}
        />
        {markers.map((m) => (
          <ReferenceLine
            key={m.key}
            x={m.value}
            stroke={m.key === "median" || m.key === "mean" ? "var(--accent)" : "var(--text-tertiary)"}
            strokeDasharray={m.key === "median" || m.key === "mean" ? undefined : "2 3"}
            label={{
              value: `${m.label} ${formatPct(m.value)}`,
              position: "top",
              fill: "var(--text-tertiary)",
              fontSize: 9.5,
              fontFamily: "var(--mono)",
            }}
          />
        ))}
        <Bar dataKey="count" radius={[1, 1, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.positive ? "var(--positive-dim)" : "var(--negative-dim)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
