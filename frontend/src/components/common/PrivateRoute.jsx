import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Skeleton from "./Skeleton";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-inner">
        <div className="glass-card skeleton-card">
          <Skeleton width="40%" height="20px" />
          <Skeleton width="80%" height="16px" style={{ marginTop: "12px" }} />
          <Skeleton width="60%" height="16px" style={{ marginTop: "8px" }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
