import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RollingWindow } from "../types";
import { formatDate, formatPct } from "../utils/format";

export function RollingReturnTimeSeries({
  windows,
  horizonLabel,
  useCagr,
  height = 280,
}: {
  windows: RollingWindow[];
  horizonLabel: string;
  useCagr: boolean;
  height?: number;
}) {
  const data = windows
    .map((w) => {
      const value = useCagr ? w.cagr : w.cumulativeReturn;
      return {
        startDate: w.startDate,
        endDate: w.endDate,
        value,
        posValue: value !== null && value >= 0 ? value : 0,
        negValue: value !== null && value < 0 ? value : 0,
      };
    })
    .filter((d) => d.value !== null) as {
    startDate: string;
    endDate: string;
    value: number;
    posValue: number;
    negValue: number;
  }[];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--negative)" stopOpacity={0.05} />
            <stop offset="100%" stopColor="var(--negative)" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--border-soft)" vertical={false} />
        <XAxis
          dataKey="startDate"
          tickFormatter={(v: string) => v.slice(0, 4)}
          stroke="var(--text-tertiary)"
          fontSize={10.5}
          fontFamily="var(--mono)"
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          stroke="var(--text-tertiary)"
          fontSize={10.5}
          fontFamily="var(--mono)"
          tickLine={false}
          width={44}
        />
        <ReferenceLine y={0} stroke="var(--text-tertiary)" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <div className="tooltip-box">
                <div className="tooltip-row">
                  <span className="tooltip-label">Window</span>
                  <span>{horizonLabel}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Entry</span>
                  <span>{formatDate(p.startDate)}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Exit</span>
                  <span>{formatDate(p.endDate)}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Return</span>
                  <span className={p.value >= 0 ? "value-positive" : "value-negative"}>{formatPct(p.value)}</span>
                </div>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="posValue"
          stroke="var(--positive)"
          strokeWidth={1}
          fill="url(#posGrad)"
          fillOpacity={1}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="negValue"
          stroke="var(--negative)"
          strokeWidth={1}
          fill="url(#negGrad)"
          fillOpacity={1}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
