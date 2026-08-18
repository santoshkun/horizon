import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyBar, RollingWindow } from "../types";
import { formatDate, formatPrice } from "../utils/format";

interface DmaOption {
  key: "dma20" | "dma50" | "dma200";
  label: string;
  color: string;
}

const DMA_OPTIONS: DmaOption[] = [
  { key: "dma20", label: "20 DMA", color: "#4fd1c5" },
  { key: "dma50", label: "50 DMA", color: "#d4b96a" },
  { key: "dma200", label: "200 DMA", color: "#e8735c" },
];

export function PriceChart({
  bars,
  currency,
  highlightWindow,
  height = 280,
}: {
  bars: DailyBar[];
  currency: string;
  highlightWindow: RollingWindow | null;
  height?: number;
}) {
  const [active, setActive] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Downsample for render performance on decades of daily data — plot every
  // Nth bar but always include the most recent bar and any highlighted window bounds.
  const data = useMemo(() => {
    const stride = Math.max(1, Math.floor(bars.length / 1500));
    const out: DailyBar[] = [];
    for (let i = 0; i < bars.length; i += stride) out.push(bars[i]);
    if (out[out.length - 1] !== bars[bars.length - 1]) out.push(bars[bars.length - 1]);
    return out;
  }, [bars]);

  return (
    <div>
      <div className="dma-toggles" style={{ marginBottom: 10 }}>
        {DMA_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`chip ${active.has(opt.key) ? "active" : ""}`}
            style={{ ["--chip-color" as any]: opt.color }}
            onClick={() => toggle(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border-soft)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => v.slice(0, 4)}
            stroke="var(--text-tertiary)"
            fontSize={10.5}
            fontFamily="var(--mono)"
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke="var(--text-tertiary)"
            fontSize={10.5}
            fontFamily="var(--mono)"
            tickLine={false}
            width={54}
            tickFormatter={(v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          />
          <Tooltip
            content={({ active: hovering, payload }) => {
              if (!hovering || !payload?.length) return null;
              const p = payload[0].payload as DailyBar;
              return (
                <div className="tooltip-box">
                  <div className="tooltip-row">
                    <span className="tooltip-label">{formatDate(p.date)}</span>
                    <span>{formatPrice(p.close, currency)}</span>
                  </div>
                </div>
              );
            }}
          />
          <Line type="monotone" dataKey="close" stroke="var(--text-primary)" strokeWidth={1.1} dot={false} isAnimationActive={false} />
          {DMA_OPTIONS.filter((o) => active.has(o.key)).map((o) => (
            <Line
              key={o.key}
              type="monotone"
              dataKey={o.key}
              stroke={o.color}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {highlightWindow && (
        <div className="panel-subtitle" style={{ marginTop: 6 }}>
          Selected period: {formatDate(highlightWindow.startDate)} → {formatDate(highlightWindow.endDate)} · entry{" "}
          {formatPrice(highlightWindow.startPrice, currency)} → exit {formatPrice(highlightWindow.endPrice, currency)}
        </div>
      )}
    </div>
  );
}
