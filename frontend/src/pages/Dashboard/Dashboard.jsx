import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  CalendarCheck,
  Clock,
  ShieldCheck,
  TrendingUp,
  Plus,
  ArrowRight,
  Activity,
  CheckCircle2,
  Calendar,
  DollarSign,
  Target,
} from 'lucide-react';
import { dashboardApi, followUpsApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';

export const Dashboard = ({ setActivePage, onOpenAddClient, onOpenAddDeal, onOpenAddProject, onOpenAddFollowUp }) => {
  const { t, formatDateTime, formatDate } = useLanguage();
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, followUpRes] = await Promise.all([
        dashboardApi.getStats(),
        followUpsApi.getUpcoming(),
      ]);

      if (dashRes.success) {
        setStats(dashRes.data);
      }
      if (followUpRes.success) {
        setTodayTasks(followUpRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleMarkTaskComplete = async (taskId) => {
    try {
      await followUpsApi.update(taskId, { status: 'completed' });
      // Update local task state
      setTodayTasks((prev) => prev.filter((t) => t._id !== taskId));
      if (stats?.summary) {
        setStats((prev) => ({
          ...prev,
          summary: {
            ...prev.summary,
            pendingFollowUps: Math.max(0, prev.summary.pendingFollowUps - 1),
            todayFollowUps: Math.max(0, prev.summary.todayFollowUps - 1),
          },
        }));
      }
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
      </div>
    );
  }

  const summary = stats?.summary || {
    totalClients: 0,
    totalProjects: 0,
    totalUsers: 0,
    pendingFollowUps: 0,
    todayFollowUps: 0,
    openDeals: 0,
    openPipelineValue: 0,
    weightedForecast: 0,
    wonRevenue: 0,
    winRate: 0,
  };

  const clientStatuses = stats?.clientsByStatus || {};
  const projectStatuses = stats?.projectsByStatus || {};
  const recentActivities = stats?.recentActivities || [];

  const statCards = [
    {
      title: 'totalClients',
      value: summary.totalClients,
      icon: Users,
      color: 'var(--primary)',
      bg: 'var(--primary-light)',
      page: 'clients',
    },
    {
      title: 'openPipeline',
      value: `$${(summary.openPipelineValue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      page: 'deals',
    },
    {
      title: 'weightedForecast',
      value: `$${(summary.weightedForecast || 0).toLocaleString()}`,
      icon: Target,
      color: 'var(--success)',
      bg: 'var(--success-bg)',
      page: 'deals',
    },
    {
      title: 'activeProjects',
      value: summary.totalProjects,
      icon: Briefcase,
      color: 'var(--info)',
      bg: 'var(--info-bg)',
      page: 'projects',
    },
    {
      title: 'pendingFollowUps',
      value: summary.pendingFollowUps,
      icon: CalendarCheck,
      color: 'var(--warning)',
      bg: 'var(--warning-bg)',
      page: 'followups',
    },
    {
      title: 'todayFollowUps',
      value: summary.todayFollowUps,
      icon: Clock,
      color: 'var(--danger)',
      bg: 'var(--danger-bg)',
      page: 'followups',
    },
    {
      title: 'totalTeamMembers',
      value: summary.totalUsers,
      icon: ShieldCheck,
      color: 'var(--success)',
      bg: 'var(--success-bg)',
      page: 'team',
    },
  ];

  const clientPipelineStages = [
    { key: 'lead', label: 'lead', color: '#6366f1' },
    { key: 'contacted', label: 'contacted', color: '#0ea5e9' },
    { key: 'proposal_sent', label: 'proposal_sent', color: '#8b5cf6' },
    { key: 'negotiation', label: 'negotiation', color: '#f59e0b' },
    { key: 'won', label: 'won', color: '#10b981' },
    { key: 'lost', label: 'lost', color: '#ef4444' },
  ];

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            {t('overviewTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t('overviewSubtitle')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            onClick={onOpenAddClient}
            className="crm-btn crm-btn-primary"
            style={{ fontSize: '0.825rem' }}
          >
            <Plus size={16} />
            <span>{t('newClient')}</span>
          </button>
          {onOpenAddDeal && (
            <button
              onClick={onOpenAddDeal}
              className="crm-btn crm-btn-secondary"
              style={{ fontSize: '0.825rem' }}
            >
              <TrendingUp size={16} />
              <span>{t('newDeal')}</span>
            </button>
          )}
          <button
            onClick={onOpenAddProject}
            className="crm-btn crm-btn-secondary"
            style={{ fontSize: '0.825rem' }}
          >
            <Plus size={16} />
            <span>{t('newProject')}</span>
          </button>
          <button
            onClick={onOpenAddFollowUp}
            className="crm-btn crm-btn-secondary"
            style={{ fontSize: '0.825rem' }}
          >
            <Calendar size={16} />
            <span>{t('scheduleFollowUp')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="crm-card"
              onClick={() => setActivePage(c.page)}
              style={{
                padding: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: c.bg,
                color: c.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={22} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>
                  {t(c.title)}
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                  {c.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline & Project Distribution */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.25rem',
      }}>
        {/* Client Pipeline Card */}
        <div className="crm-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
              {t('clientsPipeline')}
            </h3>
            <button
              onClick={() => setActivePage('clients')}
              className="crm-btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: 'none', cursor: 'pointer' }}
            >
              {t('viewAll')} →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {clientPipelineStages.map((stage) => {
              const count = clientStatuses[stage.key] || 0;
              const total = summary.totalClients || 1;
              const pct = Math.round((count / total) * 100);

              return (
                <div key={stage.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{t(stage.label)}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                        height: '100%',
                        backgroundColor: stage.color,
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Projects Status Distribution */}
        <div className="crm-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={18} style={{ color: 'var(--info)' }} />
              {t('projectsDistribution')}
            </h3>
            <button
              onClick={() => setActivePage('projects')}
              className="crm-btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: 'none', cursor: 'pointer' }}
            >
              {t('viewAll')} →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            {['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'].map((statusKey) => {
              const count = projectStatuses[statusKey] || 0;
              return (
                <div
                  key={statusKey}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-muted)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <StatusBadge status={statusKey} />
                  <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column: Today's Tasks & Recent Activities */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.25rem',
      }}>
        {/* Today's Tasks */}
        <div className="crm-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={18} style={{ color: 'var(--warning)' }} />
              {t('todayFollowUps')}
            </h3>
            <button
              onClick={() => setActivePage('followups')}
              className="crm-btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: 'none', cursor: 'pointer' }}
            >
              {t('viewAll')} →
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('noData')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {todayTasks.slice(0, 5).map((task) => (
                <div
                  key={task._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface-hover)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </span>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {task.client?.clientName ? `👤 ${task.client.clientName}` : ''} • {formatDateTime(task.scheduledAt)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleMarkTaskComplete(task._id)}
                    className="crm-btn crm-btn-secondary"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', marginLeft: '0.5rem' }}
                    title={t('markComplete')}
                  >
                    <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="crm-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              {t('recentActivity')}
            </h3>
          </div>

          {recentActivities.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('noActivitiesYet')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '340px', overflowY: 'auto' }}>
              {recentActivities.map((act) => (
                <div
                  key={act._id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    {act.performedBy?.firstName ? act.performedBy.firstName[0].toUpperCase() : 'A'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                      <strong>{act.performedBy ? `${act.performedBy.firstName} ${act.performedBy.lastName}` : 'System'}</strong>: {act.description}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatDateTime(act.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
