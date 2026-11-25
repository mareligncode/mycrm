import React from 'react';

const PALETTES = [
  { bg: 'rgba(79, 70, 229, 0.14)', text: '#4f46e5' },
  { bg: 'rgba(14, 165, 233, 0.14)', text: '#0284c7' },
  { bg: 'rgba(16, 185, 129, 0.14)', text: '#059669' },
  { bg: 'rgba(139, 92, 246, 0.14)', text: '#7c3aed' },
  { bg: 'rgba(245, 158, 11, 0.16)', text: '#d97706' },
  { bg: 'rgba(236, 72, 153, 0.14)', text: '#db2777' },
];

function getPalette(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const Avatar = ({ name = '', size = 34, fontSize, style = {} }) => {
  const palette = getPalette(name || 'User');
  const computedFontSize = fontSize || `${Math.max(10, Math.round(size * 0.36))}px`;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        backgroundColor: palette.bg,
        color: palette.text,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: computedFontSize,
        flexShrink: 0,
        letterSpacing: '0.02em',
        border: '1px solid rgba(255,255,255,0.08)',
        ...style,
      }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

export const AvatarStack = ({ members = [], max = 4, size = 26 }) => {
  const visible = members.slice(0, max);
  const remaining = members.length - visible.length;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {visible.map((m, idx) => {
        const fullName = m?.firstName ? `${m.firstName} ${m.lastName || ''}` : m?.name || 'Member';
        return (
          <div
            key={m?._id || idx}
            style={{
              marginLeft: idx === 0 ? 0 : '-8px',
              borderRadius: '9999px',
              border: '2px solid var(--bg-surface)',
              lineHeight: 0,
            }}
          >
            <Avatar name={fullName} size={size} />
          </div>
        );
      })}
      {remaining > 0 && (
        <div
          style={{
            marginLeft: '-8px',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '9999px',
            backgroundColor: 'var(--bg-muted)',
            color: 'var(--text-secondary)',
            border: '2px solid var(--bg-surface)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.68rem',
            fontWeight: 700,
          }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
