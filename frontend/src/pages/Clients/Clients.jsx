import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Building,
  UserCheck,
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  ExternalLink,
  Tag,
  DollarSign,
  UserPlus,
  Download,
  Upload,
  MessageSquare,
  Send,
  Briefcase,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { clientsApi, usersApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const Clients = ({ isOpenNewModal, onCloseNewModal }) => {
  const { t, formatDate } = useLanguage();
  const { hasRole, user } = useAuth();

  const [clients, setClients] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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

  const getPrimaryAssignee = (assignedTo) => {
    if (Array.isArray(assignedTo)) return assignedTo[0] || null;
    return assignedTo || null;
  };

  // Form states
  const initialForm = {
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
  const [formData, setFormData] = useState(initialForm);

  const [contactForm, setContactForm] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    isPrimary: false,
  });

  const fetchClients = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await usersApi.getAll();
      if (res.success) {
        setUsersList(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, statusFilter, typeFilter, sourceFilter, showArchived]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Sync external open request from Dashboard
  useEffect(() => {
    if (isOpenNewModal) {
      setFormData(initialForm);
      setIsCreateModalOpen(true);
    }
  }, [isOpenNewModal]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : 0,
      };
      if (!payload.assignedTo) delete payload.assignedTo;

      const res = await clientsApi.create(payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        if (onCloseNewModal) onCloseNewModal();
        fetchClients();
      }
    } catch (err) {
      alert(err.message || 'Error creating client');
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
    setIsDetailModalOpen(true);
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
          alert(`Activity logged, but email was not sent: ${res.emailResult.reason || res.emailResult.error}`);
        }
      }
    } catch (err) {
      alert(err.message || 'Error logging touchpoint');
    }
  };

  const handleExportCsv = async () => {
    try {
      await clientsApi.exportCsv();
    } catch (err) {
      alert(err.message || 'Error exporting clients CSV');
    }
  };

  const handleImportCsv = async (e) => {
    e.preventDefault();
    try {
      const res = await clientsApi.importCsv(csvText);
      if (res.success) {
        setImportResult(res);
        fetchClients();
      }
    } catch (err) {
      alert(err.message || 'Error importing CSV');
    }
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : 0,
      };
      if (!payload.assignedTo) delete payload.assignedTo;

      const res = await clientsApi.update(selectedClient._id, payload);
      if (res.success) {
        setIsEditModalOpen(false);
        fetchClients();
      }
    } catch (err) {
      alert(err.message || 'Error updating client');
    }
  };

  const handleToggleArchive = async (id) => {
    try {
      await clientsApi.toggleArchive(id);
      fetchClients();
    } catch (err) {
      alert(err.message || 'Error updating archive status');
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await clientsApi.delete(id);
      fetchClients();
    } catch (err) {
      alert(err.message || 'Error deleting client');
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const res = await clientsApi.addContact(selectedClient._id, contactForm);
      if (res.success) {
        setContactForm({ name: '', position: '', email: '', phone: '', isPrimary: false });
        setIsAddContactModalOpen(false);
        // Refresh detail view
        const updated = await clientsApi.getById(selectedClient._id);
        if (updated.success) {
          setSelectedClient(updated.data);
        }
        fetchClients();
      }
    } catch (err) {
      alert(err.message || 'Error adding contact');
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      await clientsApi.removeContact(selectedClient._id, contactId);
      const updated = await clientsApi.getById(selectedClient._id);
      if (updated.success) {
        setSelectedClient(updated.data);
      }
      fetchClients();
    } catch (err) {
      alert(err.message || 'Error removing contact');
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            {t('clientsTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t('clientsSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            onClick={handleExportCsv}
            className="crm-btn crm-btn-secondary"
          >
            <Download size={16} />
            <span>{t('exportCsv')}</span>
          </button>
          <button
            onClick={() => {
              setCsvText('');
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="crm-btn crm-btn-secondary"
          >
            <Upload size={16} />
            <span>{t('importCsv')}</span>
          </button>
          <button
            onClick={() => {
              setFormData(initialForm);
              setIsCreateModalOpen(true);
            }}
            className="crm-btn crm-btn-primary"
          >
            <Plus size={16} />
            <span>{t('addNewClient')}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="crm-card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        {/* Search */}
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

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="crm-select"
          style={{ width: 'auto', minWidth: '130px' }}
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

        {/* Client Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="crm-select"
          style={{ width: 'auto', minWidth: '130px' }}
        >
          <option value="">{t('clientType')}: {t('all')}</option>
          <option value="company">{t('company')}</option>
          <option value="individual">{t('individual')}</option>
          <option value="organization">{t('organization')}</option>
        </select>

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="crm-select"
          style={{ width: 'auto', minWidth: '130px' }}
        >
          <option value="">{t('source')}: {t('all')}</option>
          <option value="website">{t('website')}</option>
          <option value="referral">{t('referral')}</option>
          <option value="telegram">{t('telegramSource')}</option>
          <option value="cold_call">{t('cold_call')}</option>
          <option value="linkedin">{t('linkedin')}</option>
          <option value="other">{t('other')}</option>
        </select>

        {/* Archive Toggle */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`crm-btn ${showArchived ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.55rem 0.85rem' }}
        >
          <Archive size={15} />
          <span>{showArchived ? t('archive') : t('active')}</span>
        </button>
      </div>

      {/* Clients Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('loading')}
        </div>
      ) : clients.length === 0 ? (
        <div className="crm-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>{t('noData')}</p>
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
              {clients.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div>
                      <span
                        onClick={() => handleOpenDetail(c)}
                        style={{
                          fontWeight: 600,
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          display: 'block',
                        }}
                      >
                        {c.clientName}
                      </span>
                      {c.companyName && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Building size={12} />
                          {c.companyName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                      {t(c.clientType)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {t(c.source)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      ${(c.estimatedValue || 0).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const assignee = getPrimaryAssignee(c.assignedTo);
                      return assignee ? (
                        <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary-text)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}>
                            {assignee.firstName ? assignee.firstName[0].toUpperCase() : 'U'}
                          </span>
                          {assignee.firstName} {assignee.lastName}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleOpenDetail(c)}
                        className="crm-btn-ghost"
                        style={{ padding: '0.35rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                        title={t('details')}
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="crm-btn-ghost"
                        style={{ padding: '0.35rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                        title={t('edit')}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleArchive(c._id)}
                        className="crm-btn-ghost"
                        style={{ padding: '0.35rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                        title={showArchived ? t('restore') : t('archive')}
                      >
                        {showArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                      </button>
                      {hasRole('super_admin', 'admin', 'manager') && (
                        <button
                          onClick={() => handleDeleteClient(c._id)}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('clientName')} *
              </label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('companyName')}
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Acme Trading PLC"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('clientType')}
              </label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('status')}
              </label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@client.com"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('phone')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251 911 223344"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('source')}
              </label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('estimatedValue')}
              </label>
              <input
                type="number"
                value={formData.estimatedValue}
                onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                placeholder="5000"
                className="crm-input"
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('assignedTo')}
              </label>
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

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('tags')}
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="VIP, Retail, Urgent"
                className="crm-input"
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('notes')}
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Background details about the client..."
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

      {/* Client Detail Modal */}
      {selectedClient && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedClient.clientName}
          maxWidth="720px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top metadata */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <StatusBadge status={selectedClient.status} />
              <span className="crm-badge crm-badge-neutral">{t(selectedClient.clientType)}</span>
              <span className="crm-badge crm-badge-info">{t(selectedClient.source)}</span>
              {selectedClient.estimatedValue > 0 && (
                <span className="crm-badge crm-badge-success">
                  ${selectedClient.estimatedValue.toLocaleString()}
                </span>
              )}
            </div>

            {/* Client info grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-muted)',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('companyName')}</span>
                <p style={{ margin: 0, fontWeight: 600 }}>{selectedClient.companyName || '-'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('email')}</span>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {selectedClient.email ? (
                    <a href={`mailto:${selectedClient.email}`} style={{ color: 'var(--primary)' }}>
                      {selectedClient.email}
                    </a>
                  ) : '-'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('phone')}</span>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {selectedClient.phone ? (
                    <a href={`tel:${selectedClient.phone}`} style={{ color: 'var(--primary)' }}>
                      {selectedClient.phone}
                    </a>
                  ) : '-'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('assignedTo')}</span>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {(() => {
                    const assignee = getPrimaryAssignee(selectedClient.assignedTo);
                    return assignee ? `${assignee.firstName} ${assignee.lastName}` : '-';
                  })()}
                </p>
              </div>
            </div>

            {/* Notes */}
            {(selectedClient.notes || selectedClient.description) && (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  {t('notes')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                  {selectedClient.notes || selectedClient.description}
                </p>
              </div>
            )}

            {/* Quick Touchpoint / Email Logger */}
            <form
              onSubmit={handleLogTouchpoint}
              style={{
                padding: '0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface-hover)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MessageSquare size={15} style={{ color: 'var(--primary)' }} />
                  {t('logTouchpoint')}
                </strong>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
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
                      className={`crm-btn ${touchpointForm.type === tp.key ? 'crm-btn-primary' : 'crm-btn-secondary'}`}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
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
                  style={{ fontSize: '0.8rem' }}
                />
              )}

              <textarea
                rows={2}
                required
                value={touchpointForm.content}
                onChange={(e) => setTouchpointForm({ ...touchpointForm, content: e.target.value })}
                placeholder={`Log a ${touchpointForm.type} summary...`}
                className="crm-input"
                style={{ fontSize: '0.8rem' }}
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

                <button type="submit" className="crm-btn crm-btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                  <Send size={13} />
                  <span>{t('logTouchpoint')}</span>
                </button>
              </div>
            </form>

            {/* Associated Deals & Projects Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 600, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <TrendingUp size={14} style={{ color: 'var(--primary)' }} />
                  {t('associatedDeals')} ({selectedClient.deals?.length || 0})
                </h4>
                {!selectedClient.deals || selectedClient.deals.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{t('noData')}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedClient.deals.map((dl) => (
                      <div key={dl._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span>{dl.title}</span>
                        <span style={{ fontWeight: 600 }}>{dl.currency || 'USD'} {(dl.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 600, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Briefcase size={14} style={{ color: 'var(--info)' }} />
                  {t('associatedProjects')} ({selectedClient.projects?.length || 0})
                </h4>
                {!selectedClient.projects || selectedClient.projects.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{t('noData')}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedClient.projects.map((pr) => (
                      <div key={pr._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span>{pr.projectName}</span>
                        <StatusBadge status={pr.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 360° Activity Timeline */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.6rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={15} style={{ color: 'var(--primary)' }} />
                {t('timeline')} ({selectedClient.activities?.length || 0})
              </h4>
              {detailLoading ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('loading')}</p>
              ) : !selectedClient.activities || selectedClient.activities.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{t('noActivitiesYet')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {selectedClient.activities.map((act) => (
                    <div key={act._id} style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-muted)', fontSize: '0.78rem' }}>
                      <div style={{ color: 'var(--text-main)' }}>
                        <strong>{act.performedBy ? `${act.performedBy.firstName} ${act.performedBy.lastName}` : 'System'}</strong>: {act.description}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(act.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contacts Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                  {t('contacts')} ({selectedClient.contacts?.length || 0})
                </h4>
                <button
                  onClick={() => setIsAddContactModalOpen(true)}
                  className="crm-btn crm-btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  <UserPlus size={14} />
                  <span>{t('addContact')}</span>
                </button>
              </div>

              {!selectedClient.contacts || selectedClient.contacts.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No additional contact persons added.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedClient.contacts.map((ct) => (
                    <div
                      key={ct._id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface-hover)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem' }}>{ct.name}</strong>
                          {ct.position && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({ct.position})</span>
                          )}
                          {ct.isPrimary && (
                            <span className="crm-badge crm-badge-primary" style={{ fontSize: '0.65rem' }}>Primary</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                          {ct.email && <span>✉️ {ct.email}</span>}
                          {ct.phone && <span>📞 {ct.phone}</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveContact(ct._id)}
                        className="crm-btn-ghost"
                        style={{ color: 'var(--danger)', padding: '0.25rem', border: 'none', cursor: 'pointer' }}
                        title="Remove contact"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add Contact Modal */}
      <Modal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        title={t('addContact')}
        maxWidth="460px"
      >
        <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              className="crm-input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {t('position')}
            </label>
            <input
              type="text"
              value={contactForm.position}
              onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
              className="crm-input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {t('email')}
            </label>
            <input
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              className="crm-input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {t('phone')}
            </label>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsAddContactModalOpen(false)}
              className="crm-btn crm-btn-secondary"
            >
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
    </div>
  );
};
