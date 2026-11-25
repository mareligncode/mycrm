import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Briefcase,
  CalendarCheck,
  Clock,
  ShieldCheck,
  TrendingUp,
  Plus,
  Activity,
  CheckCircle2,
  Calendar,
  DollarSign,
  Target,
  Award,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import { dashboardApi, followUpsApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { KpiSkeletonGrid, CardGridSkeleton } from '../../components/common/Skeleton';

const DEAL_STAGE_SERIES = [
  { key: 'qualified', color: '#6366f1' },
  { key: 'contacted', color: '#0ea5e9' },
  { key: 'demo_scheduled', color: '#8b5cf6' },
  { key: 'proposal_sent', color: '#a855f7' },
  { key: 'negotiation', color: '#f59e0b' },
  { key: 'closed_won', color: '#10b981' },
];

const CLIENT_PIPELINE_STAGES = [
  { key: 'lead', label: 'lead', color: '#6366f1' },
  { key: 'contacted', label: 'contacted', color: '#0ea5e9' },
  { key: 'proposal_sent', label: 'proposal_sent', color: '#8b5cf6' },
  { key: 'negotiation', label: 'negotiation', color: '#f59e0b' },
  { key: 'won', label: 'won', color: '#10b981' },
  { key: 'lost', label: 'lost', color: '#ef4444' },
];

export const Dashboard = ({
  setActivePage,
  onOpenAddClient,
  onOpenAddDeal,
  onOpenAddProject,
  onOpenAddFollowUp,
}) => {
  const { t, formatDateTime } = useLanguage();
  const { user } = useAuth();
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, followUpRes] = await Promise.all([
        dashboardApi.getStats(),
        followUpsApi.getUpcoming(),
      ]);

      if (dashRes.success) setStats(dashRes.data);
      if (followUpRes.success) setTodayTasks(followUpRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleMarkTaskComplete = async (taskId) => {
    try {
      await followUpsApi.update(taskId, { status: 'completed' });
      setTodayTasks((prev) => prev.filter((item) => item._id !== taskId));
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
      toast.success(t('savedSuccessfully'));
    } catch (err) {
      toast.error(err.message || 'Error completing task');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <KpiSkeletonGrid count={6} />
        <CardGridSkeleton count={4} />
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
  const stageBreakdown = stats?.dealsForecast?.stageBreakdown || {};
  const recentActivities = stats?.recentActivities || [];

  const statCards = [
    {
      title: 'totalClients',
      value: summary.totalClients,
      meta: `${clientStatuses.won || 0} ${t('won')}`,
      icon: Users,
      color: '#4f46e5',
      bg: 'var(--primary-light)',
      page: 'clients',
    },
    {
      title: 'openPipeline',
      value: `$${(summary.openPipelineValue || 0).toLocaleString()}`,
      meta: `${summary.openDeals || 0} ${t('openDealsLabel')}`,
      icon: DollarSign,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.14)',
      page: 'deals',
    },
    {
      title: 'weightedForecast',
      value: `$${(summary.weightedForecast || 0).toLocaleString()}`,
      meta: `${summary.winRate || 0}% ${t('winRate')}`,
      icon: Target,
      color: '#10b981',
      bg: 'var(--success-bg)',
      page: 'deals',
    },
    {
      title: 'wonRevenue',
      value: `$${(summary.wonRevenue || 0).toLocaleString()}`,
      meta: t('closed_won'),
      icon: Award,
      color: '#059669',
      bg: 'var(--success-bg)',
      page: 'deals',
    },
    {
      title: 'activeProjects',
      value: summary.totalProjects,
      meta: `${projectStatuses.in_progress || 0} ${t('in_progress')}`,
      icon: Briefcase,
      color: '#0ea5e9',
      bg: 'var(--info-bg)',
      page: 'projects',
    },
    {
      title: 'pendingFollowUps',
      value: summary.pendingFollowUps,
      meta: `${summary.todayFollowUps} ${t('today')}`,
      icon: CalendarCheck,
      color: '#f59e0b',
      bg: 'var(--warning-bg)',
      page: 'followups',
    },
    {
      title: 'totalTeamMembers',
      value: summary.totalUsers,
      meta: t('active'),
      icon: ShieldCheck,
      color: '#10b981',
      bg: 'var(--success-bg)',
      page: 'team',
    },
  ];

  // Revenue Pipeline Bar Chart computation
  const stageMaxAmount = Math.max(
    1,
    ...DEAL_STAGE_SERIES.map((s) => stageBreakdown[s.key]?.totalAmount || 0)
  );

  // Client Donut SVG computation
  const totalClientsSum = CLIENT_PIPELINE_STAGES.reduce(
    (sum, s) => sum + (clientStatuses[s.key] || 0),
    0
  );
  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let runningOffset = 0;

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {t('welcomeBack')}{user?.firstName ? `, ${user.firstName}` : ''}
          </h2>
          <p className="page-subtitle">{t('overviewSubtitle')}</p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" onClick={onOpenAddClient} className="crm-btn crm-btn-primary crm-btn-sm">
            <Plus size={15} />
            <span>{t('newClient')}</span>
          </button>
          {onOpenAddDeal && (
            <button type="button" onClick={onOpenAddDeal} className="crm-btn crm-btn-secondary crm-btn-sm">
              <TrendingUp size={15} />
              <span>{t('newDeal')}</span>
            </button>
          )}
          <button type="button" onClick={onOpenAddProject} className="crm-btn crm-btn-secondary crm-btn-sm">
            <Plus size={15} />
            <span>{t('newProject')}</span>
          </button>
          <button type="button" onClick={onOpenAddFollowUp} className="crm-btn crm-btn-secondary crm-btn-sm">
            <Calendar size={15} />
            <span>{t('scheduleFollowUp')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="crm-card crm-card-interactive"
              onClick={() => setActivePage(c.page)}
              style={{
                padding: '1.15rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.95rem',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: c.bg,
                  color: c.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={21} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {t(c.title)}
                  </span>
                  <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.7 }} />
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.25, marginTop: '0.1rem' }}
                >
                  {c.value}
                </div>
                <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{c.meta}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row: Deal Revenue Pipeline & Client Status Donut */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Revenue Pipeline Bar Chart */}
        <div className="crm-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
              {t('revenuePipeline')}
            </h3>
            <button
              type="button"
              onClick={() => setActivePage('deals')}
              className="crm-btn crm-btn-ghost crm-btn-sm"
              style={{ color: 'var(--primary)' }}
            >
              {t('viewAll')} →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {DEAL_STAGE_SERIES.map((stage) => {
              const info = stageBreakdown[stage.key] || { count: 0, totalAmount: 0, weightedAmount: 0 };
              const pct = Math.round((info.totalAmount / stageMaxAmount) * 100);
              return (
                <div key={stage.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.8rem', marginBottom: '0.3rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t(stage.key)}
                      </span>
                      <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.68rem', padding: '0.12rem 0.42rem' }}>
                        {info.count}
                      </span>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      ${(info.totalAmount || 0).toLocaleString()}
                      {stage.key !== 'closed_won' && info.weightedAmount > 0 && (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                          {' '}({t('weighted')}: ${info.weightedAmount.toLocaleString()})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="crm-progress-track">
                    <div
                      className="crm-progress-fill"
                      style={{
                        width: `${Math.max(pct, info.totalAmount > 0 ? 4 : 0)}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Client Lead Pipeline Donut + Breakdown */}
        <div className="crm-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
              {t('clientStatusBreakdown')}
            </h3>
            <button
              type="button"
              onClick={() => setActivePage('clients')}
              className="crm-btn crm-btn-ghost crm-btn-sm"
              style={{ color: 'var(--primary)' }}
            >
              {t('viewAll')} →
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem' }}>
            {/* Crisp SVG Donut */}
            <div style={{ position: 'relative', width: '148px', height: '148px', flexShrink: 0, margin: '0 auto' }}>
              <svg viewBox="0 0 140 140" width="148" height="148" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  fill="none"
                  stroke="var(--bg-muted)"
                  strokeWidth="16"
                />
                {totalClientsSum > 0 &&
                  CLIENT_PIPELINE_STAGES.map((stage) => {
                    const count = clientStatuses[stage.key] || 0;
                    if (count <= 0) return null;
                    const dash = (count / totalClientsSum) * donutCircumference;
                    const offset = runningOffset;
                    runningOffset += dash;
                    return (
                      <circle
                        key={stage.key}
                        cx="70"
                        cy="70"
                        r={donutRadius}
                        fill="none"
                        stroke={stage.color}
                        strokeWidth="16"
                        strokeDasharray={`${dash} ${donutCircumference - dash}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="butt"
                      />
                    );
                  })}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {summary.totalClients}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {t('totalClients')}
                </span>
              </div>
            </div>

            {/* Stage Legend & Bars */}
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {CLIENT_PIPELINE_STAGES.map((stage) => {
                const count = clientStatuses[stage.key] || 0;
                const pct = totalClientsSum > 0 ? Math.round((count / totalClientsSum) * 100) : 0;
                return (
                  <div key={stage.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: stage.color }} />
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{t(stage.label)}</span>
                    </div>
                    <span className="tabular-nums" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Status Strip */}
      <div className="crm-card" style={{ padding: '1.35rem 1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={18} style={{ color: 'var(--info)' }} />
            {t('projectsDistribution')}
          </h3>
          <button
            type="button"
            onClick={() => setActivePage('projects')}
            className="crm-btn crm-btn-ghost crm-btn-sm"
            style={{ color: 'var(--primary)' }}
          >
            {t('viewAll')} →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}>
          {['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'].map((statusKey) => {
            const count = projectStatuses[statusKey] || 0;
            return (
              <div
                key={statusKey}
                onClick={() => setActivePage('projects')}
                style={{
                  padding: '0.9rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-muted)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <StatusBadge status={statusKey} />
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column: Today's Tasks & Recent Activities */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Today's Tasks */}
        <div className="crm-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={18} style={{ color: 'var(--warning)' }} />
              {t('todayFollowUps')}
            </h3>
            <button
              type="button"
              onClick={() => setActivePage('followups')}
              className="crm-btn crm-btn-ghost crm-btn-sm"
              style={{ color: 'var(--primary)' }}
            >
              {t('viewAll')} →
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <div style={{ padding: '2.25rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('noData')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {todayTasks.slice(0, 5).map((task) => (
                <div
                  key={task._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.8rem 0.9rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.22rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </span>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {task.client?.clientName && <span>{task.client.clientName}</span>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {formatDateTime(task.scheduledAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMarkTaskComplete(task._id)}
                    className="crm-btn crm-btn-secondary crm-btn-icon"
                    title={t('markComplete')}
                  >
                    <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="crm-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              {t('recentActivity')}
            </h3>
          </div>

          {recentActivities.length === 0 ? (
            <div style={{ padding: '2.25rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('noActivitiesYet')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {recentActivities.map((act) => {
                const actorName = act.performedBy
                  ? `${act.performedBy.firstName} ${act.performedBy.lastName}`
                  : 'System';
                return (
                  <div
                    key={act._id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Avatar name={actorName} size={30} style={{ marginTop: '2px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.81rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                        <strong>{actorName}</strong>: {act.description}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {formatDateTime(act.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
