import type { IndexMeta, ReturnMode } from "../types";
import { HORIZONS } from "../calculations/horizons";

export type ThemeId = "original" | "refined" | "bloomberg";

interface Props {
  indices: IndexMeta[];
  selectedIndexId: string;
  onSelectIndex: (id: string) => void;
  horizonId: string;
  onSelectHorizon: (id: string) => void;
  returnMode: ReturnMode;
  onChangeReturnMode: (m: ReturnMode) => void;
  showCagrToggle: boolean;
  theme: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
}

export function Header({
  indices,
  selectedIndexId,
  onSelectIndex,
  horizonId,
  onSelectHorizon,
  returnMode,
  onChangeReturnMode,
  showCagrToggle,
  theme,
  onChangeTheme,
}: Props) {
  const selectedIndex = indices.find((index) => index.id === selectedIndexId);
  const refreshedDate = selectedIndex?.lastUpdated && selectedIndex.lastUpdated !== "SAMPLE"
    ? new Date(`${selectedIndex.lastUpdated}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sample data";

  return (
    <header className="app-header">
      <div className="app-title">
        <div className="eyebrow">Research note / market history</div>
        <h1>Historical Investment Horizon &amp; Risk</h1>
        <span className="subtitle">rolling returns · drawdown · not a forecast</span>
      </div>

      <div className="header-meta">
        <span className="data-date" title={`Data refreshed ${refreshedDate}`} aria-label={`Data refreshed ${refreshedDate}`}>
          {refreshedDate}
        </span>
        <label className="theme-control">
          <span className="sr-only">Theme</span>
          <select value={theme} onChange={(event) => onChangeTheme(event.target.value as ThemeId)} aria-label="Theme">
            <option value="original">Live</option>
            <option value="refined">Refined</option>
            <option value="bloomberg">Bloomberg</option>
          </select>
        </label>
      </div>

      <div className="header-controls">
        <div className="control-group">
          <span className="control-label">Market</span>
          <select
            className="terminal-select"
            value={selectedIndexId}
            onChange={(e) => onSelectIndex(e.target.value)}
          >
            {indices.map((idx) => (
              <option key={idx.id} value={idx.id}>
                {idx.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <span className="control-label">Holding period</span>
          <div className="horizon-pills">
            {HORIZONS.map((h) => (
              <button
                key={h.id}
                className={`pill ${h.id === horizonId ? "active" : ""}`}
                onClick={() => onSelectHorizon(h.id)}
              >
                {h.id}
              </button>
            ))}
          </div>
        </div>

        {showCagrToggle && (
          <div className="control-group">
          <span className="control-label">Measure</span>
            <div className="return-mode-toggle">
              <button
                className={returnMode === "cumulative" ? "active" : ""}
                onClick={() => onChangeReturnMode("cumulative")}
              >
                Cumulative
              </button>
              <button
                className={returnMode === "annualized" ? "active" : ""}
                onClick={() => onChangeReturnMode("annualized")}
              >
                Annualized (CAGR)
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
