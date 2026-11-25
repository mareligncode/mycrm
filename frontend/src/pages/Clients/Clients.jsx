import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Building,
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  ExternalLink,
  UserPlus,
  Download,
  Upload,
  MessageSquare,
  Send,
  Briefcase,
  TrendingUp,
  Clock,
  LayoutGrid,
  List,
  Tag,
} from 'lucide-react';
import { clientsApi, usersApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Drawer } from '../../components/common/Drawer';
import { Avatar } from '../../components/common/Avatar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, CardGridSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

const INITIAL_CLIENT_FORM = {
  clientName: '',
  companyName: '',
  clientType: 'company',
  status: 'lead',
  source: 'website',
  email: '',
  phone: '',
  website: '',
  industry: '',
  estimatedValue: '',
  assignedTo: '',
  notes: '',
  tags: '',
};

export const Clients = ({ isOpenNewModal, onCloseNewModal }) => {
  const { t, formatDate } = useLanguage();
  const { hasRole } = useAuth();
  const toast = useToast();

  const [clients, setClients] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modals & Drawer
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [touchpointForm, setTouchpointForm] = useState({
    type: 'note',
    subject: '',
    content: '',
    sendOutboundEmail: false,
  });

  const [formData, setFormData] = useState(INITIAL_CLIENT_FORM);
  const [contactForm, setContactForm] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    isPrimary: false,
  });

  const getPrimaryAssignee = (assignedTo) => {
    if (Array.isArray(assignedTo)) return assignedTo[0] || null;
    return assignedTo || null;
  };

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await clientsApi.getAll({
        search,
        status: statusFilter,
        clientType: typeFilter,
        source: sourceFilter,
        isArchived: showArchived ? 'true' : 'false',
      });
      if (res.success) {
        setClients(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast.error(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, sourceFilter, showArchived, toast]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await usersApi.getAll();
      if (res.success) {
        setUsersList(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (isOpenNewModal) {
      setFormData(INITIAL_CLIENT_FORM);
      setIsCreateModalOpen(true);
    }
  }, [isOpenNewModal]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((item) => item.trim()).filter(Boolean) : [],
        estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : 0,
      };
      if (!payload.assignedTo) delete payload.assignedTo;

      const res = await clientsApi.create(payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        if (onCloseNewModal) onCloseNewModal();
        toast.success(t('savedSuccessfully'));
        fetchClients();
      }
    } catch (err) {
      toast.error(err.message || 'Error creating client');
    }
  };

  const handleOpenEdit = (client) => {
    const primaryAssignee = getPrimaryAssignee(client.assignedTo);
    setSelectedClient(client);
    setFormData({
      clientName: client.clientName || '',
      companyName: client.companyName || '',
      clientType: client.clientType || 'company',
      status: client.status || 'lead',
      source: client.source || 'website',
      email: client.email || '',
      phone: client.phone || '',
      website: client.website || '',
      industry: client.industry || '',
      estimatedValue: client.estimatedValue || '',
      assignedTo: primaryAssignee?._id || primaryAssignee || '',
      notes: client.notes || client.description || '',
      tags: Array.isArray(client.tags) ? client.tags.join(', ') : '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDetail = async (client) => {
    setSelectedClient(client);
    setDetailTab('overview');
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await clientsApi.getById(client._id);
      if (res.success && res.data) {
        setSelectedClient(res.data);
      }
    } catch (err) {
      console.error('Error loading client details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLogTouchpoint = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const res = await clientsApi.logTouchpoint(selectedClient._id, touchpointForm);
      if (res.success) {
        setTouchpointForm({ type: 'note', subject: '', content: '', sendOutboundEmail: false });
        const refreshed = await clientsApi.getById(selectedClient._id);
        if (refreshed.success) setSelectedClient(refreshed.data);
        if (touchpointForm.sendOutboundEmail && res.emailResult && !res.emailResult.success) {
          toast.warning(`Activity logged, but email was not sent: ${res.emailResult.reason || res.emailResult.error}`);
        } else {
          toast.success(t('savedSuccessfully'));
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error logging touchpoint');
    }
  };

  const handleExportCsv = async () => {
    try {
      await clientsApi.exportCsv();
      toast.success('CSV exported');
    } catch (err) {
      toast.error(err.message || 'Error exporting clients CSV');
    }
  };

  const handleImportCsv = async (e) => {
    e.preventDefault();
    try {
      const res = await clientsApi.importCsv(csvText);
      if (res.success) {
        setImportResult(res);
        toast.success(`Imported ${res.importedCount} clients`);
        fetchClients();
      }
    } catch (err) {
      toast.error(err.message || 'Error importing CSV');
    }
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((item) => item.trim()).filter(Boolean) : [],
        estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : 0,
      };
      if (!payload.assignedTo) delete payload.assignedTo;

      const res = await clientsApi.update(selectedClient._id, payload);
      if (res.success) {
        setIsEditModalOpen(false);
        toast.success(t('savedSuccessfully'));
        fetchClients();
        if (isDetailOpen && res.data) {
          setSelectedClient((prev) => ({ ...prev, ...res.data }));
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error updating client');
    }
  };

  const handleToggleArchive = async (id) => {
    try {
      await clientsApi.toggleArchive(id);
      toast.success(t('savedSuccessfully'));
      fetchClients();
    } catch (err) {
      toast.error(err.message || 'Error updating archive status');
    }
  };

  const confirmDeleteClient = async () => {
    if (!deleteTargetId) return;
    try {
      await clientsApi.delete(deleteTargetId);
      toast.success(t('deletedSuccessfully'));
      if (selectedClient?._id === deleteTargetId) {
        setIsDetailOpen(false);
      }
      setDeleteTargetId(null);
      fetchClients();
    } catch (err) {
      toast.error(err.message || 'Error deleting client');
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const res = await clientsApi.addContact(selectedClient._id, contactForm);
      if (res.success) {
        setContactForm({ name: '', position: '', email: '', phone: '', isPrimary: false });
        setIsAddContactModalOpen(false);
        const updated = await clientsApi.getById(selectedClient._id);
        if (updated.success) setSelectedClient(updated.data);
        toast.success(t('savedSuccessfully'));
        fetchClients();
      }
    } catch (err) {
      toast.error(err.message || 'Error adding contact');
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      await clientsApi.removeContact(selectedClient._id, contactId);
      const updated = await clientsApi.getById(selectedClient._id);
      if (updated.success) setSelectedClient(updated.data);
      toast.success(t('deletedSuccessfully'));
      fetchClients();
    } catch (err) {
      toast.error(err.message || 'Error removing contact');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('clientsTitle')}</h2>
          <p className="page-subtitle">{t('clientsSubtitle')}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" onClick={handleExportCsv} className="crm-btn crm-btn-secondary crm-btn-sm">
            <Download size={15} />
            <span>{t('exportCsv')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCsvText('');
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="crm-btn crm-btn-secondary crm-btn-sm"
          >
            <Upload size={15} />
            <span>{t('importCsv')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData(INITIAL_CLIENT_FORM);
              setIsCreateModalOpen(true);
            }}
            className="crm-btn crm-btn-primary crm-btn-sm"
          >
            <Plus size={15} />
            <span>{t('addNewClient')}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        className="crm-card"
        style={{
          padding: '0.9rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', flex: 1, alignItems: 'center' }}>
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
            <option value="lead">{t('lead')}</option>
            <option value="contacted">{t('contacted')}</option>
            <option value="proposal_sent">{t('proposal_sent')}</option>
            <option value="negotiation">{t('negotiation')}</option>
            <option value="won">{t('won')}</option>
            <option value="lost">{t('lost')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '135px' }}
          >
            <option value="">{t('clientType')}: {t('all')}</option>
            <option value="company">{t('company')}</option>
            <option value="individual">{t('individual')}</option>
            <option value="organization">{t('organization')}</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="crm-select"
            style={{ width: 'auto', minWidth: '135px' }}
          >
            <option value="">{t('source')}: {t('all')}</option>
            <option value="website">{t('website')}</option>
            <option value="referral">{t('referral')}</option>
            <option value="telegram">{t('telegramSource')}</option>
            <option value="cold_call">{t('cold_call')}</option>
            <option value="linkedin">{t('linkedin')}</option>
            <option value="other">{t('other')}</option>
          </select>

          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`crm-btn crm-btn-sm ${showArchived ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
          >
            <Archive size={14} />
            <span>{showArchived ? t('archive') : t('active')}</span>
          </button>
        </div>

        {/* View Switcher */}
        <div className="crm-tabs">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`crm-tab ${viewMode === 'table' ? 'is-active' : ''}`}
          >
            <List size={14} />
            <span>{t('tableView')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`crm-tab ${viewMode === 'grid' ? 'is-active' : ''}`}
          >
            <LayoutGrid size={14} />
            <span>{t('gridView')}</span>
          </button>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        viewMode === 'grid' ? <CardGridSkeleton count={6} /> : <TableSkeleton rows={6} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('noData')}
          description={t('noClientsDesc')}
          actionLabel={t('addNewClient')}
          onAction={() => {
            setFormData(INITIAL_CLIENT_FORM);
            setIsCreateModalOpen(true);
          }}
        />
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {clients.map((c) => {
            const assignee = getPrimaryAssignee(c.assignedTo);
            const assigneeName = assignee ? `${assignee.firstName} ${assignee.lastName}` : '';
            return (
              <div
                key={c._id}
                className="crm-card crm-card-interactive"
                onClick={() => handleOpenDetail(c)}
                style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <Avatar name={c.clientName} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.clientName}
                      </h3>
                      {c.companyName && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Building size={12} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.companyName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>

                {Array.isArray(c.tags) && c.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {c.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="crm-badge crm-badge-neutral" style={{ fontSize: '0.68rem' }}>
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <div className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary)' }}>
                      ${(c.estimatedValue || 0).toLocaleString()}
                    </div>
                    {assigneeName && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{assigneeName}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button type="button" onClick={() => handleOpenEdit(c)} className="crm-btn crm-btn-ghost crm-btn-icon" title={t('edit')}>
                      <Edit size={15} />
                    </button>
                    <button type="button" onClick={() => handleToggleArchive(c._id)} className="crm-btn crm-btn-ghost crm-btn-icon" title={showArchived ? t('restore') : t('archive')}>
                      {showArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
                    </button>
                    {hasRole('super_admin', 'admin', 'manager') && (
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(c._id)}
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
            );
          })}
        </div>
      ) : (
        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>{t('clientName')}</th>
                <th>{t('status')}</th>
                <th>{t('clientType')}</th>
                <th>{t('source')}</th>
                <th>{t('estimatedValue')}</th>
                <th>{t('assignedTo')}</th>
                <th style={{ textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const assignee = getPrimaryAssignee(c.assignedTo);
                const assigneeName = assignee ? `${assignee.firstName} ${assignee.lastName}` : '';
                return (
                  <tr key={c._id}>
                    <td>
                      <div
                        onClick={() => handleOpenDetail(c)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', cursor: 'pointer' }}
                      >
                        <Avatar name={c.clientName} size={34} />
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--primary)', display: 'block' }}>
                            {c.clientName}
                          </span>
                          {c.companyName && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Building size={11} />
                              {c.companyName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>
                        {t(c.clientType)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {t(c.source)}
                      </span>
                    </td>
                    <td>
                      <span className="tabular-nums" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                        ${(c.estimatedValue || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      {assignee ? (
                        <span style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          <Avatar name={assigneeName} size={24} />
                          <span>{assigneeName}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(c)}
                          className="crm-btn crm-btn-ghost crm-btn-icon"
                          title={t('details')}
                        >
                          <ExternalLink size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="crm-btn crm-btn-ghost crm-btn-icon"
                          title={t('edit')}
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(c._id)}
                          className="crm-btn crm-btn-ghost crm-btn-icon"
                          title={showArchived ? t('restore') : t('archive')}
                        >
                          {showArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
                        </button>
                        {hasRole('super_admin', 'admin', 'manager') && (
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(c._id)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Client Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          if (onCloseNewModal) onCloseNewModal();
        }}
        title={isEditModalOpen ? t('editClient') : t('addNewClient')}
        maxWidth="680px"
      >
        <form onSubmit={isEditModalOpen ? handleUpdateClient : handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="crm-form-grid">
            <div>
              <label className="crm-label">{t('clientName')} *</label>
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Abebe Kebede"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('companyName')}</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Acme Trading PLC"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('clientType')}</label>
              <select
                value={formData.clientType}
                onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
                className="crm-select"
              >
                <option value="company">{t('company')}</option>
                <option value="individual">{t('individual')}</option>
                <option value="organization">{t('organization')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('status')}</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="crm-select"
              >
                <option value="lead">{t('lead')}</option>
                <option value="contacted">{t('contacted')}</option>
                <option value="proposal_sent">{t('proposal_sent')}</option>
                <option value="negotiation">{t('negotiation')}</option>
                <option value="won">{t('won')}</option>
                <option value="lost">{t('lost')}</option>
                <option value="inactive">{t('inactive')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@client.com"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('phone')}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251 911 223344"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">{t('source')}</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="crm-select"
              >
                <option value="website">{t('website')}</option>
                <option value="referral">{t('referral')}</option>
                <option value="telegram">{t('telegramSource')}</option>
                <option value="cold_call">{t('cold_call')}</option>
                <option value="linkedin">{t('linkedin')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('estimatedValue')}</label>
              <input
                type="number"
                value={formData.estimatedValue}
                onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                placeholder="5000"
                className="crm-input"
              />
            </div>

            <div className="crm-col-span-2">
              <label className="crm-label">{t('assignedTo')}</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
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

            <div className="crm-col-span-2">
              <label className="crm-label">{t('tags')}</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="VIP, Retail, Urgent"
                className="crm-input"
              />
            </div>

            <div className="crm-col-span-2">
              <label className="crm-label">{t('notes')}</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Background details about the client..."
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

      {/* Client 360° Slide-Over Drawer */}
      <Drawer
        isOpen={isDetailOpen && !!selectedClient}
        onClose={() => setIsDetailOpen(false)}
        title={selectedClient?.clientName || ''}
        subtitle={selectedClient?.companyName || ''}
        maxWidth="660px"
        headerActions={
          selectedClient && (
            <button
              type="button"
              onClick={() => handleOpenEdit(selectedClient)}
              className="crm-btn crm-btn-secondary crm-btn-sm"
            >
              <Edit size={14} />
              <span>{t('edit')}</span>
            </button>
          )
        }
        badges={
          selectedClient && (
            <>
              <StatusBadge status={selectedClient.status} />
              <span className="crm-badge crm-badge-neutral">{t(selectedClient.clientType)}</span>
              <span className="crm-badge crm-badge-info">{t(selectedClient.source)}</span>
              {selectedClient.estimatedValue > 0 && (
                <span className="crm-badge crm-badge-success tabular-nums">
                  ${selectedClient.estimatedValue.toLocaleString()}
                </span>
              )}
            </>
          )
        }
      >
        {selectedClient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Drawer Sub-Tabs */}
            <div className="crm-tabs" style={{ width: '100%', overflowX: 'auto' }}>
              {[
                { id: 'overview', label: t('overviewTab') },
                { id: 'timeline', label: `${t('timeline')} (${selectedClient.activities?.length || 0})` },
                { id: 'related', label: `${t('dealsAndProjectsTab')} (${(selectedClient.deals?.length || 0) + (selectedClient.projects?.length || 0)})` },
                { id: 'contacts', label: `${t('contactsTab')} (${selectedClient.contacts?.length || 0})` },
              ].map((tabItem) => (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => setDetailTab(tabItem.id)}
                  className={`crm-tab ${detailTab === tabItem.id ? 'is-active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {tabItem.label}
                </button>
              ))}
            </div>

            {detailTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-muted)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('companyName')}</span>
                    <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600 }}>{selectedClient.companyName || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('email')}</span>
                    <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600 }}>
                      {selectedClient.email ? (
                        <a href={`mailto:${selectedClient.email}`} style={{ color: 'var(--primary)' }}>
                          {selectedClient.email}
                        </a>
                      ) : '-'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('phone')}</span>
                    <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600 }}>
                      {selectedClient.phone ? (
                        <a href={`tel:${selectedClient.phone}`} style={{ color: 'var(--primary)' }}>
                          {selectedClient.phone}
                        </a>
                      ) : '-'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t('assignedTo')}</span>
                    <p style={{ margin: '0.15rem 0 0 0', fontWeight: 600 }}>
                      {(() => {
                        const assignee = getPrimaryAssignee(selectedClient.assignedTo);
                        return assignee ? `${assignee.firstName} ${assignee.lastName}` : '-';
                      })()}
                    </p>
                  </div>
                </div>

                {Array.isArray(selectedClient.tags) && selectedClient.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {selectedClient.tags.map((tag, idx) => (
                      <span key={idx} className="crm-badge crm-badge-primary">
                        <Tag size={11} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {(selectedClient.notes || selectedClient.description) && (
                  <div className="crm-card" style={{ padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.45rem 0' }}>
                      {t('notes')}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.55 }}>
                      {selectedClient.notes || selectedClient.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* Quick Touchpoint / Email Logger */}
                <form
                  onSubmit={handleLogTouchpoint}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MessageSquare size={15} style={{ color: 'var(--primary)' }} />
                      {t('logTouchpoint')}
                    </strong>
                    <div className="crm-tabs">
                      {[
                        { key: 'note', label: 'touchpointNote' },
                        { key: 'call', label: 'touchpointCall' },
                        { key: 'email', label: 'touchpointEmail' },
                        { key: 'meeting', label: 'touchpointMeeting' },
                      ].map((tp) => (
                        <button
                          type="button"
                          key={tp.key}
                          onClick={() => setTouchpointForm({ ...touchpointForm, type: tp.key })}
                          className={`crm-tab ${touchpointForm.type === tp.key ? 'is-active' : ''}`}
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.73rem' }}
                        >
                          {t(tp.label)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {touchpointForm.type === 'email' && (
                    <input
                      type="text"
                      value={touchpointForm.subject}
                      onChange={(e) => setTouchpointForm({ ...touchpointForm, subject: e.target.value })}
                      placeholder="Email subject..."
                      className="crm-input"
                      style={{ fontSize: '0.82rem' }}
                    />
                  )}

                  <textarea
                    rows={3}
                    required
                    value={touchpointForm.content}
                    onChange={(e) => setTouchpointForm({ ...touchpointForm, content: e.target.value })}
                    placeholder={`Log a ${touchpointForm.type} summary...`}
                    className="crm-input"
                    style={{ fontSize: '0.82rem' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {touchpointForm.type === 'email' && selectedClient.email ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={touchpointForm.sendOutboundEmail}
                          onChange={(e) => setTouchpointForm({ ...touchpointForm, sendOutboundEmail: e.target.checked })}
                        />
                        <span>{t('sendOutboundEmail')} ({selectedClient.email})</span>
                      </label>
                    ) : <span />}

                    <button type="submit" className="crm-btn crm-btn-primary crm-btn-sm">
                      <Send size={13} />
                      <span>{t('logTouchpoint')}</span>
                    </button>
                  </div>
                </form>

                {/* Activity List */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={15} style={{ color: 'var(--primary)' }} />
                    {t('timeline')}
                  </h4>
                  {detailLoading ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t('loading')}</p>
                  ) : !selectedClient.activities || selectedClient.activities.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>{t('noActivitiesYet')}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {selectedClient.activities.map((act) => {
                        const actorName = act.performedBy ? `${act.performedBy.firstName} ${act.performedBy.lastName}` : 'System';
                        return (
                          <div
                            key={act._id}
                            style={{
                              display: 'flex',
                              gap: '0.65rem',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '10px',
                              backgroundColor: 'var(--bg-muted)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '0.8rem',
                            }}
                          >
                            <Avatar name={actorName} size={26} />
                            <div style={{ flex: 1 }}>
                              <div style={{ color: 'var(--text-main)' }}>
                                <strong>{actorName}</strong>: {act.description}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(act.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {detailTab === 'related' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="crm-card" style={{ padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <TrendingUp size={15} style={{ color: 'var(--primary)' }} />
                    {t('associatedDeals')} ({selectedClient.deals?.length || 0})
                  </h4>
                  {!selectedClient.deals || selectedClient.deals.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{t('noData')}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedClient.deals.map((dl) => (
                        <div key={dl._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-muted)', fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: 600 }}>{dl.title}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {dl.stage && <StatusBadge status={dl.stage} />}
                            <span className="tabular-nums" style={{ fontWeight: 700 }}>{dl.currency || 'USD'} {(dl.amount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="crm-card" style={{ padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Briefcase size={15} style={{ color: 'var(--info)' }} />
                    {t('associatedProjects')} ({selectedClient.projects?.length || 0})
                  </h4>
                  {!selectedClient.projects || selectedClient.projects.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{t('noData')}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedClient.projects.map((pr) => (
                        <div key={pr._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-muted)', fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: 600 }}>{pr.projectName}</span>
                          <StatusBadge status={pr.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {detailTab === 'contacts' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    {t('contacts')} ({selectedClient.contacts?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddContactModalOpen(true)}
                    className="crm-btn crm-btn-primary crm-btn-sm"
                  >
                    <UserPlus size={14} />
                    <span>{t('addContact')}</span>
                  </button>
                </div>

                {!selectedClient.contacts || selectedClient.contacts.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No additional contact persons added.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {selectedClient.contacts.map((ct) => (
                      <div
                        key={ct._id}
                        style={{
                          padding: '0.85rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-surface-hover)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                          <Avatar name={ct.name} size={34} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.86rem' }}>{ct.name}</strong>
                              {ct.position && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({ct.position})</span>
                              )}
                              {ct.isPrimary && (
                                <span className="crm-badge crm-badge-primary" style={{ fontSize: '0.65rem' }}>Primary</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                              {ct.email && <span>{ct.email}</span>}
                              {ct.phone && <span>{ct.phone}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveContact(ct._id)}
                          className="crm-btn crm-btn-ghost crm-btn-icon"
                          style={{ color: 'var(--danger)' }}
                          title="Remove contact"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Add Contact Modal */}
      <Modal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        title={t('addContact')}
        maxWidth="460px"
      >
        <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
          <div>
            <label className="crm-label">Full Name *</label>
            <input
              type="text"
              required
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              className="crm-input"
            />
          </div>
          <div>
            <label className="crm-label">{t('position')}</label>
            <input
              type="text"
              value={contactForm.position}
              onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
              className="crm-input"
            />
          </div>
          <div>
            <label className="crm-label">{t('email')}</label>
            <input
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              className="crm-input"
            />
          </div>
          <div>
            <label className="crm-label">{t('phone')}</label>
            <input
              type="tel"
              value={contactForm.phone}
              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              className="crm-input"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="isPrimary"
              checked={contactForm.isPrimary}
              onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
            />
            <label htmlFor="isPrimary" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              {t('isPrimary')}
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.35rem' }}>
            <button type="button" onClick={() => setIsAddContactModalOpen(false)} className="crm-btn crm-btn-secondary">
              {t('cancel')}
            </button>
            <button type="submit" className="crm-btn crm-btn-primary">
              {t('add')}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t('importClientsTitle')}
        maxWidth="560px"
      >
        <form onSubmit={handleImportCsv} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {t('csvPasteHelp')}
          </p>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => setCsvText(String(ev.target?.result || ''));
              reader.readAsText(file);
            }}
            className="crm-input"
          />

          <textarea
            rows={7}
            required
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`clientName,companyName,email,phone,status,source,estimatedValue\nAbebe Kebede,Acme PLC,abebe@acme.com,+251911000000,lead,website,5000`}
            className="crm-input"
            style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
          />

          {importResult && (
            <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-muted)', fontSize: '0.82rem' }}>
              Imported: <strong>{importResult.importedCount}</strong> • Errors: <strong>{importResult.errorCount}</strong>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => setIsImportModalOpen(false)} className="crm-btn crm-btn-secondary">
              {t('close')}
            </button>
            <button type="submit" className="crm-btn crm-btn-primary">
              <Upload size={15} />
              <span>{t('importCsv')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDeleteClient}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteClient')}
        confirmLabel={t('delete')}
        variant="danger"
      />
    </div>
  );
};
