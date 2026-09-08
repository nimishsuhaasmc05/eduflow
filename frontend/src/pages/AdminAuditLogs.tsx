import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Shield, Clock, FileText } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const { getStoredToken } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/v1/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch audit logs.`);
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error("Fetch audit logs error:", err);
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>Audit Logs & Security Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            ADMINISTRATIVE SECURITY ACTIONS • ROLE MODIFICATIONS • SYSTEM EVENT LOGS
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-[#11171D] rounded-2xl border border-slate-200 dark:border-[#26323A] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
            LOADING AUDIT LOG RECORD...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs font-mono text-rose-600 dark:text-rose-400">
            ⚠️ {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            No administrative security events logged in database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] text-slate-500 tracking-wider">
                <tr>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">User / Operator</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {logs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                    <td className="p-4 font-bold text-cyan-600 dark:text-cyan-400">
                      [{l.action}]
                    </td>
                    <td className="p-4 text-slate-800 dark:text-slate-200">
                      {l.user_email}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {l.details}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {l.created_at ? new Date(l.created_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
