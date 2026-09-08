import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { courseApi, getStoredToken } from '../services/api';
import { Course } from '../types';
import { CourseCard } from '../components/common/CourseCard';
import { getEducationImageUrl } from '../utils/images';
import { 
  Clock, Brain, ArrowRight, Play, Compass, Activity, Cpu, ShieldCheck,
  Video, Link as LinkIcon, AlertCircle, Key
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface LiveClassItem {
  id: number;
  title: string;
  teacher_name: string;
  course_title?: string;
  class_code: string;
  join_token: string;
  status: string;
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Classes State
  const [liveClasses, setLiveClasses] = useState<LiveClassItem[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'EduFlow | Student Dashboard';
    courseApi.getCourses()
      .then(data => setCourses(data))
      .catch(err => console.error("Failed to load student courses:", err))
      .finally(() => setLoading(false));

    fetchLiveClasses();
  }, []);

  const fetchLiveClasses = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await fetch('/api/v1/live-classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLiveClasses(data);
      }
    } catch (e) {
      console.warn('Error fetching live classes for student dashboard:', e);
    }
  };

  const handleJoinByPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!pinInput.trim()) return;

    try {
      const token = getStoredToken();
      let codeOrToken = pinInput.trim();
      if (codeOrToken.includes('/live/')) {
        codeOrToken = codeOrToken.split('/live/')[1].split('/')[0];
      }

      const res = await fetch('/api/v1/live-classes/validate-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ token_or_code: codeOrToken })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        navigate(`/live/${data.join_token}`);
      } else {
        setPinError(data.error_message || 'Invalid Class Code or Link');
      }
    } catch (err) {
      setPinError('Unable to join live class. Please verify code.');
    }
  };

  const formatLiveClassTitle = (item?: LiveClassItem) => {
    if (!item) return 'Live Classroom Portal';
    const t = item.title?.trim() || '';
    if (t.toLowerCase() === 'ml') return 'Machine Learning Live Masterclass';
    if (t.toLowerCase() === 'ai') return 'Artificial Intelligence Live Workshop';
    return t.length < 4 ? `Live Session: ${t.toUpperCase()}` : t;
  };

  const activeLiveClass = liveClasses.find(c => c.status === 'LIVE') || liveClasses[0];

  const featuredCourse = courses[0];
  const recommendedCourses = courses.length > 1 ? courses.slice(1) : courses;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner & Diagnostic Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 text-xs font-mono font-bold tracking-wider">
            <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Closed-Loop Affective System Active</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Good morning, {user?.full_name?.split(' ')[0] || 'Suhaas'} 👋
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
            Your real-time webcam vision telemetry is maintaining optimal pedagogical pacing.
          </p>
        </div>

        {/* Small Real Education Image Widget */}
        <div className="relative w-full md:w-56 h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-900 shadow-md">
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=80"
            alt="Student studying"
            className="w-full h-full object-cover filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
          <div className="absolute bottom-2.5 left-3 text-cyan-400 text-xs font-mono font-bold flex items-center space-x-1">
            <span>🔥 {user?.streak_days || 7}-Day Streak</span>
          </div>
        </div>
      </div>

      {/* Live Online Class Banner & Quick PIN Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Online Classroom Engine</span>
            </div>
            {activeLiveClass && (
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/50 px-2.5 py-1 rounded-lg">
                PIN: {activeLiveClass.class_code}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {formatLiveClassTitle(activeLiveClass)}
            </h2>
            <p className="text-xs text-slate-300">
              Instructor: <span className="text-white font-semibold">{activeLiveClass?.teacher_name || 'Dr. Sarah Jenkins'}</span> • Video Interest Telemetry Active
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Privacy-First OpenCV Vision Active</span>
            </span>

            <button
              onClick={() => {
                if (activeLiveClass) {
                  navigate(`/live/${activeLiveClass.join_token}`);
                } else {
                  navigate('/live');
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>{activeLiveClass ? 'Join Live Class Now →' : 'Explore Live Classes'}</span>
            </button>
          </div>
        </div>

        {/* Quick Class Code / Link Entry Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Join via Class Code / Share Link</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Received a Class Code or shareable link from your instructor?
            </p>
          </div>

          <form onSubmit={handleJoinByPin} className="space-y-3">
            <input
              type="text"
              placeholder="Enter Class Code (e.g. LZ7945M) or Link"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 uppercase"
            />

            {pinError && (
              <p className="text-xs text-rose-500 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Join Class</span>
            </button>
          </form>
        </div>
      </div>

      {/* Learning Progress Telemetry */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
            <Brain className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Learning Progress Telemetry</span>
          </h2>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-bold">68% Overall Complete</span>
        </div>

        {/* Diagnostic Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800">
            <div className="bg-cyan-500 h-full rounded-full transition-all duration-300" style={{ width: '68%' }} />
          </div>
          <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
            <span>0%</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">68% Mastered</span>
            <span>100%</span>
          </div>
        </div>

        {/* Diagnostic Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-center space-y-1">
            <span className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-medium">Total Courses</span>
            <div className="text-2xl md:text-3xl font-mono font-black text-slate-900 dark:text-white">{courses.length || 9}</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-center space-y-1">
            <span className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-medium">Completed</span>
            <div className="text-2xl md:text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400">7</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-center space-y-1">
            <span className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-medium">In Progress</span>
            <div className="text-2xl md:text-3xl font-mono font-black text-cyan-600 dark:text-cyan-400">3</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-center space-y-1">
            <span className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-medium">Not Started</span>
            <div className="text-2xl md:text-3xl font-mono font-black text-slate-500 dark:text-slate-400">2</div>
          </div>
        </div>
      </div>

      {/* Featured "Continue Learning" Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
          <Play className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Continue Learning Workspace</span>
        </h2>

        {featuredCourse ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 group shadow-sm">
            
            {/* Real Education Photo Banner */}
            <div className="lg:col-span-5 relative min-h-[220px] bg-slate-100 dark:bg-slate-950 overflow-hidden">
              <img
                src={getEducationImageUrl(featuredCourse.thumbnail_url, featuredCourse.category)}
                alt={featuredCourse.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

              <div className="absolute top-3 left-3 flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-lg border border-white/20 bg-slate-900/80 backdrop-blur-md text-xs font-mono font-bold text-white tracking-wider">
                  {featuredCourse.category}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500 text-xs font-mono font-bold text-slate-950">
                  {featuredCourse.difficulty}
                </span>
              </div>
            </div>

            {/* Course Details Content */}
            <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Module 4 of {featuredCourse.modules?.length || 12} • 68% Complete</span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {featuredCourse.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">
                  {featuredCourse.description}
                </p>
              </div>

              {/* Progress bar line */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-400">Unit 1: Facial Landmark Mesh</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">68%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: '68%' }} />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Affective Controller Ready</span>
                </span>

                <Link
                  to={`/course/${featuredCourse.id}`}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all shadow-md flex items-center space-x-2"
                >
                  <span>{featuredCourse.is_premium && !featuredCourse.is_enrolled ? 'Unlock Course →' : 'Continue Learning →'}</span>
                </Link>
              </div>
            </div>

          </div>
        ) : null}
      </div>

      {/* Recommended Catalog Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
            <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Recommended Course Catalog</span>
          </h2>
          <Link to="/explore" className="text-xs text-cyan-600 dark:text-cyan-400 font-mono font-bold hover:underline">
            View All Courses →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendedCourses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </div>

    </div>
  );
};
