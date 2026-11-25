import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Video,
  Send,
  Edit,
  Trash2,
  Layers,
  ShieldAlert,
  TrendingUp,
  LayoutGrid,
  List,
  CheckCircle,
  RotateCcw,
  User,
  Briefcase,
  DollarSign,
} from 'lucide-react';
import { followUpsApi, clientsApi, projectsApi, usersApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  PriorityBadge,
  CadenceLevelBadge,
  EscalationBadge,
  SlaBadge,
} from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, CardGridSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

const INITIAL_FOLLOWUP_FORM = {
  title: '',
  level: 1,
  sequenceAttempt: 1,
  escalationTier: 'standard',
  type: 'call',
  priority: 'medium',
  scheduledAt: '',
  client: '',
  project: '',
  assignedTo: '',
  estimatedDealValue: '',
  notes: '',
};

const INITIAL_OUTCOME_FORM = {
  outcome: 'connected_interested',
  outcomeNotes: '',
  createNextLevel: true,
  nextLevel: 2,
  nextScheduledAt: '',
  nextType: 'meeting',
  nextTitle: '',
  nextPriority: 'medium',
  nextEscalationTier: 'standard',
};

export const FollowUps = ({ isOpenNewModal, onCloseNewModal }) => {
  const { t, formatDateTime } = useLanguage();
  const toast = useToast();

  const [followUps, setFollowUps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState('list');
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [escalationFilter, setEscalationFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [formData, setFormData] = useState(INITIAL_FOLLOWUP_FORM);
  const [outcomeData, setOutcomeData] = useState(INITIAL_OUTCOME_FORM);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await followUpsApi.getAnalytics();
      if (res.success) setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  }, []);

  const fetchFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (levelFilter) params.level = levelFilter;
      if (escalationFilter) params.escalationTier = escalationFilter;

      if (activeTab === 'completed') {
        params.status = 'completed';
      } else if (activeTab === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        params.startDate = todayStart.toISOString();
        params.endDate = todayEnd.toISOString();
        params.status = 'pending';
      } else if (activeTab === 'upcoming') {
        params.startDate = new Date().toISOString();
        params.status = 'pending';
      } else if (activeTab === 'overdue') {
        params.endDate = new Date().toISOString();
        params.status = 'pending';
      }

      const res = await followUpsApi.getAll(params);
      if (res.success) setFollowUps(res.data || []);
    } catch (err) {
      console.error('Error fetching follow-ups:', err);
      toast.error(err.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [activeTab, typeFilter, priorityFilter, levelFilter, escalationFilter, toast]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [clientsRes, projectsRes, usersRes] = await Promise.all([
        clientsApi.getAll({ limit: 100 }),
        projectsApi.getAll({ limit: 100 }),
        usersApi.getAll(),
      ]);
      if (clientsRes.success) setClientsList(clientsRes.data || []);
      if (projectsRes.success) setProjectsList(projectsRes.data || []);
      if (usersRes.success) setUsersList(usersRes.data || []);
    } catch (err) {
      console.error('Error fetching dependencies:', err);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
    fetchAnalytics();
  }, [fetchFollowUps, fetchAnalytics]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  useEffect(() => {
    if (isOpenNewModal) {
      setFormData(INITIAL_FOLLOWUP_FORM);
      setIsCreateModalOpen(true);
    }
  }, [isOpenNewModal]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.client) delete payload.client;
      if (!payload.project) delete payload.project;
      if (!payload.assignedTo) delete payload.assignedTo;
      if (payload.estimatedDealValue) {
        payload.estimatedDealValue = Number(payload.estimatedDealValue);
      } else {
        delete payload.estimatedDealValue;
      }

      const res = await followUpsApi.create(payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        if (onCloseNewModal) onCloseNewModal();
        toast.success(t('savedSuccessfully'));
        fetchFollowUps();
        fetchAnalytics();
      }
    } catch (err) {
      toast.error(err.message || 'Error creating follow-up');
    }
  };

  const handleOpenEdit = (task) => {
    setSelectedFollowUp(task);
    setFormData({
      title: task.title || '',
      level: task.level || 1,
      sequenceAttempt: task.sequenceAttempt || 1,
      escalationTier: task.escalationTier || 'standard',
      type: task.type || 'call',
      priority: task.priority || 'medium',
      scheduledAt: task.scheduledAt ? new Date(task.scheduledAt).toISOString().slice(0, 16) : '',
      client: task.client?._id || task.client || '',
      project: task.project?._id || task.project || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      estimatedDealValue: task.estimatedDealValue || '',
      notes: task.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.client) delete payload.client;
      if (!payload.project) delete payload.project;
      if (!payload.assignedTo) delete payload.assignedTo;
      if (payload.estimatedDealValue) {
        payload.estimatedDealValue = Number(payload.estimatedDealValue);
      }

      const res = await followUpsApi.update(selectedFollowUp._id, payload);
      if (res.success) {
        setIsEditModalOpen(false);
        toast.success(t('savedSuccessfully'));
        fetchFollowUps();
        fetchAnalytics();
      }
    } catch (err) {
      toast.error(err.message || 'Error updating follow-up');
    }
  };

  const handleOpenOutcome = (task) => {
    setSelectedFollowUp(task);
    const nextLvl = Math.min(5, (task.level || 1) + 1);
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    inTwoDays.setHours(10, 0, 0, 0);

    setOutcomeData({
      outcome: 'connected_interested',
      outcomeNotes: '',
      createNextLevel: (task.level || 1) < 5,
      nextLevel: nextLvl,
      nextScheduledAt: inTwoDays.toISOString().slice(0, 16),
      nextType: nextLvl === 2 ? 'demo' : nextLvl === 3 ? 'proposal_review' : 'call',
      nextTitle: `Level ${nextLvl} Follow-Up (${task.client?.clientName || 'Client'})`,
      nextPriority: task.priority === 'urgent' ? 'urgent' : nextLvl >= 3 ? 'high' : 'medium',
      nextEscalationTier: task.escalationTier || 'standard',
    });
    setIsOutcomeModalOpen(true);
  };

  const handleSubmitOutcome = async (e) => {
    e.preventDefault();
    try {
      const res = await followUpsApi.logOutcome(selectedFollowUp._id, outcomeData);
      if (res.success) {
        setIsOutcomeModalOpen(false);
        toast.success(t('savedSuccessfully'));
        fetchFollowUps();
        fetchAnalytics();
      }
    } catch (err) {
      toast.error(err.message || 'Error submitting outcome');
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await followUpsApi.update(task._id, { status: newStatus });
      toast.success(t('savedSuccessfully'));
      fetchFollowUps();
      fetchAnalytics();
    } catch (err) {
      toast.error(err.message || 'Error updating status');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await followUpsApi.delete(deleteTargetId);
      toast.success(t('deletedSuccessfully'));
      setDeleteTargetId(null);
      fetchFollowUps();
      fetchAnalytics();
    } catch (err) {
      toast.error(err.message || 'Error deleting task');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'call': return <Phone size={13} />;
      case 'meeting': return <Video size={13} />;
      case 'telegram': return <Send size={13} />;
      case 'email': return <Mail size={13} />;
      case 'demo': return <TrendingUp size={13} />;
      case 'proposal_review': return <Layers size={13} />;
      default: return <Clock size={13} />;
    }
  };

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'connected_interested':
        return <span className="crm-badge crm-badge-success">{t('connectedInterested')}</span>;
      case 'meeting_scheduled':
        return <span className="crm-badge crm-badge-info">{t('meetingScheduled')}</span>;
      case 'quote_sent':
        return <span className="crm-badge crm-badge-primary">{t('quoteSent')}</span>;
      case 'no_answer_voicemail':
        return <span className="crm-badge crm-badge-warning">{t('noAnswerVoicemail')}</span>;
      case 'gatekeeper_blocked':
        return <span className="crm-badge crm-badge-neutral">{t('gatekeeperBlocked')}</span>;
      case 'rescheduled':
        return <span className="crm-badge crm-badge-warning">{t('rescheduled')}</span>;
      case 'lost_disqualified':
        return <span className="crm-badge crm-badge-danger">{t('lostDisqualified')}</span>;
      case 'won_converted':
        return <span className="crm-badge crm-badge-success" style={{ fontWeight: 700 }}>{t('wonConverted')}</span>;
      default:
        return null;
    }
  };

  const filteredFollowUps = followUps.filter((task) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      task.title?.toLowerCase().includes(q) ||
      task.client?.clientName?.toLowerCase().includes(q) ||
      task.project?.projectName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h2 className="page-title">{t('followUpsTitle')}</h2>
            <span className="crm-badge crm-badge-primary">Enterprise Cadence Engine</span>
          </div>
          <p className="page-subtitle">{t('followUpsSubtitle')}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div className="crm-tabs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`crm-tab ${viewMode === 'list' ? 'is-active' : ''}`}
            >
              <List size={14} />
              <span>{t('listView')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`crm-tab ${viewMode === 'board' ? 'is-active' : ''}`}
            >
              <LayoutGrid size={14} />
              <span>{t('cadenceBoardView')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormData(INITIAL_FOLLOWUP_FORM);
              setIsCreateModalOpen(true);
            }}
            className="crm-btn crm-btn-primary crm-btn-sm"
          >
            <Plus size={15} />
            <span>{t('scheduleNewTask')}</span>
          </button>
        </div>
      </div>

      {/* Cadence Stage Interactive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
        {[
          { level: 1, label: t('level1Short'), fullLabel: t('level1'), color: '#3b82f6', count: analytics?.levels?.[1] || 0 },
          { level: 2, label: t('level2Short'), fullLabel: t('level2'), color: '#0ea5e9', count: analytics?.levels?.[2] || 0 },
          { level: 3, label: t('level3Short'), fullLabel: t('level3'), color: '#d97706', count: analytics?.levels?.[3] || 0 },
          { level: 4, label: t('level4Short'), fullLabel: t('level4'), color: '#ea580c', count: analytics?.levels?.[4] || 0 },
          { level: 5, label: t('level5Short'), fullLabel: t('level5'), color: '#10b981', count: analytics?.levels?.[5] || 0 },
        ].map((item) => {
          const isSelected = levelFilter === String(item.level);
          return (
            <div
              key={item.level}
              onClick={() => setLevelFilter(isSelected ? '' : String(item.level))}
              className="crm-card crm-card-interactive"
              style={{
                padding: '0.9rem 1rem',
                borderLeft: `4px solid ${item.color}`,
                boxShadow: isSelected ? '0 0 0 2px var(--primary)' : undefined,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {item.label}
                </span>
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: item.color }}>
                  {item.count}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.fullLabel}
              </div>
            </div>
          );
        })}

        <div
          onClick={() => setActiveTab(activeTab === 'overdue' ? 'all' : 'overdue')}
          className="crm-card crm-card-interactive"
          style={{
            padding: '0.9rem 1rem',
            borderLeft: '4px solid var(--danger)',
            boxShadow: activeTab === 'overdue' ? '0 0 0 2px var(--danger)' : undefined,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShieldAlert size={14} />
              {t('overdueTasks')}
            </span>
            <span className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--danger)' }}>
              {analytics?.overdueCount || 0}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Requires Immediate Action
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="crm-card" style={{ padding: '0.85rem 1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div className="crm-tabs" style={{ overflowX: 'auto' }}>
          {[
            { id: 'all', label: 'allTasks' },
            { id: 'today', label: 'today' },
            { id: 'upcoming', label: 'upcoming' },
            { id: 'overdue', label: 'overdue' },
            { id: 'completed', label: 'completedTasks' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`crm-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search')}
              className="crm-input"
              style={{ paddingLeft: '2rem', height: '35px', fontSize: '0.82rem' }}
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '130px', height: '35px', fontSize: '0.82rem', paddingBlock: '0.35rem' }}
          >
            <option value="">{t('followUpLevel')}: {t('all')}</option>
            <option value="1">L1: Outreach & Intro</option>
            <option value="2">L2: Demo & Value</option>
            <option value="3">L3: Proposal & Terms</option>
            <option value="4">L4: Urgent Escalation</option>
            <option value="5">L5: Closing & Win-Back</option>
          </select>

          <select
            value={escalationFilter}
            onChange={(e) => setEscalationFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '135px', height: '35px', fontSize: '0.82rem', paddingBlock: '0.35rem' }}
          >
            <option value="">{t('escalationTier')}: {t('all')}</option>
            <option value="standard">{t('standardTier')}</option>
            <option value="high_priority">{t('highPriorityTier')}</option>
            <option value="manager_escalation">{t('managerEscalationTier')}</option>
            <option value="executive_alert">{t('executiveAlertTier')}</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '115px', height: '35px', fontSize: '0.82rem', paddingBlock: '0.35rem' }}
          >
            <option value="">{t('followUpType')}: {t('all')}</option>
            <option value="call">{t('call')}</option>
            <option value="meeting">{t('meeting')}</option>
            <option value="demo">{t('demo')}</option>
            <option value="telegram">{t('telegramMeeting')}</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="proposal_review">Proposal Review</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '110px', height: '35px', fontSize: '0.82rem', paddingBlock: '0.35rem' }}
          >
            <option value="">{t('priority')}: {t('all')}</option>
            <option value="low">{t('low')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="high">{t('high')}</option>
            <option value="urgent">{t('urgent')}</option>
          </select>

          {(levelFilter || escalationFilter || typeFilter || priorityFilter || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setLevelFilter('');
                setEscalationFilter('');
                setTypeFilter('');
                setPriorityFilter('');
                setSearchQuery('');
              }}
              className="crm-btn crm-btn-ghost crm-btn-icon"
              style={{ color: 'var(--danger)' }}
              title="Reset Filters"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        viewMode === 'board' ? <CardGridSkeleton count={5} /> : <TableSkeleton rows={5} />
      ) : filteredFollowUps.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={t('noData')}
          description={t('noFollowUpsDesc')}
          actionLabel={t('scheduleNewTask')}
          onAction={() => {
            setFormData(INITIAL_FOLLOWUP_FORM);
            setIsCreateModalOpen(true);
          }}
        />
      ) : viewMode === 'board' ? (
        <div style={{ display: 'flex', gap: '0.9rem', overflowX: 'auto', paddingBottom: '0.75rem', alignItems: 'flex-start' }}>
          {[
            { level: 1, title: 'Level 1: Outreach & Discovery', color: '#3b82f6' },
            { level: 2, title: 'Level 2: Value & Demo', color: '#0ea5e9' },
            { level: 3, title: 'Level 3: Proposal & Alignment', color: '#d97706' },
            { level: 4, title: 'Level 4: Urgent Negotiation', color: '#ea580c' },
            { level: 5, title: 'Level 5: Closing & Win-Back', color: '#10b981' },
          ].map((col) => {
            const columnTasks = filteredFollowUps.filter((task) => (task.level || 1) === col.level);
            return (
              <div
                key={col.level}
                style={{
                  minWidth: '275px',
                  width: '275px',
                  flexShrink: 0,
                  background: 'var(--bg-muted)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  padding: '0.8rem',
                  minHeight: '380px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2.5px solid ${col.color}`, paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {col.title}
                  </span>
                  <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {columnTasks.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {columnTasks.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      No tasks in this stage
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isCompleted = task.status === 'completed';
                      return (
                        <div
                          key={task._id}
                          className="crm-card"
                          style={{
                            padding: '0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            borderLeft: `3.5px solid ${task.escalationTier === 'manager_escalation' || task.escalationTier === 'executive_alert' ? 'var(--danger)' : col.color}`,
                            opacity: isCompleted ? 0.72 : 1,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                              {task.title}
                            </span>
                            <PriorityBadge priority={task.priority} />
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                            <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.7rem' }}>
                              {getTypeIcon(task.type)}
                              {task.type}
                            </span>
                            <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.7rem' }}>
                              Touch #{task.sequenceAttempt || 1}
                            </span>
                            <EscalationBadge tier={task.escalationTier} />
                            <SlaBadge slaStatus={task.slaStatus} />
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={11} />
                              {formatDateTime(task.scheduledAt)}
                            </span>
                            {task.client && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <User size={11} />
                                {task.client.clientName}
                              </span>
                            )}
                          </div>

                          {task.outcome && <div>{getOutcomeBadge(task.outcome)}</div>}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenOutcome(task)}
                              className="crm-btn crm-btn-primary crm-btn-sm"
                              style={{ padding: '0.28rem 0.55rem', fontSize: '0.72rem' }}
                            >
                              <CheckCircle size={12} />
                              <span>{t('logOutcome')}</span>
                            </button>

                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                              <button type="button" onClick={() => handleOpenEdit(task)} className="crm-btn crm-btn-ghost crm-btn-icon" style={{ padding: '0.25rem' }} title={t('edit')}>
                                <Edit size={13} />
                              </button>
                              <button type="button" onClick={() => setDeleteTargetId(task._id)} className="crm-btn crm-btn-ghost crm-btn-icon" style={{ padding: '0.25rem', color: 'var(--danger)' }} title={t('delete')}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredFollowUps.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.slaStatus === 'overdue' || task.slaStatus === 'breached';
            const assigneeName = task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : '';

            return (
              <div
                key={task._id}
                className="crm-card"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderLeft: `4.5px solid ${
                    isCompleted
                      ? 'var(--success)'
                      : task.escalationTier === 'manager_escalation' || task.escalationTier === 'executive_alert' || isOverdue
                      ? 'var(--danger)'
                      : 'var(--primary)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', minWidth: 0, flex: '1 1 320px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isCompleted ? 'var(--success)' : 'var(--text-muted)',
                      display: 'flex',
                      flexShrink: 0,
                      marginTop: '0.15rem',
                    }}
                    title={isCompleted ? t('reopen') : t('markComplete')}
                  >
                    <CheckCircle2 size={22} />
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.96rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </span>
                      <CadenceLevelBadge level={task.level || 1} />
                      <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.7rem' }}>
                        Touch #{task.sequenceAttempt || 1}
                      </span>
                      <PriorityBadge priority={task.priority} />
                      <EscalationBadge tier={task.escalationTier} />
                      <SlaBadge slaStatus={task.slaStatus} />
                      <span className="crm-badge crm-badge-neutral">
                        {getTypeIcon(task.type)}
                        {task.type}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.45rem', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                        {formatDateTime(task.scheduledAt)}
                      </span>
                      {task.client && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={12} style={{ color: 'var(--text-muted)' }} />
                          <strong>{task.client.clientName}</strong>
                          {task.client.companyName ? ` (${task.client.companyName})` : ''}
                        </span>
                      )}
                      {task.project && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Briefcase size={12} style={{ color: 'var(--text-muted)' }} />
                          {task.project.projectName}
                        </span>
                      )}
                      {assigneeName && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Avatar name={assigneeName} size={20} />
                          {assigneeName}
                        </span>
                      )}
                      {task.estimatedDealValue ? (
                        <span className="tabular-nums" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, color: 'var(--primary)' }}>
                          <DollarSign size={12} />
                          {task.estimatedDealValue.toLocaleString()}
                        </span>
                      ) : null}
                    </div>

                    {task.outcome && (
                      <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {getOutcomeBadge(task.outcome)}
                        {task.outcomeNotes && (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            &ldquo;{task.outcomeNotes}&rdquo;
                          </span>
                        )}
                      </div>
                    )}

                    {task.notes && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenOutcome(task)}
                    className="crm-btn crm-btn-secondary crm-btn-sm"
                    title={t('logOutcome')}
                  >
                    <CheckCircle size={14} />
                    <span>{t('logOutcome')}</span>
                  </button>
                  <button type="button" onClick={() => handleOpenEdit(task)} className="crm-btn crm-btn-ghost crm-btn-icon" title={t('edit')}>
                    <Edit size={15} />
                  </button>
                  <button type="button" onClick={() => setDeleteTargetId(task._id)} className="crm-btn crm-btn-ghost crm-btn-icon" style={{ color: 'var(--danger)' }} title={t('delete')}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Outcome & Next-Level Cadence Modal */}
      <Modal
        isOpen={isOutcomeModalOpen}
        onClose={() => setIsOutcomeModalOpen(false)}
        title={t('logOutcome') || 'Log Outcome & Advance Cadence'}
        maxWidth="600px"
      >
        {selectedFollowUp && (
          <form onSubmit={handleSubmitOutcome} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-muted)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {selectedFollowUp.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Client: {selectedFollowUp.client?.clientName || 'N/A'} • Level {selectedFollowUp.level || 1} (Touch #{selectedFollowUp.sequenceAttempt || 1})
              </div>
            </div>

            <div>
              <label className="crm-label">{t('selectOutcome')} *</label>
              <select
                required
                value={outcomeData.outcome}
                onChange={(e) => setOutcomeData({ ...outcomeData, outcome: e.target.value })}
                className="crm-select"
              >
                <option value="connected_interested">{t('connectedInterested')}</option>
                <option value="meeting_scheduled">{t('meetingScheduled')}</option>
                <option value="quote_sent">{t('quoteSent')}</option>
                <option value="no_answer_voicemail">{t('noAnswerVoicemail')}</option>
                <option value="gatekeeper_blocked">{t('gatekeeperBlocked')}</option>
                <option value="rescheduled">{t('rescheduled')}</option>
                <option value="lost_disqualified">{t('lostDisqualified')}</option>
                <option value="won_converted">{t('wonConverted')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">Outcome Notes & Meeting Minutes</label>
              <textarea
                rows={2}
                value={outcomeData.outcomeNotes}
                onChange={(e) => setOutcomeData({ ...outcomeData, outcomeNotes: e.target.value })}
                placeholder="Client requested customized proposal with 2-year maintenance clause..."
                className="crm-input"
              />
            </div>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.9rem', background: 'var(--bg-muted)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
                <input
                  type="checkbox"
                  checked={outcomeData.createNextLevel}
                  onChange={(e) => setOutcomeData({ ...outcomeData, createNextLevel: e.target.checked })}
                />
                <span>{t('advanceToNextLevel')}</span>
              </label>

              {outcomeData.createNextLevel && (
                <div className="crm-form-grid" style={{ marginTop: '0.8rem' }}>
                  <div>
                    <label className="crm-label" style={{ fontSize: '0.75rem' }}>Next Cadence Level</label>
                    <select
                      value={outcomeData.nextLevel}
                      onChange={(e) => setOutcomeData({ ...outcomeData, nextLevel: parseInt(e.target.value, 10) })}
                      className="crm-select"
                    >
                      <option value={1}>Level 1: Discovery & Outreach</option>
                      <option value={2}>Level 2: Value Demonstration & Demo</option>
                      <option value={3}>Level 3: Proposal Review & Terms</option>
                      <option value={4}>Level 4: Urgent Negotiation & Closing</option>
                      <option value={5}>Level 5: Final Closing & Win-Back</option>
                    </select>
                  </div>

                  <div>
                    <label className="crm-label" style={{ fontSize: '0.75rem' }}>{t('nextType')}</label>
                    <select
                      value={outcomeData.nextType}
                      onChange={(e) => setOutcomeData({ ...outcomeData, nextType: e.target.value })}
                      className="crm-select"
                    >
                      <option value="call">{t('call')}</option>
                      <option value="meeting">{t('meeting')}</option>
                      <option value="demo">{t('demo')}</option>
                      <option value="proposal_review">Proposal Review</option>
                      <option value="telegram">{t('telegramMeeting')}</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>

                  <div>
                    <label className="crm-label" style={{ fontSize: '0.75rem' }}>{t('nextScheduledDate')} *</label>
                    <input
                      type="datetime-local"
                      required={outcomeData.createNextLevel}
                      value={outcomeData.nextScheduledAt}
                      onChange={(e) => setOutcomeData({ ...outcomeData, nextScheduledAt: e.target.value })}
                      className="crm-input"
                    />
                  </div>

                  <div>
                    <label className="crm-label" style={{ fontSize: '0.75rem' }}>{t('escalationTier')}</label>
                    <select
                      value={outcomeData.nextEscalationTier}
                      onChange={(e) => setOutcomeData({ ...outcomeData, nextEscalationTier: e.target.value })}
                      className="crm-select"
                    >
                      <option value="standard">{t('standardTier')}</option>
                      <option value="high_priority">{t('highPriorityTier')}</option>
                      <option value="manager_escalation">{t('managerEscalationTier')}</option>
                      <option value="executive_alert">{t('executiveAlertTier')}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.35rem' }}>
              <button type="button" onClick={() => setIsOutcomeModalOpen(false)} className="crm-btn crm-btn-secondary">
                {t('cancel')}
              </button>
              <button type="submit" className="crm-btn crm-btn-primary">
                {t('recordOutcome')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create / Edit Follow-Up Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          if (onCloseNewModal) onCloseNewModal();
        }}
        title={isEditModalOpen ? t('edit') : t('scheduleNewTask')}
        maxWidth="680px"
      >
        <form onSubmit={isEditModalOpen ? handleUpdate : handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="crm-label">{t('title')} *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Level 2 Product Walkthrough & Pricing Alignment"
              className="crm-input"
            />
          </div>

          <div className="crm-form-grid">
            <div>
              <label className="crm-label">{t('followUpLevel')}</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) })}
                className="crm-select"
              >
                <option value={1}>Level 1: Discovery & Outreach</option>
                <option value={2}>Level 2: Value Demonstration & Demo</option>
                <option value={3}>Level 3: Decision Maker & Proposal</option>
                <option value={4}>Level 4: Urgent Negotiation & Escalation</option>
                <option value={5}>Level 5: Final Closing & Win-Back</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('sequenceAttempt')}</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.sequenceAttempt}
                onChange={(e) => setFormData({ ...formData, sequenceAttempt: parseInt(e.target.value, 10) || 1 })}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('escalationTier')}</label>
              <select
                value={formData.escalationTier}
                onChange={(e) => setFormData({ ...formData, escalationTier: e.target.value })}
                className="crm-select"
              >
                <option value="standard">{t('standardTier')}</option>
                <option value="high_priority">{t('highPriorityTier')}</option>
                <option value="manager_escalation">{t('managerEscalationTier')}</option>
                <option value="executive_alert">{t('executiveAlertTier')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('followUpType')}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="crm-select"
              >
                <option value="call">{t('call')}</option>
                <option value="meeting">{t('meeting')}</option>
                <option value="demo">{t('demo')}</option>
                <option value="proposal_review">Proposal Review</option>
                <option value="telegram">{t('telegramMeeting')}</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="visit">Physical Visit</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('priority')}</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="crm-select"
              >
                <option value="low">{t('low')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="high">{t('high')}</option>
                <option value="urgent">{t('urgent')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('scheduledAt')} *</label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('assignedTo')}</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="crm-select"
              >
                <option value="">-- Assign to Me / Unassigned --</option>
                {usersList.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="crm-label">{t('client')}</label>
              <select
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className="crm-select"
              >
                <option value="">-- {t('selectClient')} --</option>
                {clientsList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.clientName} {c.companyName ? `(${c.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="crm-label">{t('projects')}</label>
              <select
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="crm-select"
              >
                <option value="">-- Select Project --</option>
                {projectsList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.projectName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="crm-label">Estimated Deal Value ($)</label>
              <input
                type="number"
                min="0"
                value={formData.estimatedDealValue}
                onChange={(e) => setFormData({ ...formData, estimatedDealValue: e.target.value })}
                placeholder="e.g. 5000"
                className="crm-input"
              />
            </div>

            <div className="crm-col-span-2">
              <label className="crm-label">{t('notes')}</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Key meeting objectives, discussion agenda, or previous call context..."
                className="crm-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                if (onCloseNewModal) onCloseNewModal();
              }}
              className="crm-btn crm-btn-secondary"
            >
              {t('cancel')}
            </button>
            <button type="submit" className="crm-btn crm-btn-primary">
              {t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteTask')}
        confirmLabel={t('delete')}
        variant="danger"
      />
    </div>
  );
};
