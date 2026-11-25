import React, { useState } from 'react';
import {
  User,
  Key,
  Globe,
  Moon,
  Sun,
  Save,
  Send,
  Zap,
} from 'lucide-react';
import { authApi, telegramApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { RoleBadge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';

export const Profile = () => {
  const { user, updateUserState } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { setTheme, isDark } = useTheme();
  const toast = useToast();

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    telegramUsername: user?.telegram?.username || '',
    telegramChatId: user?.telegram?.chatId || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [testingPersonal, setTestingPersonal] = useState(false);

  const handleTestPersonalTelegram = async () => {
    if (!profileData.telegramChatId) {
      toast.warning('Please enter your Telegram User ID first.');
      return;
    }
    setTestingPersonal(true);
    try {
      const res = await telegramApi.testConnection({ chatId: profileData.telegramChatId.trim() });
      if (res.success) {
        toast.success('Direct message sent! Check your Telegram chat with the bot.');
      } else {
        toast.error(res.message || res.error || 'Make sure you clicked /start in the bot.');
      }
    } catch (err) {
      toast.error(err.message || 'Make sure you clicked /start with the bot first.');
    } finally {
      setTestingPersonal(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
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
        toast.success(t('savedSuccessfully'));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (res.success) {
        toast.success(t('savedSuccessfully'));
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('profileTitle')}</h2>
          <p className="page-subtitle">{t('profileSubtitle')}</p>
        </div>
      </div>

      {/* Identity Hero Card */}
      <div
        className="crm-card"
        style={{
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--bg-surface) 60%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Avatar name={fullName} size={60} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{fullName}</strong>
              <RoleBadge role={user?.role} />
            </div>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Preferences (Theme & Language) Card */}
      <div className="crm-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={18} style={{ color: 'var(--primary)' }} />
          {t('preferences')}
        </h3>

        <div className="crm-form-grid">
          <div>
            <label className="crm-label">{t('language')}</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`crm-btn ${lang === 'en' ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                style={{ flex: 1 }}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('am')}
                className={`crm-btn ${lang === 'am' ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                style={{ flex: 1 }}
              >
                አማርኛ
              </button>
            </div>
          </div>

          <div>
            <label className="crm-label">Theme Interface</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`crm-btn ${!isDark ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                style={{ flex: 1 }}
              >
                <Sun size={15} />
                {t('lightMode')}
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`crm-btn ${isDark ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                style={{ flex: 1 }}
              >
                <Moon size={15} />
                {t('darkMode')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Information Card */}
      <div className="crm-card" style={{ padding: '1.65rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} style={{ color: 'var(--primary)' }} />
          Personal Profile
        </h3>

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="crm-form-grid">
            <div>
              <label className="crm-label">{t('firstName')}</label>
              <input
                type="text"
                required
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('lastName')}</label>
              <input
                type="text"
                required
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('phone')}</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+251 911 000000"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('telegramUsername')}</label>
              <input
                type="text"
                value={profileData.telegramUsername}
                onChange={(e) => setProfileData({ ...profileData, telegramUsername: e.target.value })}
                placeholder="@myusername"
                className="crm-input"
              />
            </div>

            <div className="crm-col-span-2">
              <label className="crm-label">{t('telegramChatIdPersonal')}</label>
              <input
                type="text"
                value={profileData.telegramChatId}
                onChange={(e) => setProfileData({ ...profileData, telegramChatId: e.target.value })}
                placeholder="e.g. 5459984925"
                className="crm-input"
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Your personal Telegram user ID (from @userinfobot)
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-muted)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Send size={15} style={{ color: '#0ea5e9' }} />
                Direct Telegram Notifications
              </strong>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Step 1: Open your bot in Telegram and press <strong>/start</strong> first, then click Test.
              </p>
            </div>

            <button
              type="button"
              disabled={testingPersonal || !profileData.telegramChatId}
              onClick={handleTestPersonalTelegram}
              className="crm-btn crm-btn-secondary crm-btn-sm"
            >
              <Zap size={15} style={{ color: '#0ea5e9' }} />
              <span>{testingPersonal ? 'Testing...' : 'Test Personal Alert'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={savingProfile} className="crm-btn crm-btn-primary">
              <Save size={16} />
              <span>{savingProfile ? t('loading') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="crm-card" style={{ padding: '1.65rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={18} style={{ color: 'var(--primary)' }} />
          {t('changePassword')}
        </h3>

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="crm-label">{t('currentPassword')} *</label>
            <input
              type="password"
              required
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="crm-input"
              style={{ maxWidth: '400px' }}
            />
          </div>

          <div className="crm-form-grid">
            <div>
              <label className="crm-label">{t('newPassword')} *</label>
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
              <label className="crm-label">{t('confirmNewPassword')} *</label>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={savingPassword} className="crm-btn crm-btn-primary">
              <Save size={16} />
              <span>{savingPassword ? t('loading') : t('changePassword')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
