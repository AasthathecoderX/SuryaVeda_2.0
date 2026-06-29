import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/AppContext";
import { FiUser } from "react-icons/fi";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const addToast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast("Please fill in all fields.", "error");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      addToast("Welcome back!", "success");
      navigate("/dashboard");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-inner auth-page">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="auth-icon"><FiUser /></div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to access your personalized dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Email</label>
            <input
              className="fancy-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              className="fancy-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="predict-btn predict-btn-elec"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup" className="link-inline">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
