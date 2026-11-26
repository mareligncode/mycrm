import React, { useState, useEffect, useCallback } from 'react';
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
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Drawer } from '../../components/common/Drawer';
import { Avatar } from '../../components/common/Avatar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { KpiSkeletonGrid, TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

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
  const toast = useToast();

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
  const [detailDeal, setDetailDeal] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [lossPromptDeal, setLossPromptDeal] = useState(null);

  const getInitialForm = useCallback(
    (presetStage = 'qualified') => {
      const stageMeta = STAGES.find((s) => s.key === presetStage) || STAGES[0];
      return {
        title: '',
        client: '',
        owner: user?._id || '',
        stage: stageMeta.key,
        amount: '',
        currency: 'USD',
        probability: stageMeta.defaultProb,
        expectedCloseDate: '',
        priority: 'medium',
        source: 'website',
        notes: '',
        lossReason: '',
      };
    },
    [user?._id]
  );

  const [formData, setFormData] = useState(() => getInitialForm('qualified'));

  const loadData = useCallback(async () => {
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
      toast.error(err.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, priorityFilter, toast]);

  const loadLookups = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (isOpenNewModal) {
      setEditingDeal(null);
      setFormData(getInitialForm('qualified'));
      setIsModalOpen(true);
    }
  }, [isOpenNewModal, getInitialForm]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDeal(null);
    if (onCloseNewModal) onCloseNewModal();
  };

  const handleOpenCreate = (presetStage = 'qualified') => {
    setEditingDeal(null);
    setFormData(getInitialForm(presetStage));
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
        toast.success(t('savedSuccessfully'));
        loadData();
        loadLookups();
        if (detailDeal && res.data && detailDeal._id === res.data._id) {
          setDetailDeal(res.data);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error saving deal');
    }
  };

  const executeMoveStage = async (deal, newStage, lossReason) => {
    try {
      const res = await dealsApi.moveStage(deal._id, {
        stage: newStage,
        ...(lossReason !== undefined ? { lossReason } : {}),
      });
      if (res.success) {
        toast.success(`${deal.title} → ${t(newStage)}`);
        loadData();
        loadLookups();
        if (detailDeal && res.data && detailDeal._id === res.data._id) {
          setDetailDeal(res.data);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to move deal stage');
    }
  };

  const handleMoveStage = (deal, newStage) => {
    if (!deal || deal.stage === newStage) return;
    if (newStage === 'closed_lost') {
      setLossPromptDeal(deal);
      return;
    }
    executeMoveStage(deal, newStage);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await dealsApi.delete(deleteTargetId);
      toast.success(t('deletedSuccessfully'));
      if (detailDeal?._id === deleteTargetId) setDetailDeal(null);
      setDeleteTargetId(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete deal');
    }
  };

  const handleExportCsv = async () => {
    try {
      await dealsApi.exportCsv();
      toast.success('CSV exported');
    } catch (err) {
      toast.error(err.message || 'Failed to export deals');
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('dealsTitle')}</h2>
          <p className="page-subtitle">{t('dealsSubtitle')}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" onClick={handleExportCsv} className="crm-btn crm-btn-secondary crm-btn-sm">
            <Download size={15} />
            <span>{t('exportCsv')}</span>
          </button>
          <button type="button" onClick={() => handleOpenCreate('qualified')} className="crm-btn crm-btn-primary crm-btn-sm">
            <Plus size={15} />
            <span>{t('newDeal')}</span>
          </button>
        </div>
      </div>

      {/* Forecast KPI Cards */}
      {loading && !analytics ? (
        <KpiSkeletonGrid count={4} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          <div className="crm-card" style={{ padding: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('openPipeline')}</span>
              <strong className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.38rem', color: 'var(--text-main)' }}>
                ${(summary.openPipelineValue || 0).toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="crm-card" style={{ padding: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('weightedForecast')}</span>
              <strong className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.38rem', color: 'var(--text-main)' }}>
                ${(summary.weightedForecast || 0).toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="crm-card" style={{ padding: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('wonRevenue')}</span>
              <strong className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.38rem', color: 'var(--text-main)' }}>
                ${(summary.wonRevenue || 0).toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="crm-card" style={{ padding: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{t('winRate')}</span>
              <strong className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.38rem', color: 'var(--text-main)' }}>
                {summary.winRate || 0}%
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Filters & View Switcher */}
      <div className="crm-card" style={{ padding: '0.9rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '200px', flex: '1 1 220px', maxWidth: '300px' }}>
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

        <div className="crm-tabs">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`crm-tab ${viewMode === 'kanban' ? 'is-active' : ''}`}
          >
            <LayoutGrid size={14} />
            <span>{t('kanbanView')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`crm-tab ${viewMode === 'list' ? 'is-active' : ''}`}
          >
            <List size={14} />
            <span>{t('listView')}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <TableSkeleton rows={6} />
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
                  minWidth: '280px',
                  width: '280px',
                  flexShrink: 0,
                  backgroundColor: isOver ? 'var(--primary-light)' : 'var(--bg-muted)',
                  border: `1.5px ${isOver ? 'dashed var(--primary)' : 'solid var(--border-color)'}`,
                  borderRadius: '14px',
                  padding: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.55rem', borderBottom: `2.5px solid ${stage.color}` }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage.color }} />
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{t(stage.key)}</strong>
                      <span className="crm-badge crm-badge-neutral" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      ${stageSum.toLocaleString()} ({stage.defaultProb}%)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCreate(stage.key)}
                    className="crm-btn crm-btn-ghost crm-btn-icon"
                    title={t('newDeal')}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* Deal Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '110px' }}>
                  {stageDeals.map((deal) => {
                    const prob = deal.probability ?? stage.defaultProb;
                    const ownerName = deal.owner ? `${deal.owner.firstName} ${deal.owner.lastName}` : '';
                    return (
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
                        onClick={() => setDetailDeal(deal)}
                        className="crm-card crm-card-interactive"
                        style={{
                          padding: '0.85rem',
                          cursor: 'grab',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          opacity: draggedDealId === deal._id ? 0.55 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <strong style={{ fontSize: '0.87rem', color: 'var(--text-main)', lineHeight: 1.35 }}>
                            {deal.title}
                          </strong>
                          <PriorityBadge priority={deal.priority} />
                        </div>

                        {deal.client && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Building size={12} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {deal.client.clientName}{deal.client.companyName ? ` (${deal.client.companyName})` : ''}
                            </span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span className="tabular-nums" style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {deal.currency || 'USD'} {(deal.amount || 0).toLocaleString()}
                          </span>
                          <span className="tabular-nums" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {prob}% • ~${(deal.weightedAmount ?? Math.round(((deal.amount || 0) * prob) / 100)).toLocaleString()}
                          </span>
                        </div>

                        <div className="crm-progress-track" style={{ height: '5px' }}>
                          <div
                            className="crm-progress-fill"
                            style={{ width: `${prob}%`, backgroundColor: stage.color }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {deal.expectedCloseDate ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem' }}>
                              <Calendar size={11} />
                              {formatDate(deal.expectedCloseDate)}
                            </span>
                          ) : <span />}
                          {ownerName && <Avatar name={ownerName} size={22} />}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: '0.4rem',
                            borderTop: '1px solid var(--border-subtle)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', gap: '0.15rem' }}>
                            {stageIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveStage(deal, STAGES[stageIdx - 1].key)}
                                className="crm-btn crm-btn-ghost crm-btn-icon"
                                style={{ padding: '0.2rem' }}
                                title={`Move to ${t(STAGES[stageIdx - 1].key)}`}
                              >
                                <ChevronLeft size={14} />
                              </button>
                            )}
                            {stageIdx < STAGES.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveStage(deal, STAGES[stageIdx + 1].key)}
                                className="crm-btn crm-btn-ghost crm-btn-icon"
                                style={{ padding: '0.2rem' }}
                                title={`Move to ${t(STAGES[stageIdx + 1].key)}`}
                              >
                                <ChevronRight size={14} />
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.15rem' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(deal)}
                              className="crm-btn crm-btn-ghost crm-btn-icon"
                              style={{ padding: '0.25rem' }}
                              title={t('edit')}
                            >
                              <Edit size={13} />
                            </button>
                            {hasRole('super_admin', 'admin', 'manager') && (
                              <button
                                type="button"
                                onClick={() => setDeleteTargetId(deal._id)}
                                className="crm-btn crm-btn-ghost crm-btn-icon"
                                style={{ padding: '0.25rem', color: 'var(--danger)' }}
                                title={t('delete')}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title={t('noData')}
          description={t('noDealsDesc')}
          actionLabel={t('newDeal')}
          onAction={() => handleOpenCreate('qualified')}
        />
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
              {deals.map((d) => {
                const ownerName = d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : '';
                return (
                  <tr key={d._id}>
                    <td>
                      <strong
                        onClick={() => setDetailDeal(d)}
                        style={{ color: 'var(--primary)', cursor: 'pointer' }}
                      >
                        {d.title}
                      </strong>
                    </td>
                    <td>{d.client?.clientName || '-'}</td>
                    <td><StatusBadge status={d.stage} /></td>
                    <td><strong className="tabular-nums">{d.currency || 'USD'} {(d.amount || 0).toLocaleString()}</strong></td>
                    <td className="tabular-nums">{d.probability ?? 0}%</td>
                    <td>{formatDate(d.expectedCloseDate)}</td>
                    <td>
                      {ownerName ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Avatar name={ownerName} size={24} />
                          <span>{ownerName}</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        <button type="button" onClick={() => handleOpenEdit(d)} className="crm-btn crm-btn-ghost crm-btn-icon" title={t('edit')}>
                          <Edit size={15} />
                        </button>
                        {hasRole('super_admin', 'admin', 'manager') && (
                          <button type="button" onClick={() => setDeleteTargetId(d._id)} className="crm-btn crm-btn-ghost crm-btn-icon" style={{ color: 'var(--danger)' }} title={t('delete')}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Deal Detail Slide-Over Drawer */}
      <Drawer
        isOpen={!!detailDeal}
        onClose={() => setDetailDeal(null)}
        title={detailDeal?.title || ''}
        subtitle={detailDeal?.client ? `${detailDeal.client.clientName}${detailDeal.client.companyName ? ` • ${detailDeal.client.companyName}` : ''}` : ''}
        maxWidth="600px"
        headerActions={
          detailDeal && (
            <button
              type="button"
              onClick={() => handleOpenEdit(detailDeal)}
              className="crm-btn crm-btn-secondary crm-btn-sm"
            >
              <Edit size={14} />
              <span>{t('edit')}</span>
            </button>
          )
        }
        badges={
          detailDeal && (
            <>
              <StatusBadge status={detailDeal.stage} />
              <PriorityBadge priority={detailDeal.priority} />
              <span className="crm-badge crm-badge-primary tabular-nums">
                {detailDeal.currency || 'USD'} {(detailDeal.amount || 0).toLocaleString()}
              </span>
            </>
          )
        }
      >
        {detailDeal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Interactive Stage Stepper */}
            <div className="crm-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('stageProgress')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {STAGES.map((st) => {
                  const isCurrent = detailDeal.stage === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => handleMoveStage(detailDeal, st.key)}
                      className={`crm-btn crm-btn-sm ${isCurrent ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                      style={{
                        fontSize: '0.74rem',
                        borderColor: isCurrent ? 'transparent' : undefined,
                      }}
                    >
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isCurrent ? '#fff' : st.color }} />
                      <span>{t(st.key)}</span>
                    </button>
                  );
                })}
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
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('dealAmount')}</span>
                <p className="tabular-nums" style={{ margin: '0.15rem 0 0 0', fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>
                  {detailDeal.currency || 'USD'} {(detailDeal.amount || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('probability')}</span>
                <p className="tabular-nums" style={{ margin: '0.15rem 0 0 0', fontWeight: 700 }}>{detailDeal.probability ?? 0}%</p>
              </div>
              <div>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('expectedCloseDate')}</span>
                <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600 }}>{formatDate(detailDeal.expectedCloseDate)}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('dealOwner')}</span>
                <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600 }}>
                  {detailDeal.owner ? `${detailDeal.owner.firstName} ${detailDeal.owner.lastName}` : '-'}
                </p>
              </div>
            </div>

            {detailDeal.lossReason && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', fontSize: '0.84rem' }}>
                <strong>{t('lossReason')}:</strong> {detailDeal.lossReason}
              </div>
            )}

            {detailDeal.notes && (
              <div className="crm-card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.84rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>{t('notes')}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                  {detailDeal.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Create / Edit Deal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDeal ? t('editDeal') : t('addNewDeal')}
        maxWidth="640px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="crm-form-grid">
            <div className="crm-col-span-2">
              <label className="crm-label">{t('dealTitle')} *</label>
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
                    {c.clientName}{c.companyName ? ` (${c.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="crm-label">{t('stage')}</label>
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
              <label className="crm-label">{t('dealAmount')}</label>
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
              <label className="crm-label">{t('probability')}</label>
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
              <label className="crm-label">{t('expectedCloseDate')}</label>
              <input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                className="crm-input"
              />
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

            <div className="crm-col-span-2">
              <label className="crm-label">{t('dealOwner')}</label>
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
              <div className="crm-col-span-2">
                <label className="crm-label">{t('lossReason')}</label>
                <input
                  type="text"
                  value={formData.lossReason}
                  onChange={(e) => setFormData({ ...formData, lossReason: e.target.value })}
                  placeholder="Budget constraints, competitor chosen..."
                  className="crm-input"
                />
              </div>
            )}

            <div className="crm-col-span-2">
              <label className="crm-label">{t('notes')}</label>
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

      {/* Loss Reason Prompt Dialog */}
      <ConfirmDialog
        isOpen={!!lossPromptDeal}
        onClose={() => setLossPromptDeal(null)}
        onConfirm={(reason) => {
          const deal = lossPromptDeal;
          setLossPromptDeal(null);
          if (deal) executeMoveStage(deal, 'closed_lost', reason);
        }}
        title={t('moveToClosedLost')}
        message={t('lossReasonPrompt')}
        confirmLabel={t('confirm')}
        variant="warning"
        inputLabel={t('lossReason')}
        inputPlaceholder="Budget constraints, timeline, competitor..."
        initialInputValue={lossPromptDeal?.lossReason || ''}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteDeal')}
        confirmLabel={t('delete')}
        variant="danger"
      />
    </div>
  );
};
