import React, { useState, useEffect, useRef } from "react";

const ResultCard = ({ label, icon, value, placeholder = "--", cardClass = "" }) => {
  const isActive = value && value !== "--" && value !== "Error";
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value === prevValue.current) return;
    prevValue.current = value;

    if (!isActive) { setDisplayValue(value); return; }

    const numMatch = value.match(/([\d.]+)/);
    if (!numMatch) { setDisplayValue(value); return; }

    const target = parseFloat(numMatch[1]);
    const prefix = value.substring(0, numMatch.index);
    const suffix = value.substring(numMatch.index + numMatch[0].length);
    const decimals = numMatch[1].includes('.') ? numMatch[1].split('.')[1].length : 0;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = (target * eased).toFixed(decimals);
      setDisplayValue(`${prefix}${current}${suffix}`);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, isActive]);

  return (
    <div className={`glass-card result-card ${cardClass} ${isActive ? "has-value" : ""}`}>
      <div className="result-card-label"><span>{icon}</span>{label}</div>
      <div className={`result-value ${isActive ? "active" : "placeholder"}`}>
        {isActive ? displayValue : placeholder}
      </div>
    </div>
  );
};

export default ResultCard;
