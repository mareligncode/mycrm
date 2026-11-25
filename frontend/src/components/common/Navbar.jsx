import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu,
  Moon,
  Sun,
  Globe,
  Bell,
  Check,
  User as UserIcon,
  LogOut,
  Search,
  CheckCheck,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/endpoints';
import { Avatar } from './Avatar';

export const Navbar = ({ onToggleSidebar, activePage, setActivePage, onOpenCommandPalette }) => {
  const { isDark, toggleTheme } = useTheme();
  const { lang, toggleLang, t, formatDateTime } = useLanguage();
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.getAll();
      if (res.success && res.data) {
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n) => !n.isRead).length);
      }
    } catch {
      // silently fallback
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 0);
    const interval = setInterval(fetchNotifications, 45000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // fail silently
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // fail silently
    }
  };

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';

  return (
    <header className="crm-navbar">
      {/* Left side: Mobile menu + Breadcrumb Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="crm-btn crm-btn-ghost crm-btn-icon"
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'none' }} className="user-details-nav">
            CRM /
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t(activePage)}
          </span>
        </div>
      </div>

      {/* Right side: Quick Search + Controls + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="crm-search-trigger"
          title="Ctrl + K"
        >
          <Search size={15} />
          <span className="crm-search-label">{t('quickJump')}</span>
          <kbd className="crm-kbd">Ctrl K</kbd>
        </button>

        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLang}
          className="crm-btn crm-btn-secondary crm-btn-sm"
          style={{ padding: '0.42rem 0.65rem' }}
          title={lang === 'en' ? 'Switch to Amharic (አማርኛ)' : 'Switch to English'}
        >
          <Globe size={15} />
          <span style={{ fontWeight: 600 }}>{lang === 'en' ? 'EN' : 'አማ'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="crm-btn crm-btn-secondary crm-btn-icon"
          title={isDark ? t('lightMode') : t('darkMode')}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={17} style={{ color: '#fbbf24' }} /> : <Moon size={17} style={{ color: 'var(--primary)' }} />}
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="crm-btn crm-btn-secondary crm-btn-icon"
            style={{ position: 'relative' }}
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  backgroundColor: 'var(--danger)',
                  color: '#fff',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  minWidth: '17px',
                  height: '17px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '2px solid var(--bg-surface)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '340px',
                maxWidth: '90vw',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{t('notifications')}</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="crm-btn crm-btn-ghost crm-btn-sm"
                    style={{ padding: '0.2rem 0.5rem', color: 'var(--primary)', fontSize: '0.75rem' }}
                  >
                    <CheckCheck size={14} />
                    <span>{t('markAllRead')}</span>
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2.25rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {t('noNotifications')}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      style={{
                        padding: '0.8rem 1rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: n.isRead ? 'transparent' : 'var(--primary-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.81rem', color: 'var(--text-main)' }}>{n.title}</strong>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(n._id)}
                            title="Mark as read"
                            style={{
                              border: 'none',
                              background: 'none',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              padding: '2px',
                            }}
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: '1px solid transparent',
              borderRadius: '10px',
              cursor: 'pointer',
              padding: '0.2rem 0.35rem',
            }}
          >
            <Avatar name={fullName} size={34} />
            <div style={{ display: 'none', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }} className="user-details-nav">
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {fullName}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {t(user?.role)}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '220px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 50,
                padding: '0.5rem',
              }}
            >
              <div style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.35rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {fullName}
                </p>
                <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActivePage('profile');
                  setShowUserMenu(false);
                }}
                className="crm-sidebar-nav-btn"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
              >
                <UserIcon size={15} />
                <span>{t('profile')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="crm-sidebar-nav-btn"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem', color: 'var(--danger)' }}
              >
                <LogOut size={15} />
                <span>{t('logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
