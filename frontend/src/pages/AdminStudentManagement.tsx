import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Search, BookOpen, Video, CheckCircle2, XCircle } from 'lucide-react';

export const AdminStudentManagement: React.FC = () => {
  const { getStoredToken } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/admin/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch student directory.`);
      const data = await res.json();
      setStudents(data);
    } catch (err: any) {
      console.error("Fetch students error:", err);
      setError(err.message || "Failed to load student directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <GraduationCap className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>Student Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            STUDENT DIRECTORY • ENROLLED COURSES • LIVE CLASS ATTENDANCE LOGS
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#11171D] p-4 rounded-2xl border border-slate-200 dark:border-[#26323A]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white dark:bg-[#11171D] rounded-2xl border border-slate-200 dark:border-[#26323A] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
            LOADING STUDENT DIRECTORY...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs font-mono text-rose-600 dark:text-rose-400">
            ⚠️ {error}
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            No registered students found in database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-mono uppercase text-[10px] text-slate-500 tracking-wider">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4">Enrolled Courses</th>
                  <th className="p-4">Live Classes Attended</th>
                  <th className="p-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white font-sans">{s.full_name}</div>
                      <div className="text-[11px] text-slate-500">{s.email}</div>
                    </td>
                    <td className="p-4">
                      {s.is_active ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active Student</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center space-x-1 text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold">
                        {s.enrolled_courses_count} Enrolled
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold">
                        {s.live_classes_joined_count} Sessions
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-[11px]">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}
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
