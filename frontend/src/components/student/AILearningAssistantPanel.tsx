import React, { useState, useEffect, useRef } from 'react';
import { useAffective } from '../../context/AffectiveContext';
import { useAuth } from '../../context/AuthContext';
import { aiTutorApi, videoApi } from '../../services/api';
import { Course, Module, AITutorMessage } from '../../types';
import { attentionMonitor } from '../../services/attentionMonitor';
import { learnerStateClassifier } from '../../services/learnerStateClassifier';
import {
  Camera, Bot, Send, ShieldCheck, Play, Square, Activity, Eye,
  Sparkles, Clock, AlertTriangle, CheckCircle2, Lightbulb, User,
  HelpCircle, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Power
} from 'lucide-react';

interface AILearningAssistantPanelProps {
  course?: Course;
  module?: Module;
  onTimestampSeek?: (seconds: number) => void;
}

export const AILearningAssistantPanel: React.FC<AILearningAssistantPanelProps> = ({
  course,
  module,
  onTimestampSeek
}) => {
  const { user } = useAuth();
  const {
    videoRef,
    canvasRef,
    status,
    fps,
    landmarkCount,
    errorMessage,
    faceDetected,
    startWebcam,
    stopWebcam,
    metrics,
  } = useAffective();

  // === INDEPENDENT FEATURE STATES ===
  const [isBiometricsActive, setIsBiometricsActive] = useState<boolean>(true);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);

  // === AI TUTOR STATE ===
  const [messages, setMessages] = useState<AITutorMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [knowledgeTopic, setKnowledgeTopic] = useState<string>(module?.title || 'Introduction to Algorithms');
  const [knowledgeStatus, setKnowledgeStatus] = useState<'READY' | 'ANALYZING' | 'FAILED'>('READY');
  const isSendingRef = useRef<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isConnected = status === 'CONNECTED';
  const isInitializing = status === 'INITIALIZING';
  const isPermissionDenied = status === 'PERMISSION_DENIED';
  const isError = status === 'ERROR';

  // Compute live attention metrics if landmarks and camera connected
  const attention = attentionMonitor.computeMetrics([], fps);
  const debug = attentionMonitor.getDebugInfo();
  const stateInfo = learnerStateClassifier.classify(
    metrics,
    debug,
    attention.isFaceDetected || faceDetected,
    attention.gazeDirection,
    attention.headPose.yaw,
    attention.headPose.pitch
  );

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Synchronize knowledge topic and reset initial welcome on module change
  useEffect(() => {
    let isMounted = true;
    const currentModuleTitle = module?.title || 'Introduction to Algorithms';
    setKnowledgeTopic(currentModuleTitle);

    if (module?.id) {
      setKnowledgeStatus('ANALYZING');
      videoApi.getModuleKnowledge(module.id)
        .then((res) => {
          if (isMounted && res) {
            setKnowledgeTopic(res.topic || currentModuleTitle);
            setKnowledgeStatus('READY');
          }
        })
        .catch(() => {
          if (isMounted) {
            setKnowledgeTopic(currentModuleTitle);
            setKnowledgeStatus('READY');
          }
        });
    }

    const greeting: AITutorMessage = {
      id: `init-${module?.id || Date.now()}`,
      sender: 'ai',
      text: `Hello! I'm your AI Socratic Tutor for **${currentModuleTitle}**. Ask me any question about the concepts or problem-solving approaches in this lesson.`,
      timestamp: 'Just now',
      grounding_type: 'VIDEO_GROUNDED'
    };
    setMessages([greeting]);

    return () => {
      isMounted = false;
    };
  }, [module?.id, module?.title]);

  // Camera start / stop actions — purely local to camera
  const handleToggleCamera = async () => {
    if (isConnected || isInitializing) {
      stopWebcam();
    } else {
      setIsCameraStarting(true);
      try {
        await startWebcam();
      } catch (err) {
        console.error('Camera toggle error:', err);
      } finally {
        setIsCameraStarting(false);
      }
    }
  };

  // AI Tutor send handler
  const handleSend = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const textToSend = (promptOverride || inputQuery).trim();
    if (!textToSend || loading || isSendingRef.current) return;

    isSendingRef.current = true;
    setInputQuery('');
    setLoading(true);

    const userMsg: AITutorMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const activeTopic = module?.title || knowledgeTopic || 'Introduction to Algorithms';
      const res = await aiTutorApi.query({
        course_id: course?.id || 1,
        module_id: module?.id,
        query: textToSend,
        question: textToSend,
        student_affective_state: isBiometricsActive ? metrics.primary_state : 'ENGAGED',
        module_topic: activeTopic,
        module_title: module?.title
      });

      const aiMsg: AITutorMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.text || res.answer || "I've reviewed the lesson materials. How else can I guide you through this concept?",
        simplified_explanation: res.simplified_explanation,
        analogies: res.analogies,
        timestamp_reference: res.timestamp_reference,
        timestamp_seconds: res.timestamp_seconds,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        grounding_type: 'VIDEO_GROUNDED'
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: AITutorMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: "I'm having a brief connection issue reaching the AI tutor service. Please feel free to ask again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      isSendingRef.current = false;
    }
  };

  // Attention metric calculation (0 to 100%)
  const attentionPercentage = isConnected && isBiometricsActive
    ? Math.round((metrics.attention ?? 0.85) * 100)
    : 0;

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-[#0E1420] border-l border-slate-200 dark:border-[#1F293D] overflow-hidden text-xs">
      
      {/* ── TOP HEADER: AI LEARNING ASSISTANT ── */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1F293D] bg-slate-50/70 dark:bg-[#0B0F17] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">AI Assistant & Sensor</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Real-time Multimodal Hub</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* ── SCROLLABLE SECTIONS: CAMERA + BIOMETRICS + CHAT ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1F293D]/80">

        {/* ── SECTION B: LIVE CAMERA PREVIEW ── */}
        <div className="p-3.5 space-y-2.5 shrink-0 bg-slate-50/30 dark:bg-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="w-3.5 h-3.5 text-cyan-500" />
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                Vision Stream
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono">
                FaceMesh
              </span>
            </div>

            {/* Compact Start / Stop Camera Button */}
            <button
              onClick={handleToggleCamera}
              disabled={isCameraStarting}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono transition-all flex items-center space-x-1 ${
                isConnected || isInitializing
                  ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-sm'
              }`}
            >
              {isInitializing || isCameraStarting ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>STARTING...</span>
                </>
              ) : isConnected ? (
                <>
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>STOP CAM</span>
                </>
              ) : (
                <>
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>START CAM</span>
                </>
              )}
            </button>
          </div>

          {/* Webcam Viewport Container */}
          <div className="relative w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-200 dark:border-[#1F293D] flex items-center justify-center">
            {/* Real HTML5 Video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                !isConnected ? 'hidden' : 'block'
              }`}
            />

            {/* Real MediaPipe Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 ${
                !isConnected ? 'hidden' : 'block'
              }`}
            />

            {/* Offline State Placeholder */}
            {!isConnected && !isInitializing && (
              <div className="text-center p-3 space-y-1.5">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-medium text-slate-300">Camera Inactive</div>
                <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                  Start camera to activate real-time cognitive and attention monitoring.
                </p>
              </div>
            )}

            {/* Initializing State Placeholder */}
            {isInitializing && (
              <div className="text-center p-3 space-y-1 text-cyan-400 font-mono text-[10px]">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-cyan-400" />
                <span>Initializing MediaPipe Face Mesh...</span>
              </div>
            )}

            {/* Live Camera Overlays (FPS & Face detected badge) */}
            {isConnected && (
              <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{fps} FPS</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono text-cyan-300 border border-cyan-500/30">
                  {faceDetected ? '✓ Face Tracked' : 'Searching Face...'}
                </span>
              </div>
            )}
          </div>

          {/* Graceful error / permission warning */}
          {isPermissionDenied && (
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Camera permission was denied. Please allow camera in browser settings.</span>
            </div>
          )}
        </div>

        {/* ── SECTION C: BIOMETRICS & ATTENTION MONITORING ── */}
        <div className="p-3.5 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-3.5 h-3.5 text-cyan-500" />
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                Cognitive State
              </span>
            </div>

            {/* Independent Biometrics Enable/Disable Toggle */}
            <button
              onClick={() => setIsBiometricsActive(!isBiometricsActive)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center space-x-1 ${
                isBiometricsActive
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Power className="w-2.5 h-2.5" />
              <span>{isBiometricsActive ? 'ENABLED' : 'PAUSED'}</span>
            </button>
          </div>

          {/* Biometrics Display */}
          {!isBiometricsActive ? (
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-[#111722] border border-slate-200 dark:border-[#1F293D] text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
              <div className="font-bold flex items-center space-x-1 text-slate-600 dark:text-slate-300">
                <AlertCircle className="w-3 h-3" />
                <span>Biometric Tracking Paused</span>
              </div>
              <p>Attention telemetry and adaptive intervention prompts are currently paused.</p>
            </div>
          ) : !isConnected ? (
            <div className="p-2.5 rounded-lg bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Webcam Required for Attention Tracking</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Facial expression and gaze telemetry operate 100% on-device. Start camera to begin live attention monitoring.
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0A0F18] border border-slate-200 dark:border-[#1F293D] space-y-2">
              {/* Attention Gauge Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400">ATTENTION LEVEL</span>
                  <span className="font-bold text-cyan-500">{attentionPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      attentionPercentage >= 70 ? 'bg-emerald-500' :
                      attentionPercentage >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${attentionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Cognitive State Badges */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-mono text-slate-500">STATE:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    (!isConnected || !isBiometricsActive) ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' :
                    !faceDetected ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' :
                    metrics.primary_state === 'FOCUSED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs' :
                    metrics.primary_state === 'ENGAGED' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                    metrics.primary_state === 'LOW_ENGAGEMENT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    metrics.primary_state === 'CONFUSION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    metrics.primary_state === 'DISTRACTION' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {!isConnected || !isBiometricsActive
                      ? 'INACTIVE'
                      : !faceDetected
                      ? 'INSUFFICIENT_DATA'
                      : metrics.primary_state}
                  </span>
                </div>

                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                  {landmarkCount || 478} Landmarks
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION A: AI TUTOR CHATBOT ── */}
        <div className="flex-1 flex flex-col min-h-[320px] p-3.5 space-y-2 bg-white dark:bg-[#0E1420]">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-500" />
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                AI Socratic Tutor
              </span>
            </div>

            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-mono">
              Gemini RAG
            </span>
          </div>

          {/* Suggested quick prompt chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none shrink-0">
            <button
              onClick={() => handleSend(undefined, `What are the key concepts in "${module?.title || 'this lesson'}"?`)}
              className="px-2 py-1 rounded bg-slate-100 dark:bg-[#141D2E] hover:bg-cyan-500/10 text-slate-700 dark:text-cyan-300 border border-slate-200 dark:border-[#1F293D] text-[10px] whitespace-nowrap transition-colors"
            >
              Ask About Video
            </button>
            <button
              onClick={() => handleSend(undefined, `Explain the core concept in "${module?.title || 'this lesson'}" step-by-step.`)}
              className="px-2 py-1 rounded bg-slate-100 dark:bg-[#141D2E] hover:bg-cyan-500/10 text-slate-700 dark:text-cyan-300 border border-slate-200 dark:border-[#1F293D] text-[10px] whitespace-nowrap transition-colors"
            >
              Explain Concept
            </button>
            <button
              onClick={() => handleSend(undefined, `Give me a quick practice problem about "${module?.title || 'this topic'}".`)}
              className="px-2 py-1 rounded bg-slate-100 dark:bg-[#141D2E] hover:bg-cyan-500/10 text-slate-700 dark:text-cyan-300 border border-slate-200 dark:border-[#1F293D] text-[10px] whitespace-nowrap transition-colors"
            >
              Practice Problem
            </button>
          </div>

          {/* Conversation history */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[160px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl p-2.5 text-xs ${
                    msg.sender === 'user'
                      ? 'bg-cyan-500 text-slate-950 font-medium rounded-br-none shadow-sm'
                      : 'bg-slate-100 dark:bg-[#111722] border border-slate-200 dark:border-[#1F293D] text-slate-800 dark:text-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1 text-[9px] opacity-70">
                    {msg.sender === 'user' ? <User className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5 text-cyan-500" />}
                    <span>{msg.sender === 'user' ? 'You' : 'AI Tutor'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <p className="whitespace-pre-line leading-relaxed text-[11px]">{msg.text}</p>

                  {/* Jump to video timestamp if provided */}
                  {msg.timestamp_seconds !== undefined && msg.timestamp_seconds !== null && onTimestampSeek && (
                    <button
                      type="button"
                      onClick={() => onTimestampSeek(msg.timestamp_seconds!)}
                      className="mt-2 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center space-x-1 hover:bg-cyan-500/30 transition-colors"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>Jump to {msg.timestamp_reference || `${Math.floor(msg.timestamp_seconds / 60)}:${String(Math.floor(msg.timestamp_seconds % 60)).padStart(2, '0')}`}</span>
                    </button>
                  )}

                  {/* Simplified explanation breakdown */}
                  {msg.simplified_explanation && (
                    <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] space-y-0.5">
                      <div className="font-bold flex items-center space-x-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        <span>Simplified Breakdown</span>
                      </div>
                      <p>{msg.simplified_explanation}</p>
                    </div>
                  )}

                  {/* Real-world analogy */}
                  {msg.analogies && msg.analogies.length > 0 && (
                    <div className="mt-1.5 p-2 rounded bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] space-y-0.5">
                      <div className="font-bold flex items-center space-x-1">
                        <Lightbulb className="w-2.5 h-2.5 text-purple-500" />
                        <span>Analogy</span>
                      </div>
                      <p>{msg.analogies[0]}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] italic">
                <Bot className="w-3.5 h-3.5 animate-bounce text-cyan-500" />
                <span>AI Tutor thinking...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Anchored message input */}
          <form onSubmit={(e) => handleSend(e)} className="flex items-center space-x-1.5 pt-2 border-t border-slate-200 dark:border-[#1F293D] shrink-0">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask about ${module?.title ? `"${module.title}"` : 'this lesson'}...`}
              className="flex-1 bg-slate-50 dark:bg-[#141D2E] border border-slate-200 dark:border-[#1F293D] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="p-1.5 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition-colors font-bold shadow-sm"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
