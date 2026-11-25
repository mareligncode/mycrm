import React from 'react';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Briefcase,
  CalendarCheck,
  ShieldCheck,
  Send,
  User,
  LogOut,
  X,
  Layers,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';

export const Sidebar = ({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  activePage,
  setActivePage,
}) => {
  const { t } = useLanguage();
  const { user, logout, hasRole } = useAuth();

  const navGroups = [
    {
      title: 'workspace',
      items: [
        { id: 'dashboard', label: 'dashboard', icon: LayoutDashboard },
        { id: 'clients', label: 'clients', icon: Users },
        { id: 'followups', label: 'followUps', icon: CalendarCheck },
      ],
    },
    {
      title: 'pipelineAndDelivery',
      items: [
        { id: 'deals', label: 'deals', icon: TrendingUp },
        { id: 'projects', label: 'projects', icon: Briefcase },
      ],
    },
    {
      title: 'administration',
      items: [
        { id: 'team', label: 'team', icon: ShieldCheck, show: hasRole('super_admin', 'admin', 'manager') },
        { id: 'telegram', label: 'telegram', icon: Send, show: hasRole('super_admin', 'admin') },
        { id: 'profile', label: 'profile', icon: User },
      ].filter((item) => item.show === undefined || item.show),
    },
  ];

  const handleNavClick = (id) => {
    setActivePage(id);
    onClose();
  };

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className={`crm-sidebar-backdrop ${isOpen ? 'is-open' : ''}`}
      />

      {/* Sidebar Container */}
      <aside className={`crm-sidebar ${isOpen ? 'is-open' : ''} ${collapsed ? 'crm-sidebar--collapsed' : ''}`}>
        {/* Brand Header */}
        <div
          style={{
            height: '64px',
            padding: collapsed ? '0 0.75rem' : '0 1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid var(--border-color)',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.32)',
                flexShrink: 0,
              }}
            >
              <Layers size={19} />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    margin: 0,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t('crmTitle')}
                </h1>
                <p
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t('crmSubtitle')}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="crm-btn crm-btn-ghost crm-btn-icon crm-sidebar-close-btn"
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav style={{ flex: 1, padding: '0.9rem 0.65rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {navGroups.map((group) => (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {!collapsed && (
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: 'var(--text-muted)',
                    padding: '0 0.75rem 0.35rem 0.75rem',
                  }}
                >
                  {t(group.title)}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    title={collapsed ? t(item.label) : undefined}
                    className={`crm-sidebar-nav-btn ${isActive ? 'is-active' : ''}`}
                    style={{
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '0.68rem' : '0.625rem 0.85rem',
                    }}
                  >
                    <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'inherit', flexShrink: 0 }} />
                    {!collapsed && (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t(item.label)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer / Collapse + User & Logout */}
        <div
          style={{
            padding: '0.85rem 0.75rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            className="crm-btn crm-btn-ghost crm-btn-sm"
            style={{
              width: '100%',
              justifyContent: collapsed ? 'center' : 'space-between',
              color: 'var(--text-muted)',
            }}
            title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          >
            {!collapsed && <span style={{ fontSize: '0.75rem' }}>{t('collapseSidebar')}</span>}
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>

          <div
            onClick={() => handleNavClick('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '0.65rem',
              padding: '0.35rem',
              borderRadius: '10px',
              cursor: 'pointer',
              backgroundColor: 'var(--bg-muted)',
            }}
            title={fullName}
          >
            <Avatar name={fullName} size={34} />
            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fullName}
                </p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t(user?.role) || user?.email}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={logout}
            className="crm-btn crm-btn-secondary crm-btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            title={t('logout')}
          >
            <LogOut size={15} />
            {!collapsed && <span>{t('logout')}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
