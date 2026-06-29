import React, { useState, useEffect } from "react";
import { InputField, ResultCard } from "../components";
import { useAppContext, useToast } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api";
import { FiZap, FiInfo } from "react-icons/fi";
import { TbBulb } from "react-icons/tb";

export default function Electricity() {
  const { tariffRate, setTariffRate } = useAppContext();
  const { token } = useAuth();
  const addToast = useToast();

  const [fan,           setFan]           = useState("");
  const [refrigerator,  setRefrigerator]  = useState("");
  const [airConditioner,setAC]            = useState("");
  const [television,    setTV]            = useState("");
  const [monitor,       setMonitor]       = useState("");
  const [motorPump,     setMotorPump]     = useState("");
  const [month,         setMonth]         = useState("");
  const [monthlyHours,  setMonthlyHours]  = useState("");

  const [energyConsumption, setEnergyConsumption] = useState("--");
  const [progress,          setProgress]          = useState(0);
  const [loading,           setLoading]           = useState(false);
  const [errors,            setErrors]            = useState({});
  const [history,           setHistory]           = useState(() => {
    try { return JSON.parse(localStorage.getItem("elec_history") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("elec_history", JSON.stringify(history));
  }, [history]);

  const validate = () => {
    const e = {};
    if (!fan) e.fan = "Required";
    if (!refrigerator) e.refrigerator = "Required";
    if (!airConditioner) e.airConditioner = "Required";
    if (!television) e.television = "Required";
    if (!monitor) e.monitor = "Required";
    if (!motorPump) e.motorPump = "Required";
    if (!month) e.month = "Required";
    else if (Number(month) < 1 || Number(month) > 12) e.month = "Must be 1–12";
    if (!monthlyHours) e.monthlyHours = "Required";
    if (!tariffRate) e.tariffRate = "Required";
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
    setEnergyConsumption("--");

    const fields = [fan, refrigerator, airConditioner, television, monitor, motorPump, month, monthlyHours, tariffRate];

    const tick = setInterval(() => {
      setProgress(p => { if (p >= 90) { clearInterval(tick); return 90; } return p + 12; });
    }, 60);

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/predict_electricity`, {
        method: "POST",
        headers,
        body: JSON.stringify({ features: fields.map(Number) }),
      });
      const data = await res.json();

      if (data.error) {
        addToast(`Prediction error: ${data.error}`, "error");
        setEnergyConsumption("Error");
      } else if (data.prediction !== undefined) {
        const bill = data.prediction;
        const consumption = data.consumption ?? bill / parseFloat(tariffRate);
        const method = data.method === "ml_model" ? "AI" : "Estimate";
        const result = `${consumption.toFixed(2)} kWh/month · ₹${bill.toFixed(2)}`;
        setEnergyConsumption(result);
        addToast(`Electricity prediction complete! (${method})`, "success");

        setHistory(prev => [{ result, method, date: new Date().toLocaleString(), inputs: { fan, refrigerator, airConditioner, television, monitor, motorPump, month, monthlyHours, tariffRate } }, ...prev].slice(0, 10));
      }
    } catch (err) {
      setEnergyConsumption("Error");
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
        <div className="page-header-icon elec-icon"><FiZap /></div>
        <div>
          <h1 className="page-title">Electricity Consumption</h1>
          <p className="page-subtitle">Enter your appliances and usage details to predict your monthly bill</p>
        </div>
      </div>

      {/* Form card */}
      <div className="glass-card">
        <div className="form-columns">

          {/* LEFT: Appliances */}
          <div>
            <div className="form-section-title">Household Appliances</div>
            <InputField label="Fans (count)"             value={fan}           onChange={setFan}           placeholder="e.g. 3" error={errors.fan}/>
            <InputField label="Refrigerators (count)"    value={refrigerator}  onChange={setRefrigerator}  placeholder="e.g. 1" error={errors.refrigerator}/>
            <InputField label="Air Conditioners (count)" value={airConditioner} onChange={setAC}           placeholder="e.g. 1" error={errors.airConditioner}/>
            <InputField label="Televisions (count)"      value={television}    onChange={setTV}            placeholder="e.g. 2" error={errors.television}/>
            <InputField label="Monitors (count)"         value={monitor}       onChange={setMonitor}       placeholder="e.g. 2" error={errors.monitor}/>
            <InputField label="Motor Pumps (count)"      value={motorPump}     onChange={setMotorPump}     placeholder="e.g. 1" error={errors.motorPump}/>
          </div>

          {/* RIGHT: Usage */}
          <div>
            <div className="form-section-title">Usage Details</div>
            <InputField label="Month (1 – 12)"          value={month}        onChange={setMonth}        placeholder="e.g. 6 for June" error={errors.month}/>
            <InputField label="Monthly Hours of Usage"  value={monthlyHours} onChange={setMonthlyHours} placeholder="Total hours/month" error={errors.monthlyHours}/>
            <InputField label="Tariff Rate (₹/kWh)"    value={tariffRate}   onChange={setTariffRate}   placeholder="e.g. 7.5" error={errors.tariffRate}/>
            <div className="tariff-note">
              <FiInfo /> Your tariff rate is shared with the Solar page automatically.
            </div>
          </div>
        </div>

        <button
          className={`predict-btn predict-btn-elec ${loading ? "btn-loading" : ""}`}
          onClick={handlePredict}
          disabled={loading}
        >
          {loading ? "Calculating…" : <><FiZap /> Predict Electricity Consumption</>}
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
        label="Predicted Household Energy Consumption"
        icon={<FiZap />}
        value={energyConsumption}
        placeholder="Run the prediction above to see your result"
        cardClass="result-card-elec result-card-large"
      />

      {/* Tips */}
      <div className="tips-card glass-card">
        <div className="tips-title"><TbBulb /> Tips for accurate results</div>
        <ul className="tips-list">
          <li>Count every appliance that runs regularly, not just major ones.</li>
          <li>Monthly hours = daily average hours × 30.</li>
          <li>Your tariff rate is printed on your electricity bill (₹/unit).</li>
          <li>For summer months (Apr–Jun), AC usage significantly increases consumption.</li>
        </ul>
      </div>

      {/* Prediction History */}
      {history.length > 0 && (
        <div className="history-section">
          <div className="section-label">Prediction History</div>
          <div className="history-list glass-card">
            {history.map((h, i) => (
              <div className="history-item" key={i}>
                <div className="history-result">{h.result}</div>
                <div className="history-date">{h.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
