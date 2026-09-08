import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../../services/api';
import { Users, Eye, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

interface StudentRosterItem {
  id: number;
  name: string;
  email: string;
  attention: string;
  confusion: string;
  progress_percentage: number;
  status: string;
  interventions: number;
}

export const StudentAnalyticsTable: React.FC = () => {
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    analyticsApi.getCourseStudents(1)
      .then((data) => setStudents(data))
      .catch((err) => console.warn('Failed to load students:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Enrolled Learner Telemetry Roster</span>
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {students.length} Active Learners Monitored
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-cyan-400 flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Fetching database learner telemetry...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Avg Attention</th>
                <th className="py-3 px-4">Avg Confusion</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Affective Status</th>
                <th className="py-3 px-4">Interventions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.map((st) => (
                <tr key={st.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    <div>{st.name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{st.email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-cyan-400 font-bold">{st.attention}</td>
                  <td className="py-3.5 px-4 font-mono text-amber-400 font-bold">{st.confusion}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{st.progress_percentage}%</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      st.status === 'Confusion Alert'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : st.status === 'Needs Support'
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}>
                      {st.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{st.interventions} Adapts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
