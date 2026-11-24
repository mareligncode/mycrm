import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Mail,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Edit,
  Clock,
  Shield,
  Send,
} from 'lucide-react';
import { usersApi, invitationsApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const Team = () => {
  const { t, formatDateTime } = useLanguage();
  const { user: currentUser, hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState('members');
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [createdInviteLink, setCreatedInviteLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit user form
  const [editRole, setEditRole] = useState('member');
  const [editStatus, setEditStatus] = useState('active');
  const [editDepartment, setEditDepartment] = useState('');

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [usersRes, invRes] = await Promise.all([
        usersApi.getAll(),
        invitationsApi.getAll(),
      ]);

      if (usersRes.success) setUsers(usersRes.data || []);
      if (invRes.success) setInvitations(invRes.data || []);
    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await invitationsApi.create({
        email: inviteEmail,
        role: inviteRole,
      });

      if (res.success && res.data) {
        // Backend returns `invitationToken`
        const token = res.data.invitationToken || res.data.token || '';
        const link = token ? `${window.location.origin}/?token=${token}` : '';
        setCreatedInviteLink(link);
        fetchTeamData();
      }
    } catch (err) {
      alert(err.message || 'Error creating invitation');
    }
  };

  const handleRevokeInvite = async (id) => {
    if (!window.confirm('Revoke this invitation?')) return;
    try {
      await invitationsApi.revoke(id);
      fetchTeamData();
    } catch (err) {
      alert(err.message || 'Error revoking invitation');
    }
  };

  const handleCopyLink = (token) => {
    const link = `${window.location.origin}/?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenEditUser = (u) => {
    setSelectedUser(u);
    setEditRole(u.role || 'member');
    setEditStatus(u.status || 'active');
    setEditDepartment(u.department || '');
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await usersApi.update(selectedUser._id, {
        role: editRole,
        status: editStatus,
        department: editDepartment,
      });
      if (res.success) {
        setIsEditUserModalOpen(false);
        fetchTeamData();
      }
    } catch (err) {
      alert(err.message || 'Error updating user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersApi.delete(id);
      fetchTeamData();
    } catch (err) {
      alert(err.message || 'Error deleting user');
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            {t('teamTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t('teamSubtitle')}
          </p>
        </div>

        {hasRole('super_admin', 'admin', 'manager') && (
          <button
            onClick={() => {
              setInviteEmail('');
              setInviteRole('member');
              setCreatedInviteLink('');
              setIsInviteModalOpen(true);
            }}
            className="crm-btn crm-btn-primary"
          >
            <UserPlus size={16} />
            <span>{t('sendInvitation')}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="crm-card" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('members')}
          className={activeTab === 'members' ? 'crm-btn crm-btn-primary' : 'crm-btn crm-btn-ghost'}
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
        >
          {t('membersTab')} ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={activeTab === 'invitations' ? 'crm-btn crm-btn-primary' : 'crm-btn crm-btn-ghost'}
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
        >
          {t('invitationsTab')} ({invitations.filter((i) => i.status === 'pending').length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('loading')}
        </div>
      ) : activeTab === 'members' ? (
        /* Members Table */
        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>{t('role')}</th>
                <th>{t('department')}</th>
                <th>{t('status')}</th>
                <th>{t('lastLogin')}</th>
                <th style={{ textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}>
                        {u.firstName ? u.firstName[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.875rem' }}>
                          {u.firstName} {u.lastName}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RoleBadge role={u.role} />
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem' }}>{u.department || '-'}</span>
                  </td>
                  <td>
                    <span className={`crm-badge ${u.status === 'active' ? 'crm-badge-success' : 'crm-badge-danger'}`}>
                      {t(u.status)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      {hasRole('super_admin', 'admin') && (
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="crm-btn-ghost"
                          style={{ padding: '0.35rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                          title={t('edit')}
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {hasRole('super_admin') && u.role !== 'super_admin' && (
                        <button
                          onClick={() => handleDeleteUser(u._id)}
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
      ) : (
        /* Invitations Table */
        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>{t('email')}</th>
                <th>{t('role')}</th>
                <th>{t('status')}</th>
                <th>Invited By</th>
                <th>Expires</th>
                <th style={{ textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No invitations found
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv._id}>
                    <td>
                      <strong style={{ fontSize: '0.85rem' }}>{inv.email}</strong>
                    </td>
                    <td>
                      <RoleBadge role={inv.role} />
                    </td>
                    <td>
                      <span className={`crm-badge ${inv.status === 'pending' ? 'crm-badge-warning' : inv.status === 'accepted' ? 'crm-badge-success' : 'crm-badge-neutral'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem' }}>
                        {inv.invitedBy?.firstName ? `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}` : 'Admin'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDateTime(inv.expiresAt)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {inv.status === 'pending' && hasRole('super_admin', 'admin') && (
                        <button
                          onClick={() => handleRevokeInvite(inv._id)}
                          className="crm-btn-ghost"
                          style={{ color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                        >
                          {t('revoke')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Invitation Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title={t('sendInvitation')}
        maxWidth="500px"
      >
        {createdInviteLink ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success-text)',
              fontSize: '0.875rem',
            }}>
              ✅ Invitation successfully created for <strong>{inviteEmail}</strong>!
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Invitation Token / Link
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={createdInviteLink}
                  className="crm-input"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInviteLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="crm-btn crm-btn-secondary"
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setCreatedInviteLink('');
                setIsInviteModalOpen(false);
              }}
              className="crm-btn crm-btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('email')} *
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="crm-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('role')} *
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="crm-select"
              >
                {hasRole('super_admin') && <option value="admin">{t('admin')}</option>}
                <option value="manager">{t('manager')}</option>
                <option value="sales">{t('sales')}</option>
                <option value="developer">{t('developer')}</option>
                <option value="member">{t('member')}</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="crm-btn crm-btn-secondary"
              >
                {t('cancel')}
              </button>
              <button type="submit" className="crm-btn crm-btn-primary">
                {t('sendInvitation')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit User Modal */}
      {selectedUser && (
        <Modal
          isOpen={isEditUserModalOpen}
          onClose={() => setIsEditUserModalOpen(false)}
          title={`Edit ${selectedUser.firstName} ${selectedUser.lastName}`}
          maxWidth="460px"
        >
          <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('role')}
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="crm-select"
              >
                {hasRole('super_admin') && <option value="super_admin">{t('super_admin')}</option>}
                <option value="admin">{t('admin')}</option>
                <option value="manager">{t('manager')}</option>
                <option value="sales">{t('sales')}</option>
                <option value="developer">{t('developer')}</option>
                <option value="member">{t('member')}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('status')}
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="crm-select"
              >
                <option value="active">{t('active')}</option>
                <option value="inactive">{t('inactive')}</option>
                <option value="suspended">{t('suspended')}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {t('department')}
              </label>
              <input
                type="text"
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="Sales / Engineering / Marketing"
                className="crm-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsEditUserModalOpen(false)}
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
      )}
    </div>
  );
};
