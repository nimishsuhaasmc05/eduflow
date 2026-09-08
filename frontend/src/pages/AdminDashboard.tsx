import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserCheck, GraduationCap, Shield, BookOpen, Video, 
  BarChart3, Activity, Sparkles, CheckCircle2, Clock, RefreshCw, Radio 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { getStoredToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/v1/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load admin metrics.`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Admin Dashboard Fetch Error:", err);
      setError(err.message || "Failed to load admin metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'EduFlow | Admin Dashboard';
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
        LOADING ADMIN SYSTEM METRICS & TELEMETRY...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-mono space-y-3">
        <p>⚠️ {error || "Unable to fetch backend system data."}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const metrics = data.metrics || {};
  const activeClasses = data.active_live_classes || [];
  const recentLogs = data.recent_activity || [];
  const health = data.system_health || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Shield className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>Admin System Command</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            REAL-TIME PLATFORM METRICS • SYSTEM HEALTH • AUDIT LOGS • RBAC GOVERNANCE
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center space-x-2 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#11171D] p-5 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{metrics.total_users || 0}</p>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">● {metrics.active_users || 0} Active Status</div>
        </div>

        <div className="bg-white dark:bg-[#11171D] p-5 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Students</span>
            <GraduationCap className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{metrics.total_students || 0}</p>
          <div className="text-[10px] text-slate-400 font-mono">Registered Learners</div>
        </div>

        <div className="bg-white dark:bg-[#11171D] p-5 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Teachers</span>
            <UserCheck className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{metrics.total_teachers || 0}</p>
          <div className="text-[10px] text-slate-400 font-mono">Active Educators</div>
        </div>

        <div className="bg-white dark:bg-[#11171D] p-5 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Courses</span>
            <BookOpen className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{metrics.total_courses || 0}</p>
          <div className="text-[10px] text-slate-400 font-mono">Published Catalog</div>
        </div>

        <div className="bg-white dark:bg-[#11171D] p-5 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Live Classes</span>
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{metrics.active_live_classes || 0}</p>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            ● {metrics.connected_students || 0} Connected
          </div>
        </div>
      </div>

      {/* Main Grid: Active Classes & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Live Classes List */}
        <div className="bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Video className="w-4 h-4 text-cyan-500" />
              <span>Active Live Classrooms</span>
            </h3>
            <Link to="/admin/live-classes" className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline">
              View All Live Classes →
            </Link>
          </div>

          {activeClasses.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs font-mono">
              No live classes are currently broadcasting.
            </div>
          ) : (
            <div className="space-y-3">
              {activeClasses.map((ac: any) => (
                <div key={ac.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{ac.title}</h4>
                    <p className="text-[11px] font-mono text-slate-500">Instructor: {ac.teacher_name} ({ac.teacher_email})</p>
                    <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">Class Code: <strong>{ac.class_code}</strong></div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      <span>{ac.connected_count} Connected</span>
                    </span>
                    <Link
                      to="/admin/live-classes"
                      className="inline-block mt-1 text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      Monitor Roster →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Audit Activity Logs */}
        <div className="bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>Recent Administrative Activity</span>
            </h3>
            <Link to="/admin/audit-logs" className="text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:underline">
              View Audit Logs →
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs font-mono">
              No recent administrative activity logged.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between text-xs font-mono">
                  <div className="space-y-0.5">
                    <div className="font-bold text-cyan-600 dark:text-cyan-400">[{log.action}]</div>
                    <div className="text-slate-700 dark:text-slate-300">{log.details}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Health Strip */}
      <div className="bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Edu-Flow System Infrastructure</h4>
            <p className="text-[11px] font-mono text-slate-500">PostgreSQL Relational Storage • Redis PubSub Signaling • Multi-LLM Orchestration</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Database: <strong>{health.database || 'CONNECTED'}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Status: <strong className="text-emerald-500">{health.status || 'HEALTHY'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
