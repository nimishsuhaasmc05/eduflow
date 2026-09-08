import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStoredToken, clearStoredToken } from '../services/api';
import { 
  Video, Plus, Copy, Check, Calendar, Clock, Users, Play, 
  ArrowRight, Shield, Sparkles, BookOpen, AlertCircle, Link as LinkIcon
} from 'lucide-react';

interface LiveClassItem {
  id: number;
  title: string;
  teacher_name: string;
  course_title?: string;
  module_title?: string;
  class_code: string;
  join_token: string;
  join_url: string;
  scheduled_at: string;
  status: string;
}

export const LiveClassesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Join Modal States
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Create Class Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createdClassInfo, setCreatedClassInfo] = useState<LiveClassItem | null>(null);

  useEffect(() => {
    document.title = 'EduFlow | Live Classroom';
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await fetch('/api/v1/live-classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (e) {
      console.error('Error fetching live classes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (tokenOrUrl: string, code: string) => {
    const fullUrl = `${window.location.origin}/live/${tokenOrUrl}`;
    navigator.clipboard.writeText(`Class Code: ${code} | Link: ${fullUrl}`);
    setCopiedToken(code);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!joinInput.trim()) return;

    try {
      const token = getStoredToken();
      let codeOrToken = joinInput.trim();
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
        setJoinError(data.error_message || 'Invalid class code or link.');
      }
    } catch (err) {
      setJoinError('Unable to validate class code. Please try again.');
    }
  };

  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setCreateError('Class Title is required.');
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setCreateError('Your session has expired. Please log in again.');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    setCreateLoading(true);

    try {
      const res = await fetch('/api/v1/live-classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim(),
          start_now: true
        })
      });

      if (res.status === 401) {
        clearStoredToken();
        setCreateError('Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 1500);
        return;
      }

      if (res.status === 403) {
        setCreateError('You do not have permission to start an online class.');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Unable to create the class. Please try again. (Status ${res.status})`);
      }

      const data = await res.json();
      const roomToken = data.join_token || data.room_id || data.join_code;
      
      setShowCreateModal(false);
      navigate(`/live/${roomToken}/room`);
    } catch (err: any) {
      console.error('Create class error:', err);
      setCreateError(err.message || 'Unable to create class. Backend server is unavailable.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time WebRTC + OpenCV Affective Telemetry</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Online Live Classrooms
            </h1>
            <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
              Host interactive live sessions with real-time engagement analytics, Socratic AI assistance, Socratic micro-quizzes, and privacy-isolated affective state monitoring.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all flex items-center gap-2 shadow-lg"
            >
              <LinkIcon className="w-4 h-4 text-cyan-400" />
              <span>Join with Link / Code</span>
            </button>

            {user?.role === 'teacher' && (
              <button
                onClick={() => {
                  setCreatedClassInfo(null);
                  setTitle('');
                  setDescription('');
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-550 text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Start Online Class</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Class List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Video className="w-5 h-5 text-cyan-400" />
            <span>Active & Upcoming Sessions</span>
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 font-mono text-sm">
            Loading live classroom sessions...
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <Video className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-200">No active live classes</h3>
              <p className="text-slate-400 text-sm">
                Join a live class using a shareable link or code, or start a new live class as an instructor.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="group relative rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 p-6 transition-all duration-200 flex flex-col justify-between space-y-6 shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        cls.status === 'LIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cls.status === 'LIVE' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      {cls.status}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                      Code: {cls.class_code}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {cls.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Instructor: {cls.teacher_name}</p>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    {cls.course_title && (
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{cls.course_title}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(cls.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleCopyLink(cls.join_token, cls.class_code)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                    title="Copy Shareable Link"
                  >
                    {copiedToken === cls.class_code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => navigate(cls.status === 'LIVE' ? `/live/${cls.join_token}/room` : `/live/${cls.join_token}`)}
                    className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      cls.status === 'LIVE'
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white border-transparent shadow-md'
                        : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    }`}
                  >
                    <span>{cls.status === 'LIVE' ? '🔴 Join Live Room' : 'Enter Lobby'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JOIN CLASS MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-cyan-400" />
                <span>Join Live Class</span>
              </h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Paste Class Link or Enter Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. ML2026A or https://app/live/token"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              {joinError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg"
                >
                  Join Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CLASS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Video className="w-5 h-5 text-cyan-400" />
                <span>Start Online Class</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {createdClassInfo ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
                  <Check className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Live Classroom Created!</p>
                    <p className="text-xs opacity-90">Class is now LIVE and accepting students.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Class 6-Digit PIN:</span>
                    <span className="font-mono text-cyan-400 font-extrabold text-base bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-800/40">
                      {createdClassInfo.class_code}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Shareable Direct Link:</span>
                    <span className="font-mono text-xs text-slate-300 truncate max-w-[200px]">
                      {`${window.location.origin}/live/${createdClassInfo.join_token}`}
                    </span>
                  </div>

                  {/* QR Code Section */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Mobile Student QR Access</p>
                      <p className="text-[10px] text-slate-400">Scan with camera to join immediately</p>
                    </div>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}/live/${createdClassInfo.join_token}`)}`}
                      alt="Student Join QR Code"
                      className="w-16 h-16 rounded border border-slate-700 bg-white p-1"
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-3">
                  <button
                    onClick={() => handleCopyLink(createdClassInfo.join_token, createdClassInfo.class_code)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedToken ? 'Copied Link!' : 'Copy Invitation'}</span>
                  </button>

                  <button
                    onClick={() => navigate(`/live/${createdClassInfo.join_token}/room`)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-550 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-102"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>🚀 Launch Live Classroom</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {createError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-mono">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{createError}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Class Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deep Learning & Affective Computing Lecture"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Optional Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide overview of key concepts to be covered..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg flex items-center gap-2"
                  >
                    {createLoading ? 'Starting...' : 'Start Now'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassesPage;
