import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  LayoutGrid,
  List,
  Calendar,
  UserPlus,
  X,
} from 'lucide-react';
import { projectsApi, clientsApi, usersApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Drawer } from '../../components/common/Drawer';
import { Avatar, AvatarStack } from '../../components/common/Avatar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, CardGridSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

const INITIAL_PROJECT_FORM = {
  projectName: '',
  projectCode: '',
  description: '',
  client: '',
  status: 'planning',
  priority: 'medium',
  budget: '',
  progress: 0,
  stage: 'Discovery',
  startDate: '',
  deadline: '',
  teamMembers: [],
};

const getBudgetAmount = (budget) => {
  if (typeof budget === 'number') return budget;
  return Number(budget?.amount) || 0;
};

const getTeamMemberId = (member) => {
  if (!member) return '';
  if (typeof member === 'string') return member;
  return member.user?._id || member.user || member._id || '';
};

const getTeamMemberUsers = (teamMembers = []) =>
  teamMembers
    .map((m) => (m?.user && typeof m.user === 'object' ? m.user : m))
    .filter(Boolean);

const buildProjectPayload = (formData) => {
  const payload = {
    ...formData,
    projectName: formData.projectName.trim(),
    projectCode: formData.projectCode.trim().toUpperCase(),
    budget: { amount: formData.budget ? Number(formData.budget) : 0 },
    progress: Number(formData.progress) || 0,
    teamMembers: (formData.teamMembers || []).filter(Boolean).map((userId) => ({ user: userId })),
  };
  if (!payload.startDate) delete payload.startDate;
  if (!payload.deadline) delete payload.deadline;
  return payload;
};

