import React, { useState } from "react";
import { InputField } from "../components";
import { useToast } from "../context/AppContext";
import { FiTrendingUp } from "react-icons/fi";
import { TbBulb } from "react-icons/tb";

export default function RoiCalculator() {
  const addToast = useToast();

  const [costPerKw, setCostPerKw] = useState("");
  const [systemSize, setSystemSize] = useState("");
  const [annualGenerationPerKw, setAnnualGenerationPerKw] = useState("");
  const [tariffRate, setTariffRate] = useState("");
  const [annualIncrease, setAnnualIncrease] = useState("5");
  const [degradation, setDegradation] = useState("0.5");
  const [systemLife, setSystemLife] = useState("25");
  const [maintenanceCost, setMaintenanceCost] = useState("2000");

  const [results, setResults] = useState(null);

  const calculate = () => {
    if (!costPerKw || !systemSize || !annualGenerationPerKw || !tariffRate) {
      addToast("Please fill in cost per kW, system size, annual generation per kW, and tariff rate.", "error");
      return;
    }

    const cost = parseFloat(costPerKw) * parseFloat(systemSize);
    const genKwh = parseFloat(annualGenerationPerKw) * parseFloat(systemSize);
    const tariff = parseFloat(tariffRate);
    const increase = parseFloat(annualIncrease) / 100;
    const degrad = parseFloat(degradation) / 100;
    const life = parseInt(systemLife);
    const maintenance = parseFloat(maintenanceCost);

    let cumulativeSavings = 0;
    let paybackYear = null;
    const yearlyData = [];

    for (let year = 1; year <= life; year++) {
      const genThisYear = genKwh * Math.pow(1 - degrad, year - 1);
      const tariffThisYear = tariff * Math.pow(1 + increase, year - 1);
      const savingsThisYear = genThisYear * tariffThisYear - maintenance;
      cumulativeSavings += savingsThisYear;

      yearlyData.push({
        year,
        generation: Math.round(genThisYear),
        tariff: tariffThisYear.toFixed(2),
        savings: Math.round(savingsThisYear),
        cumulative: Math.round(cumulativeSavings),
        roi: (((cumulativeSavings - cost) / cost) * 100).toFixed(1),
      });

      if (!paybackYear && cumulativeSavings >= cost) {
        paybackYear = year;
      }
    }

    const totalSavings = cumulativeSavings;
    const netProfit = totalSavings - cost;
    const roi = ((netProfit / cost) * 100).toFixed(1);

    setResults({
      paybackYear: paybackYear || `>${life}`,
      systemCost: Math.round(cost),
      annualGeneration: Math.round(genKwh),
      totalSavings: Math.round(totalSavings),
      netProfit: Math.round(netProfit),
      roi,
      yearlyData,
    });

    addToast("ROI calculation complete!", "success");
  };

  return (
    <div className="page-inner">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon roi-icon"><FiTrendingUp /></div>
        <div>
          <h1 className="page-title">ROI / Payback Calculator</h1>
          <p className="page-subtitle">Calculate your solar investment returns over time with inflation and degradation</p>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card">
        <div className="form-columns">
          <div>
            <div className="form-section-title">System Details</div>
            <InputField label="System Size (kW)" value={systemSize} onChange={setSystemSize} placeholder="e.g. 5" />
            <InputField label="System Cost (₹/kW)" value={costPerKw} onChange={setCostPerKw} placeholder="e.g. 60000" />
            <InputField label="Annual Generation (kWh/kW/year)" value={annualGenerationPerKw} onChange={setAnnualGenerationPerKw} placeholder="e.g. 1400" />
            <InputField label="Current Tariff Rate (₹/kWh)" value={tariffRate} onChange={setTariffRate} placeholder="e.g. 7.5" />
          </div>
          <div>
            <div className="form-section-title">Advanced Parameters</div>
            <InputField label="Annual Tariff Increase (%)" value={annualIncrease} onChange={setAnnualIncrease} placeholder="e.g. 5" />
            <InputField label="Panel Degradation (%/year)" value={degradation} onChange={setDegradation} placeholder="e.g. 0.5" />
            <InputField label="System Lifetime (years)" value={systemLife} onChange={setSystemLife} placeholder="e.g. 25" />
            <InputField label="Annual Maintenance (₹)" value={maintenanceCost} onChange={setMaintenanceCost} placeholder="e.g. 2000" />
          </div>
        </div>

        <button className="predict-btn predict-btn-elec" onClick={calculate}>
          <FiTrendingUp /> Calculate ROI
        </button>
      </div>

      {/* Results Summary */}
      {results && (
        <>
          <div className="section-label">Results Summary</div>
          <div className="roi-summary">
            <div className="roi-summary-card glass-card">
              <div className="roi-metric-label">Total System Cost</div>
              <div className="roi-metric-value roi-savings">₹{results.systemCost.toLocaleString()}</div>
            </div>
            <div className="roi-summary-card glass-card">
              <div className="roi-metric-label">Annual Generation</div>
              <div className="roi-metric-value roi-profit">{results.annualGeneration.toLocaleString()} kWh</div>
            </div>
            <div className="roi-summary-card glass-card">
              <div className="roi-metric-label">Payback Period</div>
              <div className="roi-metric-value roi-payback">{results.paybackYear} years</div>
            </div>
            <div className="roi-summary-card glass-card">
              <div className="roi-metric-label">Total Savings ({systemLife} yrs)</div>
              <div className="roi-metric-value roi-savings">₹{results.totalSavings.toLocaleString()}</div>
            </div>
            <div className="roi-summary-card glass-card">
              <div className="roi-metric-label">Net Profit</div>
              <div className="roi-metric-value roi-profit">₹{results.netProfit.toLocaleString()}</div>
            </div>
            <div className="roi-summary-card glass-card">
              <div className="roi-metric-label">Total ROI</div>
              <div className="roi-metric-value roi-percent">{results.roi}%</div>
            </div>
          </div>

          {/* Year-by-year table */}
          <div className="section-label">Year-by-Year Breakdown</div>
          <div className="glass-card roi-table-wrap">
            <table className="roi-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Generation (kWh)</th>
                  <th>Tariff (₹)</th>
                  <th>Annual Savings (₹)</th>
                  <th>Cumulative (₹)</th>
                  <th>ROI (%)</th>
                </tr>
              </thead>
              <tbody>
                {results.yearlyData.map(row => (
                  <tr key={row.year} className={row.cumulative >= results.systemCost ? "roi-positive" : ""}>
                    <td>{row.year}</td>
                    <td>{row.generation.toLocaleString()}</td>
                    <td>₹{row.tariff}</td>
                    <td>₹{row.savings.toLocaleString()}</td>
                    <td>₹{row.cumulative.toLocaleString()}</td>
                    <td className={parseFloat(row.roi) >= 0 ? "text-green" : "text-red"}>{row.roi}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tips */}
      <div className="tips-card glass-card">
        <div className="tips-title"><TbBulb /> About this calculator</div>
        <ul className="tips-list">
          <li>Annual generation per kW can be taken from your Solar Prediction result.</li>
          <li>Tariff increase of 5% is typical for India (CERC data).</li>
          <li>Panel degradation of 0.5%/year is industry standard for Tier-1 panels.</li>
          <li>Maintenance includes cleaning, inverter checks, and minor repairs.</li>
          <li>Rows turn green once cumulative savings exceed system cost (payback reached).</li>
        </ul>
      </div>
    </div>
  );
}
