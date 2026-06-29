import React from "react";

const AnimatedBackground = () => (
  <div className="bg-elements" aria-hidden="true">
    <div className="bg-grid" />
    <div className="bg-orb bg-orb-1" />
    <div className="bg-orb bg-orb-2" />
    <div className="bg-orb bg-orb-3" />
    <div className="bg-particles">
      {Array.from({ length: 20 }, (_, i) => (
        <span key={i} className={`particle particle-${i % 5}`} style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${6 + Math.random() * 8}s`,
        }} />
      ))}
    </div>
  </div>
);

export default AnimatedBackground;
