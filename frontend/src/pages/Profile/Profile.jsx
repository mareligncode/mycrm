import React, { useState } from 'react';
import {
  User,
  Key,
  Globe,
  Moon,
  Sun,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Phone,
  Send,
  Zap,
} from 'lucide-react';
import { authApi, telegramApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { RoleBadge } from '../../components/common/Badge';

export const Profile = () => {
  const { user, updateUserState } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme, isDark } = useTheme();

  // Profile Form
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    telegramUsername: user?.telegram?.username || '',
    telegramChatId: user?.telegram?.chatId || '',
  });

  // Password Form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [testingPersonal, setTestingPersonal] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
  const [personalMsg, setPersonalMsg] = useState({ text: '', type: '' });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });

  const handleTestPersonalTelegram = async () => {
    if (!profileData.telegramChatId) {
      setPersonalMsg({ text: 'Please enter your Telegram User ID first (e.g. 5459984925).', type: 'error' });
      return;
    }
    setTestingPersonal(true);
    setPersonalMsg({ text: '', type: '' });
    try {
      const res = await telegramApi.testConnection({ chatId: profileData.telegramChatId.trim() });
      if (res.success) {
        setPersonalMsg({ text: '✅ Direct message sent! Check your Telegram chat with the bot.', type: 'success' });
      } else {
        setPersonalMsg({ text: `Failed: ${res.message || res.error || 'Make sure you clicked /start in the bot.'}`, type: 'error' });
      }
    } catch (err) {
      setPersonalMsg({ text: err.message || 'Make sure you clicked /start with the bot first.', type: 'error' });
    } finally {
      setTestingPersonal(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ text: '', type: '' });

    try {
      const res = await authApi.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        telegram: {
          username: profileData.telegramUsername,
          chatId: profileData.telegramChatId,
          isConnected: !!profileData.telegramChatId,
        },
      });

      if (res.success && res.data) {
        updateUserState(res.data);
        setProfileMsg({ text: t('savedSuccessfully'), type: 'success' });
      }
    } catch (err) {
      setProfileMsg({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: '', type: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ text: t('passwordsDoNotMatch'), type: 'error' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (res.success) {
        setPasswordMsg({ text: t('savedSuccessfully'), type: 'success' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPasswordMsg({ text: err.message || 'Failed to change password', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
          {t('profileTitle')}
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
          {t('profileSubtitle')}
        </p>
      </div>

      {/* Preferences (Theme & Language) Card */}
      <div className="crm-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={18} style={{ color: 'var(--primary)' }} />
          Preferences & Localization
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {/* Language selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              {t('language')}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`crm-btn ${lang === 'en' ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                style={{ flex: 1, padding: '0.5rem' }}
              >
                🇬🇧 English
              </button>
              <button
                type="button"
                onClick={() => setLang('am')}
                className={`crm-btn ${lang === 'am' ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                style={{ flex: 1, padding: '0.5rem' }}
              >
                🇪🇹 አማርኛ
              </button>
            </div>
          </div>

          {/* Theme selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Theme Interface
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`crm-btn ${!isDark ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                style={{ flex: 1, padding: '0.5rem' }}
              >
                <Sun size={15} />
                {t('lightMode')}
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`crm-btn ${isDark ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                style={{ flex: 1, padding: '0.5rem' }}
              >
                <Moon size={15} />
                {t('darkMode')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Information Card */}
      <div className="crm-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} style={{ color: 'var(--primary)' }} />
          Personal Profile
        </h3>

        {profileMsg.text && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: profileMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: profileMsg.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}>
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--bg-muted)' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              fontWeight: 700,
            }}>
              {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1rem' }}>{user?.firstName} {user?.lastName}</strong>
                <RoleBadge role={user?.role} />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('firstName')}
              </label>
              <input
                type="text"
                required
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('lastName')}
              </label>
              <input
                type="text"
                required
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('phone')}
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+251 911 000000"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('telegramUsername')}
              </label>
              <input
                type="text"
                value={profileData.telegramUsername}
                onChange={(e) => setProfileData({ ...profileData, telegramUsername: e.target.value })}
                placeholder="@myusername"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Personal Telegram Chat ID
              </label>
              <input
                type="text"
                value={profileData.telegramChatId}
                onChange={(e) => setProfileData({ ...profileData, telegramChatId: e.target.value })}
                placeholder="e.g. 5459984925"
                className="crm-input"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Your personal Telegram user ID (from @userinfobot)
              </span>
            </div>
          </div>

          {/* Test Personal Telegram Alert Banner & Button */}
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-muted)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Send size={15} style={{ color: '#0ea5e9' }} />
                  Direct Telegram Notifications
                </strong>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  ⚠️ Step 1: Open your bot in Telegram and press <strong>/start</strong> first. Then click Test.
                </p>
              </div>

              <button
                type="button"
                disabled={testingPersonal || !profileData.telegramChatId}
                onClick={handleTestPersonalTelegram}
                className="crm-btn crm-btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                <Zap size={15} style={{ color: '#0ea5e9' }} />
                <span>{testingPersonal ? 'Testing...' : 'Test Personal Alert'}</span>
              </button>
            </div>

            {personalMsg.text && (
              <div style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                backgroundColor: personalMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: personalMsg.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
              }}>
                {personalMsg.text}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={savingProfile}
              className="crm-btn crm-btn-primary"
            >
              <Save size={16} />
              <span>{savingProfile ? t('loading') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="crm-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={18} style={{ color: 'var(--primary)' }} />
          {t('changePassword')}
        </h3>

        {passwordMsg.text && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: passwordMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: passwordMsg.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {t('currentPassword')} *
            </label>
            <input
              type="password"
              required
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="crm-input"
              style={{ maxWidth: '400px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('newPassword')} *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('confirmNewPassword')} *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="crm-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={savingPassword}
              className="crm-btn crm-btn-primary"
            >
              <Save size={16} />
              <span>{savingPassword ? t('loading') : t('changePassword')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
