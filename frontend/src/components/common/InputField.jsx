import React from "react";

const InputField = ({ label, value, onChange, placeholder, type = "number", error }) => (
  <div className="input-group">
    <label>{label}</label>
    <input
      className={`fancy-input ${error ? "input-error" : ""}`}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min="0"
    />
    {error && <span className="field-error">{error}</span>}
  </div>
);

export default InputField;
