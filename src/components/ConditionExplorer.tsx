import { useMemo, useState } from "react";
import type { DailyBar } from "../types";
import {
  CONDITION_VARIABLES,
  EVENT_STUDY_DAYS,
  FORWARD_HORIZONS,
  type ConditionOperator,
  type ConditionRule,
  type ConditionVariable,
  buildEventStudy,
  computeForwardReturnStats,
  findConditionOccurrences,
} from "../calculations/conditionExplorer";
import { ForwardReturnDistributionChart } from "../charts/ForwardReturnDistributionChart";
import { ForwardReturnTimelineChart } from "../charts/ForwardReturnTimelineChart";
import { EventStudyChart } from "../charts/EventStudyChart";
import { formatDate, formatNumber, formatPct } from "../utils/format";

const OPERATORS: ConditionOperator[] = [">", ">=", "<", "<=", "=", "!="];

const DEFAULT_CONDITIONS: ConditionRule[] = [
  { id: "volume-p90", variable: "volumePercentile", operator: ">", value: 90 },
  { id: "return-minus-2", variable: "returnPct", operator: "<", value: -0.02 },
  { id: "clv-low", variable: "clv", operator: "<", value: 0.25 },
  { id: "below-dma20", variable: "closeOverDma20", operator: "<", value: 1 },
];

function newCondition(): ConditionRule {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    variable: "returnPct",
    operator: "<",
    value: 0,
  };
}

function displayDailyReturn(value: number | null): string {
  return value === null ? "-" : formatPct(value, 2);
}

