import type { RollingWindow } from "../types";
import { formatDate, formatPct } from "../utils/format";

interface Props {
  windows: RollingWindow[];
  horizonLabel: string;
  selectedWindow: RollingWindow | null;
  onSelect: (w: RollingWindow) => void;
}

export function PeriodExplorer({ windows, horizonLabel, selectedWindow, onSelect }: Props) {
  if (windows.length === 0) {
    return <div className="state-message">Not enough history for a {horizonLabel} horizon yet.</div>;
  }

  const best = windows.reduce((a, b) => (b.cumulativeReturn > a.cumulativeReturn ? b : a));
  const worst = windows.reduce((a, b) => (b.cumulativeReturn < a.cumulativeReturn ? b : a));
  const largestDD = windows.reduce((a, b) => (b.maxDrawdown < a.maxDrawdown ? b : a));

  const cards = [
    { key: "best", label: "Best Historical Outcome", window: best, value: formatPct(best.cumulativeReturn), tone: "positive" },
    { key: "worst", label: "Worst Historical Outcome", window: worst, value: formatPct(worst.cumulativeReturn), tone: "negative" },
    {
      key: "dd",
      label: "Largest Drawdown Period",
      window: largestDD,
      value: formatPct(largestDD.maxDrawdown),
      tone: "negative",
    },
  ] as const;

  return (
    <div className="period-cards">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`period-card ${selectedWindow === c.window ? "selected" : ""}`}
          onClick={() => onSelect(c.window)}
        >
          <div className="period-card-label">{c.label}</div>
          <div className={`period-card-value ${c.tone === "positive" ? "value-positive" : "value-negative"}`}>
            {c.value}
          </div>
          <div className="period-card-dates">
            {formatDate(c.window.startDate)} → {formatDate(c.window.endDate)}
          </div>
        </div>
      ))}
    </div>
  );
}
