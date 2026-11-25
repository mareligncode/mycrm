import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Edit,
  Users,
  Mail,
} from 'lucide-react';
import { usersApi, invitationsApi } from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { RoleBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton } from '../../components/common/Skeleton';

export const Team = () => {
  const { t, formatDateTime } = useLanguage();
  const { hasRole } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('members');
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [revokeInviteId, setRevokeInviteId] = useState(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [createdInviteLink, setCreatedInviteLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [editRole, setEditRole] = useState('member');
  const [editStatus, setEditStatus] = useState('active');
  const [editDepartment, setEditDepartment] = useState('');

  const fetchTeamData = useCallback(async () => {
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
      toast.error(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await invitationsApi.create({
        email: inviteEmail,
        role: inviteRole,
      });

      if (res.success && res.data) {
        const token = res.data.invitationToken || res.data.token || '';
        const link = token ? `${window.location.origin}/?token=${token}` : '';
        setCreatedInviteLink(link);
        toast.success('Invitation created');
        fetchTeamData();
      }
    } catch (err) {
      toast.error(err.message || 'Error creating invitation');
    }
  };

  const confirmRevokeInvite = async () => {
    if (!revokeInviteId) return;
    try {
      await invitationsApi.revoke(revokeInviteId);
      toast.success(t('savedSuccessfully'));
      setRevokeInviteId(null);
      fetchTeamData();
    } catch (err) {
      toast.error(err.message || 'Error revoking invitation');
    }
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
        toast.success(t('savedSuccessfully'));
        fetchTeamData();
      }
    } catch (err) {
      toast.error(err.message || 'Error updating user');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await usersApi.delete(deleteUserId);
      toast.success(t('deletedSuccessfully'));
      setDeleteUserId(null);
      fetchTeamData();
    } catch (err) {
      toast.error(err.message || 'Error deleting user');
    }
  };

  const pendingInvitesCount = invitations.filter((i) => i.status === 'pending').length;
  const activeUsersCount = users.filter((u) => u.status === 'active').length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('teamTitle')}</h2>
          <p className="page-subtitle">{t('teamSubtitle')}</p>
        </div>

        {hasRole('super_admin', 'admin', 'manager') && (
          <button
            type="button"
            onClick={() => {
              setInviteEmail('');
              setInviteRole('member');
              setCreatedInviteLink('');
              setIsInviteModalOpen(true);
            }}
            className="crm-btn crm-btn-primary crm-btn-sm"
          >
            <UserPlus size={15} />
            <span>{t('sendInvitation')}</span>
          </button>
        )}
      </div>

      {/* Team Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="crm-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '11px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block' }}>{t('membersTab')}</span>
            <strong className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>{users.length}</strong>
          </div>
        </div>

        <div className="crm-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '11px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block' }}>{t('active')}</span>
            <strong className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>{activeUsersCount}</strong>
          </div>
        </div>

        <div className="crm-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '11px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block' }}>{t('invitationsTab')}</span>
            <strong className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>{pendingInvitesCount}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="crm-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`crm-tab ${activeTab === 'members' ? 'is-active' : ''}`}
          >
            {t('membersTab')} ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invitations')}
            className={`crm-tab ${activeTab === 'invitations' ? 'is-active' : ''}`}
          >
            {t('invitationsTab')} ({pendingInvitesCount})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : activeTab === 'members' ? (
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
              {users.map((u) => {
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User';
                return (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Avatar name={fullName} size={36} />
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.875rem' }}>{fullName}</strong>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><span style={{ fontSize: '0.82rem' }}>{u.department || '-'}</span></td>
                    <td>
                      <span className={`crm-badge ${u.status === 'active' ? 'crm-badge-success' : 'crm-badge-danger'}`}>
                        <span className="crm-badge-dot" />
                        {t(u.status)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        {hasRole('super_admin', 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="crm-btn crm-btn-ghost crm-btn-icon"
                            title={t('edit')}
                          >
                            <Edit size={15} />
                          </button>
                        )}
                        {hasRole('super_admin') && u.role !== 'super_admin' && (
                          <button
                            type="button"
                            onClick={() => setDeleteUserId(u._id)}
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
      ) : (
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.25rem', color: 'var(--text-muted)' }}>
                    No invitations found
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv._id}>
                    <td><strong style={{ fontSize: '0.85rem' }}>{inv.email}</strong></td>
                    <td><RoleBadge role={inv.role} /></td>
                    <td>
                      <span className={`crm-badge ${inv.status === 'pending' ? 'crm-badge-warning' : inv.status === 'accepted' ? 'crm-badge-success' : 'crm-badge-neutral'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem' }}>
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
                          type="button"
                          onClick={() => setRevokeInviteId(inv._id)}
                          className="crm-btn crm-btn-ghost crm-btn-sm"
                          style={{ color: 'var(--danger)' }}
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
            <div style={{ padding: '0.9rem 1rem', borderRadius: '10px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', fontSize: '0.86rem' }}>
              Invitation successfully created for <strong>{inviteEmail}</strong>!
            </div>

            <div>
              <label className="crm-label">Invitation Link</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" readOnly value={createdInviteLink} className="crm-input" />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInviteLink);
                    setCopiedLink(true);
                    toast.success(t('linkCopied'));
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="crm-btn crm-btn-secondary"
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreatedInviteLink('');
                setIsInviteModalOpen(false);
              }}
              className="crm-btn crm-btn-primary"
              style={{ width: '100%', marginTop: '0.35rem' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="crm-label">{t('email')} *</label>
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
              <label className="crm-label">{t('role')} *</label>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.35rem' }}>
              <button type="button" onClick={() => setIsInviteModalOpen(false)} className="crm-btn crm-btn-secondary">
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
              <label className="crm-label">{t('role')}</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="crm-select">
                {hasRole('super_admin') && <option value="super_admin">{t('super_admin')}</option>}
                <option value="admin">{t('admin')}</option>
                <option value="manager">{t('manager')}</option>
                <option value="sales">{t('sales')}</option>
                <option value="developer">{t('developer')}</option>
                <option value="member">{t('member')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('status')}</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="crm-select">
                <option value="active">{t('active')}</option>
                <option value="inactive">{t('inactive')}</option>
                <option value="suspended">{t('suspended')}</option>
              </select>
            </div>

            <div>
              <label className="crm-label">{t('department')}</label>
              <input
                type="text"
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="Sales / Engineering / Marketing"
                className="crm-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.35rem' }}>
              <button type="button" onClick={() => setIsEditUserModalOpen(false)} className="crm-btn crm-btn-secondary">
                {t('cancel')}
              </button>
              <button type="submit" className="crm-btn crm-btn-primary">
                {t('save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        onConfirm={confirmDeleteUser}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteUser')}
        confirmLabel={t('delete')}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!revokeInviteId}
        onClose={() => setRevokeInviteId(null)}
        onConfirm={confirmRevokeInvite}
        title={t('revoke')}
        message={t('confirmRevokeInvite')}
        confirmLabel={t('revoke')}
        variant="danger"
      />
    </div>
  );
};
