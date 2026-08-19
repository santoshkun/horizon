import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EventStudyPoint } from "../calculations/conditionExplorer";
import { formatNumber } from "../utils/format";

export function EventStudyChart({ data, height = 260 }: { data: EventStudyPoint[]; height?: number }) {
  const chartData = data.map((point) => ({
    ...point,
    band: point.p75 !== null && point.p25 !== null ? point.p75 - point.p25 : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-soft)" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="var(--text-tertiary)"
          fontSize={10.5}
          fontFamily="var(--mono)"
          tickLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          stroke="var(--text-tertiary)"
          fontSize={10.5}
          fontFamily="var(--mono)"
          tickLine={false}
          width={44}
          tickFormatter={(v: number) => v.toFixed(0)}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <div className="tooltip-box">
                <div className="tooltip-row">
                  <span className="tooltip-label">Day</span>
                  <span>{p.day}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Median</span>
                  <span>{formatNumber(p.median, 2)}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">P25/P75</span>
                  <span>
                    {formatNumber(p.p25, 2)} / {formatNumber(p.p75, 2)}
                  </span>
                </div>
              </div>
            );
          }}
        />
        <Area dataKey="p75" stroke="none" fill="var(--positive-dim)" fillOpacity={0.16} isAnimationActive={false} />
        <Area dataKey="p25" stroke="none" fill="var(--bg-1)" fillOpacity={1} isAnimationActive={false} />
        <Line
          type="monotone"
          dataKey="median"
          stroke="var(--positive)"
          strokeWidth={1.3}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
