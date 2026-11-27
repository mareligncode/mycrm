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
  GitBranch,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { followUpsApi, clientsApi, projectsApi, usersApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  StatusBadge,
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

const getProjectClientIds = (project) => {
  if (!project) return [];
  const ids = new Set();
  if (project.client) {
    ids.add(typeof project.client === 'object' ? project.client._id : project.client);
  }
  if (Array.isArray(project.clients)) {
    project.clients.forEach((c) => {
      const id = typeof c === 'object' ? c?._id : c;
      if (id) ids.add(id);
    });
  }
  return [...ids].filter(Boolean);
};

const getFollowUpGroupKey = (task) => {
  const clientId = task.client?._id || task.client || 'no-client';
  const projectId = task.project?._id || task.project || 'general';
  return `${clientId}::${projectId}`;
};

const buildMaxLevelByGroup = (tasks = []) => {
  const map = new Map();
  tasks.forEach((task) => {
    const key = getFollowUpGroupKey(task);
    const lvl = Number(task.level || 1);
    map.set(key, Math.max(map.get(key) || 0, lvl));
  });
  return map;
};

const getTaskStageStatus = (task, maxLevelByGroup) => {
  if (task.isSyntheticPassed) return 'passed';
  if (task.status === 'completed') {
    const maxLvl = maxLevelByGroup.get(getFollowUpGroupKey(task)) || Number(task.level || 1);
    if (task.passedToLevel || task.nextFollowUp || maxLvl > Number(task.level || 1)) {
      return 'passed';
    }
    return 'completed';
  }
  return task.status || 'pending';
};

const StageProgressionStrip = ({ tasks = [], t }) => {
  if (!tasks.length) return null;
  const maxLevel = tasks.reduce((max, item) => Math.max(max, Number(item.level || 1)), 1);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((lvl) => {
        const stageTasks = tasks.filter((item) => Number(item.level || 1) === lvl);
        const hasPending = stageTasks.some((item) => item.status === 'pending' || item.status === 'in_progress');
        const hasCompleted = stageTasks.some((item) => item.status === 'completed');
        const isPassed = !hasPending && (hasCompleted || lvl < maxLevel);

        let bg = 'var(--bg-muted)';
        let border = 'var(--border-color)';
        let color = 'var(--text-muted)';
        let stateLabel = null;

        if (hasPending) {
          bg = 'rgba(245, 158, 11, 0.12)';
          border = 'rgba(245, 158, 11, 0.35)';
          color = '#d97706';
          stateLabel = t('pending');
        } else if (isPassed) {
          bg = 'rgba(16, 185, 129, 0.12)';
          border = 'rgba(16, 185, 129, 0.35)';
          color = '#059669';
          stateLabel = t('passed');
        }

        return (
          <div
            key={lvl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.24rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: bg,
              border: `1px solid ${border}`,
              color,
              fontSize: '0.7rem',
              fontWeight: hasPending || isPassed ? 700 : 500,
            }}
          >
            <span>L{lvl}</span>
            {stateLabel && <span>• {stateLabel}</span>}
          </div>
        );
      })}
    </div>
  );
};

