import React from "react";
import "./AlertModal.css";

export default function AlertModal({ isOpen, type = "info", title, message, onClose, autoCloseTime = null }) {
  React.useEffect(() => {
    if (isOpen && autoCloseTime) {
      const timer = setTimeout(onClose, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseTime, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
      default:
        return "ℹ";
    }
  };

  return (
    <div className={`alert-modal-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className={`alert-modal alert-${type}`} onClick={(e) => e.stopPropagation()}>
        <div className={`alert-icon alert-icon-${type}`}>
          {getIcon()}
        </div>

        {title && <h2 className="alert-title">{title}</h2>}
        <p className="alert-message">{message}</p>

        <button className={`alert-button btn-${type}`} onClick={onClose}>
          {type === "success" ? "Great!" : type === "error" ? "Retry" : "OK"}
        </button>
      </div>
    </div>
  );
}
