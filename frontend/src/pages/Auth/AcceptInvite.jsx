import React, { useState, useEffect } from 'react';
import { invitationsApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Layers, Moon, Sun, Globe, AlertCircle, CheckCircle } from 'lucide-react';

export const AcceptInvite = ({ onBackToLogin }) => {
  const { login } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const [tokenInput, setTokenInput] = useState(() => {
    // Check if token is in URL params e.g. ?token=xyz or ?inviteToken=xyz
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || params.get('inviteToken') || '';
  });

  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedRole, setVerifiedRole] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    phone: '',
  });
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const extractToken = (raw) => {
    if (!raw) return '';
    let val = raw.trim();
    if (val.includes('token=')) {
      val = val.split('token=')[1].split('&')[0];
    } else if (val.includes('inviteToken=')) {
      val = val.split('inviteToken=')[1].split('&')[0];
    }
    return val;
  };

  const handleVerify = async (tok) => {
    const cleanToken = extractToken(tok);
    if (!cleanToken) return;
    setTokenInput(cleanToken);
    setError('');
    setVerifying(true);
    try {
      const res = await invitationsApi.verify(cleanToken);
      if (res.success && res.data) {
        setVerifiedEmail(res.data.email);
        setVerifiedRole(res.data.role);
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired invitation token');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (tokenInput) {
      handleVerify(tokenInput);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await invitationsApi.accept({
        token: extractToken(tokenInput),
        ...formData,
      });

      if (res.success) {
        setSuccess(true);
        // Automatically log in with new credentials
        await login(verifiedEmail, formData.password);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete registration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1.5rem',
      backgroundColor: 'var(--bg-app)',
    }}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={toggleLang} className="crm-btn crm-btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
          <Globe size={15} />
          <span>{lang === 'en' ? '🇬🇧 EN' : '🇪🇹 አማ'}</span>
        </button>
        <button onClick={toggleTheme} className="crm-btn crm-btn-secondary" style={{ padding: '0.4rem 0.6rem' }}>
          {isDark ? <Sun size={16} style={{ color: '#fbbf24' }} /> : <Moon size={16} style={{ color: '#4f46e5' }} />}
        </button>
      </div>

      <div className="crm-card" style={{ width: '100%', maxWidth: '480px', padding: '2.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)',
            marginBottom: '0.75rem',
          }}>
            <Layers size={26} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            {t('acceptInvitationTitle')}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t('acceptInvitationSubtitle')}
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!verifiedEmail ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Invitation Token
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste invitation token here"
                className="crm-input"
              />
              <button
                type="button"
                disabled={verifying || !tokenInput}
                onClick={() => handleVerify(tokenInput)}
                className="crm-btn crm-btn-primary"
              >
                {verifying ? t('loading') : 'Verify'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-muted)',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}>
              <div><strong>Email:</strong> {verifiedEmail}</div>
              <div><strong>Role:</strong> {t(verifiedRole)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  {t('firstName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  className="crm-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  {t('lastName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="crm-input"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('phone')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251 911 000000"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('password')} *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Choose a strong password"
                className="crm-input"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="crm-btn crm-btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            >
              {submitting ? t('loading') : t('createAccount')}
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <button
            onClick={onBackToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ← {t('back')} to {t('login')}
          </button>
        </div>
      </div>
    </div>
  );
};
