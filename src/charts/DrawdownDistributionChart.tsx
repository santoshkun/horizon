import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DrawdownDistributionStats } from "../types";
import { buildHistogram } from "../utils/histogram";
import { formatDrawdownPct } from "../utils/format";

export function DrawdownDistributionChart({
  values,
  stats,
  height = 280,
}: {
  values: number[];
  stats: DrawdownDistributionStats;
  height?: number;
}) {
  const bins = buildHistogram(values, 28);
  const data = bins.map((b) => ({
    midpoint: b.midpoint,
    count: b.count,
    label: `${(b.binStart * 100).toFixed(0)}% to ${(b.binEnd * 100).toFixed(0)}%`,
  }));

  const markers = [
    { key: "worst", value: stats.worstMaxDrawdown, label: "Worst" },
    { key: "p25", value: stats.p25, label: "P25" },
    { key: "median", value: stats.medianMaxDrawdown, label: "Median" },
    { key: "mean", value: stats.meanMaxDrawdown, label: "Mean" },
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
            stroke={m.key === "median" ? "var(--accent)" : "var(--text-tertiary)"}
            strokeDasharray={m.key === "median" ? undefined : "2 3"}
            label={{
              value: `${m.label} ${formatDrawdownPct(m.value)}`,
              position: "top",
              fill: "var(--text-tertiary)",
              fontSize: 9.5,
              fontFamily: "var(--mono)",
            }}
          />
        ))}
        <Bar dataKey="count" radius={[1, 1, 0, 0]} fill="var(--negative-dim)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
