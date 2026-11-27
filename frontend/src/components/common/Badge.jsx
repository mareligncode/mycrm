import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const StatusBadge = ({ status }) => {
  const { t } = useLanguage();

  const getBadgeClass = (s) => {
    switch (s) {
      case 'won':
      case 'closed_won':
      case 'completed':
      case 'passed':
      case 'active':
        return 'crm-badge-success';
      case 'in_progress':
      case 'proposal_sent':
      case 'contacted':
      case 'qualified':
      case 'demo_scheduled':
        return 'crm-badge-info';
      case 'negotiation':
      case 'planning':
      case 'pending':
        return 'crm-badge-warning';
      case 'lost':
      case 'closed_lost':
      case 'cancelled':
      case 'suspended':
      case 'urgent':
        return 'crm-badge-danger';
      case 'on_hold':
      case 'inactive':
      default:
        return 'crm-badge-neutral';
    }
  };

  return (
    <span className={`crm-badge ${getBadgeClass(status)}`}>
      <span className="crm-badge-dot" />
      <span>{t(status) || status}</span>
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const { t } = useLanguage();

  const getPriorityClass = (p) => {
    switch (p) {
      case 'urgent':
        return 'crm-badge-danger';
      case 'high':
        return 'crm-badge-warning';
      case 'medium':
        return 'crm-badge-info';
      case 'low':
      default:
        return 'crm-badge-neutral';
    }
  };

  return (
    <span className={`crm-badge ${getPriorityClass(priority)}`}>
      {t(priority) || priority}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const { t } = useLanguage();

  const getRoleClass = (r) => {
    switch (r) {
      case 'super_admin':
        return 'crm-badge-primary';
      case 'admin':
        return 'crm-badge-info';
      case 'manager':
        return 'crm-badge-warning';
      case 'sales':
      case 'developer':
        return 'crm-badge-success';
      default:
        return 'crm-badge-neutral';
    }
  };

  return (
    <span className={`crm-badge ${getRoleClass(role)}`}>
      {t(role) || role}
    </span>
  );
};

export const CadenceLevelBadge = ({ level = 1 }) => {
  const { t } = useLanguage();

  const config = {
    1: { label: t('level1Short') || 'L1: Outreach', bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
    2: { label: t('level2Short') || 'L2: Demo', bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.3)' },
    3: { label: t('level3Short') || 'L3: Proposal', bg: 'rgba(234, 179, 8, 0.12)', color: '#d97706', border: 'rgba(234, 179, 8, 0.3)' },
    4: { label: t('level4Short') || 'L4: Negotiation', bg: 'rgba(249, 115, 22, 0.12)', color: '#ea580c', border: 'rgba(249, 115, 22, 0.3)' },
    5: { label: t('level5Short') || 'L5: Closing', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  };

  const current = config[level] || config[1];

  return (
    <span
      className="crm-badge"
      style={{
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        fontWeight: 600,
        fontSize: '0.72rem',
        letterSpacing: '0.02em',
      }}
    >
      {current.label}
    </span>
  );
};

export const EscalationBadge = ({ tier = 'standard' }) => {
  const { t } = useLanguage();

  if (tier === 'standard') return null;

  const config = {
    high_priority: { label: t('highPriorityTier') || 'High Priority', badgeClass: 'crm-badge-warning' },
    manager_escalation: { label: t('managerEscalationTier') || 'Manager Escalated', badgeClass: 'crm-badge-danger' },
    executive_alert: { label: t('executiveAlertTier') || 'Executive Alert', badgeClass: 'crm-badge-danger' },
  };

  const current = config[tier] || config.high_priority;

  return (
    <span className={`crm-badge ${current.badgeClass}`} style={{ fontSize: '0.7rem', fontWeight: 700 }}>
      {current.label}
    </span>
  );
};

export const SlaBadge = ({ slaStatus }) => {
  const { t } = useLanguage();

  if (!slaStatus || slaStatus === 'completed' || slaStatus === 'cancelled') return null;

  switch (slaStatus) {
    case 'breached':
      return (
        <span className="crm-badge crm-badge-danger" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
          {t('slaBreached') || 'SLA Breached (>48h)'}
        </span>
      );
    case 'overdue':
      return (
        <span className="crm-badge crm-badge-danger" style={{ fontSize: '0.7rem' }}>
          {t('slaOverdue') || 'SLA Overdue'}
        </span>
      );
    case 'due_soon':
      return (
        <span className="crm-badge crm-badge-warning" style={{ fontSize: '0.7rem' }}>
          {t('dueSoon') || 'Due Soon'}
        </span>
      );
    case 'on_track':
    default:
      return (
        <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.7rem', opacity: 0.85 }}>
          {t('onTrack') || 'On Track'}
        </span>
      );
  }
};
