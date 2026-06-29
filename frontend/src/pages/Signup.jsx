import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/AppContext";
import { FiUserPlus } from "react-icons/fi";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const addToast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      addToast("Please fill in all fields.", "error");
      return;
    }
    if (password !== confirmPassword) {
      addToast("Passwords don't match.", "error");
      return;
    }
    if (password.length < 6) {
      addToast("Password must be at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password);
      addToast("Account created! Welcome to SuryaVeda.", "success");
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
          <div className="auth-icon"><FiUserPlus /></div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join SuryaVeda and track your energy journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Full Name</label>
            <input
              className="fancy-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
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
              placeholder="Min 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Confirm Password</label>
            <input
              className="fancy-input"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="predict-btn predict-btn-solar"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" className="link-inline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