export const Projects = ({ isOpenNewModal, onCloseNewModal }) => {
  const { t, formatDate } = useLanguage();
  const { hasRole } = useAuth();
  const toast = useToast();

  const [projects, setProjects] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals & Drawer
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [memberToAdd, setMemberToAdd] = useState('');

  const [formData, setFormData] = useState(INITIAL_PROJECT_FORM);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await projectsApi.getAll({
        search,
        status: statusFilter,
        priority: priorityFilter,
      });
      if (res.success) {
        setProjects(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast.error(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, toast]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [clientsRes, usersRes] = await Promise.all([
        clientsApi.getAll({ limit: 100 }),
        usersApi.getAll(),
      ]);
      if (clientsRes.success) setClientsList(clientsRes.data || []);
      if (usersRes.success) setUsersList(usersRes.data || []);
    } catch (err) {
      console.error('Error fetching dependencies:', err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  useEffect(() => {
    if (isOpenNewModal) {
      setFormData(INITIAL_PROJECT_FORM);
      setIsCreateModalOpen(true);
    }
  }, [isOpenNewModal]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!formData.projectName.trim() || !formData.projectCode.trim() || !formData.client) {
      toast.error('Project name, project code, and client are required');
      return;
    }
    try {
      const payload = buildProjectPayload(formData);
      const res = await projectsApi.create(payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        if (onCloseNewModal) onCloseNewModal();
        toast.success(t('savedSuccessfully'));
        fetchProjects();
      }
    } catch (err) {
      toast.error(err.message || 'Error creating project');
    }
  };

  const handleOpenEdit = (project) => {
    setSelectedProject(project);
    const budgetAmt = getBudgetAmount(project.budget);
    setFormData({
      projectName: project.projectName || '',
      projectCode: project.projectCode || '',
      description: project.description || '',
      client: project.client?._id || project.client || '',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      budget: budgetAmt > 0 ? budgetAmt : '',
      progress: project.progress || 0,
      stage: project.stage || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      deadline: project.deadline ? project.deadline.split('T')[0] : '',
      teamMembers: project.teamMembers
        ? project.teamMembers.map((m) => getTeamMemberId(m)).filter(Boolean)
        : [],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!formData.projectName.trim() || !formData.projectCode.trim() || !formData.client) {
      toast.error('Project name, project code, and client are required');
      return;
    }
    try {
      const payload = buildProjectPayload(formData);
      const res = await projectsApi.update(selectedProject._id, payload);
      if (res.success) {
        setIsEditModalOpen(false);
        toast.success(t('savedSuccessfully'));
        if (isDetailOpen && res.data) {
          const detailRes = await projectsApi.getById(selectedProject._id).catch(() => null);
          setSelectedProject(detailRes?.success ? detailRes.data : res.data);
        }
        fetchProjects();
      }
    } catch (err) {
      toast.error(err.message || 'Error updating project');
    }
  };

  const confirmDeleteProject = async () => {
    if (!deleteTargetId) return;
    try {
      await projectsApi.delete(deleteTargetId);
      toast.success(t('deletedSuccessfully'));
      if (selectedProject?._id === deleteTargetId) setIsDetailOpen(false);
      setDeleteTargetId(null);
      fetchProjects();
    } catch (err) {
      toast.error(err.message || 'Error deleting project');
    }
  };

  const handleToggleMember = (userId) => {
    setFormData((prev) => {
      const exists = prev.teamMembers.includes(userId);
      return {
        ...prev,
        teamMembers: exists
          ? prev.teamMembers.filter((id) => id !== userId)
          : [...prev.teamMembers, userId],
      };
    });
  };

  const handleQuickAddMember = async () => {
    if (!selectedProject || !memberToAdd) return;
    try {
      const res = await projectsApi.addMember(selectedProject._id, memberToAdd);
      if (res.success) {
        const detailRes = await projectsApi.getById(selectedProject._id).catch(() => null);
        if (detailRes?.success && detailRes.data) {
          setSelectedProject(detailRes.data);
        } else if (Array.isArray(res.data)) {
          setSelectedProject((prev) => ({ ...prev, teamMembers: res.data }));
        }
        setMemberToAdd('');
        toast.success(t('savedSuccessfully'));
        fetchProjects();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add member');
    }
  };

  const handleQuickRemoveMember = async (userId) => {
    if (!selectedProject) return;
    try {
      const res = await projectsApi.removeMember(selectedProject._id, userId);
      if (res.success) {
        const detailRes = await projectsApi.getById(selectedProject._id).catch(() => null);
        if (detailRes?.success && detailRes.data) {
          setSelectedProject(detailRes.data);
        } else if (Array.isArray(res.data)) {
          setSelectedProject((prev) => ({ ...prev, teamMembers: res.data }));
        }
        toast.success(t('deletedSuccessfully'));
        fetchProjects();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const availableMembersToAdd = usersList.filter(
    (u) => !selectedProject?.teamMembers?.some((m) => getTeamMemberId(m) === u._id)
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('projectsTitle')}</h2>
          <p className="page-subtitle">{t('projectsSubtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData(INITIAL_PROJECT_FORM);
            setIsCreateModalOpen(true);
          }}
          className="crm-btn crm-btn-primary crm-btn-sm"
        >
          <Plus size={15} />
          <span>{t('addNewProject')}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="crm-card" style={{ padding: '0.9rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', flex: 1 }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '300px' }}>
            <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="crm-input"
              style={{ paddingLeft: '2.1rem' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '135px' }}
          >
            <option value="">{t('status')}: {t('all')}</option>
            <option value="planning">{t('planning')}</option>
            <option value="in_progress">{t('in_progress')}</option>
            <option value="on_hold">{t('on_hold')}</option>
            <option value="completed">{t('completed')}</option>
            <option value="cancelled">{t('cancelled')}</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '135px' }}
          >
            <option value="">{t('priority')}: {t('all')}</option>
            <option value="low">{t('low')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="high">{t('high')}</option>
            <option value="urgent">{t('urgent')}</option>
          </select>
        </div>

        <div className="crm-tabs">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`crm-tab ${viewMode === 'grid' ? 'is-active' : ''}`}
          >
            <LayoutGrid size={14} />
            <span>{t('gridView')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`crm-tab ${viewMode === 'table' ? 'is-active' : ''}`}
          >
            <List size={14} />
            <span>{t('tableView')}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        viewMode === 'grid' ? <CardGridSkeleton count={6} /> : <TableSkeleton rows={6} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={t('noData')}
          description={t('noProjectsDesc')}
          actionLabel={t('addNewProject')}
          onAction={() => {
            setFormData(INITIAL_PROJECT_FORM);
            setIsCreateModalOpen(true);
          }}
        />
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem' }}>
          {projects.map((p) => (
            <div
              key={p._id}
              className="crm-card crm-card-interactive"
              onClick={() => {
                setSelectedProject(p);
                setIsDetailOpen(true);
              }}
              style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ minWidth: 0 }}>
                  {p.projectCode && (
                    <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.68rem', marginBottom: '0.35rem' }}>
                      {p.projectCode}
                    </span>
                  )}
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {p.projectName}
                  </h3>
                  {p.client && (
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {p.client.clientName}
                    </p>
                  )}
                </div>
                <PriorityBadge priority={p.priority} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                <StatusBadge status={p.status} />
                {p.stage && <span className="crm-badge crm-badge-info">{p.stage}</span>}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '0.3rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('progress')}</span>
                  <span className="tabular-nums" style={{ color: p.progress === 100 ? 'var(--success)' : 'var(--primary)' }}>
                    {p.progress || 0}%
                  </span>
                </div>
                <div className="crm-progress-track">
                  <div
                    className="crm-progress-fill"
                    style={{
                      width: `${p.progress || 0}%`,
                      backgroundColor: p.progress === 100 ? 'var(--success)' : 'var(--primary)',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  ${getBudgetAmount(p.budget).toLocaleString()}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                  <Calendar size={12} />
                  {p.deadline ? formatDate(p.deadline) : '-'}
                </span>
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <AvatarStack members={getTeamMemberUsers(p.teamMembers || [])} max={4} size={26} />
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  <button type="button" onClick={() => handleOpenEdit(p)} className="crm-btn crm-btn-ghost crm-btn-icon" title={t('edit')}>
                    <Edit size={15} />
                  </button>
                  {hasRole('super_admin', 'admin', 'manager') && (
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(p._id)}
                      className="crm-btn crm-btn-ghost crm-btn-icon"
                      style={{ color: 'var(--danger)' }}
                      title={t('delete')}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>{t('projectName')}</th>
                <th>{t('client')}</th>
                <th>{t('status')}</th>
                <th>{t('priorityLevel')}</th>
                <th>{t('progress')}</th>
                <th>{t('budget')}</th>
                <th>{t('deadline')}</th>
                <th style={{ textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div
                      onClick={() => {
                        setSelectedProject(p);
                        setIsDetailOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--primary)', display: 'block' }}>
                        {p.projectName}
                      </span>
                      {p.projectCode && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {p.projectCode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {p.client ? (
                      <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{p.client.clientName}</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td><PriorityBadge priority={p.priority} /></td>
                  <td style={{ minWidth: '130px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="crm-progress-track" style={{ flex: 1 }}>
                        <div
                          className="crm-progress-fill"
                          style={{
                            width: `${p.progress || 0}%`,
                            backgroundColor: p.progress === 100 ? 'var(--success)' : 'var(--primary)',
                          }}
                        />
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {p.progress || 0}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="tabular-nums" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                      ${getBudgetAmount(p.budget).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {p.deadline ? formatDate(p.deadline) : '-'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProject(p);
                          setIsDetailOpen(true);
                        }}
                        className="crm-btn crm-btn-ghost crm-btn-icon"
                        title={t('details')}
                      >
                        <ExternalLink size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="crm-btn crm-btn-ghost crm-btn-icon"
                        title={t('edit')}
                      >
                        <Edit size={15} />
                      </button>
                      {hasRole('super_admin', 'admin', 'manager') && (
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(p._id)}
                          className="crm-btn crm-btn-ghost crm-btn-icon"
                          style={{ color: 'var(--danger)' }}
                          title={t('delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          if (onCloseNewModal) onCloseNewModal();
        }}
        title={isEditModalOpen ? t('editProject') : t('addNewProject')}
        maxWidth="680px"
      >
        <form onSubmit={isEditModalOpen ? handleUpdateProject : handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="crm-form-grid">
            <div>
              <label className="crm-label">{t('projectName')} *</label>
              <input
                type="text"
                required
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="Enterprise CRM Implementation"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('projectCode')} *</label>
              <input
                type="text"
                required
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                placeholder="CRM-2026-01"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('client')} *</label>
              <select
                required
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
              <label className="crm-label">{t('status')}</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="crm-select"
              >
                <option value="planning">{t('planning')}</option>
                <option value="in_progress">{t('in_progress')}</option>
                <option value="on_hold">{t('on_hold')}</option>
                <option value="completed">{t('completed')}</option>
                <option value="cancelled">{t('cancelled')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('priorityLevel')}</label>
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
              <label className="crm-label">{t('stage')}</label>
              <input
                type="text"
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                placeholder="Requirements / Design / Launch"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('budget')}</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="15000"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('progress')} ({formData.progress}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                style={{ width: '100%', marginTop: '0.55rem', accentColor: 'var(--primary)' }}
              />
            </div>

            <div>
              <label className="crm-label">{t('startDate')}</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('deadline')}</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="crm-input"
              />
            </div>

            <div className="crm-col-span-2">
              <label className="crm-label">{t('teamMembers')}</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '0.5rem',
                  maxHeight: '130px',
                  overflowY: 'auto',
                  padding: '0.6rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-muted)',
                }}
              >
                {usersList.map((u) => {
                  const isChecked = formData.teamMembers.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMember(u._id)}
                      />
                      <span>{u.firstName} {u.lastName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="crm-col-span-2">
              <label className="crm-label">{t('description')}</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="High-level project scope and targets..."
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

      {/* Project Detail Slide-Over Drawer */}
      <Drawer
        isOpen={isDetailOpen && !!selectedProject}
        onClose={() => setIsDetailOpen(false)}
        title={selectedProject?.projectName || ''}
        subtitle={selectedProject?.client?.clientName || ''}
        maxWidth="620px"
        headerActions={
          selectedProject && (
            <button
              type="button"
              onClick={() => handleOpenEdit(selectedProject)}
              className="crm-btn crm-btn-secondary crm-btn-sm"
            >
              <Edit size={14} />
              <span>{t('edit')}</span>
            </button>
          )
        }
        badges={
          selectedProject && (
            <>
              <StatusBadge status={selectedProject.status} />
              <PriorityBadge priority={selectedProject.priority} />
              {selectedProject.projectCode && (
                <span className="crm-badge crm-badge-neutral">{selectedProject.projectCode}</span>
              )}
              {selectedProject.stage && (
                <span className="crm-badge crm-badge-info">{selectedProject.stage}</span>
              )}
            </>
          )
        }
      >
        {selectedProject && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Progress Card */}
            <div className="crm-card" style={{ padding: '1rem', backgroundColor: 'var(--bg-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 700 }}>
                <span>{t('progress')}</span>
                <span className="tabular-nums">{selectedProject.progress || 0}%</span>
              </div>
              <div className="crm-progress-track" style={{ height: '10px' }}>
                <div
                  className="crm-progress-fill"
                  style={{
                    width: `${selectedProject.progress || 0}%`,
                    backgroundColor: selectedProject.progress === 100 ? 'var(--success)' : 'var(--primary)',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.9rem',
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-muted)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('client')}</span>
                <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600 }}>{selectedProject.client?.clientName || '-'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('budget')}</span>
                <p className="tabular-nums" style={{ margin: '0.15rem 0 0 0', fontWeight: 700 }}>${getBudgetAmount(selectedProject.budget).toLocaleString()}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('startDate')}</span>
                <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600 }}>{selectedProject.startDate ? formatDate(selectedProject.startDate) : '-'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('deadline')}</span>
                <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600 }}>{selectedProject.deadline ? formatDate(selectedProject.deadline) : '-'}</p>
              </div>
            </div>

            {selectedProject.description && (
              <div className="crm-card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.4rem 0' }}>
                  {t('description')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.55 }}>
                  {selectedProject.description}
                </p>
              </div>
            )}

            {/* Team Members Management */}
            <div className="crm-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  {t('teamMembers')} ({selectedProject.teamMembers?.length || 0})
                </h4>

                {availableMembersToAdd.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <select
                      value={memberToAdd}
                      onChange={(e) => setMemberToAdd(e.target.value)}
                      className="crm-select"
                      style={{ width: 'auto', minWidth: '165px', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                    >
                      <option value="">+ {t('add')}</option>
                      {availableMembersToAdd.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!memberToAdd}
                      onClick={handleQuickAddMember}
                      className="crm-btn crm-btn-primary crm-btn-sm"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                )}
              </div>

              {!selectedProject.teamMembers || selectedProject.teamMembers.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>No team members assigned.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedProject.teamMembers.map((m) => {
                    const userObj = m?.user && typeof m.user === 'object' ? m.user : m;
                    const memberId = getTeamMemberId(m);
                    const memberName = userObj?.firstName
                      ? `${userObj.firstName} ${userObj.lastName || ''}`.trim()
                      : 'Member';
                    return (
                      <div
                        key={memberId || m._id}
                        style={{
                          padding: '0.38rem 0.65rem 0.38rem 0.45rem',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--bg-muted)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                        }}
                      >
                        <Avatar name={memberName} size={22} />
                        <span style={{ fontWeight: 500 }}>{memberName}</span>
                        <button
                          type="button"
                          onClick={() => handleQuickRemoveMember(memberId)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            padding: 0,
                          }}
                          title="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDeleteProject}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteProject')}
        confirmLabel={t('delete')}
        variant="danger"
      />
    </div>
  );
};
