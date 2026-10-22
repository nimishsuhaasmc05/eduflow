import React, { useState, useRef, useEffect } from 'react';
import { useAffective } from '../../context/AffectiveContext';
import { WebcamMonitor } from '../vision/WebcamMonitor';
import { AffectiveHUD } from '../vision/AffectiveHUD';
import { AITutorSidebar } from './AITutorSidebar';
import { AdaptiveQuizModal } from './AdaptiveQuizModal';
import { AttentionActivityModal } from './AttentionActivityModal';
import { CertificateModal } from './CertificateModal';
import { Course, Module } from '../../types';
import { courseApi } from '../../services/api';
import { isYouTubeUrl, getYouTubeEmbedUrl, getYouTubeWatchUrl, getVideoType } from '../../utils/video';
import { Play, Pause, Sparkles, HelpCircle, CheckCircle2, RotateCcw, Award, ExternalLink, AlertTriangle, Video, Zap, Bot, Camera, Activity } from 'lucide-react';

import { quizPrefetchService } from '../../services/quizPrefetchService';
import { attentionActivityPrefetchService } from '../../services/attentionActivityPrefetchService';

interface LearningPlayerProps {
  course?: Course;
}

export const LearningPlayer: React.FC<LearningPlayerProps> = ({ course }) => {
  const { activeIntervention, dismissIntervention, metrics, setCurrentContext, stopWebcam, startWebcam, status, fps, faceDetected } = useAffective();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeCompanionTab, setActiveCompanionTab] = useState<'tutor' | 'biometrics'>('tutor');

  const handleStartCamera = async () => {
    setActiveCompanionTab('biometrics');
    setTimeout(() => {
      startWebcam().catch((err) => console.error("Webcam start error:", err));
    }, 50);
  };

  // HIGH-PRIORITY: Turn OFF camera immediately when student exits learning/video player component
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  
  const modules = course?.modules || [];
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const activeModule = modules[activeModuleIndex] || {
    id: 1,
    title: 'Introduction to Algorithms',
    duration_minutes: 25,
    video_url: 'https://www.youtube.com/watch?v=8hly31xKli0'
  };

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [showAttentionActivityModal, setShowAttentionActivityModal] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [videoTimestamp, setVideoTimestamp] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const courseId = course?.id || 1;
  const moduleId = activeModule.id || 1;

  // Chapter start offsets in seconds for YouTube modules (based on official freeCodeCamp timestamps)
  const MODULE_CHAPTER_OFFSETS: Record<number, number> = {
    0: 0,      // Module 1: Introduction to Algorithms (0:00:00)
    1: 7064,   // Module 2: Introduction to Data Structures (1:57:44)
    2: 8400,   // Module 3: Arrays and Linked Lists (2:20:00)
    3: 15062,  // Module 4: Sorting Algorithms (4:11:02)
    4: 17100,  // Module 5: Searching Algorithms (4:45:00)
    5: 18600,  // Module 6: Final Review and Assessment (5:10:00)
  };
  const moduleStartOffset = MODULE_CHAPTER_OFFSETS[activeModuleIndex] || 0;

  // Classify current video URL
  const videoType = getVideoType(activeModule.video_url);
  const isCurrentYouTube = videoType === 'youtube';
  const youtubeEmbedUrl = isCurrentYouTube ? getYouTubeEmbedUrl(activeModule.video_url, moduleStartOffset) : null;
  const youtubeWatchUrl = isCurrentYouTube ? (getYouTubeWatchUrl(activeModule.video_url, moduleStartOffset) || activeModule.video_url) : null;

  // BACKGROUND PREPARATION: Pre-generate grounded adaptive quiz & attention activity asynchronously as soon as student enters video/module
  useEffect(() => {
    if (courseId && moduleId && activeModule.title) {
      console.log(`[Adaptive] Starting background preparation for ${courseId} / ${moduleId} (${activeModule.title})`);
      quizPrefetchService.prefetchQuizForContext(courseId, moduleId, activeModule.title);
      attentionActivityPrefetchService.prefetchActivityForContext(courseId, moduleId, activeModule.title);
    }
  }, [courseId, moduleId, activeModule.title]);

  // Auto-pop up adaptive quiz or attention activity IMMEDIATELY when intervention is triggered
  useEffect(() => {
    if (activeIntervention && activeIntervention.action_required) {
      const itype = String(activeIntervention.intervention_type).toUpperCase();
      const t0 = performance.now();
      console.log(`[Adaptive] T0: Intervention trigger satisfied (${itype}) at ${t0.toFixed(1)}ms`);
      (window as any).__ADAPTIVE_TRIGGER_T0__ = t0;

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

  // Sync course and module ID context to AffectiveContext for telemetry
  useEffect(() => {
    if (setCurrentContext) {
      setCurrentContext(courseId, moduleId, videoTimestamp);
    }
  }, [courseId, moduleId, videoTimestamp, setCurrentContext]);

  // Listen for sustained low-attention events or test triggers
  useEffect(() => {
    const handlePopQuiz = () => {
      const t0 = performance.now();
      (window as any).__ADAPTIVE_TRIGGER_T0__ = t0;
      setShowQuizModal(true);
      setShowAttentionActivityModal(false);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
    const handlePopActivity = () => {
      const t0 = performance.now();
      (window as any).__ADAPTIVE_TRIGGER_T0__ = t0;
      setShowAttentionActivityModal(true);
      setShowQuizModal(false);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
    window.addEventListener('eduflow:pop_interactive_quiz', handlePopQuiz);
    window.addEventListener('eduflow:pop_attention_activity', handlePopActivity);
    return () => {
      window.removeEventListener('eduflow:pop_interactive_quiz', handlePopQuiz);
      window.removeEventListener('eduflow:pop_attention_activity', handlePopActivity);
    };
  }, []);

  // Reset video state on module change
  useEffect(() => {
    setIsPlaying(false);
    setVideoError(null);
    setVideoTimestamp(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  }, [activeModuleIndex, activeModule.video_url]);

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      try {
        await videoRef.current.play();
      } catch (err: any) {
        console.warn('Video play prevented or failed:', err);
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

    // Update progress percentage periodically for native HTML5 videos
    const progress = Math.min(100, Math.round((current / total) * 100));
    if (Math.round(current) % 10 === 0 && course?.id) {
      courseApi.updateProgress(course.id, progress).catch(() => {});
    }
  };

  const rawVideoUrl = activeModule.video_url || '/media/sample_course_video.mp4';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const backendOrigin = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  const videoUrl = rawVideoUrl.startsWith('/') ? `${backendOrigin}${rawVideoUrl}` : rawVideoUrl;

  const handleTimestampSeek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Video & Closed Loop Interventions Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Module Selector Bar if multiple modules exist */}
        {modules.length > 1 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {modules.map((mod, idx) => (
              <button
                key={mod.id || idx}
                onClick={() => setActiveModuleIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeModuleIndex === idx
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                Module {idx + 1}: {mod.title}
              </button>
            ))}
          </div>
        )}

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 relative">
          
          {/* PLAYER DISPLAY: YOUTUBE IFRAME OR HTML5 NATIVE VIDEO OR INVALID URL */}
          {isCurrentYouTube && youtubeEmbedUrl ? (
            /* YOUTUBE IFRAME EMBED PLAYER WITH FALLBACK LINK BAR */
            <div className="flex flex-col bg-black">
              <div className="aspect-video w-full relative bg-black">
                <iframe
                  src={youtubeEmbedUrl}
                  title={activeModule.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              {/* YouTube Fallback / Option Bar */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-slate-300 truncate">
                  <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-semibold truncate">{activeModule.title}</span>
                  <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">({activeModule.duration_minutes || 15} mins)</span>
                </div>

                {youtubeWatchUrl && (
                  <a
                    href={youtubeWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 font-bold text-[11px] flex items-center space-x-1.5 transition-all shrink-0 ml-2"
                    title="If embedding is restricted by video uploader, click to open on YouTube"
                  >
                    <span>Open on YouTube</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ) : videoType === 'invalid' ? (
            /* INVALID URL ERROR DISPLAY */
            <div className="aspect-video w-full bg-slate-950 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">Invalid Video URL</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  The video URL configured for this module ({activeModule.video_url}) is not a valid YouTube link or direct video stream.
                </p>
              </div>
            </div>
          ) : (
            /* NATIVE HTML5 MP4 / LOCAL MEDIA PLAYER */
            <div className="relative aspect-video bg-black flex items-center justify-center group cursor-pointer" onClick={togglePlay}>
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                controls={false}
                playsInline
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={() => setVideoError('Unable to load video stream. Check source URL or network.')}
                onCanPlay={() => setVideoError(null)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                loop
              />

              {/* Play Overlay Button when Paused */}
              {!isPlaying && !videoError && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center shadow-glow-cyan transform group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Video Error Message Overlay */}
              {videoError && (
                <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                  <HelpCircle className="w-10 h-10 text-rose-400" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-300">Video Loading Error</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">{videoError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current) videoRef.current.load();
                      setVideoError(null);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 font-semibold"
                  >
                    Retry Loading Video
                  </button>
                </div>
              )}

              {/* Video Control Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex items-center justify-between z-20" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-2 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{activeModule.title}</h4>
                    <p className="text-[11px] text-slate-400">
                      {course?.title || 'Edu-Flow Course'} • {activeModule.duration_minutes || 15} mins • {Math.floor(videoTimestamp)}s / {Math.floor(duration)}s
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowQuizModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Interactive Quiz</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCertificateModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/50 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Claim Certificate</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Closed-Loop Adaptive Intervention Overlay */}
          {/* Active Adaptive Support Banner */}
          {activeIntervention && activeIntervention.action_required && (
            <div className="p-4 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-cyan-950/80 border-t border-cyan-500/30 flex items-start space-x-3 animate-fade-in">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 mt-0.5">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Adaptive Learning Support
                  </h5>
                  <button
                    onClick={dismissIntervention}
                    className="text-xs text-slate-400 hover:text-white font-mono px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
                  >
                    Dismiss ✕
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  {activeIntervention.message || "Let's reconnect with the topic."}
                </p>
                {activeIntervention.suggested_content && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 font-mono">
                    {activeIntervention.suggested_content}
                  </div>
                )}
                {(activeIntervention.intervention_type === 'INTERACTIVE_QUIZ' ||
                  activeIntervention.intervention_type === 'MICRO_QUIZ' ||
                  activeIntervention.intervention_type === 'TARGETED_QUIZ') && (
                  <button
                    onClick={() => {
                      dismissIntervention();
                      setShowQuizModal(true);
                    }}
                    className="mt-2 px-3 py-1 rounded bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 shadow-sm"
                  >
                    Open Knowledge Challenge
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sleek Compact Affective Telemetry Strip (Distraction-Free, No Bottom Mess) */}
        <div className="glass-panel rounded-2xl p-3.5 border border-slate-800 bg-slate-900/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-sm">
          {/* Left: Camera Status & Trigger */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status === 'CONNECTED' ? 'bg-cyan-400' : 'bg-slate-500'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  status === 'CONNECTED' ? 'bg-cyan-400' : 'bg-slate-500'
                }`}></span>
              </span>
              <span className="text-xs font-bold text-slate-200">
                {status === 'CONNECTED' ? `Live Telemetry (${fps} FPS)` : 'Webcam Standby'}
              </span>
            </div>

            {status !== 'CONNECTED' ? (
              <button
                type="button"
                onClick={handleStartCamera}
                className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-[11px] hover:bg-cyan-400 transition-all flex items-center space-x-1 shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start Camera</span>
              </button>
            ) : (

              <button
                type="button"
                onClick={stopWebcam}
                className="px-2 py-0.5 rounded text-[11px] text-rose-400 hover:bg-rose-950/40 border border-rose-500/30 transition-all"
              >
                Stop Camera
              </button>
            )}
          </div>

          {/* Center: Live Attention Score Gauge */}
          <div className="flex items-center space-x-3 flex-1 max-w-xs min-w-[160px]">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Attention:</span>
            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (metrics.attention ?? 0) >= 0.7
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                    : (metrics.attention ?? 0) >= 0.4
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500'
                }`}
                style={{ width: `${Math.round((metrics.attention ?? 0) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-cyan-400">
              {Math.round((metrics.attention ?? 0) * 100)}%
            </span>
          </div>

          {/* Right: State Pill + Toggle to Camera/Biometrics Tab */}
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold font-mono ${
              metrics.primary_state === 'CONFUSION' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
              metrics.primary_state === 'BOREDOM' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
              metrics.primary_state === 'DISTRACTION' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
              metrics.primary_state === 'HIGH_COGNITIVE_LOAD' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {metrics.primary_state || 'ENGAGED'}
            </span>


            <button
              type="button"
              onClick={() => setActiveCompanionTab(activeCompanionTab === 'biometrics' ? 'tutor' : 'biometrics')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center space-x-1"
              title="Toggle between AI Tutor and Camera Biometrics"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{activeCompanionTab === 'biometrics' ? 'Open AI Chat' : 'View Camera & HUD'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Studio Companion Panel (Tabbed AI Tutor / Biometrics & Camera) */}
      <div className="space-y-3">
        {/* Sleek Companion Header Tabs */}
        <div className="flex items-center rounded-2xl bg-slate-900 border border-slate-800 p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveCompanionTab('tutor')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeCompanionTab === 'tutor'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>AI Socratic Tutor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCompanionTab('biometrics')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeCompanionTab === 'biometrics'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>Camera & Biometrics</span>
            {status === 'CONNECTED' && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-1"></span>
            )}
          </button>
        </div>

        {/* Tab 1: AI Tutor Assistant */}
        <div className={activeCompanionTab === 'tutor' ? 'block' : 'hidden'}>
          <AITutorSidebar course={course} module={activeModule} onTimestampSeek={handleTimestampSeek} />
        </div>

        {/* Tab 2: Camera Tracker & HUD Diagnostics (Keep mounted so videoRef is always valid) */}
        <div className={activeCompanionTab === 'biometrics' ? 'block h-[650px] overflow-y-auto space-y-4 pr-1 scrollbar-thin' : 'hidden'}>
          <WebcamMonitor />
          <AffectiveHUD />
        </div>
      </div>



      {/* Modals */}
      {showQuizModal && (
        <AdaptiveQuizModal
          onClose={() => setShowQuizModal(false)}
          courseId={courseId}
          moduleId={moduleId}
          topic={activeModule.title}
          onNavigateToTopic={(weakTopic, timestampSeconds) => {
            // Find module matching topic or switch/seek
            const lower = (weakTopic || '').toLowerCase();
            const matchedIdx = modules.findIndex(m => m.title.toLowerCase().includes(lower) || lower.includes(m.title.toLowerCase()));
            if (matchedIdx >= 0) {
              setActiveModuleIndex(matchedIdx);
            }
            if (timestampSeconds !== undefined && timestampSeconds > 0) {
              handleTimestampSeek(timestampSeconds);
            }
            // Also notify AI Tutor
            const el = document.querySelector('textarea, input[type="text"]') as HTMLInputElement | HTMLTextAreaElement;
            if (el) {
              const tsNote = timestampSeconds ? ` (around timestamp ${Math.floor(timestampSeconds / 60)}:${String(Math.floor(timestampSeconds % 60)).padStart(2, '0')})` : '';
              el.value = `Can you explain "${weakTopic}"${tsNote} and show how it relates to this lesson?`;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.focus();
            }
          }}
          onOpenAITutor={(weakTopic) => {
            const el = document.querySelector('textarea, input[type="text"]') as HTMLInputElement | HTMLTextAreaElement;
            if (el) {
              if (weakTopic) {
                el.value = `Can you explain the core concept of "${weakTopic}" step-by-step?`;
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
              el.focus();
            }
          }}
        />
      )}
      {showAttentionActivityModal && (
        <AttentionActivityModal
          isOpen={showAttentionActivityModal}
          onClose={() => setShowAttentionActivityModal(false)}
          courseId={courseId}
          moduleId={moduleId}
          topicTitle={activeModule.title}
        />
      )}
      {showCertificateModal && <CertificateModal onClose={() => setShowCertificateModal(false)} />}
    </div>
  );
};
