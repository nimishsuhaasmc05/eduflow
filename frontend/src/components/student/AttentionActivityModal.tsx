import React, { useState, useEffect, useId } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Shuffle,
  Zap,
  Flame,
  Award,
  BookOpen,
  HelpCircle,
  X
} from 'lucide-react';
import { AttentionActivity } from '../../types';
import { activityApi } from '../../services/api';
import { closedLoopController } from '../../services/closedLoopController';
import { attentionActivityPrefetchService } from '../../services/attentionActivityPrefetchService';

interface AttentionActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  moduleId: number;
  topicTitle: string;
}

export const AttentionActivityModal: React.FC<AttentionActivityModalProps> = ({
  isOpen,
  onClose,
  courseId,
  moduleId,
  topicTitle,
}) => {
  const [activity, setActivity] = useState<AttentionActivity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [completed, setCompleted] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);

  // Spot the Concept state
  const [selectedSpotOption, setSelectedSpotOption] = useState<string | null>(null);

  // Sequence state
  const [sequenceItems, setSequenceItems] = useState<any[]>([]);

  // Match Pairs state
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [shuffledRight, setShuffledRight] = useState<any[]>([]);

  // Identify Mistake state
  const [selectedMistakeOption, setSelectedMistakeOption] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActivity(null);
      setLoading(true);
      setCompleted(false);
      setFeedbackMessage('');
      setIsSuccess(false);
      setSelectedSpotOption(null);
      setSequenceItems([]);
      setSelectedLeft(null);
      setMatchedPairs({});
      setShuffledRight([]);
      setSelectedMistakeOption(null);
      return;
    }

    setStartTime(Date.now());

    // Check prefetch cache first for zero-latency launch
    const cached = attentionActivityPrefetchService.consumeCachedActivity(courseId, moduleId);
    if (cached) {
      initActivity(cached);
      setLoading(false);
      return;
    }

    // Otherwise fetch live from API
    activityApi
      .generateAttentionActivity({
        course_id: courseId,
        module_id: moduleId,
        topic: topicTitle,
      })
      .then((data) => {
        initActivity(data);
      })
      .catch((err) => {
        console.warn('Failed to load activity from API, using client fallback:', err);
        // Fallback activity
        const fallback: AttentionActivity = {
          activity_id: `act_${Date.now()}`,
          activity_type: 'spot_the_concept',
          title: `Quick Challenge: ${topicTitle}`,
          instructions: 'Read the definition and identify the matching core concept.',
          topic: topicTitle,
          duration_seconds: 40,
          payload: {
            prompt: `Which principle transforms input data into verified output while maintaining bounded asymptotic complexity in ${topicTitle}?`,
            options: [
              { id: 'c1', label: 'Deterministic Algorithm', is_correct: true },
              { id: 'c2', label: 'Infinite Recursion', is_correct: false },
              { id: 'c3', label: 'Hardware Thrashing', is_correct: false },
              { id: 'c4', label: 'Unbounded Memory Leak', is_correct: false },
            ],
            explanation: 'Deterministic algorithms guarantee correctness within finite steps and bounded memory.',
          },
          encouragement: 'Great job! Bringing this idea into focus keeps your momentum strong.',
        };
        initActivity(fallback);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, courseId, moduleId, topicTitle]);

  const initActivity = (act: AttentionActivity) => {
    setActivity(act);
    if (act.activity_type === 'sequence_reorder' && act.payload?.items) {
      // Scramble items initially
      const items = [...act.payload.items].sort(() => Math.random() - 0.5);
      setSequenceItems(items);
    } else if (act.activity_type === 'match_pairs' && act.payload?.pairs) {
      const rights = act.payload.pairs.map((p: any) => ({ id: p.id, right: p.right }));
      setShuffledRight(rights.sort(() => Math.random() - 0.5));
    }
  };

  const handleFinish = async (success: boolean, explanation: string) => {
    setIsSuccess(success);
    setCompleted(true);
    setFeedbackMessage(explanation);

    const timeSpent = Math.max(5, Math.round((Date.now() - startTime) / 1000));

    if (activity) {
      try {
        await activityApi.submitAttentionActivity({
          activity_id: activity.activity_id,
          activity_type: activity.activity_type,
          completed: true,
          score_percentage: success ? 100 : 75,
          time_spent_seconds: timeSpent,
          course_id: courseId,
          module_id: moduleId,
        });
      } catch (err) {
        console.warn('Failed to submit attention activity telemetry:', err);
      }
    }

    // Report outcome to closedLoopController to reset escalation and cooldown
    closedLoopController.reportInterventionOutcome({
      quizScore: success ? 100 : 75,
    });
    closedLoopController.resetIneffectiveCounter(courseId, moduleId);
  };

  const handleClose = () => {
    closedLoopController.resetInterventionCooldown();
    closedLoopController.resetIneffectiveCounter(courseId, moduleId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col min-h-[500px] max-h-[90vh]">
        {/* Top Gradient Banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Focus Challenge
                </span>
                <span className="text-xs text-slate-400">30–45s Quick Reset</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {activity?.title || 'Let’s switch it up for a moment'}
              </h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close activity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Preparing quick challenge...</p>
            </div>
          ) : activity ? (
            <>
              {/* Instructions Bar */}
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-200">
                  {activity.instructions}
                </p>
              </div>

              {/* 1. SPOT THE CONCEPT */}
              {activity.activity_type === 'spot_the_concept' && activity.payload && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <p className="text-sm font-medium text-slate-200 leading-relaxed">
                      {activity.payload.prompt}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activity.payload.options?.map((opt: any) => {
                      const isSelected = selectedSpotOption === opt.id;
                      let btnStyle =
                        'border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-indigo-500/40 text-slate-200';
                      if (completed) {
                        if (opt.is_correct) {
                          btnStyle = 'border-emerald-500/80 bg-emerald-950/40 text-emerald-200 shadow-lg shadow-emerald-500/10';
                        } else if (isSelected) {
                          btnStyle = 'border-rose-500/80 bg-rose-950/40 text-rose-200';
                        } else {
                          btnStyle = 'opacity-40 border-slate-800 bg-slate-900 text-slate-400';
                        }
                      } else if (isSelected) {
                        btnStyle = 'border-indigo-500 bg-indigo-950/40 text-white';
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={completed}
                          onClick={() => {
                            setSelectedSpotOption(opt.id);
                            handleFinish(opt.is_correct, activity.payload.explanation);
                          }}
                          className={`p-4 rounded-xl border text-left text-sm font-semibold transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{opt.label}</span>
                          {completed && opt.is_correct && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 ml-2" />
                          )}
                          {completed && isSelected && !opt.is_correct && (
                            <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. SEQUENCE / REORDER */}
              {activity.activity_type === 'sequence_reorder' && activity.payload && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <p className="text-sm font-medium text-slate-200">
                      {activity.payload.prompt}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {sequenceItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          completed
                            ? item.correct_position === idx
                              ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200'
                              : 'border-amber-500/60 bg-amber-950/30 text-amber-200'
                            : 'border-slate-800 bg-slate-800/40 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-700/60 text-slate-300 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium">{item.text}</span>
                        </div>
                        {!completed && (
                          <div className="flex items-center space-x-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => {
                                const newItems = [...sequenceItems];
                                const temp = newItems[idx - 1];
                                newItems[idx - 1] = newItems[idx];
                                newItems[idx] = temp;
                                setSequenceItems(newItems);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              disabled={idx === sequenceItems.length - 1}
                              onClick={() => {
                                const newItems = [...sequenceItems];
                                const temp = newItems[idx + 1];
                                newItems[idx + 1] = newItems[idx];
                                newItems[idx] = temp;
                                setSequenceItems(newItems);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {!completed && (
                    <button
                      onClick={() => {
                        const allCorrect = sequenceItems.every(
                          (it, idx) => it.correct_position === idx
                        );
                        handleFinish(allCorrect, activity.payload.explanation);
                      }}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Check Sequence</span>
                    </button>
                  )}
                </div>
              )}

              {/* 3. MATCH PAIRS */}
              {activity.activity_type === 'match_pairs' && activity.payload && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <p className="text-sm font-medium text-slate-200">
                      {activity.payload.prompt}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Column (Terms) */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-slate-400">Concept / Structure</p>
                      {activity.payload.pairs?.map((p: any) => {
                        const isMatched = !!matchedPairs[p.id];
                        const isSelected = selectedLeft === p.id;
                        return (
                          <button
                            key={p.id}
                            disabled={completed || isMatched}
                            onClick={() => setSelectedLeft(p.id)}
                            className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition ${
                              isMatched
                                ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                                : isSelected
                                ? 'border-indigo-500 bg-indigo-950/40 text-white ring-2 ring-indigo-500/30'
                                : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-200'
                            }`}
                          >
                            {p.left}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Column (Definitions) */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-slate-400">Characteristic / Role</p>
                      {shuffledRight.map((r: any) => {
                        const matchedLeftId = Object.keys(matchedPairs).find((k) => matchedPairs[k] === r.id);
                        const isMatched = !!matchedLeftId;
                        return (
                          <button
                            key={r.id}
                            disabled={completed || isMatched || !selectedLeft}
                            onClick={() => {
                              if (selectedLeft) {
                                const newMatches = { ...matchedPairs, [selectedLeft]: r.id };
                                setMatchedPairs(newMatches);
                                setSelectedLeft(null);

                                if (Object.keys(newMatches).length === activity.payload.pairs.length) {
                                  const allCorrect = Object.entries(newMatches).every(([k, v]) => k === v);
                                  handleFinish(allCorrect, activity.payload.explanation);
                                }
                              }
                            }}
                            className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition ${
                              isMatched
                                ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                                : selectedLeft
                                ? 'border-indigo-500/40 bg-slate-800/60 hover:bg-indigo-950/40 text-slate-200 cursor-pointer'
                                : 'border-slate-800 bg-slate-800/20 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {r.right}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. IDENTIFY THE MISTAKE */}
              {activity.activity_type === 'identify_mistake' && activity.payload && (
                <div className="space-y-4">
                  {activity.payload.snippet && (
                    <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto whitespace-pre leading-relaxed">
                      {activity.payload.snippet}
                    </pre>
                  )}
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <p className="text-sm font-medium text-slate-200">
                      {activity.payload.prompt}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {activity.payload.options?.map((opt: any) => {
                      const isSelected = selectedMistakeOption === opt.id;
                      let btnStyle =
                        'border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-indigo-500/40 text-slate-200';
                      if (completed) {
                        if (opt.is_correct) {
                          btnStyle = 'border-emerald-500/80 bg-emerald-950/40 text-emerald-200 shadow-lg shadow-emerald-500/10';
                        } else if (isSelected) {
                          btnStyle = 'border-rose-500/80 bg-rose-950/40 text-rose-200';
                        } else {
                          btnStyle = 'opacity-40 border-slate-800 bg-slate-900 text-slate-400';
                        }
                      } else if (isSelected) {
                        btnStyle = 'border-indigo-500 bg-indigo-950/40 text-white';
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={completed}
                          onClick={() => {
                            setSelectedMistakeOption(opt.id);
                            handleFinish(opt.is_correct, activity.payload.explanation);
                          }}
                          className={`w-full p-3.5 rounded-xl border text-left text-sm font-medium transition flex items-start justify-between ${btnStyle}`}
                        >
                          <span className="flex-1 pr-2">{opt.text}</span>
                          {completed && opt.is_correct && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          )}
                          {completed && isSelected && !opt.is_correct && (
                            <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completion Feedback Card */}
              {completed && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 animate-fade-in">
                  <div className="flex items-center space-x-2 text-sm font-bold text-white">
                    {isSuccess ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400">Great Focus! +30 XP</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <span className="text-indigo-300">Concept Review Completed +10 XP</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {feedbackMessage || activity.encouragement}
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {completed ? 'Ready to resume video' : 'Interactive attention reset'}
          </span>
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition flex items-center space-x-2"
          >
            <span>{completed ? 'Continue Learning' : 'Skip to Lesson'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
