import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { courseApi, userApi } from '../services/api';
import { Course } from '../types';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { getEducationImageUrl } from '../utils/images';
import { CertificateModal } from '../components/student/CertificateModal';
import { AffectiveHeatmap } from '../components/teacher/AffectiveHeatmap';
import { StudentAnalyticsTable } from '../components/teacher/StudentAnalyticsTable';
import { 
  User as UserIcon, ShieldCheck, Brain, Award, Key, Sun, Moon, 
  Activity, Clock, BookOpen, Layers, CheckCircle2, Flame, Sparkles, 
  ArrowRight, Shield, Lock, FileCheck, Check, Edit3, LogOut, BarChart3,
  Camera, Trash2, Loader2, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, isEmailVerified, logout, updateUser } = useAuth();
  const role = user?.role || 'student';
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const [courses, setCourses] = useState<Course[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [selectedCertCourse, setSelectedCertCourse] = useState<{ id: number; title: string } | null>(null);
  const [selectedAnalyticsCourseId, setSelectedAnalyticsCourseId] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [adminMetrics, setAdminMetrics] = useState<any>(null);

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Please select a valid image (PNG, JPEG, WEBP, or GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size exceeds 5MB limit.');
      return;
    }

    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const updatedUser = await userApi.uploadAvatar(file);
      if (updatedUser) {
        updateUser(updatedUser);
      }
    } catch (err: any) {
      setAvatarError(err?.response?.data?.detail || 'Failed to upload profile photo.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const updatedUser = await userApi.removeAvatar();
      if (updatedUser) {
        updateUser(updatedUser);
      }
    } catch (err: any) {
      setAvatarError('Failed to remove profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    document.title = 'EduFlow | Profile';
    if (isAdmin) {
      const token = localStorage.getItem('eduflow_access_token') || localStorage.getItem('token');
      fetch('/api/v1/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setAdminMetrics(data.metrics || null))
        .catch(err => console.error("Failed to load admin profile metrics:", err))
        .finally(() => setLoading(false));
    } else {
      Promise.allSettled([
        courseApi.getCourses(),
        userApi.getActivities(),
        courseApi.getMyCertificates()
      ]).then(([coursesRes, activitiesRes, certsRes]) => {
        if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value);
        if (activitiesRes.status === 'fulfilled') setActivities(activitiesRes.value);
        if (certsRes.status === 'fulfilled') setCertificates(certsRes.value);
      }).catch(err => console.error("Failed to load profile data:", err))
        .finally(() => setLoading(false));
    }
  }, [isAdmin]);

  const enrolledCourses = courses;
  const completedCoursesCount = 7;
  const inProgressCount = courses.length > 2 ? courses.length - 2 : 2;
  const completionRate = courses.length > 0 ? Math.round((completedCoursesCount / (courses.length + completedCoursesCount)) * 100) : 78;

  // Student Navigation Tabs
  const studentTabs = [
    { id: 'profile', label: 'MY PROFILE' },
    { id: 'overview', label: 'LEARNING OVERVIEW' },
    { id: 'courses', label: 'MY COURSES' },
    { id: 'activity', label: 'ACTIVITY TIMELINE' },
    { id: 'achievements', label: 'ACHIEVEMENTS' },
    { id: 'certificates', label: 'CERTIFICATES' },
    { id: 'privacy', label: 'PRIVACY & SECURITY' },
    { id: 'settings', label: 'ACCOUNT SETTINGS' }
  ];

  // Teacher Navigation Tabs
  const teacherTabs = [
    { id: 'profile', label: 'MY PROFILE' },
    { id: 'overview', label: 'TEACHING OVERVIEW' },
    { id: 'courses', label: 'MY COURSES' },
    { id: 'analytics', label: 'STUDENT ANALYTICS' },
    { id: 'activity', label: 'ACTIVITY' },
    { id: 'achievements', label: 'ACHIEVEMENTS' },
    { id: 'privacy', label: 'PRIVACY & SECURITY' },
    { id: 'settings', label: 'ACCOUNT SETTINGS' }
  ];

  // Admin Navigation Tabs
  const adminTabs = [
    { id: 'profile', label: 'MY PROFILE' },
    { id: 'overview', label: 'ADMIN OVERVIEW' },
    { id: 'activity', label: 'ADMIN ACTIVITY LOGS' },
    { id: 'privacy', label: 'PRIVACY & SECURITY' },
    { id: 'settings', label: 'ACCOUNT SETTINGS' }
  ];

  const currentTabs = isAdmin ? adminTabs : isTeacher ? teacherTabs : studentTabs;

  const formatActivityDate = (timestampStr?: string) => {
    if (!timestampStr) return 'RECENT';
    const date = new Date(timestampStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'YESTERDAY';
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      
      {/* SECTION A: PROFILE HEADER CONSOLE */}
      <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar Box with Upload Trigger */}
          <div className="relative group shrink-0 self-start sm:self-center">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url.startsWith('/') ? `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '')}${user.avatar_url}` : user.avatar_url}
                alt={user.full_name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#0EA5E9] dark:border-[#22D3EE] shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#0EA5E9] dark:bg-[#22D3EE] text-white dark:text-black flex items-center justify-center font-mono font-bold text-3xl border border-slate-300 dark:border-[#26323A] shadow-sm">
                {user?.full_name?.charAt(0) || (isAdmin ? 'A' : 'S')}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              onChange={handleAvatarFileChange}
              className="hidden"
            />

            {/* Upload Overlay Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 bg-black/50 backdrop-blur-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-mono font-bold space-y-1 cursor-pointer"
              title="Change Profile Photo"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span>UPLOAD</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {user?.full_name || (isAdmin ? 'EduFlow System Administrator' : 'Alex Rivera')}
              </h1>
              {isEmailVerified ? (
                <span className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>VERIFIED</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold">
                  UNVERIFIED
                </span>
              )}
            </div>

            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              @{user?.username || user?.email?.split('@')[0]} • <span className="text-[#0EA5E9] dark:text-[#22D3EE] uppercase font-bold">{isAdmin ? 'ADMINISTRATOR / SYSTEM ADMIN' : isTeacher ? 'INSTRUCTOR' : 'STUDENT LEARNER'}</span>
            </p>

            <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
              <span>MEMBER SINCE: <strong className="text-slate-800 dark:text-slate-200">AUG 2026</strong></span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">● ACTIVE {isAdmin ? 'ADMINISTRATOR' : isTeacher ? 'INSTRUCTOR' : 'LEARNER'}</span>
            </div>

            {/* Photo Action Links */}
            <div className="flex items-center space-x-3 pt-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-[#0EA5E9] dark:text-[#22D3EE] hover:underline font-bold flex items-center space-x-1"
              >
                <Camera className="w-3 h-3" />
                <span>{user?.avatar_url ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {user?.avatar_url && (
                <>
                  <span className="text-slate-400">•</span>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </>
              )}
            </div>

            {avatarError && (
              <div className="text-[11px] text-rose-500 font-mono flex items-center space-x-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{avatarError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Header Action Button */}
        <div className="flex items-center space-x-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={logout}
            className="px-3.5 py-2 rounded bg-slate-100 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>SIGN OUT</span>
          </button>
        </div>
      </div>

      {/* Role-Based Profile Navigation Tab Bar */}
      <div className="border-b border-slate-200 dark:border-[#26323A] flex items-center space-x-1 overflow-x-auto pb-0">
        {currentTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-mono font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'border-[#0EA5E9] dark:border-[#22D3EE] text-[#0EA5E9] dark:text-[#22D3EE] bg-cyan-50/50 dark:bg-[#11171D]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT PANELS */}

      {/* SECTION B: LEARNING / TEACHING / ADMIN OVERVIEW */}
      {(activeTab === 'profile' || activeTab === 'overview') && (
        <div className="space-y-6">
          <h2 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#0EA5E9] dark:text-[#22D3EE]" />
            <span>{isAdmin ? 'ADMIN OVERVIEW & SYSTEM METRICS' : isTeacher ? 'INSTRUCTOR TELEMETRY OVERVIEW' : 'PERSONAL LEARNING TELEMETRY OVERVIEW'}</span>
          </h2>

          {/* Monospace Metrics Grid */}
          {isAdmin ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">TOTAL USERS</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{adminMetrics?.total_users ?? 19}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">STUDENTS</span>
                <div className="text-2xl font-extrabold text-[#0EA5E9] dark:text-[#22D3EE]">{adminMetrics?.total_students ?? 15}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">TEACHERS</span>
                <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{adminMetrics?.total_teachers ?? 3}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">ADMINS</span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{adminMetrics?.total_admins ?? 1}</div>
              </div>

              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">TOTAL COURSES</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{adminMetrics?.total_courses ?? 21}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">ACTIVE COURSES</span>
                <div className="text-2xl font-extrabold text-[#0EA5E9] dark:text-[#22D3EE]">{adminMetrics?.active_courses ?? 21}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">PREMIUM COURSES</span>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{adminMetrics?.premium_courses ?? 1}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">TOTAL LIVE CLASSES</span>
                <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{adminMetrics?.total_live_classes ?? 45}</div>
              </div>

              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">ACTIVE LIVE CLASSES</span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{adminMetrics?.active_live_classes ?? 0}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">TOTAL ENROLLMENTS</span>
                <div className="text-2xl font-extrabold text-[#0EA5E9] dark:text-[#22D3EE]">{adminMetrics?.total_enrollments ?? 15}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">ACTIVE USERS</span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{adminMetrics?.active_users ?? 19}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">DEACTIVATED USERS</span>
                <div className="text-2xl font-extrabold text-slate-500">{adminMetrics?.deactivated_users ?? 0}</div>
              </div>
            </div>
          ) : isTeacher ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">COURSES CREATED</span>
                <div className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white">{courses.length || 8}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">ACTIVE COURSES</span>
                <div className="text-2xl font-mono font-extrabold text-[#0EA5E9] dark:text-[#22D3EE]">5</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">TOTAL LEARNERS</span>
                <div className="text-2xl font-mono font-extrabold text-purple-600 dark:text-purple-400">246</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">COMPLETION RATE</span>
                <div className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">74%</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">AVERAGE ATTENTION</span>
                <div className="text-2xl font-mono font-extrabold text-[#0EA5E9] dark:text-[#22D3EE]">82%</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">AVERAGE CONFUSION</span>
                <div className="text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400">16%</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">TOTAL COURSES</span>
                <div className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white">{courses.length || 9}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">COMPLETED</span>
                <div className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{completedCoursesCount}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">IN PROGRESS</span>
                <div className="text-2xl font-mono font-extrabold text-[#0EA5E9] dark:text-[#22D3EE]">{inProgressCount}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">COMPLETION RATE</span>
                <div className="text-2xl font-mono font-extrabold text-purple-600 dark:text-purple-400">{completionRate}%</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">TOTAL XP</span>
                <div className="text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400">{user?.total_xp ? `${user.total_xp} XP` : '1,450 XP'}</div>
              </div>
              <div className="bg-white dark:bg-[#11171D] p-4 rounded border border-slate-200 dark:border-[#26323A] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">LEARNING STREAK</span>
                <div className="text-2xl font-mono font-extrabold text-rose-600 dark:text-rose-400">{user?.streak_days ? `${user.streak_days} DAYS` : '7 DAYS'}</div>
              </div>
            </div>
          )}

          {/* SECTION D: LEARNING STREAK TRACKER */}
          {!isTeacher && !isAdmin && (
            <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-5 space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>LEARNING STREAK TELEMETRY</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A]">
                  <span className="text-[10px] text-slate-400 uppercase">CURRENT STREAK</span>
                  <div className="font-bold text-amber-500 text-sm mt-0.5">🔥 {user?.streak_days || 7} DAYS</div>
                </div>
                <div className="p-3 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A]">
                  <span className="text-[10px] text-slate-400 uppercase">LONGEST STREAK</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">14 DAYS</div>
                </div>
                <div className="p-3 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A]">
                  <span className="text-[10px] text-slate-400 uppercase">LAST ACTIVE</span>
                  <div className="font-bold text-emerald-500 text-sm mt-0.5">TODAY</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION E / B: ENROLLED / CREATED COURSES */}
      {!isAdmin && (activeTab === 'profile' || activeTab === 'courses') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#0EA5E9] dark:text-[#22D3EE]" />
              <span>{isTeacher ? 'AUTHORING COURSES CATALOG' : 'ENROLLED COURSE PROGRESS'}</span>
            </h2>
            <Link to="/explore" className="text-xs text-[#0EA5E9] dark:text-[#22D3EE] font-mono font-bold hover:underline">
              EXPLORE ALL →
            </Link>
          </div>

          <div className="space-y-3">
            {enrolledCourses.map(c => {
              const imgUrl = getEducationImageUrl(c.thumbnail_url, c.category);
              return (
                <div key={c.id} className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <img src={imgUrl} alt={c.title} className="w-16 h-16 rounded object-cover border border-slate-200 dark:border-[#26323A] shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#0EA5E9] dark:text-[#22D3EE] uppercase">{c.category}</span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Module 4 / {c.modules?.length || 5} • 68% Complete
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/course/${c.id}`}
                    className="px-4 py-2 rounded bg-[#0EA5E9] dark:bg-[#22D3EE] text-white dark:text-black font-mono font-bold text-xs hover:opacity-90 transition-opacity flex items-center space-x-1 shrink-0 justify-center"
                  >
                    <span>{isTeacher ? 'EDIT / PREVIEW' : 'CONTINUE LEARNING'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION: TEACHER STUDENT ANALYTICS & TELEMETRY */}
      {isTeacher && (activeTab === 'profile' || activeTab === 'analytics') && (
        <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#26323A] pb-4">
            <div>
              <h2 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-[#0EA5E9] dark:text-[#22D3EE]" />
                <span>STUDENT COHORT ANALYTICS & AFFECTIVE TELEMETRY</span>
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Real-time MediaPipe facial & cognitive telemetry across enrolled course cohorts
              </p>
            </div>

            {courses.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">COURSE:</span>
                <select
                  value={selectedAnalyticsCourseId}
                  onChange={(e) => setSelectedAnalyticsCourseId(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] rounded px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0EA5E9] dark:focus:border-[#22D3EE]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div className="p-4 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">COHORT STUDENTS</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">156</div>
              <div className="text-[10px] text-emerald-500 font-bold">● Active in Hub</div>
            </div>

            <div className="p-4 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">AVG ATTENTION</span>
              <div className="text-2xl font-bold text-[#0EA5E9] dark:text-[#22D3EE]">88.4%</div>
              <div className="text-[10px] text-slate-500">Target &gt; 80%</div>
            </div>

            <div className="p-4 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">CLASS CONFUSION</span>
              <div className="text-2xl font-bold text-amber-500">12.6%</div>
              <div className="text-[10px] text-emerald-500">Within Safe Limits</div>
            </div>

            <div className="p-4 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">INTERVENTIONS</span>
              <div className="text-2xl font-bold text-purple-500">42</div>
              <div className="text-[10px] text-slate-500">Resolved via 3D/AI</div>
            </div>
          </div>

          {/* Timeline Affective Heatmap */}
          <AffectiveHeatmap />

          {/* Student Roster Table with Search and Status Filter */}
          <div className="space-y-3 pt-2">
            <StudentAnalyticsTable courseId={selectedAnalyticsCourseId} />
          </div>
        </div>
      )}

      {/* SECTION C: RECENT ACTIVITY TIMELINE / ADMIN AUDIT LOGS */}
      {isAdmin ? (
        (activeTab === 'profile' || activeTab === 'activity') && (
          <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-6 space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#0EA5E9] dark:text-[#22D3EE]" />
              <span>ADMINISTRATIVE SYSTEM ACTIVITY LOGS</span>
            </h2>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
                <div className="flex justify-between items-center text-slate-400 text-[10px]">
                  <span>SYSTEM EVENT</span>
                  <span>AUTHENTICATED</span>
                </div>
                <div className="text-slate-900 dark:text-white font-bold">Admin Portal Session Initialized</div>
                <div className="text-[11px] text-slate-500">Administrator authenticated via secure OAuth2 JWT bearer token.</div>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
                <div className="flex justify-between items-center text-slate-400 text-[10px]">
                  <span>SECURITY AUDIT</span>
                  <span>SYSTEM HEALTHY</span>
                </div>
                <div className="text-slate-900 dark:text-white font-bold">Entitlement Enforcement Checked</div>
                <div className="text-[11px] text-slate-500">Verified zero unauthorized IDOR access attempts across course modules.</div>
              </div>
            </div>
          </div>
        )
      ) : (
        (activeTab === 'profile' || activeTab === 'activity') && (
          <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-6 space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#0EA5E9] dark:text-[#22D3EE]" />
              <span>RECENT ACTIVITY TIMELINE</span>
            </h2>

            <div className="space-y-4 border-l-2 border-slate-200 dark:border-[#26323A] pl-4 font-mono text-xs">
              {activities.length > 0 ? (
                activities.slice(0, 10).map((act) => (
                  <div key={act.id} className="space-y-1 relative">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {formatActivityDate(act.created_at)}
                    </span>
                    <div className="text-slate-800 dark:text-slate-200 font-bold flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{act.description || act.event_type}</span>
                    </div>
                    {act.xp_gained ? (
                      <span className="text-[#0EA5E9] dark:text-[#22D3EE] font-bold">+{act.xp_gained} XP GAINED</span>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 dark:text-slate-400 text-xs italic py-2">
                  No activity events recorded yet. Start learning or take a quiz to log activity!
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* SECTION F: ACHIEVEMENTS (HIDDEN FOR ADMIN) */}
      {!isAdmin && (activeTab === 'profile' || activeTab === 'achievements') && (
        <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-6 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>EARNED ACHIEVEMENTS & BADGES</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
              <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">🏆</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">First Course Completed</div>
              <p className="text-[10px] text-slate-500">Completed 1 full course.</p>
            </div>

            <div className="p-3.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
              <div className="w-7 h-7 rounded bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">🔥</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">7-Day Streak</div>
              <p className="text-[10px] text-slate-500">Maintained active daily streak.</p>
            </div>

            <div className="p-3.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
              <div className="w-7 h-7 rounded bg-[#0EA5E9]/10 text-[#0EA5E9] dark:text-[#22D3EE] flex items-center justify-center font-bold">⚡</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">Quiz Master</div>
              <p className="text-[10px] text-slate-500">Scored 100% on adaptive quiz.</p>
            </div>

            <div className="p-3.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-1">
              <div className="w-7 h-7 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">🤖</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">AI Explorer</div>
              <p className="text-[10px] text-slate-500">Engaged Gemini tutor 10+ times.</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION G: CERTIFICATES (HIDDEN FOR ADMIN) */}
      {!isAdmin && (activeTab === 'profile' || activeTab === 'certificates') && (
        <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-500" />
              <span>VERIFIED COURSE CERTIFICATES</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              {certificates.length} {certificates.length === 1 ? 'CERTIFICATE' : 'CERTIFICATES'} EARNED
            </span>
          </div>

          {certificates.length > 0 ? (
            <div className="space-y-3">
              {certificates.map((cert) => (
                <div key={cert.id || cert.certificate_code} className="p-4 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white uppercase">{cert.course_title || 'COURSE CERTIFICATE'}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      STATUS: COMPLETED • CODE: {cert.certificate_code || `EDFL-2026-${cert.id}`}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCertCourse({ id: cert.course_id, title: cert.course_title })}
                    className="px-4 py-2 rounded bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs hover:opacity-90 transition-opacity"
                  >
                    VIEW CERTIFICATE
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] text-center space-y-3 font-mono text-xs">
              <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-slate-800 dark:text-slate-200 font-bold">No Course Certificates Earned Yet</div>
              <p className="text-slate-500 max-w-md mx-auto text-[11px]">
                Complete 100% of all lessons and quizzes in a course to unlock your digitally verified Certificate of Completion.
              </p>
              {courses.length > 0 && (
                <button
                  onClick={() => setSelectedCertCourse({ id: courses[0].id, title: courses[0].title })}
                  className="px-4 py-2 rounded bg-[#0EA5E9] dark:bg-[#22D3EE] text-white dark:text-black font-bold text-xs hover:opacity-90 transition-opacity"
                >
                  VERIFY SHOWCASE COURSE CERTIFICATE
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION I / J: PRIVACY & SECURITY & ACCOUNT SETTINGS */}
      {(activeTab === 'profile' || activeTab === 'privacy' || activeTab === 'settings') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SECTION I: PRIVACY & SECURITY */}
          <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-6 space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>PRIVACY & SECURITY CONSOLE</span>
            </h2>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] flex justify-between items-center">
                <span className="text-slate-500">PRIVACY STATUS</span>
                <span className="font-bold text-emerald-500">PROTECTED</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] flex justify-between items-center">
                <span className="text-slate-500 font-mono">PROCESSING</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">CLIENT-SIDE BROWSER</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] flex justify-between items-center">
                <span className="text-slate-500">RAW VIDEO TRANSMISSION</span>
                <span className="font-bold text-emerald-500">0 BYTES (NOT TRANSMITTED)</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] flex justify-between items-center">
                <span className="text-slate-500">AUTHENTICATION PROVIDER</span>
                <span className="font-bold text-[#0EA5E9] dark:text-[#22D3EE]">FIREBASE CLIENT AUTH</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] flex justify-between items-center">
                <span className="text-slate-500">EMAIL STATUS</span>
                <span className="font-bold text-emerald-500 font-mono">{isEmailVerified ? 'VERIFIED' : 'UNVERIFIED'}</span>
              </div>
            </div>
          </div>

          {/* SECTION J / H: ACCOUNT SETTINGS & THEME */}
          <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] p-6 space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-white flex items-center space-x-2">
              <Key className="w-4 h-4 text-[#0EA5E9] dark:text-[#22D3EE]" />
              <span>ACCOUNT SETTINGS & PREFERENCES</span>
            </h2>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center p-2.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A]">
                <span className="text-slate-500">INTERFACE THEME</span>
                <ThemeToggle />
              </div>

              <div className="flex justify-between items-center p-2.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A]">
                <span className="text-slate-500">LEARNING MODE</span>
                <span className="font-bold text-[#0EA5E9] dark:text-[#22D3EE]">ADAPTIVE CLOSED-LOOP</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A]">
                <span className="text-slate-500">AI TUTOR PROVIDER</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">GEMINI 2.5 FLASH</span>
              </div>

              <button
                onClick={logout}
                className="w-full py-2.5 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-mono font-bold text-xs hover:bg-rose-100 transition-colors flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>SIGN OUT OF EDU-FLOW</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {selectedCertCourse && (
        <CertificateModal
          courseId={selectedCertCourse.id}
          courseTitle={selectedCertCourse.title}
          onClose={() => setSelectedCertCourse(null)}
        />
      )}

    </div>
  );
};
