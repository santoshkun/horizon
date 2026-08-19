import { useEffect, useState } from "react";
import "./App.css";
import type { RollingWindow, ReturnMode } from "./types";
import { Header } from "./components/Header";
import { KpiCards } from "./components/KpiCards";
import { StatsTable } from "./components/StatsTable";
import { HorizonComparisonTable } from "./components/HorizonComparisonTable";
import { PeriodExplorer } from "./components/PeriodExplorer";
import { PriceChart } from "./components/PriceChart";
import { Methodology } from "./components/Methodology";
import { SampleDataBanner } from "./components/SampleDataBanner";
import { ConditionExplorer } from "./components/ConditionExplorer";
import { ReturnDistributionChart } from "./charts/ReturnDistributionChart";
import { RollingReturnTimeSeries } from "./charts/RollingReturnTimeSeries";
import { DrawdownDistributionChart } from "./charts/DrawdownDistributionChart";
import { ReturnVsDrawdownScatter } from "./charts/ReturnVsDrawdownScatter";
import { useIndexRegistry, useIndexBars } from "./hooks/useIndexData";
import { useHorizonAnalysis } from "./hooks/useHorizonAnalysis";
import { DEFAULT_HORIZON_ID, getHorizon } from "./calculations/horizons";

function App() {
  const { indices, error: registryError } = useIndexRegistry();
  const [selectedIndexId, setSelectedIndexId] = useState<string | null>(null);
  const [horizonId, setHorizonId] = useState(DEFAULT_HORIZON_ID);
  const [returnMode, setReturnMode] = useState<ReturnMode>("cumulative");
  const [selectedWindow, setSelectedWindow] = useState<RollingWindow | null>(null);
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"dashboard" | "conditions">("dashboard");

  useEffect(() => {
    if (indices && indices.length > 0 && !selectedIndexId) {
      setSelectedIndexId(indices[0].id);
    }
  }, [indices, selectedIndexId]);

  const selectedMeta = indices?.find((i) => i.id === selectedIndexId) ?? null;
  const { bars, error: barsError } = useIndexBars(selectedMeta);
  const horizon = getHorizon(horizonId);
  const useCagr = returnMode === "annualized";
  const analysis = useHorizonAnalysis(selectedIndexId, bars, horizonId, useCagr);

  // Reset the inspected window whenever the underlying selection changes so
  // stale period-explorer selections don't linger across horizon switches.
  useEffect(() => {
    setSelectedWindow(null);
  }, [selectedIndexId, horizonId]);

  if (registryError || barsError) {
    return (
      <div className="app">
        <div className="state-message">
          Failed to load data: {registryError || barsError}
        </div>
      </div>
    );
  }

  if (!indices || !selectedMeta || !bars || !analysis) {
    return (
      <div className="app">
        <div className="state-message">Loading historical data…</div>
      </div>
    );
  }

  const isSample = selectedMeta.lastUpdated === "SAMPLE";
  const returnValues = analysis.windows.map((w) => (useCagr ? w.cagr : w.cumulativeReturn)).filter((v): v is number => v !== null);
  const drawdownValues = analysis.windows.map((w) => w.maxDrawdown);
  const showCagrToggle = horizon.years >= 1;
  const expandedChartHeight = 620;
  const normalChartHeight = 280;
  const chartHeight = (id: string, fallback = normalChartHeight) => (expandedChartId === id ? expandedChartHeight : fallback);
  const toggleChart = (id: string) => setExpandedChartId((current) => (current === id ? null : id));

  return (
    <div className="app">
      <Header
        indices={indices}
        selectedIndexId={selectedMeta.id}
        onSelectIndex={setSelectedIndexId}
        horizonId={horizonId}
        onSelectHorizon={setHorizonId}
        returnMode={returnMode}
        onChangeReturnMode={setReturnMode}
        showCagrToggle={showCagrToggle}
      />

      <div className="dashboard">
        {isSample && <SampleDataBanner />}

        <div className="section-nav">
          <button
            className={`pill ${activeSection === "dashboard" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveSection("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`pill ${activeSection === "conditions" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveSection("conditions")}
          >
            Condition Explorer
          </button>
        </div>

        {activeSection === "conditions" ? (
          <ConditionExplorer bars={bars} />
        ) : analysis.windows.length === 0 ? (
          <div className="panel state-message">
            Not enough history yet for a {horizon.label} horizon ({horizon.tradingDays} trading days needed,{" "}
            {bars.length} available).
          </div>
        ) : (
          <>
            <KpiCards analysis={analysis} horizonLabel={horizon.label} />

            <div className="grid-2">
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Rolling Return Distribution</span>
                  <button
                    className="panel-icon-button"
                    type="button"
                    aria-pressed={expandedChartId === "return-distribution"}
                    onClick={() => toggleChart("return-distribution")}
                  >
                    {expandedChartId === "return-distribution" ? "MIN" : "MAX"}
                  </button>
                  <span className="panel-subtitle">{horizon.label} · historical frequency, not a forecast</span>
                </div>
                <ReturnDistributionChart
                  values={returnValues}
                  stats={analysis.returnStats}
                  height={chartHeight("return-distribution")}
                />
              </div>
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Rolling Return Through Time</span>
                  <button
                    className="panel-icon-button"
                    type="button"
                    aria-pressed={expandedChartId === "rolling-return"}
                    onClick={() => toggleChart("rolling-return")}
                  >
                    {expandedChartId === "rolling-return" ? "MIN" : "MAX"}
                  </button>
                  <span className="panel-subtitle">{horizon.label} window, by entry date</span>
                </div>
                <RollingReturnTimeSeries
                  windows={analysis.windows}
                  horizonLabel={horizon.label}
                  useCagr={useCagr}
                  height={chartHeight("rolling-return")}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Return vs. Drawdown</span>
                  <button
                    className="panel-icon-button"
                    type="button"
                    aria-pressed={expandedChartId === "return-drawdown"}
                    onClick={() => toggleChart("return-drawdown")}
                  >
                    {expandedChartId === "return-drawdown" ? "MIN" : "MAX"}
                  </button>
                  <span className="panel-subtitle">what you made vs. what you had to endure — click a point</span>
                </div>
                <ReturnVsDrawdownScatter
                  windows={analysis.windows}
                  useCagr={useCagr}
                  onSelectWindow={setSelectedWindow}
                  height={chartHeight("return-drawdown", 300)}
                />
              </div>
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Drawdown Distribution</span>
                  <button
                    className="panel-icon-button"
                    type="button"
                    aria-pressed={expandedChartId === "drawdown-distribution"}
                    onClick={() => toggleChart("drawdown-distribution")}
                  >
                    {expandedChartId === "drawdown-distribution" ? "MIN" : "MAX"}
                  </button>
                  <span className="panel-subtitle">max drawdown observed inside each {horizon.label} window</span>
                </div>
                <DrawdownDistributionChart
                  values={drawdownValues}
                  stats={analysis.drawdownStats}
                  height={chartHeight("drawdown-distribution")}
                />
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Price History</span>
                <button
                  className="panel-icon-button"
                  type="button"
                  aria-pressed={expandedChartId === "price-history"}
                  onClick={() => toggleChart("price-history")}
                >
                  {expandedChartId === "price-history" ? "MIN" : "MAX"}
                </button>
                <span className="panel-subtitle">{selectedMeta.name} · close with optional DMA overlays</span>
              </div>
              <PriceChart
                bars={bars}
                currency={selectedMeta.currency}
                highlightWindow={selectedWindow}
                height={chartHeight("price-history")}
              />
            </div>

            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Historical Horizon Comparison</span>
                <span className="panel-subtitle">sortable · every supported horizon side by side</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <HorizonComparisonTable bars={bars} activeHorizonId={horizonId} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Historical Period Explorer</span>
                <span className="panel-subtitle">{horizon.label} horizon · click a card to highlight it on the price chart</span>
              </div>
              <PeriodExplorer
                windows={analysis.windows}
                horizonLabel={horizon.label}
                selectedWindow={selectedWindow}
                onSelect={setSelectedWindow}
              />
            </div>

            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Detailed Statistics</span>
                <span className="panel-subtitle">{selectedMeta.name} · {horizon.label}</span>
              </div>
              <StatsTable analysis={analysis} />
            </div>

            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Methodology</span>
              </div>
              <Methodology index={selectedMeta} />
            </div>
          </>
        )}
      </div>

      <footer className="app-footer">
        Historical Investment Horizon &amp; Risk Dashboard — descriptive analysis of historical data, not investment advice.
      </footer>
    </div>
  );
}

export default App;
