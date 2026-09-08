import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Search, Users, UserCheck } from 'lucide-react';

export const AdminCourseManagement: React.FC = () => {
  const { getStoredToken } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/admin/courses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch courses list.`);
      const data = await res.json();
      setCourses(data);
    } catch (err: any) {
      console.error("Fetch courses error:", err);
      setError(err.message || "Failed to load course catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#11171D] p-6 rounded-2xl border border-slate-200 dark:border-[#26323A] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>Course Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            SYSTEM COURSE CATALOG • FACULTY ASSIGNMENT • ENROLLMENT AUDIT
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#11171D] p-4 rounded-2xl border border-slate-200 dark:border-[#26323A]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search courses by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Course Table */}
      <div className="bg-white dark:bg-[#11171D] rounded-2xl border border-slate-200 dark:border-[#26323A] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
            LOADING COURSE DIRECTORY...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs font-mono text-rose-600 dark:text-rose-400">
            ⚠️ {error}
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            No published courses found in database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-mono uppercase text-[10px] text-slate-500 tracking-wider">
                <tr>
                  <th className="p-4">Course Title & ID</th>
                  <th className="p-4">Instructor</th>
                  <th className="p-4">Enrollments</th>
                  <th className="p-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {courses.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white font-sans">{c.title}</div>
                      <div className="text-[11px] text-slate-500">ID: #{c.id} • {c.description ? c.description.slice(0, 60) + '...' : 'No description'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 font-sans">{c.instructor_name}</div>
                      <div className="text-[11px] text-slate-500">{c.instructor_email}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                        {c.enrollment_count} Students
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-[11px]">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
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
