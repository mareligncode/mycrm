import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle,
  AlertCircle,
  Zap,
  Save,
  Bell,
  Radio,
  Settings,
} from 'lucide-react';
import { telegramApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export const TelegramSettings = () => {
  const { t } = useLanguage();
  const { hasRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({
    name: 'Main CRM Telegram Bot',
    botToken: '',
    botUsername: '',
    chatId: '',
    chatType: 'group',
    isActive: true,
    events: {
      newClient: true,
      newProject: true,
      projectDeadline: true,
      followUpReminder: true,
      newInvitation: false,
      projectCompleted: true,
    },
  });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await telegramApi.getConfig();
      if (res.success && res.data) {
        setFormData({
          name: res.data.name || 'Main CRM Telegram Bot',
          botToken: '', // Token is hidden for security
          botUsername: res.data.botUsername || '',
          chatId: res.data.chatId || '',
          chatType: res.data.chatType || 'group',
          isActive: res.data.isActive ?? true,
          events: {
            ...formData.events,
            ...(res.data.events || {}),
          },
        });
      }
    } catch (err) {
      console.error('Error fetching Telegram config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleToggleEvent = (eventName) => {
    setFormData((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [eventName]: !prev.events[eventName],
      },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage({ text: '', type: '' });

    try {
      const payload = { ...formData };
      if (!payload.botToken) delete payload.botToken;

      const res = await telegramApi.updateConfig(payload);
      if (res.success) {
        setStatusMessage({ text: t('savedSuccessfully'), type: 'success' });
      }
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to save configuration', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await telegramApi.testConnection();
      if (res.success) {
        setTestResult({ success: true, message: t('testSuccess') });
      } else {
        setTestResult({ success: false, message: res.message || t('testFailed') });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || t('testFailed'),
      });
    } finally {
      setTesting(false);
    }
  };

  if (!hasRole('super_admin', 'admin')) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        You do not have administrative permissions to view Telegram integration settings.
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
          {t('telegramTitle')}
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
          {t('telegramSubtitle')}
        </p>
      </div>

      {statusMessage.text && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          backgroundColor: statusMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: statusMessage.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
          fontSize: '0.875rem',
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Main Settings Card */}
      <div className="crm-card" style={{ padding: '1.75rem' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={18} style={{ color: '#0ea5e9' }} />
              Bot Credentials
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)', cursor: 'pointer' }}>
                Active Integration
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('telegramBotToken')}
              </label>
              <input
                type="password"
                value={formData.botToken}
                onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="crm-input"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Obtained from @BotFather on Telegram (leave blank if keeping existing)
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('telegramChatId')}
              </label>
              <input
                type="text"
                value={formData.chatId}
                onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                placeholder="-1001234567890 or @channelname"
                className="crm-input"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Group or channel ID where alert dispatches will be delivered
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Bot Username (optional)
              </label>
              <input
                type="text"
                value={formData.botUsername}
                onChange={(e) => setFormData({ ...formData, botUsername: e.target.value })}
                placeholder="MyCRMBot"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Chat Type
              </label>
              <select
                value={formData.chatType}
                onChange={(e) => setFormData({ ...formData, chatType: e.target.value })}
                className="crm-select"
              >
                <option value="group">Group</option>
                <option value="supergroup">Supergroup</option>
                <option value="channel">Channel</option>
                <option value="private">Private Direct Message</option>
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

          {/* Event Triggers Checklist */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={16} />
              {t('eventTriggers')}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {[
                { key: 'newClient', label: 'newLeadEvent' },
                { key: 'newProject', label: 'newProjectEvent' },
                { key: 'projectCompleted', label: 'projectMilestoneEvent' },
                { key: 'followUpReminder', label: 'followUpReminderEvent' },
                { key: 'newInvitation', label: 'newInvitationEvent' },
              ].map((ev) => (
                <label
                  key={ev.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-muted)',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!formData.events[ev.key]}
                    onChange={() => handleToggleEvent(ev.key)}
                  />
                  <span>{t(ev.label)}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            {/* Test Connection Button */}
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="crm-btn crm-btn-secondary"
            >
              <Zap size={16} style={{ color: '#0ea5e9' }} />
              <span>{testing ? t('testMessageSending') : t('testConnection')}</span>
            </button>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="crm-btn crm-btn-primary"
            >
              <Save size={16} />
              <span>{saving ? t('loading') : t('save')}</span>
            </button>
          </div>

          {testResult && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: testResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: testResult.success ? 'var(--success-text)' : 'var(--danger-text)',
              fontSize: '0.85rem',
            }}>
              {testResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
