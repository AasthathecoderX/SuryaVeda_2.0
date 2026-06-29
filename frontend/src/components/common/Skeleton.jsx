import React from "react";

export default function Skeleton({ width = "100%", height = "20px", radius = "8px", count = 1, style = {} }) {
  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className="skeleton-pulse"
      style={{ width, height, borderRadius: radius, ...style, marginBottom: count > 1 ? "12px" : 0 }}
    />
  ));

  return <>{items}</>;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass-card skeleton-card">
      <Skeleton width="40%" height="14px" />
      <Skeleton width="100%" height="24px" style={{ marginTop: "12px" }} />
      <Skeleton count={lines - 1} width="80%" height="14px" style={{ marginTop: "8px" }} />
    </div>
  );
}
