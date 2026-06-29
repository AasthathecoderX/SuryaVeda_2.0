import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InputField, ResultCard } from "../components";
import { useAppContext, useToast } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api";
import { FiSun, FiMapPin, FiBarChart2, FiDollarSign, FiAlertTriangle, FiNavigation } from "react-icons/fi";
import { TbMap2 } from "react-icons/tb";

const encodeZone = (zone) => {
  const map = { central:"CENTRAL ZONE", east:"EAST ZONE", north:"NORTH ZONE", south:"SOUTH ZONE", west:"WEST ZONE" };
  return map[zone.toLowerCase()] ?? "CENTRAL ZONE";
};

// Determine zone from coordinates (rough India zones)
const detectZone = (lat, lng) => {
  if (lat > 28) return "North";
  if (lat < 15) return "South";
  if (lng > 85) return "East";
  if (lng < 75) return "West";
  return "Central";
};

export default function Solar() {
  const navigate = useNavigate();
  const { tariffRate, setSolarResults } = useAppContext();
  const { token } = useAuth();
  const addToast = useToast();

  const [latitude,    setLatitude]    = useState("");
  const [longitude,   setLongitude]   = useState("");
  const [cloudAmount, setCloudAmount] = useState("");
  const [zone,        setZone]        = useState("Central");
  const [systemSize,  setSystemSize]  = useState("");
  const [costPerKw,   setCostPerKw]   = useState("");

  const [solarGeneration, setSolarGeneration] = useState("--");
  const [progress,        setProgress]        = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [detecting,       setDetecting]       = useState(false);
  const [errors,          setErrors]          = useState({});
  const [history,         setHistory]         = useState(() => {
    try { return JSON.parse(localStorage.getItem("solar_history") || "[]"); } catch { return []; }
  });

  // Sync history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("solar_history", JSON.stringify(history));
  }, [history]);

  // Auto-detect location using browser Geolocation + Open-Meteo
  const handleDetect = async () => {
    if (!navigator.geolocation) {
      addToast("Geolocation is not supported by your browser.", "error");
      return;
    }

    setDetecting(true);
    addToast("Detecting your location...", "info");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lng = position.coords.longitude.toFixed(4);
        setLatitude(lat);
        setLongitude(lng);
        setZone(detectZone(parseFloat(lat), parseFloat(lng)));

        // Fetch cloud coverage from Open-Meteo
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=cloud_cover_mean&timezone=auto&forecast_days=7`
          );
          const data = await res.json();
          if (data.daily?.cloud_cover_mean) {
            const avgCloud = (data.daily.cloud_cover_mean.reduce((a, b) => a + b, 0) / data.daily.cloud_cover_mean.length).toFixed(0);
            setCloudAmount(avgCloud);
            addToast(`Location detected! Lat: ${lat}, Lng: ${lng}, Cloud: ${avgCloud}%`, "success");
          } else {
            addToast(`Location detected! Cloud data unavailable — please enter manually.`, "info");
          }
        } catch {
          addToast("Location detected but couldn't fetch weather data.", "info");
        }
        setDetecting(false);
      },
      (err) => {
        setDetecting(false);
        addToast(`Location access denied: ${err.message}`, "error");
      },
      { timeout: 10000 }
    );
  };

  const validate = () => {
    const e = {};
    if (!latitude) e.latitude = "Required";
    if (!longitude) e.longitude = "Required";
    if (!cloudAmount) e.cloudAmount = "Required";
    else if (Number(cloudAmount) < 0 || Number(cloudAmount) > 100) e.cloudAmount = "0–100%";
    if (!systemSize) e.systemSize = "Required";
    else if (Number(systemSize) <= 0) e.systemSize = "Must be greater than 0";
    if (!costPerKw) e.costPerKw = "Required";
    else if (Number(costPerKw) <= 0) e.costPerKw = "Must be greater than 0";
    return e;
  };

  const handlePredict = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      addToast("Please fix the highlighted fields.", "error");
      return;
    }

    setLoading(true);
    setProgress(0);
    setSolarGeneration("--");

    const tick = setInterval(() => {
      setProgress(p => { if (p >= 90) { clearInterval(tick); return 90; } return p + 12; });
    }, 60);

    const encodedZone = encodeZone(zone);
    const features = [
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(cloudAmount),
      encodedZone === "CENTRAL ZONE" ? 1 : 0,
      encodedZone === "EAST ZONE"    ? 1 : 0,
      encodedZone === "NORTH ZONE"   ? 1 : 0,
      encodedZone === "SOUTH ZONE"   ? 1 : 0,
      encodedZone === "WEST ZONE"    ? 1 : 0,
    ];

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/predict_solar`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          features,
          tariff_rate: parseFloat(tariffRate || 7),
          system_size: parseFloat(systemSize),
          cost_per_kw: parseFloat(costPerKw),
        }),
      });
      const data = await res.json();

      if (data.error) {
        setSolarGeneration("Error");
        addToast(`Prediction error: ${data.error}`, "error");
      } else if (data.prediction !== undefined) {
        const genValue = `${Number(data.prediction).toFixed(2)} kWh / year`;
        setSolarGeneration(genValue);
        addToast("Solar prediction complete!", "success");

        const results = {
          solarGeneration: genValue,
          systemSize:      `${data.system_size} kW`,
          costPerKw:       `₹${data.cost_per_kw}/kW`,
          totalSystemCost: `₹${data.total_system_cost}`,
          annualSavings:   `₹${data.annual_savings}`,
          paybackPeriod:   `${data.payback_period} years`,
          carbonReduction: `${data.carbon_reduction} kg CO₂/yr`,
          treesEquivalent: `${data.trees_equivalent} trees`,
          insight:         data.insight || "",
        };

        setSolarResults(results);

        setHistory(prev => [{ ...results, date: new Date().toLocaleString(), inputs: { latitude, longitude, cloudAmount, zone, systemSize, costPerKw } }, ...prev].slice(0, 10));
      }
    } catch (err) {
      setSolarGeneration("Error");
      addToast("Could not reach the prediction server: " + err.message, "error");
    } finally {
      clearInterval(tick);
      setProgress(100);
      setLoading(false);
      setTimeout(() => setProgress(0), 700);
    }
  };

  return (
    <div className="page-inner">

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon solar-icon"><FiSun /></div>
        <div>
          <h1 className="page-title">Solar Generation Predictor</h1>
          <p className="page-subtitle">Discover your rooftop solar potential based on location and system details</p>
        </div>
      </div>

      {/* Form card */}
      <div className="glass-card">
        <div className="form-section-title">Location &amp; System Details</div>

        {/* Detect button */}
        <div className="detect-row">
          <button
            className="detect-btn"
            onClick={handleDetect}
            disabled={detecting}
            type="button"
          >
            {detecting ? <><FiNavigation /> Detecting...</> : <><FiMapPin /> Auto-Detect My Location</>}
          </button>
          <span className="detect-hint">Uses your GPS + Open-Meteo weather data. You can overwrite any value.</span>
        </div>

        <div className="solar-grid">
          <InputField label="Latitude"            value={latitude}    onChange={setLatitude}    placeholder="e.g. 12.9716" error={errors.latitude}/>
          <InputField label="Longitude"           value={longitude}   onChange={setLongitude}   placeholder="e.g. 77.5946" error={errors.longitude}/>
          <InputField label="Cloud Coverage (%)"  value={cloudAmount} onChange={setCloudAmount} placeholder="0 – 100" error={errors.cloudAmount}/>
          <InputField label="System Size (kW)"    value={systemSize}  onChange={setSystemSize}  placeholder="e.g. 5" error={errors.systemSize}/>
          <InputField label="System Cost (₹/kW)"  value={costPerKw}   onChange={setCostPerKw}   placeholder="e.g. 60000" error={errors.costPerKw}/>

          <div className="input-group">
            <label>Geographical Zone</label>
            <select className="fancy-input" value={zone} onChange={e => setZone(e.target.value)}>
              {["Central","East","North","South","West"].map(z => <option key={z}>{z}</option>)}
            </select>
          </div>

          {tariffRate ? (
            <div className="input-group">
              <label>Tariff Rate (₹/kWh)</label>
              <div className="tariff-autofill">
                <span className="tariff-val">₹{tariffRate}/kWh</span>
                <span className="tariff-source">Auto-filled from Electricity page</span>
              </div>
            </div>
          ) : (
            <div className="input-group">
              <label>Tariff Rate (₹/kWh)</label>
              <div className="tariff-missing">
                <FiAlertTriangle /> Set this on the <span onClick={() => navigate("/electricity")} className="link-inline">Electricity page</span> first, or it defaults to ₹7/kWh.
              </div>
            </div>
          )}
        </div>

        <button
          className={`predict-btn predict-btn-solar ${loading ? "btn-loading" : ""}`}
          onClick={handlePredict}
          disabled={loading}
        >
          {loading ? "Calculating…" : <><FiSun /> Predict Solar Generation</>}
        </button>

        {progress > 0 && (
          <div className="progress-wrap">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Result */}
      <div className="section-label">Result</div>
      <ResultCard
        label="Predicted Annual Solar Generation"
        icon={<FiSun />}
        value={solarGeneration}
        placeholder="Run the prediction above to see your result"
        cardClass="result-card-solar result-card-large"
      />

      {solarGeneration !== "--" && solarGeneration !== "Error" && (
        <div className="goto-insights glass-card">
          <div className="goto-text">
            <span className="goto-icon"><FiBarChart2 /></span>
            <div>
              <div className="goto-title">See the full financial breakdown</div>
              <div className="goto-sub">Annual savings, payback period, carbon reduction — all waiting on the Insights page.</div>
            </div>
          </div>
          <button className="cta-btn cta-primary" onClick={() => navigate("/insights")}>
            View Insights →
          </button>
        </div>
      )}

      {/* Zone reference */}
      <div className="zone-reference glass-card">
        <div className="tips-title"><TbMap2 /> India zone reference</div>
        <div className="zone-grid">
          {[
            { zone: "North",   states: "J&K, HP, Punjab, Haryana, Delhi, UP, Uttarakhand" },
            { zone: "South",   states: "Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, Telangana" },
            { zone: "East",    states: "West Bengal, Odisha, Bihar, Jharkhand, Assam" },
            { zone: "West",    states: "Rajasthan, Gujarat, Maharashtra, Goa" },
            { zone: "Central", states: "Madhya Pradesh, Chhattisgarh" },
          ].map(z => (
            <div className="zone-item" key={z.zone}>
              <span className="zone-name">{z.zone}</span>
              <span className="zone-states">{z.states}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Prediction History */}
      {history.length > 0 && (
        <div className="history-section">
          <div className="section-label">Prediction History</div>
          <div className="history-list glass-card">
            {history.map((h, i) => (
              <div className="history-item" key={i}>
                <div className="history-result">{h.solarGeneration}</div>
                <div className="history-meta">
                  <span><FiDollarSign /> {h.annualSavings}</span>
                  <span>⏳ {h.paybackPeriod}</span>
                </div>
                <div className="history-date">{h.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
