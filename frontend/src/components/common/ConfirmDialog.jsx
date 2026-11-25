import React, { useState, useEffect } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { useLanguage } from '../../context/LanguageContext';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  variant = 'danger',
  inputLabel,
  inputPlaceholder,
  initialInputValue = '',
}) => {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState(initialInputValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(initialInputValue);
    }
  }, [isOpen, initialInputValue]);

  const handleConfirm = (e) => {
    e.preventDefault();
    onConfirm(inputLabel ? inputValue : undefined);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || t('confirm')} maxWidth="440px">
      <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: variant === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)',
              color: variant === 'danger' ? 'var(--danger)' : 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {variant === 'danger' ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>

        {inputLabel && (
          <div>
            <label className="crm-label">{inputLabel}</label>
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              className="crm-input"
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.35rem' }}>
          <button type="button" onClick={onClose} className="crm-btn crm-btn-secondary">
            {t('cancel')}
          </button>
          <button
            type="submit"
            className={`crm-btn ${variant === 'danger' ? 'crm-btn-danger' : 'crm-btn-primary'}`}
          >
            {confirmLabel || t('confirm')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
