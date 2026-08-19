import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildHistogram } from "../utils/histogram";

export function ForwardReturnDistributionChart({ values, height = 260 }: { values: number[]; height?: number }) {
  const data = buildHistogram(values, 26).map((bin) => ({
    midpoint: bin.midpoint,
    count: bin.count,
    positive: bin.positive,
    label: `${(bin.binStart * 100).toFixed(1)}% to ${(bin.binEnd * 100).toFixed(1)}%`,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
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
        <ReferenceLine x={0} stroke="var(--text-tertiary)" />
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
        <Bar dataKey="count" radius={[1, 1, 0, 0]}>
          {data.map((item, i) => (
            <Cell key={i} fill={item.positive ? "var(--positive-dim)" : "var(--negative-dim)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
