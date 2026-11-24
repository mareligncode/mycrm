import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  Phone,
  Mail,
  Video,
  Send,
  AlertCircle,
  Edit,
  Trash2,
  Layers,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  LayoutGrid,
  List,
  MessageSquare,
  Flame,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { followUpsApi, clientsApi, projectsApi, usersApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  PriorityBadge,
  StatusBadge,
  CadenceLevelBadge,
  EscalationBadge,
  SlaBadge,
} from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const FollowUps = ({ isOpenNewModal, onCloseNewModal }) => {
  const { t, formatDateTime } = useLanguage();
  const { user } = useAuth();

  const [followUps, setFollowUps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'list' or 'board'
  const [viewMode, setViewMode] = useState('list');

  // Filter tabs: 'all', 'today', 'upcoming', 'overdue', 'completed'
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

  // Initial Form state
  const initialForm = {
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
  const [formData, setFormData] = useState(initialForm);

  // Outcome Form state
  const initialOutcomeForm = {
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
  const [outcomeData, setOutcomeData] = useState(initialOutcomeForm);

  const fetchAnalytics = async () => {
    try {
      const res = await followUpsApi.getAnalytics();
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchFollowUps = async () => {
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
      if (res.success) {
        setFollowUps(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
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
  };

  useEffect(() => {
    fetchFollowUps();
    fetchAnalytics();
  }, [activeTab, typeFilter, priorityFilter, levelFilter, escalationFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    if (isOpenNewModal) {
      setFormData(initialForm);
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
        fetchFollowUps();
        fetchAnalytics();
      }
    } catch (err) {
      alert(err.message || 'Error creating follow-up');
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
        fetchFollowUps();
        fetchAnalytics();
      }
    } catch (err) {
      alert(err.message || 'Error updating follow-up');
    }
  };

  const handleOpenOutcome = (task) => {
    setSelectedFollowUp(task);
    const nextLvl = Math.min(5, (task.level || 1) + 1);
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    inTwoDays.setHours(10, 0, 0, 0);

    const levelDescriptions = {
      1: 'Level 1: Discovery & Outreach',
      2: 'Level 2: Value Demonstration & Demo',
      3: 'Level 3: Decision Maker & Proposal Review',
      4: 'Level 4: Urgent Negotiation & Closing',
      5: 'Level 5: Final Closing & Win-Back',
    };

    setOutcomeData({
      outcome: 'connected_interested',
      outcomeNotes: '',
      createNextLevel: task.level < 5,
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
        fetchFollowUps();
        fetchAnalytics();
      }
    } catch (err) {
      alert(err.message || 'Error submitting outcome');
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await followUpsApi.update(task._id, { status: newStatus });
      fetchFollowUps();
      fetchAnalytics();
    } catch (err) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await followUpsApi.delete(id);
      fetchFollowUps();
      fetchAnalytics();
    } catch (err) {
      alert(err.message || 'Error deleting task');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'call': return <Phone size={14} />;
      case 'meeting': return <Video size={14} />;
      case 'telegram': return <Send size={14} />;
      case 'email': return <Mail size={14} />;
      case 'demo': return <TrendingUp size={14} />;
      case 'proposal_review': return <Layers size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'connected_interested':
        return <span className="crm-badge crm-badge-success">{t('connectedInterested') || 'Connected - Interested'}</span>;
      case 'meeting_scheduled':
        return <span className="crm-badge crm-badge-info">{t('meetingScheduled') || 'Meeting Scheduled'}</span>;
      case 'quote_sent':
        return <span className="crm-badge crm-badge-primary">{t('quoteSent') || 'Proposal Sent'}</span>;
      case 'no_answer_voicemail':
        return <span className="crm-badge crm-badge-warning">{t('noAnswerVoicemail') || 'No Answer / Voicemail'}</span>;
      case 'gatekeeper_blocked':
        return <span className="crm-badge crm-badge-neutral">{t('gatekeeperBlocked') || 'Gatekeeper Blocked'}</span>;
      case 'rescheduled':
        return <span className="crm-badge crm-badge-warning">{t('rescheduled') || 'Rescheduled'}</span>;
      case 'lost_disqualified':
        return <span className="crm-badge crm-badge-danger">{t('lostDisqualified') || 'Lost / Disqualified'}</span>;
      case 'won_converted':
        return <span className="crm-badge crm-badge-success" style={{ fontWeight: 700 }}>🏆 {t('wonConverted') || 'Won / Converted'}</span>;
      default:
        return null;
    }
  };

  // Filter follow-ups by search query
  const filteredFollowUps = followUps.filter((task) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = task.title?.toLowerCase().includes(q);
    const clientMatch = task.client?.clientName?.toLowerCase().includes(q);
    const projectMatch = task.project?.projectName?.toLowerCase().includes(q);
    return titleMatch || clientMatch || projectMatch;
  });

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {t('followUpsTitle')}
            </h2>
            <span className="crm-badge crm-badge-primary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              Enterprise Cadence Engine
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            {t('followUpsSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* View mode toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'crm-btn crm-btn-primary' : 'crm-btn crm-btn-ghost'}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title={t('listView')}
            >
              <List size={14} />
              <span>{t('listView')}</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={viewMode === 'board' ? 'crm-btn crm-btn-primary' : 'crm-btn crm-btn-ghost'}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title={t('cadenceBoardView')}
            >
              <LayoutGrid size={14} />
              <span>{t('cadenceBoardView')}</span>
            </button>
          </div>

          <button
            onClick={() => {
              setFormData(initialForm);
              setIsCreateModalOpen(true);
            }}
            className="crm-btn crm-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <Plus size={16} />
            <span>{t('scheduleNewTask')}</span>
          </button>
        </div>
      </div>

      {/* Cadence Stage Interactive KPI Cards (Level 1 to 5 + Overdue SLA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        {[
          { level: 1, label: t('level1Short'), fullLabel: t('level1'), color: '#3b82f6', count: analytics?.levels?.[1] || 0 },
          { level: 2, label: t('level2Short'), fullLabel: t('level2'), color: '#0ea5e9', count: analytics?.levels?.[2] || 0 },
          { level: 3, label: t('level3Short'), fullLabel: t('level3'), color: '#eab308', count: analytics?.levels?.[3] || 0 },
          { level: 4, label: t('level4Short'), fullLabel: t('level4'), color: '#f97316', count: analytics?.levels?.[4] || 0 },
          { level: 5, label: t('level5Short'), fullLabel: t('level5'), color: '#10b981', count: analytics?.levels?.[5] || 0 },
        ].map((item) => {
          const isSelected = levelFilter === String(item.level);
          return (
            <div
              key={item.level}
              onClick={() => setLevelFilter(isSelected ? '' : String(item.level))}
              className="crm-card"
              style={{
                padding: '0.85rem 1rem',
                cursor: 'pointer',
                borderLeft: `4px solid ${item.color}`,
                boxShadow: isSelected ? '0 0 0 2px var(--primary)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: item.color,
                  }}
                >
                  {item.count}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.fullLabel}
              </div>
            </div>
          );
        })}

        {/* SLA Overdue Highlight Card */}
        <div
          onClick={() => setActiveTab(activeTab === 'overdue' ? 'all' : 'overdue')}
          className="crm-card"
          style={{
            padding: '0.85rem 1rem',
            cursor: 'pointer',
            borderLeft: '4px solid var(--danger)',
            boxShadow: activeTab === 'overdue' ? '0 0 0 2px var(--danger)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ShieldAlert size={14} />
              {t('overdueTasks')}
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>
              {analytics?.overdueCount || 0}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Requires Immediate Action
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="crm-card" style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'allTasks' },
            { id: 'today', label: 'today' },
            { id: 'upcoming', label: 'upcoming' },
            { id: 'overdue', label: 'overdue' },
            { id: 'completed', label: 'completedTasks' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'crm-btn crm-btn-primary' : 'crm-btn crm-btn-ghost'}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        {/* Search & Dropdown Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search')}
              className="crm-input"
              style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.82rem' }}
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '130px', height: '34px', fontSize: '0.82rem' }}
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
            style={{ width: 'auto', minWidth: '135px', height: '34px', fontSize: '0.82rem' }}
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
            style={{ width: 'auto', minWidth: '110px', height: '34px', fontSize: '0.82rem' }}
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
            style={{ width: 'auto', minWidth: '110px', height: '34px', fontSize: '0.82rem' }}
          >
            <option value="">{t('priority')}: {t('all')}</option>
            <option value="low">{t('low')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="high">{t('high')}</option>
            <option value="urgent">{t('urgent')}</option>
          </select>

          {(levelFilter || escalationFilter || typeFilter || priorityFilter || searchQuery) && (
            <button
              onClick={() => {
                setLevelFilter('');
                setEscalationFilter('');
                setTypeFilter('');
                setPriorityFilter('');
                setSearchQuery('');
              }}
              className="crm-btn crm-btn-ghost"
              style={{ height: '34px', padding: '0 0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
              title="Reset Filters"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: List View vs Cadence Board View */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('loading')}
        </div>
      ) : filteredFollowUps.length === 0 ? (
        <div className="crm-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <CalendarCheck size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>{t('noData')}</p>
        </div>
      ) : viewMode === 'board' ? (
        /* Cadence Pipeline Board (5 Columns: Level 1 to 5) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'flex-start' }}>
          {[
            { level: 1, title: 'Level 1: Outreach & Discovery', color: '#3b82f6' },
            { level: 2, title: 'Level 2: Value & Demo', color: '#0ea5e9' },
            { level: 3, title: 'Level 3: Proposal & Alignment', color: '#eab308' },
            { level: 4, title: 'Level 4: Urgent Negotiation', color: '#f97316' },
            { level: 5, title: 'Level 5: Closing & Win-Back', color: '#10b981' },
          ].map((col) => {
            const columnTasks = filteredFollowUps.filter((task) => (task.level || 1) === col.level);
            return (
              <div
                key={col.level}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  minHeight: '400px',
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${col.color}`, paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {col.title}
                  </span>
                  <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {columnTasks.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      No tasks in this cadence stage
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
                            borderLeft: `3px solid ${task.escalationTier === 'manager_escalation' || task.escalationTier === 'executive_alert' ? 'var(--danger)' : col.color}`,
                            opacity: isCompleted ? 0.75 : 1,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                              {task.title}
                            </span>
                            <PriorityBadge priority={task.priority} />
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                            <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              {getTypeIcon(task.type)}
                              {task.type}
                            </span>
                            <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.7rem' }}>
                              Touch #{task.sequenceAttempt || 1}
                            </span>
                            <EscalationBadge tier={task.escalationTier} />
                            <SlaBadge slaStatus={task.slaStatus} />
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span>📅 {formatDateTime(task.scheduledAt)}</span>
                            {task.client && <span>👤 {task.client.clientName}</span>}
                            {task.assignedTo && <span>🛡️ {task.assignedTo.firstName} {task.assignedTo.lastName}</span>}
                          </div>

                          {task.outcome && (
                            <div style={{ marginTop: '0.25rem' }}>
                              {getOutcomeBadge(task.outcome)}
                            </div>
                          )}

                          {/* Quick Action Buttons */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border)' }}>
                            <button
                              onClick={() => handleOpenOutcome(task)}
                              className="crm-btn crm-btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <CheckCircle size={12} />
                              <span>{t('logOutcome')}</span>
                            </button>

                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                onClick={() => handleOpenEdit(task)}
                                className="crm-btn-ghost"
                                style={{ padding: '0.25rem', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                title={t('edit')}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(task._id)}
                                className="crm-btn-ghost"
                                style={{ padding: '0.25rem', border: 'none', cursor: 'pointer', borderRadius: '4px', color: 'var(--danger)' }}
                                title={t('delete')}
                              >
                                <Trash2 size={14} />
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
        /* Structured List View with Enhanced Multi-Level Insights */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredFollowUps.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.slaStatus === 'overdue' || task.slaStatus === 'breached';

            return (
              <div
                key={task._id}
                className="crm-card"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderLeft: `5px solid ${
                    isCompleted
                      ? 'var(--success)'
                      : task.escalationTier === 'manager_escalation' || task.escalationTier === 'executive_alert' || isOverdue
                      ? 'var(--danger)'
                      : 'var(--primary)'
                  }`,
                }}
              >
                {/* Check / Outcome Icon & Main Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                  <button
                    onClick={() => handleToggleComplete(task)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isCompleted ? 'var(--success)' : 'var(--text-muted)',
                      display: 'flex',
                      flexShrink: 0,
                      marginTop: '0.2rem',
                    }}
                    title={isCompleted ? t('reopen') : t('markComplete')}
                  >
                    <CheckCircle2 size={22} />
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    {/* Header Row: Title + Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.98rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </span>

                      {/* Cadence Level Badge */}
                      <CadenceLevelBadge level={task.level || 1} />

                      {/* Touchpoint Attempt count */}
                      <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.72rem' }}>
                        Touch #{task.sequenceAttempt || 1}
                      </span>

                      {/* Priority */}
                      <PriorityBadge priority={task.priority} />

                      {/* Escalation Tier */}
                      <EscalationBadge tier={task.escalationTier} />

                      {/* SLA Status */}
                      <SlaBadge slaStatus={task.slaStatus} />

                      {/* Type */}
                      <span className="crm-badge crm-badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {getTypeIcon(task.type)}
                        {task.type}
                      </span>
                    </div>

                    {/* Metadata Details Row */}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                      <span>📅 {formatDateTime(task.scheduledAt)}</span>
                      {task.client && <span>👤 <strong>{task.client.clientName}</strong> {task.client.companyName ? `(${task.client.companyName})` : ''}</span>}
                      {task.project && <span>💼 {task.project.projectName}</span>}
                      {task.assignedTo && <span>🛡️ {task.assignedTo.firstName} {task.assignedTo.lastName}</span>}
                      {task.estimatedDealValue ? <span>💰 ${task.estimatedDealValue.toLocaleString()}</span> : null}
                    </div>

                    {/* Outcome pill if logged */}
                    {task.outcome && (
                      <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outcome:</span>
                        {getOutcomeBadge(task.outcome)}
                        {task.outcomeNotes && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            "{task.outcomeNotes}"
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

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleOpenOutcome(task)}
                    className="crm-btn crm-btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title={t('logOutcome')}
                  >
                    <CheckCircle size={14} />
                    <span>{t('logOutcome')}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(task)}
                    className="crm-btn-ghost"
                    style={{ padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    title={t('edit')}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(task._id)}
                    className="crm-btn-ghost"
                    style={{ padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                    title={t('delete')}
                  >
                    <Trash2 size={16} />
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
            {/* Task Summary Banner */}
            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {selectedFollowUp.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Client: {selectedFollowUp.client?.clientName || 'N/A'} • Current Level: {selectedFollowUp.level || 1} (Touch #{selectedFollowUp.sequenceAttempt || 1})
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('selectOutcome')} *
              </label>
              <select
                required
                value={outcomeData.outcome}
                onChange={(e) => setOutcomeData({ ...outcomeData, outcome: e.target.value })}
                className="crm-select"
              >
                <option value="connected_interested">✅ {t('connectedInterested') || 'Connected - Interested'}</option>
                <option value="meeting_scheduled">📅 {t('meetingScheduled') || 'Meeting Scheduled'}</option>
                <option value="quote_sent">📄 {t('quoteSent') || 'Proposal / Quote Sent'}</option>
                <option value="no_answer_voicemail">📞 {t('noAnswerVoicemail') || 'No Answer / Left Voicemail'}</option>
                <option value="gatekeeper_blocked">🛑 {t('gatekeeperBlocked') || 'Gatekeeper Blocked'}</option>
                <option value="rescheduled">⏱️ {t('rescheduled') || 'Call Rescheduled'}</option>
                <option value="lost_disqualified">❌ {t('lostDisqualified') || 'Lost / Disqualified'}</option>
                <option value="won_converted">🏆 {t('wonConverted') || 'Won / Deal Converted'}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Outcome Notes & Meeting Minutes
              </label>
              <textarea
                rows={2}
                value={outcomeData.outcomeNotes}
                onChange={(e) => setOutcomeData({ ...outcomeData, outcomeNotes: e.target.value })}
                placeholder="Client requested customized proposal with 2-year maintenance clause..."
                className="crm-input"
              />
            </div>

            {/* Cadence Progression Box */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem', background: 'rgba(59, 130, 246, 0.03)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
                <input
                  type="checkbox"
                  checked={outcomeData.createNextLevel}
                  onChange={(e) => setOutcomeData({ ...outcomeData, createNextLevel: e.target.checked })}
                />
                <span>{t('advanceToNextLevel') || 'Auto-Schedule Next Cadence Stage'}</span>
              </label>

              {outcomeData.createNextLevel && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Next Cadence Level
                    </label>
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
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      {t('nextType')}
                    </label>
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
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      {t('nextScheduledDate')} *
                    </label>
                    <input
                      type="datetime-local"
                      required={outcomeData.createNextLevel}
                      value={outcomeData.nextScheduledAt}
                      onChange={(e) => setOutcomeData({ ...outcomeData, nextScheduledAt: e.target.value })}
                      className="crm-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      {t('escalationTier')}
                    </label>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsOutcomeModalOpen(false)}
                className="crm-btn crm-btn-secondary"
              >
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
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {t('title')} *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Level 2 Product Walkthrough & Pricing Alignment"
              className="crm-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            {/* Cadence Level */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('followUpLevel')}
              </label>
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

            {/* Sequence Attempt */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('sequenceAttempt')}
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.sequenceAttempt}
                onChange={(e) => setFormData({ ...formData, sequenceAttempt: parseInt(e.target.value, 10) || 1 })}
                className="crm-input"
              />
            </div>

            {/* Escalation Tier */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('escalationTier')}
              </label>
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

            {/* Channel Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('followUpType')}
              </label>
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

            {/* Priority */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('priority')}
              </label>
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

            {/* Scheduled Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('scheduledAt')} *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="crm-input"
              />
            </div>

            {/* Assigned To */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('assignedTo')}
              </label>
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

            {/* Client */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('client')}
              </label>
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

            {/* Project */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('projects')}
              </label>
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

            {/* Deal Value */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Estimated Deal Value ($)
              </label>
              <input
                type="number"
                min="0"
                value={formData.estimatedDealValue}
                onChange={(e) => setFormData({ ...formData, estimatedDealValue: e.target.value })}
                placeholder="e.g. 5000"
                className="crm-input"
              />
            </div>

            {/* Notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('notes')}
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Key meeting objectives, discussion agenda, or previous call context..."
                className="crm-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
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
    </div>
  );
};