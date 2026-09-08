import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Video, Users, Clock, CheckCircle2, Radio, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminLiveClasses: React.FC = () => {
  const { getStoredToken } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  const fetchLiveClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/v1/admin/live-classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch live class directory.`);
      const data = await res.json();
      setClasses(data);
    } catch (err: any) {
      console.error("Fetch admin live classes error:", err);
      setError(err.message || "Failed to load live classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveClasses();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Video className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>Live Class Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            REAL-TIME CLASSROOM MONITORING • AUTHENTICATED PARTICIPANT ROSTER AUDIT
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#11171D] rounded-2xl border border-slate-200 dark:border-[#26323A] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
              LOADING LIVE CLASSROOM DIRECTORY...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs font-mono text-rose-600 dark:text-rose-400">
              ⚠️ {error}
            </div>
          ) : classes.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              No live classes found in system log.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-mono uppercase text-[10px] text-slate-500 tracking-wider">
                  <tr>
                    <th className="p-4">Live Class</th>
                    <th className="p-4">Instructor</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Present</th>
                    <th className="p-4 text-right">Roster</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {classes.map((c: any) => (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/40 cursor-pointer ${
                        selectedClass?.id === c.id ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : ''
                      }`}
                      onClick={() => setSelectedClass(c)}
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white font-sans">{c.title}</div>
                        <div className="text-[11px] text-slate-500">Code: <strong className="text-cyan-600 dark:text-cyan-400">{c.class_code}</strong></div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 font-sans">{c.teacher_name}</div>
                        <div className="text-[11px] text-slate-500">{c.teacher_email}</div>
                      </td>
                      <td className="p-4">
                        {c.status === 'LIVE' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase flex items-center space-x-1 w-fit">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                            <span>LIVE</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase">
                            {c.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-cyan-600 dark:text-cyan-400">
                          {c.connected_count} Present
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClass(c);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold"
                        >
                          Inspect Roster →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Participant Roster Details Side Panel */}
        <div className="bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-cyan-500" />
            <span>Participant Roster Audit</span>
          </h3>

          {!selectedClass ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs font-mono">
              Click on a live class row to inspect authenticated student join records.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-xs text-slate-900 dark:text-white">{selectedClass.title}</div>
                <div className="text-[11px] font-mono text-slate-500">Instructor: {selectedClass.teacher_name}</div>
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  Status: {selectedClass.status} ({selectedClass.connected_count} Connected)
                </div>
              </div>

              {(!selectedClass.roster || selectedClass.roster.length === 0) ? (
                <div className="p-6 text-center text-xs font-mono text-slate-400">
                  No students have joined this class yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {selectedClass.roster.map((st: any) => (
                    <div key={st.student_id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white font-sans">{st.full_name}</span>
                        {st.connection_status === 'CONNECTED' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                            ● CONNECTED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-500 text-[10px] font-bold">
                            DISCONNECTED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{st.email}</div>
                      <div className="text-[10px] text-slate-400 pt-1 flex justify-between">
                        <span>Joined: {st.joined_at ? new Date(st.joined_at).toLocaleTimeString() : 'N/A'}</span>
                        {st.left_at && <span>Left: {new Date(st.left_at).toLocaleTimeString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
