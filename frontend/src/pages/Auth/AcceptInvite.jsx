import React, { useState, useEffect, useCallback } from 'react';
import { invitationsApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Layers, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from './AuthLayout';

export const AcceptInvite = ({ onBackToLogin }) => {
  const { login } = useAuth();
  const { t } = useLanguage();

  const [tokenInput, setTokenInput] = useState(() => {
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
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const handleVerify = useCallback(async (tok) => {
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
  }, []);

  useEffect(() => {
    if (tokenInput) {
      const timer = setTimeout(() => handleVerify(tokenInput), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [handleVerify, tokenInput]);

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
        await login(verifiedEmail, formData.password);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete registration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="crm-card" style={{ width: '100%', maxWidth: '470px', padding: '2.25rem', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.65rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'var(--primary-gradient)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 18px rgba(79, 70, 229, 0.3)',
              marginBottom: '0.85rem',
            }}
          >
            <Layers size={24} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            {t('acceptInvitationTitle')}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t('acceptInvitationSubtitle')}
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              fontSize: '0.84rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!verifiedEmail ? (
          <div>
            <label className="crm-label">Invitation Token</label>
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            <div
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-muted)',
                border: '1px solid var(--border-color)',
                fontSize: '0.84rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
              }}
            >
              <div><strong>{t('email')}:</strong> {verifiedEmail}</div>
              <div><strong>{t('role')}:</strong> {t(verifiedRole)}</div>
            </div>

            <div className="crm-form-grid">
              <div>
                <label className="crm-label">{t('firstName')} *</label>
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
                <label className="crm-label">{t('lastName')} *</label>
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
              <label className="crm-label">{t('phone')}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251 911 000000"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('password')} *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Choose a strong password"
                  className="crm-input"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="crm-btn crm-btn-primary"
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.72rem' }}
            >
              {submitting ? t('loading') : t('createAccount')}
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← {t('back')} to {t('login')}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};
