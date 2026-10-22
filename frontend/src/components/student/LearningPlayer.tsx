import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import {
  Play, Pause, Sparkles, HelpCircle, CheckCircle2, RotateCcw, Award,
  ExternalLink, AlertTriangle, Video, Zap, Bot, Camera, Activity,
  ChevronDown, ChevronRight, X, Maximize2, Minimize2, Eye, EyeOff,
  MessageSquare, Monitor, PanelRightOpen, PanelRightClose
} from 'lucide-react';

import { quizPrefetchService } from '../../services/quizPrefetchService';
import { attentionActivityPrefetchService } from '../../services/attentionActivityPrefetchService';

interface LearningPlayerProps {
  course?: Course;
}

export const LearningPlayer: React.FC<LearningPlayerProps> = ({ course }) => {
  const {
    activeIntervention, dismissIntervention, metrics, setCurrentContext,
    stopWebcam, startWebcam, status, fps, faceDetected
  } = useAffective();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // === INDEPENDENT STATE for AI Tutor, Camera, and Biometrics ===
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isBiometricsVisible, setIsBiometricsVisible] = useState<boolean>(false);
  const [isLearningToolsOpen, setIsLearningToolsOpen] = useState<boolean>(false);

  // Camera start handler — independent of tutor/biometrics visibility
  const handleStartCamera = useCallback(async () => {
    setIsCameraActive(true);
    setIsLearningToolsOpen(true);
    setTimeout(() => {
      startWebcam().catch((err) => console.error("Webcam start error:", err));
    }, 50);
  }, [startWebcam]);

  // Camera stop handler — independent of tutor/biometrics visibility
  const handleStopCamera = useCallback(() => {
    stopWebcam();
    setIsCameraActive(false);
  }, [stopWebcam]);

  // Cleanup: Turn OFF camera when student exits learning/video player component
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  const modules = course?.modules || [];
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [isModuleListOpen, setIsModuleListOpen] = useState<boolean>(false);
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

  // Chapter start offsets in seconds for YouTube modules
  const MODULE_CHAPTER_OFFSETS: Record<number, number> = {
    0: 0,
    1: 7064,
    2: 8400,
    3: 15062,
    4: 17100,
    5: 18600,
  };
  const moduleStartOffset = MODULE_CHAPTER_OFFSETS[activeModuleIndex] || 0;

  // Classify current video URL
  const videoType = getVideoType(activeModule.video_url);
  const isCurrentYouTube = videoType === 'youtube';
  const youtubeEmbedUrl = isCurrentYouTube ? getYouTubeEmbedUrl(activeModule.video_url, moduleStartOffset) : null;
  const youtubeWatchUrl = isCurrentYouTube ? (getYouTubeWatchUrl(activeModule.video_url, moduleStartOffset) || activeModule.video_url) : null;

  // BACKGROUND PREPARATION: Pre-generate adaptive quiz & attention activity
  useEffect(() => {
    if (courseId && moduleId && activeModule.title) {
      quizPrefetchService.prefetchQuizForContext(courseId, moduleId, activeModule.title);
      attentionActivityPrefetchService.prefetchActivityForContext(courseId, moduleId, activeModule.title);
    }
  }, [courseId, moduleId, activeModule.title]);

  // Auto-pop up adaptive quiz or attention activity on intervention
  useEffect(() => {
    if (activeIntervention && activeIntervention.action_required) {
      const itype = String(activeIntervention.intervention_type).toUpperCase();
      const t0 = performance.now();
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
      if (videoRef.current) videoRef.current.pause();
    };
    const handlePopActivity = () => {
      const t0 = performance.now();
      (window as any).__ADAPTIVE_TRIGGER_T0__ = t0;
      setShowAttentionActivityModal(true);
      setShowQuizModal(false);
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
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

  const isWebcamConnected = status === 'CONNECTED';

  return (
    <div className="lp-workspace">
      {/* ── Main Content Area ── */}
      <div className={`lp-main ${isTutorOpen ? 'lp-main--tutor-open' : ''}`}>
        {/* Module Navigation Bar */}
        {modules.length > 1 && (
          <div className="lp-module-nav">
            <button
              className="lp-module-selector"
              onClick={() => setIsModuleListOpen(!isModuleListOpen)}
            >
              <div className="lp-module-selector__info">
                <span className="lp-module-selector__label">Module {activeModuleIndex + 1}</span>
                <span className="lp-module-selector__title">{activeModule.title}</span>
              </div>
              <ChevronDown className={`lp-module-selector__chevron ${isModuleListOpen ? 'lp-module-selector__chevron--open' : ''}`} />
            </button>

            {/* Module Dropdown */}
            {isModuleListOpen && (
              <div className="lp-module-dropdown">
                {modules.map((mod, idx) => (
                  <button
                    key={mod.id || idx}
                    onClick={() => {
                      setActiveModuleIndex(idx);
                      setIsModuleListOpen(false);
                    }}
                    className={`lp-module-dropdown__item ${activeModuleIndex === idx ? 'lp-module-dropdown__item--active' : ''}`}
                  >
                    <span className="lp-module-dropdown__number">{idx + 1}</span>
                    <div className="lp-module-dropdown__content">
                      <span className="lp-module-dropdown__title">{mod.title}</span>
                      <span className="lp-module-dropdown__duration">{mod.duration_minutes || 25} min</span>
                    </div>
                    {activeModuleIndex === idx && <CheckCircle2 className="lp-module-dropdown__check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Video Player ── */}
        <div className="lp-player">
          {isCurrentYouTube && youtubeEmbedUrl ? (
            <div className="lp-player__youtube">
              <div className="lp-player__aspect">
                <iframe
                  src={youtubeEmbedUrl}
                  title={activeModule.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="lp-player__iframe"
                />
              </div>
              {/* YouTube fallback bar */}
              <div className="lp-player__bar">
                <div className="lp-player__bar-left">
                  <Video className="lp-player__bar-icon" />
                  <span className="lp-player__bar-title">{activeModule.title}</span>
                  <span className="lp-player__bar-duration">{activeModule.duration_minutes || 15} min</span>
                </div>
                <div className="lp-player__bar-right">
                  {youtubeWatchUrl && (
                    <a
                      href={youtubeWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lp-player__yt-link"
                      title="Open on YouTube"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : videoType === 'invalid' ? (
            <div className="lp-player__aspect lp-player__error">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <h4 className="text-sm font-semibold text-amber-300 mt-2">Invalid Video URL</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md text-center">
                The video URL for this module ({activeModule.video_url}) is not valid.
              </p>
            </div>
          ) : (
            <div className="lp-player__native" onClick={togglePlay}>
              <video
                ref={videoRef}
                src={videoUrl}
                className="lp-player__video"
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

              {/* Play overlay */}
              {!isPlaying && !videoError && (
                <div className="lp-player__play-overlay">
                  <div className="lp-player__play-btn">
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {videoError && (
                <div className="lp-player__error-overlay">
                  <HelpCircle className="w-8 h-8 text-rose-400" />
                  <h4 className="text-sm font-semibold text-rose-300 mt-2">Video Error</h4>
                  <p className="text-xs text-slate-400 mt-1">{videoError}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current) videoRef.current.load();
                      setVideoError(null);
                    }}
                    className="lp-player__retry-btn"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Bottom control bar */}
              <div className="lp-player__controls" onClick={(e) => e.stopPropagation()}>
                <div className="lp-player__controls-left">
                  <button type="button" onClick={togglePlay} className="lp-player__control-btn">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <div className="lp-player__controls-info">
                    <span className="lp-player__controls-title">{activeModule.title}</span>
                    <span className="lp-player__controls-time">
                      {Math.floor(videoTimestamp)}s / {Math.floor(duration)}s
                    </span>
                  </div>
                </div>
                <div className="lp-player__controls-right">
                  <button
                    onClick={() => setShowQuizModal(true)}
                    className="lp-player__action-btn lp-player__action-btn--quiz"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quiz</span>
                  </button>
                  <button
                    onClick={() => setShowCertificateModal(true)}
                    className="lp-player__action-btn lp-player__action-btn--cert"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Certificate</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Intervention Banner */}
        {activeIntervention && activeIntervention.action_required && (
          <div className="lp-intervention">
            <div className="lp-intervention__icon">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="lp-intervention__content">
              <div className="lp-intervention__header">
                <h5 className="lp-intervention__title">Adaptive Support</h5>
                <button onClick={dismissIntervention} className="lp-intervention__dismiss">Dismiss ✕</button>
              </div>
              <p className="lp-intervention__message">
                {activeIntervention.message || "Let's reconnect with the topic."}
              </p>
              {activeIntervention.suggested_content && (
                <div className="lp-intervention__suggestion">{activeIntervention.suggested_content}</div>
              )}
              {(activeIntervention.intervention_type === 'INTERACTIVE_QUIZ' ||
                activeIntervention.intervention_type === 'MICRO_QUIZ' ||
                activeIntervention.intervention_type === 'TARGETED_QUIZ') && (
                <button
                  onClick={() => {
                    dismissIntervention();
                    setShowQuizModal(true);
                  }}
                  className="lp-intervention__action-btn"
                >
                  Open Knowledge Challenge
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Compact Toolbar: Camera, Biometrics, AI Tutor toggles ── */}
        <div className="lp-toolbar">
          {/* Left: Camera & Telemetry Status */}
          <div className="lp-toolbar__left">
            {/* Camera status indicator */}
            <div className="lp-toolbar__status">
              <span className={`lp-toolbar__dot ${isWebcamConnected ? 'lp-toolbar__dot--live' : ''}`} />
              <span className="lp-toolbar__status-text">
                {isWebcamConnected ? `Live · ${fps} FPS` : 'Camera Off'}
              </span>
            </div>

            {/* Camera toggle */}
            {!isWebcamConnected ? (
              <button onClick={handleStartCamera} className="lp-toolbar__btn lp-toolbar__btn--camera-start">
                <Camera className="w-3.5 h-3.5" />
                <span>Start Camera</span>
              </button>
            ) : (
              <button onClick={handleStopCamera} className="lp-toolbar__btn lp-toolbar__btn--camera-stop">
                <Camera className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}

            {/* Attention gauge (compact) */}
            {isWebcamConnected && (
              <div className="lp-toolbar__gauge">
                <span className="lp-toolbar__gauge-label">Attention</span>
                <div className="lp-toolbar__gauge-bar">
                  <div
                    className={`lp-toolbar__gauge-fill ${
                      (metrics.attention ?? 0) >= 0.7 ? 'lp-toolbar__gauge-fill--high' :
                      (metrics.attention ?? 0) >= 0.4 ? 'lp-toolbar__gauge-fill--mid' :
                      'lp-toolbar__gauge-fill--low'
                    }`}
                    style={{ width: `${Math.round((metrics.attention ?? 0) * 100)}%` }}
                  />
                </div>
                <span className="lp-toolbar__gauge-value">{Math.round((metrics.attention ?? 0) * 100)}%</span>
              </div>
            )}

            {/* State pill */}
            {isWebcamConnected && (
              <span className={`lp-toolbar__state-pill lp-toolbar__state-pill--${(metrics.primary_state || 'ENGAGED').toLowerCase()}`}>
                {metrics.primary_state || 'ENGAGED'}
              </span>
            )}
          </div>

          {/* Right: Feature toggles */}
          <div className="lp-toolbar__right">
            {/* Learning Tools toggle (Camera preview + Biometrics) */}
            <button
              onClick={() => setIsLearningToolsOpen(!isLearningToolsOpen)}
              className={`lp-toolbar__btn ${isLearningToolsOpen ? 'lp-toolbar__btn--active' : ''}`}
              title="Learning Tools"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Learning Tools</span>
            </button>

            {/* AI Tutor toggle — INDEPENDENT of camera/biometrics */}
            <button
              onClick={() => setIsTutorOpen(!isTutorOpen)}
              className={`lp-toolbar__btn ${isTutorOpen ? 'lp-toolbar__btn--active' : ''}`}
              title="AI Tutor"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>AI Tutor</span>
              {isTutorOpen ? <PanelRightClose className="w-3 h-3 opacity-50" /> : <PanelRightOpen className="w-3 h-3 opacity-50" />}
            </button>
          </div>
        </div>

        {/* ── Learning Tools Panel (Camera + Biometrics) — collapsible ── */}
        {isLearningToolsOpen && (
          <div className="lp-learning-tools">
            <div className="lp-learning-tools__header">
              <h4 className="lp-learning-tools__title">
                <Monitor className="w-4 h-4" />
                <span>Learning Tools</span>
              </h4>
              <button onClick={() => setIsLearningToolsOpen(false)} className="lp-learning-tools__close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="lp-learning-tools__grid">
              {/* Webcam Preview — compact */}
              <div className="lp-learning-tools__camera">
                <WebcamMonitor />
              </div>
              {/* Biometrics HUD — compact */}
              <div className="lp-learning-tools__biometrics">
                <AffectiveHUD />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AI Tutor Side Panel — INDEPENDENT ── */}
      {isTutorOpen && (
        <div className="lp-tutor-panel">
          <div className="lp-tutor-panel__header">
            <div className="lp-tutor-panel__header-info">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>AI Tutor</span>
            </div>
            <button onClick={() => setIsTutorOpen(false)} className="lp-tutor-panel__close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <AITutorSidebar course={course} module={activeModule} onTimestampSeek={handleTimestampSeek} />
        </div>
      )}

      {/* Modals */}
      {showQuizModal && (
        <AdaptiveQuizModal
          onClose={() => setShowQuizModal(false)}
          courseId={courseId}
          moduleId={moduleId}
          topic={activeModule.title}
          onNavigateToTopic={(weakTopic, timestampSeconds) => {
            const lower = (weakTopic || '').toLowerCase();
            const matchedIdx = modules.findIndex(m => m.title.toLowerCase().includes(lower) || lower.includes(m.title.toLowerCase()));
            if (matchedIdx >= 0) setActiveModuleIndex(matchedIdx);
            if (timestampSeconds !== undefined && timestampSeconds > 0) handleTimestampSeek(timestampSeconds);
            const el = document.querySelector('textarea, input[type="text"]') as HTMLInputElement | HTMLTextAreaElement;
            if (el) {
              const tsNote = timestampSeconds ? ` (around timestamp ${Math.floor(timestampSeconds / 60)}:${String(Math.floor(timestampSeconds % 60)).padStart(2, '0')})` : '';
              el.value = `Can you explain "${weakTopic}"${tsNote} and show how it relates to this lesson?`;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.focus();
            }
          }}
          onOpenAITutor={(weakTopic) => {
            setIsTutorOpen(true);
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
