import React from "react";
import { useNavigate } from "react-router-dom";
import { ResultCard } from "../components";
import { useAppContext } from "../context/AppContext";
import { FiBarChart2, FiSun, FiDollarSign, FiClock, FiZap, FiSettings } from "react-icons/fi";
import { TbLeaf, TbTrees, TbBulb, TbConfetti } from "react-icons/tb";

export default function Insights() {
  const navigate = useNavigate();
  const { solarResults } = useAppContext();
  const {
    annualSavings,
    paybackPeriod,
    carbonReduction,
    treesEquivalent,
    solarGeneration,
    systemSize,
    totalSystemCost,
    insight,
  } = solarResults;

  const hasData = solarGeneration && solarGeneration !== "--";

  return (
    <div className="page-inner">

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon insights-icon"><FiBarChart2 /></div>
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="page-subtitle">Financial returns and environmental impact of your solar installation</p>
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="empty-state glass-card">
          <div className="empty-icon"><FiSun /></div>
          <div className="empty-title">No solar prediction yet</div>
          <p className="empty-desc">
            Run a solar generation prediction first — your financial and environmental
            metrics will appear here automatically.
          </p>
          <button className="cta-btn cta-primary" onClick={() => navigate("/solar")}>
            Go to Solar Predictor →
          </button>
        </div>
      )}

      {/* Results */}
      {hasData && (
        <>
          {/* Solar generation summary banner */}
          <div className="insights-banner glass-card">
            <div className="banner-left">
              <div className="banner-label">Based on your solar prediction</div>
              <div className="banner-value">{solarGeneration}</div>
            </div>
            <div className="banner-icon"><FiSun /></div>
          </div>

          {/* Financial metrics */}
          <div className="section-label">Financial Impact</div>
          <div className="results-row results-row-2">
            <ResultCard label="System Size"     icon={<FiSettings />} value={systemSize} cardClass="result-card-solar"/>
            <ResultCard label="System Cost"     icon={<FiDollarSign />} value={totalSystemCost} cardClass="result-card-savings"/>
            <ResultCard label="Annual Savings"  icon={<FiDollarSign />} value={annualSavings}  cardClass="result-card-savings"/>
            <ResultCard label="Payback Period"  icon={<FiClock />} value={paybackPeriod}  cardClass="result-card-payback"/>
          </div>

          {/* Environmental metrics */}
          <div className="section-label">Environmental Impact</div>
          <div className="results-row results-row-2">
            <ResultCard label="Carbon Reduction"    icon={<TbLeaf />} value={carbonReduction} cardClass="result-card-carbon"/>
            <ResultCard label="Trees Equivalent"    icon={<TbTrees />} value={treesEquivalent} cardClass="result-card-trees"/>
          </div>

          {/* Smart insight */}
          {insight && (
            <>
              <div className="section-label">Smart Insight</div>
              <div className="glass-card insight-card">
                <div className="insight-label"><TbBulb /> AI Recommendation</div>
                <p className="insight-text">{insight}</p>
              </div>
            </>
          )}

          {/* What these numbers mean */}
          <div className="section-label">Understanding your numbers</div>
          <div className="explainer-grid">
            <div className="glass-card explainer-card">
              <div className="explainer-icon"><FiDollarSign /></div>
              <div className="explainer-title">Annual Savings</div>
              <p className="explainer-desc">
                The amount you'd save on electricity bills each year after going solar,
                calculated using your predicted solar output and local tariff rate.
              </p>
            </div>
            <div className="glass-card explainer-card">
              <div className="explainer-icon"><FiClock /></div>
              <div className="explainer-title">Payback Period</div>
              <p className="explainer-desc">
                How many years until your solar system has paid for itself through
                electricity savings. After payback, energy is essentially free.
              </p>
            </div>
            <div className="glass-card explainer-card">
              <div className="explainer-icon"><TbLeaf /></div>
              <div className="explainer-title">Carbon Reduction</div>
              <p className="explainer-desc">
                The kilograms of CO₂ your solar system avoids emitting annually,
                compared to grid electricity generated from fossil fuels.
              </p>
            </div>
            <div className="glass-card explainer-card">
              <div className="explainer-icon"><TbTrees /></div>
              <div className="explainer-title">Trees Equivalent</div>
              <p className="explainer-desc">
                Your annual carbon reduction expressed as the number of mature trees
                needed to absorb the same amount of CO₂ — a relatable comparison.
              </p>
            </div>
          </div>

          <button className="cta-btn cta-secondary" style={{marginTop: "8px"}} onClick={() => navigate("/solar")}>
            ← Re-run Solar Prediction
          </button>

          {/* Comparison View */}
          {(() => {
            const elecHistory = JSON.parse(localStorage.getItem("elec_history") || "[]");
            if (elecHistory.length === 0) return null;
            const latest = elecHistory[0];
            const elecMatch = latest.result.match(/([\d.]+)\s*kWh/);
            const elecKwh = elecMatch ? parseFloat(elecMatch[1]) : null;
            const solarMatch = solarGeneration.match(/([\d.]+)/);
            const solarKwh = solarMatch ? parseFloat(solarMatch[1]) : null;
            const monthlyConsumption = elecKwh || 0;
            const annualConsumption = monthlyConsumption * 12;
            const coverage = annualConsumption > 0 && solarKwh ? ((solarKwh / annualConsumption) * 100).toFixed(0) : null;

            return (
              <>
                <div className="section-label">Energy Comparison</div>
                <div className="comparison-card glass-card">
                  <div className="comparison-header"><FiZap /> Consumption vs <FiSun /> Solar Generation</div>
                  <div className="comparison-grid">
                    <div className="comparison-item">
                      <div className="comparison-label">Annual Consumption</div>
                      <div className="comparison-value comparison-elec">{annualConsumption.toFixed(0)} kWh/yr</div>
                    </div>
                    <div className="comparison-vs">vs</div>
                    <div className="comparison-item">
                      <div className="comparison-label">Solar Generation</div>
                      <div className="comparison-value comparison-solar">{solarKwh?.toFixed(0) || "--"} kWh/yr</div>
                    </div>
                  </div>
                  {coverage && (
                    <div className="comparison-coverage">
                      <div className="coverage-bar-wrap">
                        <div className="coverage-bar" style={{ width: `${Math.min(Number(coverage), 100)}%` }} />
                      </div>
                      <div className="coverage-text">
                        Solar covers <strong>{coverage}%</strong> of your annual electricity needs
                        {Number(coverage) >= 100 && <> — you'd be energy positive! <TbConfetti /></>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
