import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Database, Server, Radio, RefreshCw, CheckCircle2 } from 'lucide-react';

export const AdminSystemMonitoring: React.FC = () => {
  const { getStoredToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/v1/admin/system', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch system health.`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Fetch system health error:", err);
      setError(err.message || "Failed to load system health metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>System Monitoring</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            INFRASTRUCTURE HEALTH • DATABASE CONNECTIVITY • WEBSOCKET HUB & REDIS METRICS
          </p>
        </div>

        <button
          onClick={fetchSystemData}
          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center space-x-2 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Ping Systems</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
          PINGING BACKEND SERVICES & INFRASTRUCTURE...
        </div>
      ) : error || !data ? (
        <div className="p-8 text-center text-xs font-mono text-rose-600 dark:text-rose-400">
          ⚠️ {error || "Failed to load system metrics"}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="bg-white dark:bg-[#11171D] p-5 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase">PostgreSQL DB</span>
                <Database className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{data.services?.database?.status || 'ONLINE'}</p>
              <div className="text-[10px] text-slate-400">Provider: {data.services?.database?.provider}</div>
            </div>

            <div className="bg-white dark:bg-[#11171D] p-5 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase">Redis Signaling</span>
                <Server className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{data.services?.redis?.status || 'ONLINE'}</p>
              <div className="text-[10px] text-slate-400">Provider: {data.services?.redis?.provider}</div>
            </div>

            <div className="bg-white dark:bg-[#11171D] p-5 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase">WebSocket Hub</span>
                <Radio className="w-4 h-4 text-cyan-500" />
              </div>
              <p className="text-xl font-extrabold text-cyan-600 dark:text-cyan-400">{data.services?.websocket?.status || 'ONLINE'}</p>
              <div className="text-[10px] text-slate-400">Active Rooms: {data.services?.websocket?.active_signaling_rooms || 1}</div>
            </div>

            <div className="bg-white dark:bg-[#11171D] p-5 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase">AI Tutor Engine</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{data.services?.ai_tutor?.status || 'ONLINE'}</p>
              <div className="text-[10px] text-slate-400">{data.services?.ai_tutor?.provider}</div>
            </div>
          </div>

          {/* Infrastructure Metrics Overview */}
          <div className="bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Active System Capacity Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">Registered Users</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{data.total_registered_users || 0} Accounts</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">Active Live Classes</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{data.active_classes_count || 0} Broadcasting</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">Connected Students</div>
                <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mt-1">{data.connected_participants || 0} Active Session Streams</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
