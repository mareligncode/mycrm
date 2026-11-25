import React from 'react';
import { Layers, Moon, Sun, Globe, CheckCircle2, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export const AuthLayout = ({ children }) => {
  const { t, lang, toggleLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const features = [
    t('authFeature1'),
    t('authFeature2'),
    t('authFeature3'),
  ];

  return (
    <div className="crm-auth-layout">
      {/* Left Brand / Value Showcase (hidden on smaller viewports) */}
      <div className="crm-auth-hero">
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
              {t('crmTitle')}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.78 }}>{t('crmSubtitle')}</div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '460px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.32rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            <Sparkles size={14} />
            <span>NextGen Workspace</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.1rem',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.025em',
              marginBottom: '1rem',
            }}
          >
            {t('authHeroTitle')}
          </h1>
          <p style={{ fontSize: '0.96rem', lineHeight: 1.6, opacity: 0.86, marginBottom: '2rem' }}>
            {t('authHeroSubtitle')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {features.map((feat, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                }}
              >
                <CheckCircle2 size={17} style={{ color: '#34d399', flexShrink: 0 }} />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, fontSize: '0.78rem', opacity: 0.7 }}>
          Enterprise CRM • Bilingual (EN / አማ)
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="crm-auth-panel">
        {/* Top Controls */}
        <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={toggleLang}
            className="crm-btn crm-btn-secondary crm-btn-sm"
          >
            <Globe size={15} />
            <span>{lang === 'en' ? 'EN' : 'አማ'}</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="crm-btn crm-btn-secondary crm-btn-icon"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={16} style={{ color: '#fbbf24' }} /> : <Moon size={16} style={{ color: 'var(--primary)' }} />}
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};
