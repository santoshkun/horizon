import type { IndexMeta, ReturnMode } from "../types";
import { HORIZONS } from "../calculations/horizons";

interface Props {
  indices: IndexMeta[];
  selectedIndexId: string;
  onSelectIndex: (id: string) => void;
  horizonId: string;
  onSelectHorizon: (id: string) => void;
  returnMode: ReturnMode;
  onChangeReturnMode: (m: ReturnMode) => void;
  showCagrToggle: boolean;
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
}: Props) {
  return (
    <header className="app-header">
      <div className="app-title">
        <h1>Historical Investment Horizon &amp; Risk</h1>
        <span className="subtitle">rolling returns · drawdown · not a forecast</span>
      </div>

      <div className="header-controls">
        <div className="control-group">
          <span className="control-label">Index</span>
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
          <span className="control-label">Horizon</span>
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
            <span className="control-label">Return</span>
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
