import React from 'react';

export const KpiSkeletonGrid = ({ count = 4 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="crm-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="crm-skeleton" style={{ width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div className="crm-skeleton" style={{ width: '58%', height: '12px' }} />
          <div className="crm-skeleton" style={{ width: '42%', height: '24px' }} />
        </div>
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 6 }) => (
  <div className="crm-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <div className="crm-skeleton" style={{ height: '38px', width: '100%' }} />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="crm-skeleton" style={{ height: '48px', width: '100%', opacity: 1 - i * 0.1 }} />
    ))}
  </div>
);

export const CardGridSkeleton = ({ count = 6 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="crm-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="crm-skeleton" style={{ width: '55%', height: '18px' }} />
          <div className="crm-skeleton" style={{ width: '64px', height: '20px', borderRadius: '999px' }} />
        </div>
        <div className="crm-skeleton" style={{ width: '80%', height: '14px' }} />
        <div className="crm-skeleton" style={{ width: '100%', height: '8px', borderRadius: '999px' }} />
        <div className="crm-skeleton" style={{ width: '45%', height: '14px' }} />
      </div>
    ))}
  </div>
);
