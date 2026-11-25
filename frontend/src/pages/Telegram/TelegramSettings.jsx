import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  CheckCircle,
  AlertCircle,
  Zap,
  Save,
  Bell,
} from 'lucide-react';
import { telegramApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CardGridSkeleton } from '../../components/common/Skeleton';

export const TelegramSettings = () => {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

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

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await telegramApi.getConfig();
      if (res.success && res.data) {
        setFormData((prev) => ({
          name: res.data.name || 'Main CRM Telegram Bot',
          botToken: '',
          botUsername: res.data.botUsername || '',
          chatId: res.data.chatId || '',
          chatType: res.data.chatType || 'group',
          isActive: res.data.isActive ?? true,
          events: {
            ...prev.events,
            ...(res.data.events || {}),
          },
        }));
      }
    } catch (err) {
      console.error('Error fetching Telegram config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

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
    try {
      const payload = { ...formData };
      if (!payload.botToken) delete payload.botToken;

      const res = await telegramApi.updateConfig(payload);
      if (res.success) {
        toast.success(t('savedSuccessfully'));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save configuration');
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
        toast.success(t('testSuccess'));
      } else {
        setTestResult({ success: false, message: res.message || t('testFailed') });
        toast.error(res.message || t('testFailed'));
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || t('testFailed'),
      });
      toast.error(err.message || t('testFailed'));
    } finally {
      setTesting(false);
    }
  };

  if (!hasRole('super_admin', 'admin')) {
    return (
      <div className="page-container">
        <div className="crm-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          You do not have administrative permissions to view Telegram integration settings.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('telegramTitle')}</h2>
          <p className="page-subtitle">{t('telegramSubtitle')}</p>
        </div>
        <span className={`crm-badge ${formData.isActive ? 'crm-badge-success' : 'crm-badge-neutral'}`}>
          <span className="crm-badge-dot" />
          {formData.isActive ? t('active') : t('inactive')}
        </span>
      </div>

      {loading ? (
        <CardGridSkeleton count={2} />
      ) : (
        <div className="crm-card" style={{ padding: '1.65rem' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} style={{ color: '#0ea5e9' }} />
                Bot Credentials
              </h3>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                <span>Active Integration</span>
                <span className="crm-switch">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span className="crm-switch-slider" />
                </span>
              </label>
            </div>

            <div className="crm-form-grid">
              <div>
                <label className="crm-label">{t('telegramBotToken')}</label>
                <input
                  type="password"
                  value={formData.botToken}
                  onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="crm-input"
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Obtained from @BotFather on Telegram (leave blank if keeping existing)
                </span>
              </div>

              <div>
                <label className="crm-label">{t('telegramChatId')}</label>
                <input
                  type="text"
                  value={formData.chatId}
                  onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                  placeholder="-1001234567890 or @channelname"
                  className="crm-input"
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Group or channel ID where alert dispatches will be delivered
                </span>
              </div>

              <div>
                <label className="crm-label">Bot Username (optional)</label>
                <input
                  type="text"
                  value={formData.botUsername}
                  onChange={(e) => setFormData({ ...formData, botUsername: e.target.value })}
                  placeholder="MyCRMBot"
                  className="crm-input"
                />
              </div>

              <div>
                <label className="crm-label">Chat Type</label>
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

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

            {/* Event Triggers */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={16} style={{ color: 'var(--primary)' }} />
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
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: `1px solid ${formData.events[ev.key] ? 'rgba(79, 70, 229, 0.3)' : 'var(--border-color)'}`,
                      backgroundColor: formData.events[ev.key] ? 'var(--primary-light)' : 'var(--bg-muted)',
                      fontSize: '0.84rem',
                      fontWeight: 500,
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{t(ev.label)}</span>
                    <span className="crm-switch">
                      <input
                        type="checkbox"
                        checked={!!formData.events[ev.key]}
                        onChange={() => handleToggleEvent(ev.key)}
                      />
                      <span className="crm-switch-slider" />
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                disabled={testing}
                onClick={handleTestConnection}
                className="crm-btn crm-btn-secondary"
              >
                <Zap size={16} style={{ color: '#0ea5e9' }} />
                <span>{testing ? t('testMessageSending') : t('testConnection')}</span>
              </button>

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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.8rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: testResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: testResult.success ? 'var(--success-text)' : 'var(--danger-text)',
                  fontSize: '0.85rem',
                }}
              >
                {testResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{testResult.message}</span>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
