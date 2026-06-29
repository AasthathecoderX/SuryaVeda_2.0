import React from "react";
import { NavLink } from "react-router-dom";
import SolarPanelSvg from "../common/SolarPanelSvg.jsx";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { FiHome, FiZap, FiSun, FiBarChart2, FiTrendingUp, FiUser, FiLogIn, FiMoon } from "react-icons/fi";
import { HiOutlineSun } from "react-icons/hi";

const links = [
  { to: "/",              label: "Home",        icon: <FiHome />        },
  { to: "/electricity",   label: "Electricity", icon: <FiZap />         },
  { to: "/solar",         label: "Solar",       icon: <FiSun />         },
  { to: "/insights",      label: "Insights",    icon: <FiBarChart2 />   },
  { to: "/roi-calculator",label: "ROI Calc",    icon: <FiTrendingUp />  },
];

export default function Navbar() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <SolarPanelSvg />
        <span className="brand-name">
          <span className="brand-surya">Surya</span>
          <span className="brand-veda">Veda</span>
        </span>
      </div>
      <ul className="navbar-links">
        {links.map(link => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </NavLink>
          </li>
        ))}
        <li>
          <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <HiOutlineSun /> : <FiMoon />}
          </button>
        </li>
        <li>
          <NavLink
            to={user ? "/dashboard" : "/login"}
            className={({ isActive }) => `nav-link nav-link-auth ${isActive ? "nav-link-active" : ""}`}
          >
            <span className="nav-icon">{user ? <FiUser /> : <FiLogIn />}</span>
            <span className="nav-label">{user ? user.name.split(' ')[0] : "Login"}</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
