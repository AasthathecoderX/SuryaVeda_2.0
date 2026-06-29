import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Skeleton } from "../components";
import { API_URL } from "../config/api";
import { FiClipboard, FiZap, FiSun, FiTrendingUp, FiBarChart2, FiLogOut } from "react-icons/fi";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const url = filter === "all"
      ? `${API_URL}/api/predictions`
      : `${API_URL}/api/predictions?type=${filter}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setPredictions(data.predictions || []))
      .catch(() => setPredictions([]))
      .finally(() => setLoading(false));
  }, [token, filter]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatResult = (pred) => {
    try {
      const result = JSON.parse(pred.result);
      if (pred.type === "electricity") {
        return `₹${result.prediction} (${result.unit})`;
      } else {
        return `${result.prediction} kWh/yr · ₹${result.annual_savings} savings`;
      }
    } catch {
      return pred.result;
    }
  };

  const formatInputs = (pred) => {
    try {
      const inputs = JSON.parse(pred.inputs);
      if (pred.type === "electricity") {
        return `Features: [${inputs.features?.join(", ")}]`;
      } else {
        return `Lat: ${inputs.features?.[0]}, Lng: ${inputs.features?.[1]}, Size: ${inputs.system_size} kW, Cost: ₹${inputs.total_system_cost}`;
      }
    } catch {
      return "";
    }
  };

  if (!user) {
    return null; // PrivateRoute handles redirect
  }

  return (
    <div className="page-inner">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-icon dashboard-icon"><FiClipboard /></div>
        <div>
          <h1 className="page-title">Welcome, {user.name}</h1>
          <p className="page-subtitle">Your personalized energy prediction dashboard</p>
        </div>
      </div>

      {/* User info card */}
      <div className="glass-card dashboard-user-card">
        <div className="dashboard-user-info">
          <div className="dashboard-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="dashboard-user-name">{user.name}</div>
            <div className="dashboard-user-email">{user.email}</div>
          </div>
        </div>
        <button className="cta-btn cta-secondary" onClick={handleLogout}>
          <FiLogOut /> Logout
        </button>
      </div>

      {/* Quick actions */}
      <div className="section-label">Quick Actions</div>
      <div className="dashboard-actions">
        <button className="cta-btn cta-primary" onClick={() => navigate("/electricity")}>
          <FiZap /> Predict Electricity
        </button>
        <button className="cta-btn cta-primary" onClick={() => navigate("/solar")}>
          <FiSun /> Predict Solar
        </button>
        <button className="cta-btn cta-secondary" onClick={() => navigate("/roi-calculator")}>
          <FiTrendingUp /> ROI Calculator
        </button>
      </div>

      {/* Prediction History */}
      <div className="section-label">Prediction History</div>
      <div className="dashboard-filters">
        {["all", "electricity", "solar"].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "filter-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? <><FiClipboard /> All</> : f === "electricity" ? <><FiZap /> Electricity</> : <><FiSun /> Solar</>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="predictions-list">
          {[1,2,3].map(i => (
            <div className="glass-card skeleton-card" key={i}>
              <Skeleton width="30%" height="12px" />
              <Skeleton width="60%" height="20px" style={{ marginTop: "12px" }} />
              <Skeleton width="90%" height="14px" style={{ marginTop: "8px" }} />
              <Skeleton width="50%" height="14px" style={{ marginTop: "6px" }} />
            </div>
          ))}
        </div>
      ) : predictions.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon"><FiBarChart2 /></div>
          <div className="empty-title">No predictions yet</div>
          <p className="empty-desc">
            Run electricity or solar predictions while logged in — they'll appear here automatically.
          </p>
        </div>
      ) : (
        <div className="predictions-list">
          {predictions.map(pred => (
            <div className={`prediction-item glass-card pred-${pred.type}`} key={pred.id}>
              <div className="pred-header">
                <span className="pred-type-badge">
                  {pred.type === "electricity" ? <><FiZap /> Electricity</> : <><FiSun /> Solar</>}
                </span>
                <span className="pred-date">
                  {new Date(pred.created_at).toLocaleDateString()} {new Date(pred.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </span>
              </div>
              <div className="pred-result">{formatResult(pred)}</div>
              <div className="pred-inputs">{formatInputs(pred)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
