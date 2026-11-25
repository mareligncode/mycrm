import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  DollarSign,
  Target,
  Award,
  BarChart3,
  LayoutGrid,
  List,
  Download,
  Edit,
  Trash2,
  Calendar,
  Building,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { dealsApi, clientsApi, usersApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

const STAGES = [
  { key: 'qualified', color: '#6366f1', defaultProb: 15 },
  { key: 'contacted', color: '#0ea5e9', defaultProb: 25 },
  { key: 'demo_scheduled', color: '#8b5cf6', defaultProb: 45 },
  { key: 'proposal_sent', color: '#a855f7', defaultProb: 65 },
  { key: 'negotiation', color: '#f59e0b', defaultProb: 80 },
  { key: 'closed_won', color: '#10b981', defaultProb: 100 },
  { key: 'closed_lost', color: '#ef4444', defaultProb: 0 },
];

export const Deals = ({ isOpenNewModal, onCloseNewModal }) => {
  const { t, formatDate } = useLanguage();
  const { hasRole, user } = useAuth();

  const [deals, setDeals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [clientsList, setClientsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState('kanban');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [draggedDealId, setDraggedDealId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);

  const initialForm = {
    title: '',
    client: '',
    owner: user?._id || '',
    stage: 'qualified',
    amount: '',
    currency: 'USD',
    probability: 15,
    expectedCloseDate: '',
    priority: 'medium',
    source: 'website',
    notes: '',
    lossReason: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dealsRes, analyticsRes] = await Promise.all([
        dealsApi.getAll({
          search,
          stage: stageFilter,
          priority: priorityFilter,
          limit: 200,
        }),
        dealsApi.getAnalytics(),
      ]);
      if (dealsRes.success) setDeals(dealsRes.data || []);
      if (analyticsRes.success) setAnalytics(analyticsRes.data || null);
    } catch (err) {
      console.error('Error loading deals:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [clientsRes, usersRes] = await Promise.all([
        clientsApi.getAll({ limit: 200 }),
        usersApi.getAll(),
      ]);
      if (clientsRes.success) setClientsList(clientsRes.data || []);
      if (usersRes.success) setUsersList(usersRes.data || []);
    } catch (err) {
      console.error('Error loading lookups:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, stageFilter, priorityFilter]);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    if (isOpenNewModal) {
      setEditingDeal(null);
      setFormData({ ...initialForm, owner: user?._id || '' });
      setIsModalOpen(true);
    }
  }, [isOpenNewModal]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDeal(null);
    if (onCloseNewModal) onCloseNewModal();
  };

  const handleOpenCreate = (presetStage = 'qualified') => {
    const stageMeta = STAGES.find((s) => s.key === presetStage) || STAGES[0];
    setEditingDeal(null);
    setFormData({
      ...initialForm,
      owner: user?._id || '',
      stage: stageMeta.key,
      probability: stageMeta.defaultProb,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (deal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title || '',
      client: deal.client?._id || deal.client || '',
      owner: deal.owner?._id || deal.owner || '',
      stage: deal.stage || 'qualified',
      amount: deal.amount ?? '',
      currency: deal.currency || 'USD',
      probability: deal.probability ?? 15,
      expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().slice(0, 10) : '',
      priority: deal.priority || 'medium',
      source: deal.source || 'other',
      notes: deal.notes || '',
      lossReason: deal.lossReason || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount) || 0,
        probability: Number(formData.probability) || 0,
      };
      if (!payload.owner) delete payload.owner;
      if (!payload.expectedCloseDate) delete payload.expectedCloseDate;

      const res = editingDeal
        ? await dealsApi.update(editingDeal._id, payload)
        : await dealsApi.create(payload);

      if (res.success) {
        closeModal();
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error saving deal');
    }
  };

  const handleMoveStage = async (deal, newStage) => {
    if (!deal || deal.stage === newStage) return;
    let lossReason;
    if (newStage === 'closed_lost') {
      const promptValue = window.prompt(t('lossReason') || 'Loss reason (optional):', deal.lossReason || '');
      if (promptValue === null) return;
      lossReason = promptValue;
    }

    try {
      const res = await dealsApi.moveStage(deal._id, {
        stage: newStage,
        ...(lossReason !== undefined ? { lossReason } : {}),
      });
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Failed to move deal stage');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;
    try {
      await dealsApi.delete(id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete deal');
    }
  };

  const handleExportCsv = async () => {
    try {
      await dealsApi.exportCsv();
    } catch (err) {
      alert(err.message || 'Failed to export deals');
    }
  };

  const summary = analytics || {
    openPipelineValue: 0,
    weightedForecast: 0,
    wonRevenue: 0,
    winRate: 0,
    openCount: 0,
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            {t('dealsTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t('dealsSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button onClick={handleExportCsv} className="crm-btn crm-btn-secondary">
            <Download size={16} />
            <span>{t('exportCsv')}</span>
          </button>
          <button onClick={() => handleOpenCreate('qualified')} className="crm-btn crm-btn-primary">
            <Plus size={16} />
            <span>{t('newDeal')}</span>
          </button>
        </div>
      </div>

      {/* Forecast KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div className="crm-card" style={{ padding: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('openPipeline')}</span>
            <strong style={{ fontSize: '1.35rem', color: 'var(--text-main)' }}>${(summary.openPipelineValue || 0).toLocaleString()}</strong>
          </div>
        </div>

        <div className="crm-card" style={{ padding: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('weightedForecast')}</span>
            <strong style={{ fontSize: '1.35rem', color: 'var(--text-main)' }}>${(summary.weightedForecast || 0).toLocaleString()}</strong>
          </div>
        </div>

        <div className="crm-card" style={{ padding: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('wonRevenue')}</span>
            <strong style={{ fontSize: '1.35rem', color: 'var(--text-main)' }}>${(summary.wonRevenue || 0).toLocaleString()}</strong>
          </div>
        </div>

        <div className="crm-card" style={{ padding: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('winRate')}</span>
            <strong style={{ fontSize: '1.35rem', color: 'var(--text-main)' }}>{summary.winRate || 0}%</strong>
          </div>
        </div>
      </div>

      {/* Filters & View Switcher */}
      <div className="crm-card" style={{ padding: '0.9rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '210px', flex: '1 1 220px', maxWidth: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="crm-input"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="">{t('stage')}: {t('all')}</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>{t(s.key)}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="">{t('priority')}: {t('all')}</option>
            <option value="low">{t('low')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="high">{t('high')}</option>
            <option value="urgent">{t('urgent')}</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-muted)', padding: '0.25rem', borderRadius: '8px' }}>
          <button
            onClick={() => setViewMode('kanban')}
            className={`crm-btn ${viewMode === 'kanban' ? 'crm-btn-primary' : 'crm-btn-ghost'}`}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
          >
            <LayoutGrid size={15} />
            <span>{t('kanbanView')}</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`crm-btn ${viewMode === 'list' ? 'crm-btn-primary' : 'crm-btn-ghost'}`}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
          >
            <List size={15} />
            <span>{t('listView')}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('loading')}</div>
      ) : viewMode === 'kanban' ? (
        <div style={{ display: 'flex', gap: '0.9rem', overflowX: 'auto', paddingBottom: '0.75rem', alignItems: 'flex-start' }}>
          {STAGES.filter((s) => !stageFilter || s.key === stageFilter).map((stage, stageIdx) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            const stageSum = stageDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            const isOver = dragOverStage === stage.key;

            return (
              <div
                key={stage.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage.key);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const id = e.dataTransfer.getData('text/plain') || draggedDealId;
                  const targetDeal = deals.find((d) => d._id === id);
                  if (targetDeal) handleMoveStage(targetDeal, stage.key);
                  setDraggedDealId(null);
                }}
                style={{
                  minWidth: '275px',
                  width: '275px',
                  flexShrink: 0,
                  backgroundColor: isOver ? 'var(--primary-light)' : 'var(--bg-muted)',
                  border: `1px solid ${isOver ? 'var(--primary)' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: `2px solid ${stage.color}` }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage.color }} />
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{t(stage.key)}</strong>
                      <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      ${stageSum.toLocaleString()} ({stage.defaultProb}%)
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenCreate(stage.key)}
                    className="crm-btn-ghost"
                    style={{ padding: '0.25rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    title={t('newDeal')}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* Deal Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '100px' }}>
                  {stageDeals.map((deal) => (
                    <div
                      key={deal._id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedDealId(deal._id);
                        e.dataTransfer.setData('text/plain', deal._id);
                      }}
                      onDragEnd={() => {
                        setDraggedDealId(null);
                        setDragOverStage(null);
                      }}
                      className="crm-card"
                      style={{
                        padding: '0.8rem',
                        cursor: 'grab',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        opacity: draggedDealId === deal._id ? 0.55 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                          {deal.title}
                        </strong>
                        <PriorityBadge priority={deal.priority} />
                      </div>

                      {deal.client && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Building size={12} />
                          <span>{deal.client.clientName}{deal.client.companyName ? ` (${deal.client.companyName})` : ''}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {deal.currency || 'USD'} {(deal.amount || 0).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {deal.probability ?? stage.defaultProb}% • ~${(deal.weightedAmount ?? Math.round(((deal.amount || 0) * (deal.probability ?? 0)) / 100)).toLocaleString()}
                        </span>
                      </div>

                      {deal.expectedCloseDate && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={12} />
                          <span>{formatDate(deal.expectedCloseDate)}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          {stageIdx > 0 && (
                            <button
                              onClick={() => handleMoveStage(deal, STAGES[stageIdx - 1].key)}
                              className="crm-btn-ghost"
                              style={{ padding: '0.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              title={`Move to ${t(STAGES[stageIdx - 1].key)}`}
                            >
                              <ChevronLeft size={14} />
                            </button>
                          )}
                          {stageIdx < STAGES.length - 1 && (
                            <button
                              onClick={() => handleMoveStage(deal, STAGES[stageIdx + 1].key)}
                              className="crm-btn-ghost"
                              style={{ padding: '0.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              title={`Move to ${t(STAGES[stageIdx + 1].key)}`}
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleOpenEdit(deal)}
                            className="crm-btn-ghost"
                            style={{ padding: '0.25rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            title={t('edit')}
                          >
                            <Edit size={13} />
                          </button>
                          {hasRole('super_admin', 'admin', 'manager') && (
                            <button
                              onClick={() => handleDelete(deal._id)}
                              className="crm-btn-ghost"
                              style={{ padding: '0.25rem', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'var(--danger)' }}
                              title={t('delete')}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : deals.length === 0 ? (
        <div className="crm-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <TrendingUp size={38} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
          <p style={{ margin: 0 }}>{t('noData')}</p>
        </div>
      ) : (
        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>{t('dealTitle')}</th>
                <th>{t('client')}</th>
                <th>{t('stage')}</th>
                <th>{t('dealAmount')}</th>
                <th>{t('probability')}</th>
                <th>{t('expectedCloseDate')}</th>
                <th>{t('dealOwner')}</th>
                <th style={{ textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d._id}>
                  <td>
                    <strong style={{ color: 'var(--text-main)' }}>{d.title}</strong>
                  </td>
                  <td>{d.client?.clientName || '-'}</td>
                  <td><StatusBadge status={d.stage} /></td>
                  <td><strong>{d.currency || 'USD'} {(d.amount || 0).toLocaleString()}</strong></td>
                  <td>{d.probability ?? 0}%</td>
                  <td>{formatDate(d.expectedCloseDate)}</td>
                  <td>{d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button onClick={() => handleOpenEdit(d)} className="crm-btn-ghost" style={{ padding: '0.35rem', border: 'none', cursor: 'pointer' }}>
                        <Edit size={15} />
                      </button>
                      {hasRole('super_admin', 'admin', 'manager') && (
                        <button onClick={() => handleDelete(d._id)} className="crm-btn-ghost" style={{ padding: '0.35rem', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
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

      {/* Create / Edit Deal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDeal ? t('editDeal') : t('addNewDeal')}
        maxWidth="640px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('dealTitle')} *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enterprise CRM Rollout"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('client')} *
              </label>
              <select
                required
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className="crm-select"
              >
                <option value="">-- {t('selectClient')} --</option>
                {clientsList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.clientName}{c.companyName ? ` (${c.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('stage')}
              </label>
              <select
                value={formData.stage}
                onChange={(e) => {
                  const stageKey = e.target.value;
                  const meta = STAGES.find((s) => s.key === stageKey);
                  setFormData({
                    ...formData,
                    stage: stageKey,
                    probability: meta ? meta.defaultProb : formData.probability,
                  });
                }}
                className="crm-select"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{t(s.key)}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('dealAmount')}
              </label>
              <input
                type="number"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="15000"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('probability')}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('expectedCloseDate')}
              </label>
              <input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
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

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('dealOwner')}
              </label>
              <select
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="crm-select"
              >
                <option value="">-- Unassigned --</option>
                {usersList.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({t(u.role)})
                  </option>
                ))}
              </select>
            </div>

            {formData.stage === 'closed_lost' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  {t('lossReason')}
                </label>
                <input
                  type="text"
                  value={formData.lossReason}
                  onChange={(e) => setFormData({ ...formData, lossReason: e.target.value })}
                  placeholder="Budget constraints, competitor chosen..."
                  className="crm-input"
                />
              </div>
            )}

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('notes')}
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="crm-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={closeModal} className="crm-btn crm-btn-secondary">
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
