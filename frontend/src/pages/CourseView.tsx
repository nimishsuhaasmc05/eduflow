import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAffective } from '../context/AffectiveContext';
import { courseApi } from '../services/api';
import { Course, Module } from '../types';
import { getEducationImageUrl } from '../utils/images';
import { isYouTubeUrl, getYouTubeEmbedUrl, getYouTubeWatchUrl, getVideoType } from '../utils/video';
import { quizPrefetchService } from '../services/quizPrefetchService';
import { attentionActivityPrefetchService } from '../services/attentionActivityPrefetchService';

import { AILearningAssistantPanel } from '../components/student/AILearningAssistantPanel';
import { AdaptiveQuizModal } from '../components/student/AdaptiveQuizModal';
import { AttentionActivityModal } from '../components/student/AttentionActivityModal';
import { CertificateModal } from '../components/student/CertificateModal';

import {
  BookOpen, Layers, FileText, Sparkles, RefreshCw, Play, Pause, Star,
  Clock, CheckCircle, ChevronRight, ChevronLeft, Award, ExternalLink,
  AlertTriangle, HelpCircle, Video, Compass, LayoutDashboard, Trophy,
  BarChart3, Settings, LogOut, CheckCircle2, ChevronDown, Menu, X, RotateCcw
} from 'lucide-react';

