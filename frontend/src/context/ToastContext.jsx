import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur ?? 5000),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '1px' }} />;
      case 'error':
        return <AlertCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '1px' }} />;
      default:
        return <Info size={18} style={{ color: 'var(--info)', flexShrink: 0, marginTop: '1px' }} />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'var(--success-border)';
      case 'error':
        return 'var(--danger-border)';
      case 'warning':
        return 'var(--warning-border)';
      default:
        return 'var(--info-border)';
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="crm-toast-container" role="region" aria-live="polite">
          {toasts.map((item) => (
            <div
              key={item.id}
              className="crm-toast"
              style={{ borderColor: getBorderColor(item.type) }}
            >
              {getIcon(item.type)}
              <div style={{ flex: 1, lineHeight: 1.4, fontWeight: 500 }}>{item.message}</div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="crm-btn-ghost"
                style={{
                  border: 'none',
                  padding: '0.15rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  color: 'var(--text-muted)',
                }}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};
