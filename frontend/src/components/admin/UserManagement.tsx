import React, { useEffect, useState } from 'react';
import { userApi } from '../../services/api';
import { User } from '../../types';
import { Users, Shield, CheckCircle, Lock, UserPlus, RefreshCw } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      const data = await userApi.getUsers();
      setUsers(data);
    } catch (e) {
      console.warn('Failed to load users for admin:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdatingId(userId);
    try {
      await userApi.updateRole(userId, newRole);
      await loadUsers();
    } catch (err) {
      console.warn('Failed to update role:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>User & RBAC Permissions Management</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Control system access, roles, and audit security logs</p>
        </div>
        <span className="text-xs font-mono text-cyan-400 font-bold">
          {users.length} Database Users Listed
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-cyan-400 flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Fetching database user directory...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Role Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    <div>{u.full_name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                      u.role === 'admin'
                        ? 'bg-purple-950 text-purple-400 border-purple-800'
                        : u.role === 'teacher'
                        ? 'bg-indigo-950 text-indigo-400 border-indigo-800'
                        : 'bg-slate-800 text-cyan-400 border-slate-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{u.is_active ? 'Active' : 'Disabled'}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
