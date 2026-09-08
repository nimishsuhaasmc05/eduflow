import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Search, Filter, Shield, CheckCircle2, XCircle, RefreshCw, Edit2 } from 'lucide-react';

export const AdminUserManagement: React.FC = () => {
  const { user: currentUser, getStoredToken } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalAction, setModalAction] = useState<'status' | 'role' | null>(null);
  const [newRole, setNewRole] = useState('student');
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch user list.`);
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error("Fetch users error:", err);
      setError(err.message || "Failed to load user list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleToggleStatus = async (targetUser: any) => {
    if (targetUser.id === currentUser?.id && targetUser.is_active) {
      alert("Action prohibited: You cannot deactivate your own admin account.");
      return;
    }

    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/admin/users/${targetUser.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !targetUser.is_active })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Status update failed.");
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    setActionError(null);

    if (selectedUser.id === currentUser?.id && newRole !== 'admin') {
      setActionError("Action prohibited: You cannot remove admin role from your own account.");
      return;
    }

    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Role update failed.");
      setModalAction(null);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>User Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            AUTHENTICATED DB USER RECORDS • ROLE ACCESS CONTROL • ACCOUNT ACTIVATION
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white dark:bg-[#11171D] p-4 rounded-2xl border border-slate-200 dark:border-[#26323A] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, email or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher / Instructor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-[#11171D] rounded-2xl border border-slate-200 dark:border-[#26323A] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
            LOADING USER DIRECTORY...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs font-mono text-rose-600 dark:text-rose-400">
            ⚠️ {error}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            No users found matching query criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-mono uppercase text-[10px] text-slate-500 tracking-wider">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white font-sans">{u.full_name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : u.role === 'teacher' || u.role === 'instructor'
                          ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                          : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.is_active ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center space-x-1 text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setNewRole(u.role);
                          setModalAction('role');
                          setActionError(null);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold"
                      >
                        Change Role
                      </button>

                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          u.is_active
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {modalAction === 'role' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#11171D] border border-slate-200 dark:border-[#26323A] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Change Role for {selectedUser.full_name}
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Current Role: <strong>{selectedUser.role}</strong> ({selectedUser.email})
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-xs font-mono">
                ⚠️ {actionError}
              </div>
            )}

            <div className="space-y-2 font-mono text-xs">
              <label className="block text-slate-400">Select New Role:</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher / Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setModalAction(null);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeRole}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
