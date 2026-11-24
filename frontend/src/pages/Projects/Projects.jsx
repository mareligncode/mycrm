import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  UserCheck,
  Edit,
  Trash2,
  ExternalLink,
  Users,
  CheckCircle,
} from 'lucide-react';
import { projectsApi, clientsApi, usersApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const Projects = ({ isOpenNewModal, onCloseNewModal }) => {
  const { t, formatDate } = useLanguage();
  const { hasRole } = useAuth();

  const [projects, setProjects] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const initialForm = {
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
  const [formData, setFormData] = useState(initialForm);

  const fetchProjects = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
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
  };

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    if (isOpenNewModal) {
      setFormData(initialForm);
      setIsCreateModalOpen(true);
    }
  }, [isOpenNewModal]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        budget: formData.budget ? Number(formData.budget) : 0,
        progress: Number(formData.progress),
      };
      if (!payload.client) delete payload.client;
      if (!payload.startDate) delete payload.startDate;
      if (!payload.deadline) delete payload.deadline;

      const res = await projectsApi.create(payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        if (onCloseNewModal) onCloseNewModal();
        fetchProjects();
      }
    } catch (err) {
      alert(err.message || 'Error creating project');
    }
  };

  const handleOpenEdit = (project) => {
    setSelectedProject(project);
    setFormData({
      projectName: project.projectName || '',
      projectCode: project.projectCode || '',
      description: project.description || '',
      client: project.client?._id || project.client || '',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      budget: project.budget || '',
      progress: project.progress || 0,
      stage: project.stage || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      deadline: project.deadline ? project.deadline.split('T')[0] : '',
      teamMembers: project.teamMembers ? project.teamMembers.map((m) => m._id || m) : [],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        budget: formData.budget ? Number(formData.budget) : 0,
        progress: Number(formData.progress),
      };
      if (!payload.client) delete payload.client;
      if (!payload.startDate) delete payload.startDate;
      if (!payload.deadline) delete payload.deadline;

      const res = await projectsApi.update(selectedProject._id, payload);
      if (res.success) {
        setIsEditModalOpen(false);
        fetchProjects();
      }
    } catch (err) {
      alert(err.message || 'Error updating project');
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectsApi.delete(id);
      fetchProjects();
    } catch (err) {
      alert(err.message || 'Error deleting project');
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

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            {t('projectsTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t('projectsSubtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            setFormData(initialForm);
            setIsCreateModalOpen(true);
          }}
          className="crm-btn crm-btn-primary"
        >
          <Plus size={16} />
          <span>{t('addNewProject')}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="crm-card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="crm-input"
            style={{ paddingLeft: '2rem' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="crm-select"
          style={{ width: 'auto', minWidth: '130px' }}
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
          style={{ width: 'auto', minWidth: '130px' }}
        >
          <option value="">{t('priority')}: {t('all')}</option>
          <option value="low">{t('low')}</option>
          <option value="medium">{t('medium')}</option>
          <option value="high">{t('high')}</option>
          <option value="urgent">{t('urgent')}</option>
        </select>
      </div>

      {/* Projects Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('loading')}
        </div>
      ) : projects.length === 0 ? (
        <div className="crm-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Briefcase size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>{t('noData')}</p>
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
                    <div>
                      <span
                        onClick={() => {
                          setSelectedProject(p);
                          setIsDetailModalOpen(true);
                        }}
                        style={{
                          fontWeight: 600,
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          display: 'block',
                        }}
                      >
                        {p.projectName}
                      </span>
                      {p.projectCode && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Code: {p.projectCode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {p.client ? (
                      <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                        {p.client.clientName}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={p.priority} />
                  </td>
                  <td style={{ minWidth: '120px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${p.progress || 0}%`,
                            height: '100%',
                            backgroundColor: p.progress === 100 ? 'var(--success)' : 'var(--primary)',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {p.progress || 0}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      ${(p.budget || 0).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {p.deadline ? formatDate(p.deadline) : '-'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => {
                          setSelectedProject(p);
                          setIsDetailModalOpen(true);
                        }}
                        className="crm-btn-ghost"
                        style={{ padding: '0.35rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                        title={t('details')}
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="crm-btn-ghost"
                        style={{ padding: '0.35rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                        title={t('edit')}
                      >
                        <Edit size={16} />
                      </button>
                      {hasRole('super_admin', 'admin', 'manager') && (
                        <button
                          onClick={() => handleDeleteProject(p._id)}
                          className="crm-btn-ghost"
                          style={{ padding: '0.35rem', borderRadius: '6px', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                          title={t('delete')}
                        >
                          <Trash2 size={16} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('projectName')} *
              </label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('projectCode')}
              </label>
              <input
                type="text"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                placeholder="CRM-2026-01"
                className="crm-input"
              />
            </div>

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

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('status')}
              </label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('priorityLevel')}
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

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('stage')}
              </label>
              <input
                type="text"
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                placeholder="Requirements / Design / Launch"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('budget')}
              </label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="15000"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('progress')} ({formData.progress}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                style={{ width: '100%', marginTop: '0.5rem', accentColor: 'var(--primary)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('startDate')}
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('deadline')}
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="crm-input"
              />
            </div>

            {/* Team Members checklist */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('teamMembers')}
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.5rem',
                maxHeight: '130px',
                overflowY: 'auto',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-muted)',
              }}>
                {usersList.map((u) => {
                  const isChecked = formData.teamMembers.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
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

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('description')}
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="High-level project scope and targets..."
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

      {/* Project Detail Modal */}
      {selectedProject && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedProject.projectName}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <StatusBadge status={selectedProject.status} />
              <PriorityBadge priority={selectedProject.priority} />
              {selectedProject.projectCode && (
                <span className="crm-badge crm-badge-neutral">{selectedProject.projectCode}</span>
              )}
              {selectedProject.stage && (
                <span className="crm-badge crm-badge-info">{selectedProject.stage}</span>
              )}
            </div>

            {/* Progress indicator */}
            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--bg-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                <span>{t('progress')}</span>
                <span>{selectedProject.progress || 0}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-surface)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${selectedProject.progress || 0}%`,
                    height: '100%',
                    backgroundColor: selectedProject.progress === 100 ? 'var(--success)' : 'var(--primary)',
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-muted)',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('client')}</span>
                <p style={{ margin: 0, fontWeight: 600 }}>{selectedProject.client?.clientName || '-'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('budget')}</span>
                <p style={{ margin: 0, fontWeight: 600 }}>${(selectedProject.budget || 0).toLocaleString()}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('startDate')}</span>
                <p style={{ margin: 0, fontWeight: 600 }}>{selectedProject.startDate ? formatDate(selectedProject.startDate) : '-'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('deadline')}</span>
                <p style={{ margin: 0, fontWeight: 600 }}>{selectedProject.deadline ? formatDate(selectedProject.deadline) : '-'}</p>
              </div>
            </div>

            {selectedProject.description && (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  {t('description')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                  {selectedProject.description}
                </p>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                {t('teamMembers')} ({selectedProject.teamMembers?.length || 0})
              </h4>
              {!selectedProject.teamMembers || selectedProject.teamMembers.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No team members assigned.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedProject.teamMembers.map((m) => (
                    <div
                      key={m._id || m}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--bg-muted)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <span>👤 {m.firstName ? `${m.firstName} ${m.lastName}` : 'Member'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
