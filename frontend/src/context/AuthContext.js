import { createContext, useContext, useState, useEffect } from "react";
import { API_URL } from "../config/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("sv_token") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => setUser(data.user))
        .catch(() => { setToken(""); localStorage.removeItem("sv_token"); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    localStorage.setItem("sv_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password) => {
    const res = await fetch(`${API_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    localStorage.setItem("sv_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("sv_token");
    setToken("");
    setUser(null);
  };

  const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
