import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const StatusBadge = ({ status }) => {
  const { t } = useLanguage();
  
  const getBadgeClass = (s) => {
    switch (s) {
      case 'won':
      case 'completed':
      case 'active':
        return 'crm-badge-success';
      case 'in_progress':
      case 'proposal_sent':
      case 'contacted':
        return 'crm-badge-info';
      case 'negotiation':
      case 'planning':
      case 'pending':
        return 'crm-badge-warning';
      case 'lost':
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
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {t(status) || status}
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
