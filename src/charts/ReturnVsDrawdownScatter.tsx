import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { RollingWindow } from "../types";
import { formatDate, formatPct } from "../utils/format";

export function ReturnVsDrawdownScatter({
  windows,
  useCagr,
  onSelectWindow,
  height = 300,
}: {
  windows: RollingWindow[];
  useCagr: boolean;
  onSelectWindow: (w: RollingWindow) => void;
  height?: number;
}) {
  const data = windows
    .map((w) => ({
      drawdown: w.maxDrawdown,
      ret: useCagr ? w.cagr : w.cumulativeReturn,
      startDate: w.startDate,
      endDate: w.endDate,
      window: w,
    }))
    .filter((d) => d.ret !== null);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-soft)" />
        <XAxis
          type="number"
          dataKey="drawdown"
          name="Max Drawdown"
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          stroke="var(--text-tertiary)"
          fontSize={10.5}
          fontFamily="var(--mono)"
          tickLine={false}
        />
        <YAxis
          type="number"
          dataKey="ret"
          name="Rolling Return"
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
                  <span className="tooltip-label">Start</span>
                  <span>{formatDate(p.startDate)}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">End</span>
                  <span>{formatDate(p.endDate)}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Return</span>
                  <span className={p.ret >= 0 ? "value-positive" : "value-negative"}>{formatPct(p.ret)}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Max DD</span>
                  <span className="value-negative">{formatPct(p.drawdown)}</span>
                </div>
              </div>
            );
          }}
        />
        <Scatter
          data={data}
          fill="var(--positive)"
          fillOpacity={0.55}
          r={2.5}
          isAnimationActive={false}
          onClick={(d: any) => onSelectWindow(d.window)}
          cursor="pointer"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
