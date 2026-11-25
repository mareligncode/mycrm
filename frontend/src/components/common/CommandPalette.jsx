import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Users,
  TrendingUp,
  Briefcase,
  CalendarCheck,
  ShieldCheck,
  Send,
  User,
  Plus,
  Moon,
  Sun,
  Globe,
  ArrowRight,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { clientsApi, dealsApi, projectsApi } from '../../api/endpoints';

export const CommandPalette = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenNewClient,
  onOpenNewDeal,
  onOpenNewProject,
  onOpenNewFollowUp,
}) => {
  const { t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { hasRole } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ clients: [], deals: [], projects: [] });
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ clients: [], deals: [], projects: [] });
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    const q = query.trim();
    if (!isOpen || q.length < 2) {
      setResults({ clients: [], deals: [], projects: [] });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const [cRes, dRes, pRes] = await Promise.allSettled([
          clientsApi.getAll({ search: q, limit: 4 }),
          dealsApi.getAll({ search: q, limit: 4 }),
          projectsApi.getAll({ search: q, limit: 4 }),
        ]);
        if (!cancelled) {
          setResults({
            clients: cRes.status === 'fulfilled' && cRes.value?.success ? cRes.value.data || [] : [],
            deals: dRes.status === 'fulfilled' && dRes.value?.success ? dRes.value.data || [] : [],
            projects: pRes.status === 'fulfilled' && pRes.value?.success ? pRes.value.data || [] : [],
          });
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  if (!isOpen) return null;

  const qLower = query.trim().toLowerCase();

  const navActions = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, action: () => onNavigate('dashboard') },
    { id: 'clients', label: t('clients'), icon: Users, action: () => onNavigate('clients') },
    { id: 'deals', label: t('deals'), icon: TrendingUp, action: () => onNavigate('deals') },
    { id: 'projects', label: t('projects'), icon: Briefcase, action: () => onNavigate('projects') },
    { id: 'followups', label: t('followUps'), icon: CalendarCheck, action: () => onNavigate('followups') },
    ...(hasRole('super_admin', 'admin', 'manager')
      ? [{ id: 'team', label: t('team'), icon: ShieldCheck, action: () => onNavigate('team') }]
      : []),
    ...(hasRole('super_admin', 'admin')
      ? [{ id: 'telegram', label: t('telegram'), icon: Send, action: () => onNavigate('telegram') }]
      : []),
    { id: 'profile', label: t('profile'), icon: User, action: () => onNavigate('profile') },
  ].filter((item) => !qLower || item.label.toLowerCase().includes(qLower));

  const quickActions = [
    { id: 'new-client', label: t('newClient'), icon: Plus, action: onOpenNewClient },
    { id: 'new-deal', label: t('newDeal'), icon: Plus, action: onOpenNewDeal },
    { id: 'new-project', label: t('newProject'), icon: Plus, action: onOpenNewProject },
    { id: 'new-followup', label: t('scheduleFollowUp'), icon: Plus, action: onOpenNewFollowUp },
    { id: 'theme', label: t('toggleTheme'), icon: isDark ? Sun : Moon, action: toggleTheme },
    { id: 'lang', label: t('toggleLanguage'), icon: Globe, action: () => onNavigate('__toggle_lang__') },
  ].filter((item) => !qLower || item.label.toLowerCase().includes(qLower));

  const runAction = (fn) => {
    onClose();
    fn();
  };

  return (
    <div className="crm-cmd-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="crm-cmd-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.9rem 1.1rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <Search size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('quickSearchPlaceholder')}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="crm-btn-ghost crm-btn-icon"
            style={{ border: 'none', cursor: 'pointer', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '0.6rem' }}>
          {searching && (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t('loading')}
            </div>
          )}

          {/* Live entity hits */}
          {results.clients.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0.35rem 0.65rem' }}>
                {t('clients')}
              </div>
              {results.clients.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => runAction(() => onNavigate('clients'))}
                  className="crm-sidebar-nav-btn"
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <Users size={15} style={{ color: 'var(--primary)' }} />
                  <span style={{ flex: 1, fontWeight: 500 }}>{c.clientName}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.companyName || c.email || ''}</span>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          )}

          {results.deals.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0.35rem 0.65rem' }}>
                {t('deals')}
              </div>
              {results.deals.map((d) => (
                <button
                  key={d._id}
                  type="button"
                  onClick={() => runAction(() => onNavigate('deals'))}
                  className="crm-sidebar-nav-btn"
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <TrendingUp size={15} style={{ color: 'var(--success)' }} />
                  <span style={{ flex: 1, fontWeight: 500 }}>{d.title}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                    ${(d.amount || 0).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.projects.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0.35rem 0.65rem' }}>
                {t('projects')}
              </div>
              {results.projects.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => runAction(() => onNavigate('projects'))}
                  className="crm-sidebar-nav-btn"
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <Briefcase size={15} style={{ color: 'var(--info)' }} />
                  <span style={{ flex: 1, fontWeight: 500 }}>{p.projectName}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.progress || 0}%</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0.35rem 0.65rem' }}>
                {t('quickActions')}
              </div>
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => runAction(item.action)}
                    className="crm-sidebar-nav-btn"
                    style={{ padding: '0.5rem 0.75rem' }}
                  >
                    <Icon size={15} style={{ color: 'var(--primary)' }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation */}
          {navActions.length > 0 && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0.35rem 0.65rem' }}>
                {t('workspace')}
              </div>
              {navActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => runAction(item.action)}
                    className="crm-sidebar-nav-btn"
                    style={{ padding: '0.5rem 0.75rem' }}
                  >
                    <Icon size={15} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div
          style={{
            padding: '0.55rem 1rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>ESC {t('close')}</span>
          <span>Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};
