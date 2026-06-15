import { useEffect } from "react";

interface ToastProps {
  msg: string;
  type: string;
  onClose: () => void;
}

export function Toast({ msg, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast ${type}`}>
      <span>{msg}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.5)",
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        ×
      </button>
    </div>
  );
}
