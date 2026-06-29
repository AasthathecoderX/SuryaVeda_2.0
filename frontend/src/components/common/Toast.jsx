import React from "react";
import { FiX, FiCheck, FiInfo } from "react-icons/fi";

export function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          <span className="toast-icon">
            {t.type === "error" ? <FiX /> : t.type === "success" ? <FiCheck /> : <FiInfo />}
          </span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export default Toast;
