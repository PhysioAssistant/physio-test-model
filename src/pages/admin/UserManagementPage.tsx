import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/lib/api';
import type { UserProfile, UserRole } from '@/types';
import {
  Users,
  Search,
  Shield,
  Stethoscope,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { UserDetailsPanel } from '@/components/admin/UserDetailsPanel';

export default function UserManagementPage() {
  const { user: currentUser, refreshProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const data = await usersApi.listAll();
      setUsers(data);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load users from database',
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleRoleChange(targetUserId: string, newRole: UserRole) {
    setUpdatingId(targetUserId);
    setNotification(null);
    try {
      await usersApi.updateRole(targetUserId, newRole);

      // Update local table immediately
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );
      // Also update selected user panel if open
      setSelectedUser((prev) => prev && prev.id === targetUserId ? { ...prev, role: newRole } : prev);

      setNotification({
        type: 'success',
        message: `Successfully updated role to ${newRole.toUpperCase()}.`,
      });

      // If admin updated their own role, refresh auth context
      if (currentUser?.id === targetUserId) {
        await refreshProfile();
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update user role.',
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleStatusChange(targetUserId: string, newStatus: boolean) {
    setUpdatingId(targetUserId);
    setNotification(null);
    try {
      await usersApi.updateStatus(targetUserId, newStatus);

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isActive: newStatus } : u))
      );
      setSelectedUser((prev) => prev && prev.id === targetUserId ? { ...prev, isActive: newStatus } : prev);

      setNotification({
        type: 'success',
        message: `User ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update user status.',
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-xs uppercase tracking-wider mb-1">
            <Shield size={16} />
            <span>Admin Control Center</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
            User & Role Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage authenticated accounts and delegate permissions. Click any user row to view full details.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all shadow-xs disabled:opacity-60"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          Refresh Users
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border text-sm animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Search and Stats bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or role…"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
          <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/50">
            Total Users: {users.length}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/50">
            Doctors: {users.filter((u) => u.role === 'doctor').length}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200/50">
            AI Ops: {users.filter((u) => u.role === 'ai_user').length}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/50">
            Admins: {users.filter((u) => u.role === 'admin').length}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold tracking-wider">
                <th className="py-3.5 px-6">User / Practitioner</th>
                <th className="py-3.5 px-6">Email Address</th>
                <th className="py-3.5 px-6">Logins</th>
                <th className="py-3.5 px-6">Current Role</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Assign Role</th>
                <th className="py-3.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium">Loading user profiles from Supabase…</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No users found matching your search.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isUpdating = updatingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className={`group transition-colors cursor-pointer ${
                        selectedUser?.id === u.id ? 'bg-teal-50/50' : 'hover:bg-slate-50/70'
                      }`}
                      onClick={() => setSelectedUser(u)}
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
                            {u.fullName ? u.fullName.slice(0, 2) : u.email.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {u.fullName || 'Anonymous Practitioner'}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800">
                                  You
                                </span>
                              )}
                              {u.isActive === false && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                  Deactivated
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {u.specialty || 'General / Physical Therapy'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 text-slate-600 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      {/* Login dates */}
                      <td className="py-4 px-6 text-slate-500 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <Clock size={12} className="text-slate-400" />
                            <span>First: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</span>
                          </div>
                          <div className="pl-4 text-slate-400">
                            Last: {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                          </div>
                          {(u.loginCount ?? 0) > 0 && (
                            <div className="pl-4 text-slate-400">
                              {u.loginCount} login{(u.loginCount ?? 0) !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Current Role Badge */}
                      <td className="py-4 px-6">
                        {u.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <Shield size={12} />
                            Admin
                          </span>
                        )}
                        {u.role === 'doctor' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                            <Stethoscope size={12} />
                            Doctor
                          </span>
                        )}
                        {u.role === 'ai_user' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Cpu size={12} />
                            AI Lab
                          </span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={async () => handleStatusChange(u.id, !u.isActive)}
                          disabled={isUpdating || isCurrent}
                          title={isCurrent ? 'Cannot deactivate your own account' : (u.isActive ? 'Click to deactivate' : 'Click to activate')}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            u.isActive !== false ? 'bg-teal-500' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              u.isActive !== false ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`ml-2 text-xs font-medium ${u.isActive !== false ? 'text-teal-600' : 'text-slate-400'}`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Role Selector */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          {isUpdating && (
                            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          <select
                            value={u.role}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value as UserRole)
                            }
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <option value="doctor">🩺 Doctor — Clinical Mode</option>
                            <option value="ai_user">🔬 AI Operator — Lab Access</option>
                            <option value="admin">⚡ Administrator — Full Access</option>
                          </select>
                        </div>
                      </td>

                      {/* Chevron hint */}
                      <td className="py-4 px-4">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info card */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-3">
        <Shield size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-slate-800">Role Permissions Guide:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1 text-slate-500">
            <li><strong>Doctor:</strong> Has access to Clinical Intake, Patient Cases, and Doctor Ground Truth reviews.</li>
            <li><strong>AI User:</strong> Has access to Model Registry, Prompt Lab, RAG Studio, Experiments, Comparisons, and Evaluation suites.</li>
            <li><strong>Administrator:</strong> Has full access to both Doctor & AI Lab portals, plus the ability to manage user roles and system settings.</li>
          </ul>
        </div>
      </div>

      {/* User Details Side Panel */}
      {selectedUser && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40"
            onClick={() => setSelectedUser(null)}
          />
          <UserDetailsPanel
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        </>
      )}
    </div>
  );
}
