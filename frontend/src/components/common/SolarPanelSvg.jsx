import React from "react";

const SolarPanelSvg = () => (
  <svg
    width="160" height="110"
    viewBox="0 0 180 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="solar-svg"
    aria-hidden="true"
  >
    <defs>
      <filter id="sun-glow">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="44" cy="28" r="20" fill="#f5c842" filter="url(#sun-glow)" opacity="0.95"/>
    <circle cx="44" cy="28" r="12" fill="#fff8c0"/>
    {[0,45,90,135,180,225,270,315].map((deg, i) => (
      <line key={i}
        x1={44 + 23 * Math.cos((deg * Math.PI) / 180)}
        y1={28 + 23 * Math.sin((deg * Math.PI) / 180)}
        x2={44 + 30 * Math.cos((deg * Math.PI) / 180)}
        y2={28 + 30 * Math.sin((deg * Math.PI) / 180)}
        stroke="#f5c842" strokeWidth="2" strokeLinecap="round" opacity="0.7"
      />
    ))}
    <rect x="28" y="58" width="130" height="52" rx="8"
      fill="#0e2044" stroke="#2ee8c4" strokeWidth="1.5"/>
    {[0,1,2,3].map(col => [0,1].map(row => (
      <rect key={`${col}-${row}`}
        x={35 + col * 30} y={65 + row * 20}
        width="25" height="15" rx="2"
        fill="#1a4a8a" stroke="#2ee8c4" strokeWidth="0.8" opacity="0.85"
      />
    )))}
    <polygon points="80,110 93,110 90,108 83,108" fill="#1e3a5f"/>
    <rect x="84" y="107" width="5" height="5" rx="1" fill="#2a4f78"/>
  </svg>
);

export default SolarPanelSvg;