export function ConditionExplorer({ bars }: { bars: DailyBar[] }) {
  const [draftConditions, setDraftConditions] = useState<ConditionRule[]>(DEFAULT_CONDITIONS);
  const [activeConditions, setActiveConditions] = useState<ConditionRule[]>(DEFAULT_CONDITIONS);
  const [selectedHorizon, setSelectedHorizon] = useState<number>(20);

  const occurrences = useMemo(
    () => findConditionOccurrences(bars, activeConditions),
    [bars, activeConditions],
  );

  const stats = useMemo(
    () => FORWARD_HORIZONS.map((horizon) => computeForwardReturnStats(occurrences, horizon)),
    [occurrences],
  );

  const selectedValues = useMemo(
    () =>
      occurrences
        .map((occurrence) => occurrence.forwardReturns[selectedHorizon])
        .filter((value): value is number => value !== null && Number.isFinite(value)),
    [occurrences, selectedHorizon],
  );

  const eventStudy = useMemo(() => buildEventStudy(bars, occurrences, EVENT_STUDY_DAYS), [bars, occurrences]);
  const selectedStats = stats.find((row) => row.horizon === selectedHorizon);

  const updateCondition = (id: string, patch: Partial<ConditionRule>) => {
    setDraftConditions((current) =>
      current.map((condition) => (condition.id === id ? { ...condition, ...patch } : condition)),
    );
  };

  const removeCondition = (id: string) => {
    setDraftConditions((current) => current.filter((condition) => condition.id !== id));
  };

  const runSearch = () => {
    setActiveConditions(draftConditions);
  };

  return (
    <div className="condition-explorer">
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Condition Explorer</span>
          <span className="panel-subtitle">historical instances and forward returns, not a forecast</span>
        </div>

        <div className="condition-copy">
          Find historical instances where NIFTY exhibited measurable conditions, then inspect what happened afterward.
        </div>

        <div className="condition-builder">
          {draftConditions.map((condition, index) => (
            <div className="condition-row" key={condition.id}>
              <span className="condition-and">{index === 0 ? "WHERE" : "AND"}</span>
              <select
                className="terminal-select"
                value={condition.variable}
                onChange={(event) => updateCondition(condition.id, { variable: event.target.value as ConditionVariable })}
              >
                {CONDITION_VARIABLES.map((variable) => (
                  <option key={variable.key} value={variable.key}>
                    {variable.label}
                  </option>
                ))}
              </select>
              <select
                className="terminal-select condition-operator"
                value={condition.operator}
                onChange={(event) => updateCondition(condition.id, { operator: event.target.value as ConditionOperator })}
              >
                {OPERATORS.map((operator) => (
                  <option key={operator} value={operator}>
                    {operator}
                  </option>
                ))}
              </select>
              <input
                className="condition-input"
                type="number"
                step="0.01"
                value={condition.value}
                onChange={(event) => updateCondition(condition.id, { value: Number(event.target.value) })}
              />
              <button className="chip" type="button" onClick={() => removeCondition(condition.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="condition-actions">
          <button className="pill" type="button" onClick={() => setDraftConditions((current) => [...current, newCondition()])}>
            + Add Condition
          </button>
          <button className="pill active" type="button" onClick={runSearch} disabled={draftConditions.length === 0}>
            Search History
          </button>
        </div>
      </div>

      <div className="kpi-row condition-summary">
        <div className="kpi-card">
          <span className="kpi-label">Historical Occurrences</span>
          <span className="kpi-value neutral">{occurrences.length.toLocaleString()}</span>
          <span className="kpi-footnote">conditions joined with AND logic</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Selected Forward Horizon</span>
          <span className="kpi-value neutral">{selectedHorizon}D</span>
          <span className="kpi-footnote">{selectedValues.length.toLocaleString()} forward observations</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Median Forward Return</span>
          <span className={`kpi-value ${(selectedStats?.median ?? 0) >= 0 ? "positive" : "negative"}`}>
            {formatPct(selectedStats?.median)}
          </span>
          <span className="kpi-footnote">for selected forward horizon</span>
        </div>
      </div>

      {occurrences.length > 0 && occurrences.length < 20 && (
        <div className="caveat-box">Small historical sample: N = {occurrences.length}. Results may be unstable.</div>
      )}

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Forward Return Statistics</span>
          <span className="panel-subtitle">Close[t + horizon] / Close[t] - 1</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Forward Horizon</th>
                <th>N</th>
                <th>Median</th>
                <th>Mean</th>
                <th>Positive</th>
                <th>10th Pctl</th>
                <th>25th Pctl</th>
                <th>75th Pctl</th>
                <th>90th Pctl</th>
                <th>Min</th>
                <th>Max</th>
                <th>Std Dev</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.horizon} className={row.horizon === selectedHorizon ? "highlighted" : ""}>
                  <td>
                    <button className="table-link" type="button" onClick={() => setSelectedHorizon(row.horizon)}>
                      {row.horizon}D
                    </button>
                  </td>
                  <td>{row.count.toLocaleString()}</td>
                  <td className={row.median >= 0 ? "value-positive" : "value-negative"}>{formatPct(row.median)}</td>
                  <td className={row.mean >= 0 ? "value-positive" : "value-negative"}>{formatPct(row.mean)}</td>
                  <td>{formatPct(row.probabilityPositive)}</td>
                  <td className={row.p10 >= 0 ? "value-positive" : "value-negative"}>{formatPct(row.p10)}</td>
                  <td className={row.p25 >= 0 ? "value-positive" : "value-negative"}>{formatPct(row.p25)}</td>
                  <td className={row.p75 >= 0 ? "value-positive" : "value-negative"}>{formatPct(row.p75)}</td>
                  <td className={row.p90 >= 0 ? "value-positive" : "value-negative"}>{formatPct(row.p90)}</td>
                  <td className={row.min >= 0 ? "value-positive" : "value-negative"}>{formatPct(row.min)}</td>
                  <td className={row.max >= 0 ? "value-positive" : "value-negative"}>{formatPct(row.max)}</td>
                  <td>{formatPct(row.stdDev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Forward Return Distribution</span>
            <div className="horizon-pills compact">
              {FORWARD_HORIZONS.map((horizon) => (
                <button
                  key={horizon}
                  className={`pill ${selectedHorizon === horizon ? "active" : ""}`}
                  type="button"
                  onClick={() => setSelectedHorizon(horizon)}
                >
                  {horizon}D
                </button>
              ))}
            </div>
          </div>
          <ForwardReturnDistributionChart values={selectedValues} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Forward Return Through Time</span>
            <span className="panel-subtitle">{selectedHorizon}D after each occurrence</span>
          </div>
          <ForwardReturnTimelineChart occurrences={occurrences} horizon={selectedHorizon} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Event Study</span>
          <span className="panel-subtitle">Day 0 = 100, median path for next {EVENT_STUDY_DAYS} trading days</span>
        </div>
        <EventStudyChart data={eventStudy} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Historical Occurrences</span>
          <span className="panel-subtitle">showing first 100 matching dates</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Return</th>
                <th>Volume</th>
                <th>Range</th>
                <th>CLV</th>
                <th>Gap</th>
                <th>1D</th>
                <th>5D</th>
                <th>20D</th>
                <th>60D</th>
              </tr>
            </thead>
            <tbody>
              {occurrences.slice(0, 100).map((occurrence) => (
                <tr key={occurrence.bar.date}>
                  <td>{formatDate(occurrence.bar.date)}</td>
                  <td className={occurrence.bar.returnPct && occurrence.bar.returnPct >= 0 ? "value-positive" : "value-negative"}>
                    {displayDailyReturn(occurrence.bar.returnPct)}
                  </td>
                  <td>{formatNumber(occurrence.bar.volume)}</td>
                  <td>{formatNumber(occurrence.bar.range, 2)}</td>
                  <td>{formatNumber(occurrence.bar.clv, 2)}</td>
                  <td>{formatNumber(occurrence.bar.gap, 2)}</td>
                  {FORWARD_HORIZONS.map((horizon) => {
                    const value = occurrence.forwardReturns[horizon];
                    return (
                      <td key={horizon} className={value !== null && value >= 0 ? "value-positive" : "value-negative"}>
                        {formatPct(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
