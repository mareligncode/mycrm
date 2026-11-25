import React from 'react';

export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => (
  <div
    className="crm-card"
    style={{
      padding: '3.25rem 1.5rem',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
    }}
  >
    {Icon && (
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.25rem',
        }}
      >
        <Icon size={26} />
      </div>
    )}
    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
      {title}
    </h3>
    {description && (
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
        {description}
      </p>
    )}
    {actionLabel && onAction && (
      <button onClick={onAction} className="crm-btn crm-btn-primary" style={{ marginTop: '0.5rem' }}>
        {actionLabel}
      </button>
    )}
  </div>
);
