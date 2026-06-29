import React from "react";
import { useNavigate } from "react-router-dom";
import { SolarPanelSvg } from "../components";
import { FiZap, FiSun, FiBarChart2, FiDollarSign, FiClock } from "react-icons/fi";
import { TbBulb, TbLeaf, TbTrees, TbCpu } from "react-icons/tb";

export default function Home() {
  const navigate = useNavigate();

  const steps = [
    {
      num: "01", icon: <FiZap />, title: "Predict Electricity",
      desc: "Enter your household appliance counts, monthly usage hours, and tariff rate to get an accurate monthly consumption and bill estimate.",
      action: () => navigate("/electricity"),
      cta: "Try it →",
    },
    {
      num: "02", icon: <FiSun />, title: "Predict Solar Output",
      desc: "Input your location coordinates, cloud coverage, system size, cost per kW, and geographic zone to discover your rooftop solar generation potential.",
      action: () => navigate("/solar"),
      cta: "Try it →",
    },
    {
      num: "03", icon: <FiBarChart2 />, title: "View Insights",
      desc: "After running a solar prediction, see your annual savings, payback period, carbon reduction, and trees-equivalent environmental impact all in one place.",
      action: () => navigate("/insights"),
      cta: "See insights →",
    },
    {
      num: "04", icon: <TbBulb />, title: "Make Decisions",
      desc: "Compare your energy consumption against solar generation potential and use the financial metrics to decide if solar installation makes sense for you.",
      action: null,
      cta: null,
    },
  ];

  const stats = [
    { value: "300+",   label: "Sunny days/year in India" },
    { value: "7–8×",   label: "ROI over 25 years"        },
    { value: "~5 yrs", label: "Average payback period"   },
    { value: "1.5T kg",label: "CO₂ saved if all rooftops go solar" },
  ];

  return (
    <div className="page-home">

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-content">
          <div className="hero-badge"><span><TbCpu /></span> AI Energy Intelligence</div>
          <h1 className="home-title">
            Make smarter<br />
            <span className="title-accent">energy decisions</span><br />
            with AI
          </h1>
          <p className="home-sub">
            SuryaVeda uses machine learning to predict your household electricity
            consumption and solar generation potential — so you can plan your
            sustainable future with confidence.
          </p>
          <div className="hero-cta-row">
            <button className="cta-btn cta-primary" onClick={() => navigate("/electricity")}>
              <FiZap /> Predict Consumption
            </button>
            <button className="cta-btn cta-secondary" onClick={() => navigate("/solar")}>
              <FiSun /> Explore Solar
            </button>
          </div>
        </div>
        <div className="home-hero-visual">
          <div className="hero-svg-wrap">
            <SolarPanelSvg />
          </div>
          <div className="hero-glow" />
        </div>
      </section>

      {/* Stats Strip */}
      <section className="stats-strip">
        {stats.map((s, i) => (
          <div className="stat-item" key={i}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="howto-section">
        <div className="section-label">How SuryaVeda works</div>
        <h2 className="section-heading">Four steps to energy clarity</h2>

        <div className="steps-grid">
          {steps.map((step) => (
            <div className="step-card" key={step.num}>
              <div className="step-num">{step.num}</div>
              <span className="step-icon">{step.icon}</span>
              <div className="step-title">{step.title}</div>
              <p className="step-desc">{step.desc}</p>
              {step.action && (
                <button className="step-cta" onClick={step.action}>
                  {step.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* What you'll learn */}
      <section className="learn-section">
        <div className="section-label">What you get</div>
        <div className="learn-grid">
          {[
            { icon: <FiZap />, title: "Monthly kWh & bill",       desc: "Know exactly how much electricity your home consumes and what it costs." },
            { icon: <FiSun />, title: "Annual solar output",       desc: "See how many kWh your rooftop could generate based on your real location." },
            { icon: <FiDollarSign />, title: "Annual savings",            desc: "Find out how much you'd save on electricity bills after going solar." },
            { icon: <FiClock />, title: "Payback period",            desc: "Understand exactly how many years until your solar system pays for itself." },
            { icon: <TbLeaf />, title: "Carbon footprint reduction",desc: "See your annual CO₂ savings in kilograms — a tangible environmental impact." },
            { icon: <TbTrees />, title: "Trees equivalent",          desc: "Your carbon reduction translated into trees planted — a relatable metric." },
          ].map((item, i) => (
            <div className="learn-card glass-card" key={i}>
              <span className="learn-icon">{item.icon}</span>
              <div className="learn-title">{item.title}</div>
              <p className="learn-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <TbLeaf /> Powered by machine learning · Built for a sustainable India
      </footer>
    </div>
  );
}