export const CourseView: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id) || 1;

  // Course Data State
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active module & navigation state
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number>(0);
  const [activeBottomTab, setActiveBottomTab] = useState<'notes' | 'flashcards' | 'overview'>('notes');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);

  // Flashcards flip state
  const [flippedCards, setFlippedCards] = useState<{ [key: number]: boolean }>({});
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState<number>(0);

  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoTimestamp, setVideoTimestamp] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Modals
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [showAttentionActivityModal, setShowAttentionActivityModal] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  // Affective telemetry context
  const {
    activeIntervention,
    dismissIntervention,
    setCurrentContext,
    stopWebcam
  } = useAffective();

  // Load course details
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadCourse = async () => {
      try {
        const fetchedCourse = await courseApi.getCourseById(courseId);
        if (isMounted) {
          setCourse(fetchedCourse);
          document.title = fetchedCourse?.title ? `EduFlow | ${fetchedCourse.title}` : 'EduFlow | Course';
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Failed to retrieve course details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      isMounted = false;
      stopWebcam();
    };
  }, [courseId, stopWebcam]);

  const modules = course?.modules || [];
  const currentModule = modules[selectedModuleIndex] || {
    id: 1,
    title: 'Introduction to Algorithms',
    duration_minutes: 25,
    video_url: 'https://www.youtube.com/watch?v=8hly31xKli0'
  };

  const moduleId = currentModule.id || 1;

  // Chapter start offsets in seconds for YouTube modules
  const MODULE_CHAPTER_OFFSETS: Record<number, number> = {
    0: 0,
    1: 7064,
    2: 8400,
    3: 15062,
    4: 17100,
    5: 18600,
  };
  const moduleStartOffset = MODULE_CHAPTER_OFFSETS[selectedModuleIndex] || 0;

  // Video URL parsing
  const videoType = getVideoType(currentModule.video_url);
  const isCurrentYouTube = videoType === 'youtube';
  const youtubeEmbedUrl = isCurrentYouTube ? getYouTubeEmbedUrl(currentModule.video_url, moduleStartOffset) : null;
  const youtubeWatchUrl = isCurrentYouTube ? (getYouTubeWatchUrl(currentModule.video_url, moduleStartOffset) || currentModule.video_url) : null;

  const rawVideoUrl = currentModule.video_url || '/media/sample_course_video.mp4';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const backendOrigin = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  const nativeVideoUrl = rawVideoUrl.startsWith('/') ? `${backendOrigin}${rawVideoUrl}` : rawVideoUrl;

  // Sync course and module context for affective telemetry
  useEffect(() => {
    if (setCurrentContext) {
      setCurrentContext(courseId, moduleId, videoTimestamp);
    }
  }, [courseId, moduleId, videoTimestamp, setCurrentContext]);

  // Background pre-generation for adaptive quiz and activity
  useEffect(() => {
    if (courseId && moduleId && currentModule.title) {
      quizPrefetchService.prefetchQuizForContext(courseId, moduleId, currentModule.title);
      attentionActivityPrefetchService.prefetchActivityForContext(courseId, moduleId, currentModule.title);
    }
  }, [courseId, moduleId, currentModule.title]);

  // Handle active intervention events (pause video and pop modal)
  useEffect(() => {
    if (activeIntervention && activeIntervention.action_required) {
      const itype = String(activeIntervention.intervention_type).toUpperCase();
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }

      if (itype === 'ATTENTION_ACTIVITY') {
        setShowAttentionActivityModal(true);
        setShowQuizModal(false);
      } else if (
        itype === 'INTERACTIVE_QUIZ' ||
        itype === 'MICRO_QUIZ' ||
        itype === 'TARGETED_QUIZ' ||
        itype.includes('QUIZ')
      ) {
        setShowQuizModal(true);
        setShowAttentionActivityModal(false);
      }
    }
  }, [activeIntervention]);

  // Reset video state when module changes
  useEffect(() => {
    setIsPlaying(false);
    setVideoError(null);
    setVideoTimestamp(0);
    setCurrentFlashcardIndex(0);
    setFlippedCards({});
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  }, [selectedModuleIndex, currentModule.video_url]);

  // Video toggle play/pause
  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      try {
        await videoRef.current.play();
      } catch (err) {
        console.warn('Video play blocked or failed:', err);
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration || 1;
    setVideoTimestamp(current);
    setDuration(total);

    const progress = Math.min(100, Math.round((current / total) * 100));
    if (Math.round(current) % 10 === 0 && course?.id) {
      courseApi.updateProgress(course.id, progress).catch(() => {});
    }
  };

  const handleTimestampSeek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleEnrollClick = async () => {
    try {
      setLoading(true);
      await courseApi.enroll(courseId);
      const updated = await courseApi.getCourseById(courseId);
      setCourse(updated);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to enroll in course.');
    } finally {
      setLoading(false);
    }
  };

  // Module-Aware Flashcards Knowledge Base
  const getModuleFlashcards = (moduleTitle: string = '') => {
    const titleLower = (moduleTitle || '').toLowerCase();
    if (titleLower.includes('sort') || titleLower.includes('merge') || titleLower.includes('quick') || titleLower.includes('selection')) {
      return [
        { front: 'What is Merge Sort and what is its time complexity?', back: 'A divide-and-conquer algorithm that recursively bisects arrays, sorts them, and merges them in guaranteed O(n log n) time.' },
        { front: 'How does Selection Sort operate?', back: 'It repeatedly scans the unsorted subarray to find the minimum element and swaps it to the front, running in O(n²) time.' },
        { front: 'What is Quick Sort average and worst-case complexity?', back: 'Quick Sort averages O(n log n) using pivot partitioning, but degrades to O(n²) on already sorted inputs with poor pivot selection.' },
        { front: 'When is a sorting algorithm stable?', back: 'When it preserves the relative order of duplicate elements with equal keys in the sorted output.' }
      ];
    } else if (titleLower.includes('search') || titleLower.includes('binary')) {
      return [
        { front: 'What is the essential precondition for Binary Search?', back: 'The input collection or array must be sorted in monotonic order prior to searching.' },
        { front: 'What is the time complexity of Binary Search?', back: 'O(log n) logarithmic time, because each comparison step eliminates half of the remaining search space.' },
        { front: 'Why compute middle as low + (high - low) / 2?', back: 'To prevent integer arithmetic overflow that can occur when adding (low + high) in fixed-width numeric types.' },
        { front: 'How many comparisons are needed for 1,000,000 elements?', back: 'At most 20 comparisons, since 2^20 is approximately 1,048,576.' }
      ];
    } else if (titleLower.includes('array') || titleLower.includes('linked list') || titleLower.includes('list')) {
      return [
        { front: 'What is the fundamental difference between arrays and linked lists?', back: 'Arrays store contiguous memory blocks allowing O(1) index access; linked lists store nodes connected by pointers allowing O(1) insertion without resizing.' },
        { front: 'What is amortized O(1) time in dynamic arrays?', back: 'Although doubling array capacity takes O(n) during a resize, the average cost per append operation across n additions remains O(1).' },
        { front: 'What are the tradeoffs of singly vs doubly linked lists?', back: 'Singly linked lists save memory with one pointer per node; doubly linked lists allow bidirectional traversal at the expense of an extra pointer per node.' }
      ];
    } else {
      return [
        { front: 'What is an algorithm?', back: 'A well-defined computational procedure that transforms specified inputs into desired outputs through a finite sequence of instructions.' },
        { front: 'How is algorithmic efficiency measured?', back: 'Using asymptotic Big-O notation to evaluate how runtime and memory grow as input size n approaches infinity.' },
        { front: 'What does O(1) constant time complexity mean?', back: 'Execution steps remain constant regardless of input size, such as accessing an array element at a known index.' },
        { front: 'What is the time complexity of a linear scan?', back: 'O(n) linear time, because in the worst case every item in the collection must be inspected.' }
      ];
    }
  };

  // Module-Aware Smart Notes Knowledge Base
  const getModuleSmartNotes = (moduleTitle: string = '') => {
    const titleLower = (moduleTitle || '').toLowerCase();
    if (titleLower.includes('sort') || titleLower.includes('merge') || titleLower.includes('quick') || titleLower.includes('selection')) {
      return {
        unit: 'SORTING ALGORITHMS',
        takeaways: [
          'Sorting arranges unordered collections into monotonic ascending or descending sequences.',
          'Merge Sort applies divide-and-conquer: recursively bisects arrays, sorts halves, and merges in guaranteed O(n log n) time with O(n) auxiliary space.',
          'Quick Sort partitions elements around a pivot; achieves O(n log n) average time with superior CPU cache locality.',
          'Selection Sort repeatedly locates the minimum element from the unsorted partition and places it at the front in O(n²) time.',
          'Stability in sorting preserves the original order of elements having identical key values.'
        ]
      };
    } else if (titleLower.includes('search') || titleLower.includes('binary')) {
      return {
        unit: 'SEARCHING ALGORITHMS',
        takeaways: [
          'Searching locates target elements within a collection or verifies their absence.',
          'Linear search scans elements sequentially from index 0 to n-1 in O(n) time with zero preconditions.',
          'Binary search operates strictly on sorted arrays, halving the search space at each comparison in O(log n) time.',
          'Calculating middle index as `low + (high - low) / 2` avoids integer overflow in 32-bit registers.',
          'For 1,000,000 elements, binary search requires at most 20 comparisons to locate any key.'
        ]
      };
    } else if (titleLower.includes('array') || titleLower.includes('linked list') || titleLower.includes('list')) {
      return {
        unit: 'ARRAYS AND LINKED LISTS',
        takeaways: [
          'Static arrays allocate fixed contiguous memory blocks in RAM, enabling instantaneous O(1) random access.',
          'Dynamic arrays double their capacity when full, achieving O(1) amortized append time despite occasional O(n) resizing.',
          'Linked lists store elements as independent node objects connected by pointers across non-contiguous memory.',
          'Singly linked lists support O(1) head prepends but require O(n) traversal for indexed lookups.'
        ]
      };
    } else {
      return {
        unit: 'INTRODUCTION TO ALGORITHMS',
        takeaways: [
          'An algorithm is a formal step-by-step computational procedure that converts inputs to outputs.',
          'Algorithmic performance is evaluated using Big-O asymptotic analysis as input size n approaches infinity.',
          'Time complexity measures processor instructions; Space complexity measures auxiliary memory consumed.',
          'Linear search provides an intuitive baseline comparison with O(n) worst-case time complexity.'
        ]
      };
    }
  };

  const activeFlashcards = getModuleFlashcards(currentModule.title);
  const activeSmartNotes = getModuleSmartNotes(currentModule.title);

  const objectives = (course?.learning_objectives ||
    "✓ Master core algorithmic concepts and time complexity analysis.\n✓ Implement and evaluate sorting and searching methods.\n✓ Understand memory organization for arrays and node-based lists.\n✓ Apply cognitive principles to solve computational problems."
  ).split('\n').filter(line => line.trim().length > 0);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080B0F] flex items-center justify-center space-x-2.5 text-cyan-500 font-mono text-xs font-bold">
        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
        <span>LOADING LEARNING WORKSPACE...</span>
      </div>
    );
  }

  // Error Screen
  if (error || !course) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="p-6 text-center bg-white dark:bg-[#0E1420] rounded-xl border border-rose-200 dark:border-rose-900/60 max-w-md mx-auto space-y-3 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">COURSE RETRIEVAL FAILED</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">{error || 'Unable to load course details.'}</p>
          <Link
            to="/explore"
            className="inline-flex items-center space-x-1 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Return to Explore Courses</span>
          </Link>
        </div>
      </div>
    );
  }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/live', label: 'Online Classes', icon: Video },
    { to: '/explore', label: 'Explore Courses', icon: Compass },
    { to: '/library', label: 'Digital Library', icon: BookOpen },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/analytics', label: 'Cognitive Reports', icon: BarChart3 },
    { to: '/profile', label: 'Profile', icon: Settings },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#F8FAFC] dark:bg-[#080B0F] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      
      {/* ── MOBILE HEADER (Shown only on small screens) ── */}
      <div className="lg:hidden px-4 py-2.5 bg-white dark:bg-[#0B0F17] border-b border-slate-200 dark:border-[#1F293D] flex items-center justify-between shrink-0">
        <button
          onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1F293D] text-slate-600 dark:text-slate-300"
        >
          {isSidebarOpenMobile ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
        <span className="font-bold text-xs truncate max-w-[200px]">{course.title}</span>
        <Link to="/explore" className="text-cyan-500 font-mono text-[11px] font-bold">
          Explore →
        </Link>
      </div>

      {/* ── UNIFIED THREE-COLUMN DESKTOP WORKSPACE ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* ════════════════════════════════════════════════════════════════
            LEFT COLUMN: COMPACT COURSE NAVIGATION (~220px)
            ════════════════════════════════════════════════════════════════ */}
        <aside
          className={`w-full lg:w-[220px] shrink-0 border-r border-slate-200 dark:border-[#1F293D] bg-white dark:bg-[#0B0F17] flex flex-col justify-between transition-all duration-300 z-30 ${
            isSidebarOpenMobile ? 'block absolute inset-0 bg-white dark:bg-[#0B0F17]' : 'hidden lg:flex'
          }`}
        >
          <div className="flex-1 flex flex-col min-h-0 divide-y divide-slate-100 dark:divide-[#1F293D]/70 overflow-y-auto">
            
            {/* Course Title & Back to Explore Link */}
            <div className="p-3 space-y-1.5 shrink-0">
              <Link
                to="/explore"
                className="inline-flex items-center space-x-1 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 hover:underline font-bold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Explore Courses</span>
              </Link>
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                {course.title}
              </h2>
            </div>

            {/* Course Curriculum Modules List */}
            <div className="p-3 space-y-2 flex-1 min-h-[160px] overflow-y-auto">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
                <span>Curriculum</span>
                <span>{modules.length} Lessons</span>
              </div>

              <div className="space-y-1">
                {modules.map((mod: Module, index: number) => {
                  const isActive = selectedModuleIndex === index;
                  return (
                    <button
                      key={mod.id || index}
                      onClick={() => {
                        setSelectedModuleIndex(index);
                        setIsSidebarOpenMobile(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-start space-x-2.5 ${
                        isActive
                          ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-[#141D2E]'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-200 dark:bg-[#1A2538] text-slate-500 dark:text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-[11px] leading-tight">{mod.title}</div>
                        <div className="text-[10px] font-mono text-slate-400 opacity-80 mt-0.5">
                          {mod.duration_minutes || 25} min
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform Navigation Links */}
            <div className="p-3 space-y-1 shrink-0">
              <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase px-1 pb-1">
                Platform
              </div>
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#141D2E]'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-[11px]">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Gamification / Streak & Sign Out Footer */}
          <div className="p-3 border-t border-slate-100 dark:border-[#1F293D] space-y-2 shrink-0">
            {user && (
              <div className="bg-slate-50 dark:bg-[#111722] rounded-lg p-2 border border-slate-200/60 dark:border-[#1F293D] text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Streak</span>
                  <span className="font-bold text-amber-500 font-mono">🔥 {user.streak_days || 7}d</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>XP</span>
                  <span className="text-cyan-500 font-bold">{user.total_xp || 1450} XP</span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full px-2 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center space-x-1.5 font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ════════════════════════════════════════════════════════════════
            CENTER COLUMN: VIDEO LEARNING AREA (Primary Focus, flex-1)
            ════════════════════════════════════════════════════════════════ */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-3.5 lg:p-4 space-y-3 bg-[#F8FAFC] dark:bg-[#080B0F]">
          
          {/* Top Breadcrumb & Metadata Strip */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
              <span>{course.category}</span>
              <span>/</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Lesson {selectedModuleIndex + 1}: {currentModule.title}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-[#141D2E] text-slate-700 dark:text-slate-300">
                {course.difficulty}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 flex items-center space-x-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{course.rating || 4.9}</span>
              </span>
            </div>
          </div>

          {/* Un-enrolled Premium Banner (if applicable) */}
          {course.is_premium && !course.is_enrolled && user?.role !== 'admin' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
              <div className="flex items-center space-x-2">
                <span className="text-sm">👑</span>
                <span>Enroll in this premium course to track progress and claim your verified completion certificate.</span>
              </div>
              <button
                onClick={handleEnrollClick}
                className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] transition-colors shrink-0"
              >
                Enroll Now
              </button>
            </div>
          )}

          {/* ── 16:9 RESPONSIVE VIDEO PLAYER CONTAINER ── */}
          <div className="w-full rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-[#1F293D] shadow-lg relative aspect-video flex items-center justify-center">
            {isCurrentYouTube && youtubeEmbedUrl ? (
              <div className="relative w-full h-full">
                <iframe
                  src={youtubeEmbedUrl}
                  title={currentModule.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs p-2 flex items-center justify-between text-[11px] text-slate-300 border-t border-slate-800">
                  <div className="flex items-center space-x-2 truncate">
                    <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-semibold truncate">{currentModule.title}</span>
                  </div>
                  {youtubeWatchUrl && (
                    <a
                      href={youtubeWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center space-x-1"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : videoType === 'invalid' ? (
              <div className="p-6 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <h4 className="text-xs font-bold text-amber-300">Invalid Video Stream</h4>
                <p className="text-[11px] text-slate-400">The video URL provided for this lesson is invalid.</p>
              </div>
            ) : (
              <div className="relative w-full h-full cursor-pointer group" onClick={togglePlay}>
                <video
                  ref={videoRef}
                  src={nativeVideoUrl}
                  className="w-full h-full object-cover"
                  controls={false}
                  playsInline
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setVideoError('Unable to load video stream.')}
                  onCanPlay={() => setVideoError(null)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                  loop
                />

                {/* Big Center Play Overlay */}
                {!isPlaying && !videoError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                    <div className="w-14 h-14 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>
                )}

                {/* Error overlay */}
                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 space-y-2 p-4 text-center">
                    <HelpCircle className="w-8 h-8 text-rose-400" />
                    <div className="text-xs font-bold text-rose-300">{videoError}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (videoRef.current) videoRef.current.load();
                        setVideoError(null);
                      }}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-xs hover:bg-slate-700"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Sleek Bottom Control Bar */}
                <div
                  className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={togglePlay}
                      className="w-8 h-8 rounded-lg bg-white/20 hover:bg-cyan-500 hover:text-slate-950 text-white flex items-center justify-center transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div className="text-[11px] font-mono text-white">
                      <span>{Math.floor(videoTimestamp)}s</span>
                      <span className="opacity-60"> / </span>
                      <span>{Math.floor(duration)}s</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowQuizModal(true)}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 text-[10px] font-bold font-mono transition-all flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Quiz Challenge</span>
                    </button>
                    <button
                      onClick={() => setShowCertificateModal(true)}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-[10px] font-bold font-mono transition-all flex items-center space-x-1"
                    >
                      <Award className="w-3 h-3" />
                      <span>Certificate</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── LESSON INFORMATION & ACTION TABS BELOW VIDEO ── */}
          <div className="bg-white dark:bg-[#0E1420] rounded-xl border border-slate-200 dark:border-[#1F293D] overflow-hidden">
            
            {/* Tabs Header */}
            <div className="flex items-center border-b border-slate-200 dark:border-[#1F293D] px-3 bg-slate-50/50 dark:bg-[#0A0F18]">
              <button
                onClick={() => setActiveBottomTab('notes')}
                className={`px-3.5 py-2.5 text-xs font-mono font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                  activeBottomTab === 'notes'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>AI SMART NOTES</span>
              </button>

              <button
                onClick={() => setActiveBottomTab('flashcards')}
                className={`px-3.5 py-2.5 text-xs font-mono font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                  activeBottomTab === 'flashcards'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ADAPTIVE FLASHCARDS</span>
              </button>

              <button
                onClick={() => setActiveBottomTab('overview')}
                className={`px-3.5 py-2.5 text-xs font-mono font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                  activeBottomTab === 'overview'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>OBJECTIVES</span>
              </button>
            </div>

            {/* Tab 1: AI Smart Notes & Takeaways */}
            {activeBottomTab === 'notes' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 uppercase">
                    {activeSmartNotes.unit}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Context-Grounded Summaries</span>
                </div>

                <div className="space-y-2">
                  {activeSmartNotes.takeaways.map((point, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="text-cyan-500 font-bold shrink-0 mt-0.5">•</span>
                      <p className="leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Adaptive Flashcards */}
            {activeBottomTab === 'flashcards' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-400">
                    CARD {currentFlashcardIndex + 1} OF {activeFlashcards.length}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        setCurrentFlashcardIndex((prev) => (prev > 0 ? prev - 1 : activeFlashcards.length - 1));
                        setFlippedCards({});
                      }}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-cyan-500/10"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentFlashcardIndex((prev) => (prev < activeFlashcards.length - 1 ? prev + 1 : 0));
                        setFlippedCards({});
                      }}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-cyan-500/10"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {activeFlashcards[currentFlashcardIndex] && (
                  <div
                    onClick={() =>
                      setFlippedCards((prev) => ({
                        ...prev,
                        [currentFlashcardIndex]: !prev[currentFlashcardIndex]
                      }))
                    }
                    className="cursor-pointer p-6 rounded-xl border border-slate-200 dark:border-[#1F293D] bg-slate-50 dark:bg-[#0A0F18] min-h-[140px] flex flex-col justify-between hover:border-cyan-500/50 transition-all text-center"
                  >
                    <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 uppercase font-bold">
                      {flippedCards[currentFlashcardIndex] ? 'ANSWER REVEALED' : 'CLICK TO REVEAL ANSWER'}
                    </div>

                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 py-3 leading-relaxed">
                      {flippedCards[currentFlashcardIndex]
                        ? activeFlashcards[currentFlashcardIndex].back
                        : activeFlashcards[currentFlashcardIndex].front}
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center space-x-1">
                      <RotateCcw className="w-3 h-3" />
                      <span>Flip Card</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Objectives & Syllabus */}
            {activeBottomTab === 'overview' && (
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase text-slate-800 dark:text-slate-200">
                  What You Will Learn
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  {objectives.map((obj, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-cyan-500 font-bold">✓</span>
                      <span>{obj.replace(/^✓\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT COLUMN: AI LEARNING ASSISTANT (Persistent, ~340px)
            Live Camera + Biometrics + AI Socratic Tutor visible together
            ════════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-[340px] xl:w-[360px] shrink-0 h-auto lg:h-full z-20">
          <AILearningAssistantPanel
            course={course}
            module={currentModule}
            onTimestampSeek={handleTimestampSeek}
          />
        </div>

      </div>

      {/* ── ADAPTIVE CHALLENGE MODALS ── */}
      {showQuizModal && (
        <AdaptiveQuizModal
          onClose={() => setShowQuizModal(false)}
          courseId={courseId}
          moduleId={moduleId}
          topic={currentModule.title}
          onNavigateToTopic={(weakTopic, timestampSeconds) => {
            const lower = (weakTopic || '').toLowerCase();
            const matchedIdx = modules.findIndex((m) =>
              m.title.toLowerCase().includes(lower) || lower.includes(m.title.toLowerCase())
            );
            if (matchedIdx >= 0) setSelectedModuleIndex(matchedIdx);
            if (timestampSeconds !== undefined && timestampSeconds > 0) handleTimestampSeek(timestampSeconds);
          }}
          onOpenAITutor={(weakTopic) => {
            setShowQuizModal(false);
          }}
        />
      )}

      {showAttentionActivityModal && (
        <AttentionActivityModal
          isOpen={showAttentionActivityModal}
          onClose={() => setShowAttentionActivityModal(false)}
          courseId={courseId}
          moduleId={moduleId}
          topicTitle={currentModule.title}
        />
      )}

      {showCertificateModal && (
        <CertificateModal onClose={() => setShowCertificateModal(false)} />
      )}

    </div>
  );
};
