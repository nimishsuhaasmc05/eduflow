import React, { useState, useEffect, useRef } from 'react';
import { useAffective } from '../../context/AffectiveContext';
import { useAuth } from '../../context/AuthContext';
import { aiTutorApi, videoApi } from '../../services/api';
import { Course, Module, AITutorMessage } from '../../types';
import { getVideoType, extractYouTubeVideoId } from '../../utils/video';
import { Bot, Send, Sparkles, Lightbulb, User, Video, CheckCircle2, HelpCircle, Clock, ShieldCheck, AlertCircle, BookOpen } from 'lucide-react';

interface AITutorSidebarProps {
  course?: Course;
  module?: Module;
  onTimestampSeek?: (seconds: number) => void;
}

export const AITutorSidebar: React.FC<AITutorSidebarProps> = ({ course, module, onTimestampSeek }) => {
  const { metrics } = useAffective();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<AITutorMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [knowledgeTopic, setKnowledgeTopic] = useState<string>(module?.title || 'Introduction to Algorithms');
  const [knowledgeStatus, setKnowledgeStatus] = useState<'READY' | 'ANALYZING' | 'FAILED'>('READY');
  const isSendingRef = useRef<boolean>(false);

  const videoType = getVideoType(module?.video_url);
  const videoId = extractYouTubeVideoId(module?.video_url);

  // Synchronize active topic & reset chat when module changes
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
    } else {
      setKnowledgeTopic(currentModuleTitle);
      setKnowledgeStatus('READY');
    }

    const initialGreeting: AITutorMessage = {
      id: `msg-init-${module?.id || Date.now()}`,
      sender: 'ai',
      text: `Welcome to **${currentModuleTitle}**! I am your AI Socratic Tutor powered by Gemini. Ask me any question about the concepts, definitions, algorithm steps, or time complexity in this lesson.`,
      simplified_explanation: `Ask any question about ${currentModuleTitle}—I will guide you step-by-step with intuitive hints.`,
      analogies: [`Think of me as a dedicated study partner exploring ${currentModuleTitle} with you.`],
      timestamp: 'Just now',
      grounding_type: 'VIDEO_GROUNDED'
    };
    setMessages([initialGreeting]);

    return () => {
      isMounted = false;
    };
  }, [module?.id, module?.title]);

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const userText = (overrideText || inputQuery).trim();
    if (!userText || loading || isSendingRef.current) return;

    isSendingRef.current = true;
    setInputQuery('');
    setLoading(true);

    const clientMsgId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const userMsg: AITutorMessage = {
      id: clientMsgId,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const activeTopic = module?.title || knowledgeTopic || 'Introduction to Algorithms';
      const res = await aiTutorApi.query({
        course_id: course?.id || 1,
        module_id: module?.id,
        query: userText,
        question: userText,
        student_affective_state: metrics.primary_state,
        affective_state: metrics.primary_state,
        course_title: course?.title || 'Algorithms and Data Structures',
        module_title: module?.title || activeTopic,
        video_title: module?.title || activeTopic,
        video_topic: activeTopic,
        module_description: module?.description,
        video_url: module?.video_url,
        video_type: videoType,
        video_id: videoId || undefined,
        transcript: module?.transcript
      });

      let cleanText = res.answer || res.text || res.explanation || '';
      let cleanSimplified = res.simplified_explanation;
      let cleanAnalogies = res.analogies;
      let cleanMermaid = res.visual_diagram_mermaid;

      if (typeof cleanText === 'string') {
        const trimmed = cleanText.trim();
        if (trimmed.startsWith('```json') || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          try {
            const parsed = JSON.parse(trimmed.replace(/^```json\s*/, '').replace(/```$/, ''));
            if (parsed.answer) cleanText = parsed.answer;
            if (parsed.simplified_explanation) cleanSimplified = parsed.simplified_explanation;
            if (parsed.analogies) cleanAnalogies = parsed.analogies;
            if (parsed.visual_diagram_mermaid) cleanMermaid = parsed.visual_diagram_mermaid;
          } catch (e) {
            // Keep cleanText
          }
        }
      }

      if (!cleanText.trim()) {
        cleanText = `Regarding **${userText}** in **${activeTopic}**:\n\n1. **Core Concept**: ${activeTopic} establishes systematic computational rules.\n2. **Analysis**: Break down input constraints and verify logical correctness.\n3. **Application**: Apply algorithmic procedures step-by-step to achieve optimal execution.`;
      }

      const aiMsg: AITutorMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: cleanText,
        simplified_explanation: cleanSimplified,
        analogies: cleanAnalogies,
        mermaid_diagram: cleanMermaid,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        grounding_type: res.grounding_type || 'VIDEO_GROUNDED',
        timestamp_reference: res.timestamp_reference,
        timestamp_seconds: res.timestamp_seconds
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("AI Tutor API error:", err);
      const errorAiMsg: AITutorMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'AI Tutor is temporarily unavailable. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        grounding_type: 'UNGROUNDED'
      };
      setMessages((prev) => [...prev, errorAiMsg]);
    } finally {
      isSendingRef.current = false;
      setLoading(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    if (loading || isSendingRef.current) return;
    handleSend(undefined, promptText);
  };

  return (
    <div className="glass-panel rounded-2xl border border-[#24425C] flex flex-col h-[650px] bg-[#0B1728]">
      {/* Header */}
      <div className="p-4 border-b border-[#24425C] flex items-center justify-between bg-[#10243A] rounded-t-2xl">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#27D7E8]/20 border border-[#27D7E8]/30 flex items-center justify-center text-[#27D7E8]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200">AI Socratic Tutor</h3>
            <p className="text-[10px] text-slate-400">Powered by Gemini 2.5 Flash • Course-Aware RAG</p>
          </div>
        </div>
        <span className="text-[10px] bg-[#27D7E8]/10 text-[#58E6F2] border border-[#27D7E8]/30 px-2 py-0.5 rounded-full font-mono">
          State: {metrics.primary_state}
        </span>
      </div>

      {/* Dynamic Video & Module Context Badge Indicator */}
      {module && (
        <div className="mx-4 mt-3 p-2.5 rounded-xl bg-[#10243A] border border-[#27D7E8]/30 space-y-2 text-[11px] shadow-sm">
          <div className="flex items-center justify-between truncate">
            <div className="flex items-center space-x-2 truncate">
              <Video className="w-3.5 h-3.5 text-[#27D7E8] shrink-0" />
              <span className="text-[#27D7E8] font-bold uppercase tracking-wider text-[10px]">VIDEO CONTEXT:</span>
              <span className="text-slate-100 font-semibold truncate text-xs">{module.title}</span>
            </div>
            {knowledgeStatus === 'READY' ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold shrink-0 flex items-center space-x-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Knowledge READY</span>
              </span>
            ) : knowledgeStatus === 'ANALYZING' ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold shrink-0 flex items-center space-x-1 animate-pulse">
                <Clock className="w-2.5 h-2.5" />
                <span>ANALYZING Content...</span>
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold shrink-0 flex items-center space-x-1">
                <AlertCircle className="w-2.5 h-2.5" />
                <span>Analysis Pending</span>
              </span>
            )}
          </div>

          {knowledgeTopic && (
            <div className="text-[10px] text-slate-400 truncate flex items-center space-x-1">
              <span className="font-semibold text-slate-300">Topic:</span>
              <span className="text-[#58E6F2] font-mono">{knowledgeTopic}</span>
            </div>
          )}

          {/* Quick Action Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 border-t border-[#24425C]/60 scrollbar-none">
            <button
              type="button"
              onClick={() => handleQuickPrompt(`What are the key concepts and important points in "${module.title}"?`)}
              className="px-2 py-1 rounded-lg bg-[#142B43] hover:bg-[#10243A] text-[#58E6F2] border border-[#24425C] text-[10px] font-bold whitespace-nowrap transition-colors flex items-center space-x-1"
            >
              <HelpCircle className="w-3 h-3 text-[#27D7E8]" />
              <span>Ask About Video</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt(`Explain the primary concept taught in "${module.title}" step-by-step.`)}
              className="px-2 py-1 rounded-lg bg-[#142B43] hover:bg-[#10243A] text-[#58E6F2] border border-[#24425C] text-[10px] font-bold whitespace-nowrap transition-colors"
            >
              Explain Concept
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt(`Give me a practice problem based on "${module.title}".`)}
              className="px-2 py-1 rounded-lg bg-[#142B43] hover:bg-[#10243A] text-[#58E6F2] border border-[#24425C] text-[10px] font-bold whitespace-nowrap transition-colors"
            >
              Practice Problem
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl p-3.5 text-xs ${
                msg.sender === 'user'
                  ? 'bg-[#27D7E8] text-[#07111F] font-medium rounded-br-none shadow-lg shadow-[#27D7E8]/20'
                  : 'bg-[#10243A] border border-[#24425C] text-slate-200 rounded-bl-none'
              }`}
            >
              <div className="flex items-center justify-between space-x-2 mb-1 text-[10px] opacity-70">
                <div className="flex items-center space-x-1.5">
                  {msg.sender === 'user' ? <User className="w-3 h-3 text-[#07111F]" /> : <Bot className="w-3 h-3 text-[#27D7E8]" />}
                  <span>{msg.sender === 'user' ? 'You' : 'AI Tutor'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
                {msg.sender === 'ai' && (
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    msg.grounding_type === 'VIDEO_GROUNDED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {msg.grounding_type === 'VIDEO_GROUNDED' ? 'VIDEO GROUNDED' : 'GENERAL KNOWLEDGE'}
                  </span>
                )}
              </div>

              <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

              {/* Timestamp Action Button */}
              {msg.timestamp_seconds !== undefined && msg.timestamp_seconds !== null && onTimestampSeek && (
                <div className="mt-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => onTimestampSeek(msg.timestamp_seconds!)}
                    className="px-2.5 py-1 rounded-lg bg-[#27D7E8]/20 text-[#27D7E8] border border-[#27D7E8]/40 hover:bg-[#27D7E8]/30 transition-all font-bold text-[10px] flex items-center space-x-1.5 shadow-sm"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Jump to {msg.timestamp_reference || `${Math.floor(msg.timestamp_seconds / 60)}:${Math.floor(msg.timestamp_seconds % 60).toString().padStart(2, '0')}`}</span>
                  </button>
                </div>
              )}

              {/* Simplified Explanation Box */}
              {msg.simplified_explanation && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[11px] space-y-1">
                  <div className="font-bold flex items-center space-x-1 text-amber-400">
                    <Sparkles className="w-3 h-3" />
                    <span>Simplified Concept Breakdown</span>
                  </div>
                  <p>{msg.simplified_explanation}</p>
                </div>
              )}

              {/* Analogy Box */}
              {msg.analogies && msg.analogies.length > 0 && (
                <div className="mt-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-[11px] space-y-1">
                  <div className="font-bold flex items-center space-x-1 text-purple-400">
                    <Lightbulb className="w-3 h-3" />
                    <span>Intuitive Analogy</span>
                  </div>
                  <p>{msg.analogies[0]}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs italic">
            <Bot className="w-4 h-4 animate-bounce text-[#27D7E8]" />
            <span>AI Tutor is querying video knowledge & tailoring response...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => handleSend(e)} className="p-3 border-t border-[#24425C] bg-[#07111F] rounded-b-2xl flex items-center space-x-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={`Ask about ${module?.title ? `"${module.title}"` : 'this video'}...`}
          className="flex-1 bg-[#10243A] border border-[#24425C] rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#27D7E8]"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="p-2 rounded-xl bg-[#27D7E8] text-[#07111F] hover:bg-[#58E6F2] disabled:opacity-50 transition-colors font-bold"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