export const FollowUps = ({ isOpenNewModal, onCloseNewModal }) => {
  const { t, formatDate, formatDateTime } = useLanguage();
  const toast = useToast();

  const [followUps, setFollowUps] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [selectedPipelineClientId, setSelectedPipelineClientId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState('list');
  const [activeTab, setActiveTab] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
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
      const params = { limit: 100 };
      if (clientFilter) params.client = clientFilter;
      if (projectFilter) params.project = projectFilter;
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

      const [res, pipelineRes] = await Promise.all([
        followUpsApi.getAll(params),
        followUpsApi.getPipeline({
          ...(clientFilter ? { client: clientFilter } : {}),
          ...(projectFilter ? { project: projectFilter } : {}),
          ...(typeFilter ? { type: typeFilter } : {}),
          ...(priorityFilter ? { priority: priorityFilter } : {}),
          ...(levelFilter ? { level: levelFilter } : {}),
          ...(escalationFilter ? { escalationTier: escalationFilter } : {}),
          ...(activeTab === 'completed' ? { status: 'completed' } : {}),
        }).catch(() => null),
      ]);

      if (res.success) setFollowUps(res.data || []);
      if (pipelineRes?.success) setPipelineData(pipelineRes.data || []);
    } catch (err) {
      console.error('Error fetching follow-ups:', err);
      toast.error(err.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [activeTab, clientFilter, projectFilter, typeFilter, priorityFilter, levelFilter, escalationFilter, toast]);

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

  const openCreateFollowUpModal = ({ clientId = '', projectId = '' } = {}) => {
    setFormData({
      ...INITIAL_FOLLOWUP_FORM,
      client: clientId,
      project: projectId,
    });
    setIsCreateModalOpen(true);
  };

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

  // Build fallback pipeline locally if dedicated /pipeline endpoint isn't deployed yet
  const resolvedPipeline = React.useMemo(() => {
    const source =
      pipelineData.length > 0
        ? pipelineData
        : clientsList
            .filter((c) => !clientFilter || c._id === clientFilter)
            .map((c) => {
              const clientProjects = projectsList.filter((p) => {
                const matchesClient = getProjectClientIds(p).includes(c._id);
                const matchesProjFilter = !projectFilter || p._id === projectFilter;
                return matchesClient && matchesProjFilter;
              });
              const clientFollowUps = filteredFollowUps.filter(
                (f) => (f.client?._id || f.client) === c._id
              );
              const projectGroups = clientProjects.map((proj) => {
                const pFollowUps = clientFollowUps.filter(
                  (f) => (f.project?._id || f.project) === proj._id
                );
                return {
                  project: proj,
                  followUps: pFollowUps,
                  stats: {
                    total: pFollowUps.length,
                    pendingCount: pFollowUps.filter((f) => f.status === 'pending' || f.status === 'in_progress').length,
                    overdueCount: pFollowUps.filter((f) => f.slaStatus === 'overdue' || f.slaStatus === 'breached').length,
                    completedCount: pFollowUps.filter((f) => f.status === 'completed').length,
                  },
                };
              });
              const generalFollowUps = clientFollowUps.filter((f) => !f.project);
              return {
                client: c,
                projects: projectGroups,
                generalFollowUps,
                stats: {
                  totalFollowUps: clientFollowUps.length,
                  pendingCount: clientFollowUps.filter((f) => f.status === 'pending' || f.status === 'in_progress').length,
                  overdueCount: clientFollowUps.filter((f) => f.slaStatus === 'overdue' || f.slaStatus === 'breached').length,
                  completedCount: clientFollowUps.filter((f) => f.status === 'completed').length,
                  projectCount: clientProjects.length,
                },
              };
            });

    if (!searchQuery) return source;
    const q = searchQuery.toLowerCase();
    return source.filter((entry) => {
      const cName = entry.client?.clientName?.toLowerCase() || '';
      const compName = entry.client?.companyName?.toLowerCase() || '';
      const hasProjMatch = entry.projects?.some((pg) =>
        pg.project?.projectName?.toLowerCase().includes(q)
      );
      return cName.includes(q) || compName.includes(q) || hasProjMatch;
    });
  }, [pipelineData, clientsList, projectsList, filteredFollowUps, clientFilter, projectFilter, searchQuery]);

  const activePipelineEntry =
    resolvedPipeline.find((entry) => entry.client?._id === selectedPipelineClientId) ||
    resolvedPipeline[0] ||
    null;

  const allKnownFollowUps = React.useMemo(() => {
    const byId = new Map();
    followUps.forEach((task) => byId.set(task._id, task));
    pipelineData.forEach((entry) => {
      entry.projects?.forEach((pg) => {
        pg.followUps?.forEach((task) => {
          if (!byId.has(task._id)) byId.set(task._id, task);
        });
      });
      entry.generalFollowUps?.forEach((task) => {
        if (!byId.has(task._id)) byId.set(task._id, task);
      });
    });
    return [...byId.values()];
  }, [followUps, pipelineData]);

  const maxLevelByGroup = React.useMemo(
    () => buildMaxLevelByGroup(allKnownFollowUps),
    [allKnownFollowUps]
  );

  const boardTasks = React.useMemo(() => {
    if (levelFilter || activeTab === 'completed') {
      return filteredFollowUps;
    }

    const baseTasks = [...filteredFollowUps];
    const seenIds = new Set(baseTasks.map((tItem) => tItem._id));
    const activeGroupKeys = new Set(baseTasks.map((tItem) => getFollowUpGroupKey(tItem)));

    // Include completed/passed stage tasks for visible groups even when filtered by Today/Upcoming/Overdue
    allKnownFollowUps.forEach((task) => {
      if (seenIds.has(task._id)) return;
      const key = getFollowUpGroupKey(task);
      if (!activeGroupKeys.has(key)) return;
      if (task.status === 'completed') {
        baseTasks.push(task);
        seenIds.add(task._id);
      }
    });

    // Ensure no earlier stage column is left empty when a client/project has moved to a higher stage
    const tasksByGroup = new Map();
    baseTasks.forEach((task) => {
      const key = getFollowUpGroupKey(task);
      if (!tasksByGroup.has(key)) tasksByGroup.set(key, []);
      tasksByGroup.get(key).push(task);
    });

    const syntheticTasks = [];
    tasksByGroup.forEach((groupTasks, groupKey) => {
      const maxLvl = groupTasks.reduce((max, item) => Math.max(max, Number(item.level || 1)), 1);
      const presentLevels = new Set(groupTasks.map((item) => Number(item.level || 1)));
      const sampleTask = groupTasks.find((item) => Number(item.level || 1) === maxLvl) || groupTasks[0];

      for (let lvl = 1; lvl < maxLvl; lvl += 1) {
        if (!presentLevels.has(lvl)) {
          const clientLabel = sampleTask.client?.clientName || 'Client';
          const projLabel = sampleTask.project?.projectName ? ` • ${sampleTask.project.projectName}` : '';
          syntheticTasks.push({
            _id: `synthetic-passed-${groupKey}-${lvl}`,
            isSyntheticPassed: true,
            level: lvl,
            status: 'passed',
            passedToLevel: maxLvl,
            title: `${clientLabel}${projLabel}`,
            client: sampleTask.client,
            project: sampleTask.project,
            scheduledAt: sampleTask.scheduledAt,
          });
        }
      }
    });

    return [...baseTasks, ...syntheticTasks];
  }, [filteredFollowUps, allKnownFollowUps, levelFilter, activeTab]);

  const filterBarProjects = clientFilter
    ? projectsList.filter((p) => getProjectClientIds(p).includes(clientFilter))
    : projectsList;

  const modalProjects = formData.client
    ? projectsList.filter((p) => getProjectClientIds(p).includes(formData.client))
    : projectsList;

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
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`crm-tab ${viewMode === 'pipeline' ? 'is-active' : ''}`}
            >
              <GitBranch size={14} />
              <span>{t('clientPipelineView')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateFollowUpModal({ clientId: clientFilter, projectId: projectFilter })}
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
            value={clientFilter}
            onChange={(e) => {
              const nextClient = e.target.value;
              setClientFilter(nextClient);
              if (nextClient) setSelectedPipelineClientId(nextClient);
              if (projectFilter && nextClient) {
                const chosenProj = projectsList.find((p) => p._id === projectFilter);
                if (chosenProj && !getProjectClientIds(chosenProj).includes(nextClient)) {
                  setProjectFilter('');
                }
              }
            }}
            className="crm-select"
            style={{ width: 'auto', minWidth: '140px', height: '35px', fontSize: '0.82rem', paddingBlock: '0.35rem' }}
          >
            <option value="">{t('allClients')}</option>
            {clientsList.map((c) => (
              <option key={c._id} value={c._id}>
                {c.clientName}
              </option>
            ))}
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '140px', height: '35px', fontSize: '0.82rem', paddingBlock: '0.35rem' }}
          >
            <option value="">{t('allProjects')}</option>
            {filterBarProjects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.projectName}
              </option>
            ))}
          </select>

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

          {(clientFilter || projectFilter || levelFilter || escalationFilter || typeFilter || priorityFilter || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setClientFilter('');
                setProjectFilter('');
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
      ) : viewMode === 'pipeline' ? (
        resolvedPipeline.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title={t('noData')}
            description={t('noFollowUpsDesc')}
            actionLabel={t('scheduleNewTask')}
            onAction={() => openCreateFollowUpModal()}
          />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Left Pane: Individual Client List */}
            <div className="crm-card" style={{ flex: '1 1 280px', maxWidth: '100%', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ padding: '0.35rem 0.45rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('clients')} ({resolvedPipeline.length})
              </div>
              {resolvedPipeline.map((entry) => {
                const c = entry.client;
                const isSelected = activePipelineEntry?.client?._id === c._id;
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setSelectedPipelineClientId(c._id)}
                    style={{
                      textAlign: 'left',
                      padding: '0.8rem 0.85rem',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.clientName}
                      </span>
                      <ChevronRight size={14} style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                    </div>
                    {c.companyName && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Building2 size={11} />
                        {c.companyName}
                      </span>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', marginTop: '0.1rem' }}>
                      <StatusBadge status={c.status} />
                      <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.68rem' }}>
                        {entry.stats.projectCount} {t('projects')}
                      </span>
                      {entry.stats.overdueCount > 0 && (
                        <span className="crm-badge crm-badge-danger" style={{ fontSize: '0.68rem' }}>
                          {entry.stats.overdueCount} {t('overdue')}
                        </span>
                      )}
                      {entry.stats.pendingCount > 0 && (
                        <span className="crm-badge crm-badge-info" style={{ fontSize: '0.68rem' }}>
                          {entry.stats.pendingCount} {t('pending')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Pane: Selected Client & Associated Projects Follow-Up Pipeline */}
            {activePipelineEntry && (
              <div style={{ flex: '999 1 460px', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
                {/* Client Summary Header */}
                <div className="crm-card" style={{ padding: '1.15rem 1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                    <Avatar name={activePipelineEntry.client.clientName} size={44} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {activePipelineEntry.client.clientName}
                        </h3>
                        <StatusBadge status={activePipelineEntry.client.status} />
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.25rem' }}>
                        {activePipelineEntry.client.companyName && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Building2 size={12} />
                            {activePipelineEntry.client.companyName}
                          </span>
                        )}
                        {activePipelineEntry.client.email && <span>{activePipelineEntry.client.email}</span>}
                        {activePipelineEntry.client.phone && <span>{activePipelineEntry.client.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span className="crm-badge crm-badge-neutral">
                      {activePipelineEntry.stats.totalFollowUps} Total
                    </span>
                    <span className="crm-badge crm-badge-success">
                      {activePipelineEntry.stats.completedCount} {t('completed')}
                    </span>
                    <button
                      type="button"
                      onClick={() => openCreateFollowUpModal({ clientId: activePipelineEntry.client._id })}
                      className="crm-btn crm-btn-primary crm-btn-sm"
                    >
                      <Plus size={14} />
                      <span>{t('addClientFollowUp')}</span>
                    </button>
                  </div>
                </div>

                {/* Associated Projects Pipeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Briefcase size={16} style={{ color: 'var(--primary)' }} />
                    {t('associatedProjects')} ({activePipelineEntry.projects.length})
                  </h4>

                  {activePipelineEntry.projects.length === 0 ? (
                    <div className="crm-card" style={{ padding: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {t('noClientProjects')}
                    </div>
                  ) : (
                    activePipelineEntry.projects.map(({ project: proj, followUps: projFollowUps, stats: projStats }) => (
                      <div key={proj._id} className="crm-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.7rem', borderBottom: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              {proj.projectCode && (
                                <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.68rem' }}>
                                  {proj.projectCode}
                                </span>
                              )}
                              <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>
                                {proj.projectName}
                              </strong>
                              <StatusBadge status={proj.status} />
                              <PriorityBadge priority={proj.priority} />
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                              <span>{t('progress')}: {proj.progress || 0}%</span>
                              {proj.deadline && <span>{t('deadline')}: {formatDate(proj.deadline)}</span>}
                              <span>{projStats.pendingCount} {t('pending')} • {projStats.completedCount} {t('completed')}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openCreateFollowUpModal({ clientId: activePipelineEntry.client._id, projectId: proj._id })}
                            className="crm-btn crm-btn-secondary crm-btn-sm"
                          >
                            <Plus size={14} />
                            <span>{t('addProjectFollowUp')}</span>
                          </button>
                        </div>

                        {projFollowUps.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {t('noProjectFollowUps')}
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <StageProgressionStrip tasks={projFollowUps} t={t} />
                            {projFollowUps.map((task) => {
                              const stageStatus = getTaskStageStatus(task, maxLevelByGroup);
                              const isCompleted = task.status === 'completed';
                              const isPassed = stageStatus === 'passed';
                              return (
                                <div
                                  key={task._id}
                                  style={{
                                    padding: '0.75rem 0.9rem',
                                    borderRadius: '10px',
                                    backgroundColor: 'var(--bg-muted)',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', minWidth: 0, flex: '1 1 260px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleComplete(task)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: isCompleted ? 'var(--success)' : 'var(--text-muted)', display: 'flex', padding: 0, marginTop: '2px' }}
                                      title={isCompleted ? t('reopen') : t('markComplete')}
                                    >
                                      <CheckCircle2 size={18} />
                                    </button>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-main)', textDecoration: isCompleted && !isPassed ? 'line-through' : 'none' }}>
                                          {task.title}
                                        </span>
                                        <CadenceLevelBadge level={task.level || 1} />
                                        <StatusBadge status={stageStatus} />
                                        <SlaBadge slaStatus={task.slaStatus} />
                                        <EscalationBadge tier={task.escalationTier} />
                                      </div>
                                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <Clock size={11} />
                                          {formatDateTime(task.scheduledAt)}
                                        </span>
                                        <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.68rem' }}>
                                          {getTypeIcon(task.type)}
                                          {task.type}
                                        </span>
                                        {task.outcome && getOutcomeBadge(task.outcome)}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <button type="button" onClick={() => handleOpenOutcome(task)} className="crm-btn crm-btn-secondary crm-btn-sm" style={{ padding: '0.28rem 0.55rem', fontSize: '0.74rem' }}>
                                      <CheckCircle size={12} />
                                      <span>{t('logOutcome')}</span>
                                    </button>
                                    <button type="button" onClick={() => handleOpenEdit(task)} className="crm-btn crm-btn-ghost crm-btn-icon" title={t('edit')}>
                                      <Edit size={14} />
                                    </button>
                                    <button type="button" onClick={() => setDeleteTargetId(task._id)} className="crm-btn crm-btn-ghost crm-btn-icon" style={{ color: 'var(--danger)' }} title={t('delete')}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Client-Level General Follow-Ups */}
                {activePipelineEntry.generalFollowUps.length > 0 && (
                  <div className="crm-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {t('generalClientFollowUps')} ({activePipelineEntry.generalFollowUps.length})
                    </h4>
                    <StageProgressionStrip tasks={activePipelineEntry.generalFollowUps} t={t} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {activePipelineEntry.generalFollowUps.map((task) => {
                        const stageStatus = getTaskStageStatus(task, maxLevelByGroup);
                        const isCompleted = task.status === 'completed';
                        const isPassed = stageStatus === 'passed';
                        return (
                          <div
                            key={task._id}
                            style={{
                              padding: '0.75rem 0.9rem',
                              borderRadius: '10px',
                              backgroundColor: 'var(--bg-muted)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.75rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', minWidth: 0, flex: '1 1 260px' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleComplete(task)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isCompleted ? 'var(--success)' : 'var(--text-muted)', display: 'flex', padding: 0, marginTop: '2px' }}
                                title={isCompleted ? t('reopen') : t('markComplete')}
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-main)', textDecoration: isCompleted && !isPassed ? 'line-through' : 'none' }}>
                                    {task.title}
                                  </span>
                                  <CadenceLevelBadge level={task.level || 1} />
                                  <StatusBadge status={stageStatus} />
                                  <SlaBadge slaStatus={task.slaStatus} />
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Clock size={11} />
                                    {formatDateTime(task.scheduledAt)}
                                  </span>
                                  {task.outcome && getOutcomeBadge(task.outcome)}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button type="button" onClick={() => handleOpenOutcome(task)} className="crm-btn crm-btn-secondary crm-btn-sm" style={{ padding: '0.28rem 0.55rem', fontSize: '0.74rem' }}>
                                <CheckCircle size={12} />
                                <span>{t('logOutcome')}</span>
                              </button>
                              <button type="button" onClick={() => handleOpenEdit(task)} className="crm-btn crm-btn-ghost crm-btn-icon" title={t('edit')}>
                                <Edit size={14} />
                              </button>
                              <button type="button" onClick={() => setDeleteTargetId(task._id)} className="crm-btn crm-btn-ghost crm-btn-icon" style={{ color: 'var(--danger)' }} title={t('delete')}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
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
            const columnTasks = boardTasks.filter((task) => Number(task.level || 1) === col.level);
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
                      const stageStatus = getTaskStageStatus(task, maxLevelByGroup);
                      const isPassed = stageStatus === 'passed';
                      const isCompleted = task.status === 'completed';

                      if (task.isSyntheticPassed) {
                        return (
                          <div
                            key={task._id}
                            className="crm-card"
                            style={{
                              padding: '0.8rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                              borderLeft: '3.5px solid var(--success)',
                              opacity: 0.88,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                {task.title}
                              </span>
                              <StatusBadge status="passed" />
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {t('stageProgress')}: L{task.level} → L{task.passedToLevel}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={task._id}
                          className="crm-card"
                          style={{
                            padding: '0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            borderLeft: `3.5px solid ${
                              isPassed
                                ? 'var(--success)'
                                : task.escalationTier === 'manager_escalation' || task.escalationTier === 'executive_alert'
                                ? 'var(--danger)'
                                : col.color
                            }`,
                            opacity: isPassed ? 0.88 : isCompleted ? 0.72 : 1,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)', textDecoration: isCompleted && !isPassed ? 'line-through' : 'none' }}>
                              {task.title}
                            </span>
                            <PriorityBadge priority={task.priority} />
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                            <StatusBadge status={stageStatus} />
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
            const stageStatus = getTaskStageStatus(task, maxLevelByGroup);
            const isPassed = stageStatus === 'passed';
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
                    isCompleted || isPassed
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
                          textDecoration: isCompleted && !isPassed ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </span>
                      <CadenceLevelBadge level={task.level || 1} />
                      <StatusBadge status={stageStatus} />
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
                onChange={(e) => {
                  const nextClientId = e.target.value;
                  const currentProj = projectsList.find((p) => p._id === formData.project);
                  const keepProject =
                    !nextClientId || (currentProj && getProjectClientIds(currentProj).includes(nextClientId));
                  setFormData({
                    ...formData,
                    client: nextClientId,
                    project: keepProject ? formData.project : '',
                  });
                }}
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
                onChange={(e) => {
                  const nextProjId = e.target.value;
                  const chosenProj = projectsList.find((p) => p._id === nextProjId);
                  const projClientIds = getProjectClientIds(chosenProj);
                  setFormData({
                    ...formData,
                    project: nextProjId,
                    client: formData.client || projClientIds[0] || '',
                  });
                }}
                className="crm-select"
              >
                <option value="">-- Select Project --</option>
                {modalProjects.map((p) => (
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
