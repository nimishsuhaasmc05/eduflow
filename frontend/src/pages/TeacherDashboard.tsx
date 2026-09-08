import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseApi, getStoredToken, clearStoredToken } from '../services/api';
import { Course } from '../types';
import { CourseCard } from '../components/common/CourseCard';
import { AffectiveHeatmap } from '../components/teacher/AffectiveHeatmap';
import { StudentAnalyticsTable } from '../components/teacher/StudentAnalyticsTable';
import { CourseEditorModal } from '../components/teacher/CourseEditorModal';
import { 
  Plus, Sparkles, BookOpen, Users, BarChart3, Clock, Edit3, Eye, Trash2, 
  CheckCircle, FileEdit, Award, Layers, Search, Filter, AlertTriangle, Video 
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState<Course | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [aiReportGenerated, setAiReportGenerated] = useState(false);
  // Start Online Class Modal States
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [classTitle, setClassTitle] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [createClassLoading, setCreateClassLoading] = useState(false);
  const [createClassError, setCreateClassError] = useState<string | null>(null);

  const handleStartOnlineClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateClassError(null);

    const trimmedTitle = classTitle.trim();
    if (!trimmedTitle) {
      setCreateClassError('Class Title is required.');
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setCreateClassError('Your session has expired. Please log in again.');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    setCreateClassLoading(true);

    try {
      const res = await fetch('/api/v1/live-classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: classDescription.trim(),
          start_now: true
        })
      });

      if (res.status === 401) {
        clearStoredToken();
        setCreateClassError('Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 1500);
        return;
      }

      if (res.status === 403) {
        setCreateClassError('You do not have permission to start an online class.');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Unable to create the class. Please try again. (Status ${res.status})`);
      }

      const data = await res.json();
      const roomToken = data.join_token || data.room_id || data.join_code;
      
      setShowCreateClassModal(false);
      navigate(`/live/${roomToken}/room`);
    } catch (err: any) {
      console.error('Start Online Class Error:', err);
      setCreateClassError(err.message || 'Unable to create class. Backend server is unavailable.');
    } finally {
      setCreateClassLoading(false);
    }
  };

  const fetchTeacherCourses = async () => {
    setLoading(true);
    try {
      const data = await courseApi.getCourses();
      setCourses(data);
    } catch (err) {
      console.error("Failed to load courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'EduFlow | Teacher Dashboard';
    fetchTeacherCourses();
  }, []);

  const handleToggleStatus = async (c: Course) => {
    const newStatus = c.status === 'published' ? 'draft' : 'published';
    try {
      await courseApi.updateCourse(c.id, { status: newStatus });
      fetchTeacherCourses();
    } catch (err) {
      console.error("Failed to toggle course status:", err);
    }
  };

  const handleDeleteCourseConfirmed = async () => {
    if (!courseToDelete) return;
    try {
      await courseApi.deleteCourse(courseToDelete.id);
      setCourseToDelete(null);
      fetchTeacherCourses();
    } catch (err) {
      console.error("Failed to delete course:", err);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (activeFilter === 'published') return (c.status || 'published') === 'published';
    if (activeFilter === 'draft') return c.status === 'draft';
    return true;
  });

  const publishedCount = courses.filter(c => (c.status || 'published') === 'published').length;
  const draftCount = courses.filter(c => c.status === 'draft').length;

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>Course Management Command Center</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Good morning, {user?.full_name?.split(' ')[0] || 'Dr. Sarah'} 👋
          </h1>
          <p className="text-xs text-slate-600 mt-1">Manage your courses and understand your learners with real-time telemetry.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setClassTitle('');
              setClassDescription('');
              setCreateClassError(null);
              setShowCreateClassModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs transition-all flex items-center space-x-2 shadow-md shadow-cyan-600/20"
          >
            <Video className="w-4 h-4" />
            <span>🎥 Start Live Online Class</span>
          </button>

          <button
            onClick={() => setAiReportGenerated(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Generate AI Class Report</span>
          </button>

          <button
            onClick={() => {
              setSelectedCourseForEdit(null);
              setShowEditorModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all flex items-center space-x-2 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Create New Course</span>
          </button>
        </div>
      </div>

      {/* Generated AI Digest Alert */}
      {aiReportGenerated && (
        <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200 text-purple-900 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-800 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Automated AI Pedagogical Intervention Digest</span>
            </h4>
            <button onClick={() => setAiReportGenerated(false)} className="text-xs text-purple-600 hover:text-purple-900 font-bold">✕</button>
          </div>
          <p className="text-xs text-purple-900 leading-relaxed">
            <strong>Key Finding:</strong> Module 1 timestamp 01:30 triggered high confusion (78%) due to multi-variable calculus equations. Edu-Flow closed-loop engine delivered 3D interactive diagrams which brought average class comprehension back to 92%.
          </p>
        </div>
      )}

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Courses</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{courses.length}</div>
          <p className="text-[10px] text-slate-500 font-medium">Authoring Catalog</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Published</span>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono">{publishedCount}</div>
          <p className="text-[10px] text-emerald-700 font-medium">Active in Student Hub</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Drafts</span>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">{draftCount}</div>
          <p className="text-[10px] text-amber-700 font-medium">Under Preparation</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
          <div className="text-2xl font-extrabold text-cyan-600 font-mono">156</div>
          <p className="text-[10px] text-slate-500 font-medium">Enrolled Learners</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Completion</span>
          <div className="text-2xl font-extrabold text-purple-600 font-mono">78%</div>
          <p className="text-[10px] text-slate-500 font-medium">+12% vs last term</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Attention</span>
          <div className="text-2xl font-extrabold text-indigo-600 font-mono">88%</div>
          <p className="text-[10px] text-slate-500 font-medium">MediaPipe Telemetry</p>
        </div>
      </div>

      {/* Course Management Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-cyan-600" />
            <span>My Authoring Courses</span>
          </h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeFilter === 'all' ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({courses.length})
            </button>
            <button
              onClick={() => setActiveFilter('published')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeFilter === 'published' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setActiveFilter('draft')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeFilter === 'draft' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({draftCount})
            </button>
          </div>
        </div>

        {/* Course Cards Grid */}
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs font-semibold">Loading course catalog...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-dashed border-slate-300 space-y-3">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No courses found</h3>
            <p className="text-xs text-slate-500">Click "+ Create New Course" above to author your first curriculum.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                isTeacher={true}
                onEdit={(selected) => {
                  setSelectedCourseForEdit(selected);
                  setShowEditorModal(true);
                }}
                onToggleStatus={handleToggleStatus}
                onDelete={(selected) => setCourseToDelete(selected)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Class Telemetry & Heatmap Sections */}
      <div className="space-y-6 pt-4 border-t border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <span>Real-Time Class Affective Analytics</span>
        </h2>
        <AffectiveHeatmap />
        <StudentAnalyticsTable />
      </div>

      {/* Course Editor Modal */}
      {showEditorModal && (
        <CourseEditorModal
          course={selectedCourseForEdit}
          onClose={() => {
            setShowEditorModal(false);
            setSelectedCourseForEdit(null);
          }}
          onSaved={() => {
            fetchTeacherCourses();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Delete Course Confirmation</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong>"{courseToDelete.title}"</strong>? This will permanently remove the course, modules, and enrollments from PostgreSQL.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourseConfirmed}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#11171D] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <span>Start Online Class</span>
              </h3>
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {createClassError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createClassError}</span>
              </div>
            )}

            <form onSubmit={handleStartOnlineClass} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Class Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Machine Learning Basics & Neural Networks"
                  value={classTitle}
                  onChange={(e) => setClassTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-sans focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Optional Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Overview of lesson topics, algorithms, or concepts..."
                  value={classDescription}
                  onChange={(e) => setClassDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-sans focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClassLoading}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono font-bold text-xs shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
                >
                  {createClassLoading ? 'Starting Class...' : 'Start Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
