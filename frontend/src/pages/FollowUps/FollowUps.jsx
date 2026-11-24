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
  CheckSquare,
} from 'lucide-react';
import { followUpsApi, clientsApi, projectsApi, usersApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const FollowUps = ({ isOpenNewModal, onCloseNewModal }) => {
  const { t, formatDateTime } = useLanguage();
  const { user } = useAuth();

  const [followUps, setFollowUps] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter tabs: 'all', 'today', 'upcoming', 'completed'
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);

  const initialForm = {
    title: '',
    type: 'call',
    priority: 'medium',
    scheduledAt: '',
    client: '',
    project: '',
    assignedTo: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;

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
  }, [activeTab, typeFilter, priorityFilter]);

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

      const res = await followUpsApi.create(payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        if (onCloseNewModal) onCloseNewModal();
        fetchFollowUps();
      }
    } catch (err) {
      alert(err.message || 'Error creating follow-up');
    }
  };

  const handleOpenEdit = (task) => {
    setSelectedFollowUp(task);
    setFormData({
      title: task.title || '',
      type: task.type || 'call',
      priority: task.priority || 'medium',
      scheduledAt: task.scheduledAt ? new Date(task.scheduledAt).toISOString().slice(0, 16) : '',
      client: task.client?._id || task.client || '',
      project: task.project?._id || task.project || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
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

      const res = await followUpsApi.update(selectedFollowUp._id, payload);
      if (res.success) {
        setIsEditModalOpen(false);
        fetchFollowUps();
      }
    } catch (err) {
      alert(err.message || 'Error updating follow-up');
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await followUpsApi.update(task._id, { status: newStatus });
      fetchFollowUps();
    } catch (err) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await followUpsApi.delete(id);
      fetchFollowUps();
    } catch (err) {
      alert(err.message || 'Error deleting task');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'call': return <Phone size={15} />;
      case 'meeting': return <Video size={15} />;
      case 'telegram': return <Send size={15} />;
      case 'email': return <Mail size={15} />;
      default: return <Clock size={15} />;
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            {t('followUpsTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t('followUpsSubtitle')}
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
          <span>{t('scheduleNewTask')}</span>
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="crm-card" style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'allTasks' },
            { id: 'today', label: 'today' },
            { id: 'upcoming', label: 'upcoming' },
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

        {/* Dropdowns */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="">{t('followUpType')}: {t('all')}</option>
            <option value="call">{t('call')}</option>
            <option value="meeting">{t('meeting')}</option>
            <option value="telegram">{t('telegramMeeting')}</option>
            <option value="email">Email</option>
            <option value="demo">{t('demo')}</option>
            <option value="other">{t('other')}</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="">{t('priority')}: {t('all')}</option>
            <option value="low">{t('low')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="high">{t('high')}</option>
            <option value="urgent">{t('urgent')}</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('loading')}
        </div>
      ) : followUps.length === 0 ? (
        <div className="crm-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <CalendarCheck size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>{t('noData')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {followUps.map((task) => {
            const isCompleted = task.status === 'completed';
            const isPastDue = !isCompleted && new Date(task.scheduledAt) < new Date();

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
                  borderLeft: `4px solid ${
                    isCompleted ? 'var(--success)' : isPastDue ? 'var(--danger)' : 'var(--primary)'
                  }`,
                }}
              >
                {/* Left check button & Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                  <button
                    onClick={() => handleToggleComplete(task)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isCompleted ? 'var(--success)' : 'var(--text-muted)',
                      display: 'flex',
                      flexShrink: 0,
                    }}
                    title={isCompleted ? t('reopen') : t('markComplete')}
                  >
                    <CheckCircle2 size={22} />
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                      }}>
                        {task.title}
                      </span>
                      <PriorityBadge priority={task.priority} />
                      <span className="crm-badge crm-badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {getTypeIcon(task.type)}
                        {t(task.type)}
                      </span>
                      {isPastDue && (
                        <span className="crm-badge crm-badge-danger" style={{ fontSize: '0.7rem' }}>
                          {t('overdue')}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <span>📅 {formatDateTime(task.scheduledAt)}</span>
                      {task.client && <span>👤 {task.client.clientName}</span>}
                      {task.project && <span>💼 {task.project.projectName}</span>}
                      {task.assignedTo && <span>🛡️ {task.assignedTo.firstName} {task.assignedTo.lastName}</span>}
                    </div>

                    {task.notes && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleOpenEdit(task)}
                    className="crm-btn-ghost"
                    style={{ padding: '0.35rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    title={t('edit')}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(task._id)}
                    className="crm-btn-ghost"
                    style={{ padding: '0.35rem', borderRadius: '6px', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
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

      {/* Create / Edit Follow-Up Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          if (onCloseNewModal) onCloseNewModal();
        }}
        title={isEditModalOpen ? t('edit') : t('scheduleNewTask')}
        maxWidth="600px"
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
              placeholder="Call regarding proposal feedback"
              className="crm-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
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
                <option value="telegram">{t('telegramMeeting')}</option>
                <option value="email">Email</option>
                <option value="demo">{t('demo')}</option>
                <option value="other">{t('other')}</option>
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
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
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
                    {c.clientName}
                  </option>
                ))}
              </select>
            </div>

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

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('notes')}
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Key points or meeting link..."
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
