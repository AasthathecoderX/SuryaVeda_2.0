import React, { useState, useCallback, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

import { AppContext } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Navbar, AnimatedBackground, Toast, PrivateRoute } from "./components";

import Home           from "./pages/Home.jsx";
import Electricity    from "./pages/Electricity.jsx";
import Solar          from "./pages/Solar.jsx";
import Insights       from "./pages/Insights.jsx";
import Login          from "./pages/Login.jsx";
import Signup         from "./pages/Signup.jsx";
import Dashboard      from "./pages/Dashboard.jsx";
import RoiCalculator  from "./pages/RoiCalculator.jsx";

// Re-export for backward compatibility
export { AppContext, useAppContext, useToast } from "./context/AppContext";
export { default as SolarPanelSvg } from "./components/common/SolarPanelSvg.jsx";
export { default as InputField } from "./components/common/InputField.jsx";
export { default as ResultCard } from "./components/common/ResultCard.jsx";

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const toastIdRef = useRef(0);

  const [solarResults, setSolarResults] = useState(() => {
    try {
      const saved = localStorage.getItem("sv_solar_results");
      return saved ? JSON.parse(saved) : {
        solarGeneration: "--",
        systemSize:      "--",
        costPerKw:       "--",
        totalSystemCost: "--",
        annualSavings:   "--",
        paybackPeriod:   "--",
        carbonReduction: "--",
        treesEquivalent: "--",
        insight:         "",
      };
    } catch {
      return {
        solarGeneration: "--",
        systemSize:      "--",
        costPerKw:       "--",
        totalSystemCost: "--",
        annualSavings:   "--",
        paybackPeriod:   "--",
        carbonReduction: "--",
        treesEquivalent: "--",
        insight:         "",
      };
    }
  });

  const [tariffRate, setTariffRate] = useState(() => localStorage.getItem("sv_tariff_rate") || "");
  const [toasts, setToasts] = useState([]);

  // Persist solarResults to localStorage when they change
  const updateSolarResults = useCallback((results) => {
    setSolarResults(results);
    try {
      localStorage.setItem("sv_solar_results", JSON.stringify(results));
    } catch { /* ignore quota errors */ }
  }, []);

  // Persist tariff rate
  const updateTariffRate = useCallback((rate) => {
    setTariffRate(rate);
    localStorage.setItem("sv_tariff_rate", rate);
  }, []);

  const addToast = useCallback((message, type = "error") => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ThemeProvider>
      <AppContext.Provider value={{ solarResults, setSolarResults: updateSolarResults, tariffRate, setTariffRate: updateTariffRate, addToast }}>
        <AuthProvider>
          <div className="surya-root">
            <AnimatedBackground />
            <Navbar />
            <main className="page-content">
              <Routes>
                <Route path="/"              element={<Home />} />
                <Route path="/electricity"   element={<Electricity />} />
                <Route path="/solar"         element={<Solar />} />
                <Route path="/insights"      element={<Insights />} />
                <Route path="/login"         element={<Login />} />
                <Route path="/signup"        element={<Signup />} />
                <Route path="/dashboard"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/roi-calculator" element={<RoiCalculator />} />
                <Route path="*" element={
                  <div className="page-inner">
                    <div className="empty-state glass-card">
                      <div className="empty-title">404 — Page Not Found</div>
                      <p className="empty-desc">The page you're looking for doesn't exist.</p>
                    </div>
                  </div>
                } />
              </Routes>
            </main>
            <Toast toasts={toasts} removeToast={removeToast} />
          </div>
        </AuthProvider>
      </AppContext.Provider>
    </ThemeProvider>
  );
}
