import { AffectiveMetrics, ClosedLoopIntervention } from '../types';
import { affectiveApi } from './api';
import { learnerStateClassifier, LearnerState, LearnerContextState } from './learnerStateClassifier';
import { attentionMonitor } from './attentionMonitor';
import { api } from './api';

export type InterventionListener = (intervention: ClosedLoopIntervention) => void;

export interface LastInterventionRecord {
  interventionId: string;
  type: string;
  triggerReason: string;
  triggerScore: number;
  triggerTimestamp: number;
  resolved: boolean;
}

/**
 * CLOSED-LOOP CONTROLLER
 * ======================
 * Orchestrates the full DETECT → UNDERSTAND → DECIDE → INTERVENE → MEASURE cycle.
 * 
 * Guarantees:
 *   - No duplicate intervention while active intervention is pending
 *   - 60-second minimum cooldown to prevent spam
 *   - Preserves historical trigger context separate from live current attention
 */
export class ClosedLoopController {
  private listeners: InterventionListener[] = [];
  private lastTriggerTime: number = 0;
  private minTriggerIntervalMs: number = 60000; // 60 seconds cooldown between interventions
  private lastTelemetryTime: number = 0;
  private minTelemetryIntervalMs: number = 3000; // Throttle telemetry DB writes to max 1 per 3 seconds

  // Active intervention tracking for outcome measurement
  private activeInterventionId: string | null = null;
  private activeInterventionTime: number = 0;
  private outcomeTimerId: ReturnType<typeof setTimeout> | null = null;

  // Historical record of most recent intervention (for explainable UI)
  private lastInterventionRecord: LastInterventionRecord | null = null;
  // Track consecutive ineffective quiz interventions (persisted across mounts/refreshes)
  private consecutiveIneffectiveQuizzes: number = 0;
  private currentCourseId: number = 1;
  private currentModuleId: number = 1;

  private getStorageKey(courseId?: number, moduleId?: number): string {
    const c = courseId ?? this.currentCourseId;
    const m = moduleId ?? this.currentModuleId;
    return `eduflow_ineffective_interventions_c${c}_m${m}`;
  }

  public getIneffectiveQuizCount(courseId?: number, moduleId?: number): number {
    try {
      const key = this.getStorageKey(courseId, moduleId);
      const val = localStorage.getItem(key);
      if (val !== null) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {}
    return this.consecutiveIneffectiveQuizzes;
  }

  public setIneffectiveQuizCount(count: number, courseId?: number, moduleId?: number) {
    this.consecutiveIneffectiveQuizzes = count;
    try {
      const key = this.getStorageKey(courseId, moduleId);
      localStorage.setItem(key, String(count));
    } catch {}
  }

  public resetIneffectiveCounter(courseId?: number, moduleId?: number) {
    this.setIneffectiveQuizCount(0, courseId, moduleId);
  }

  public subscribe(listener: InterventionListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public async evaluateMetrics(
    courseId: number,
    moduleId: number,
    videoTimestamp: number,
    metrics: AffectiveMetrics
  ) {
    const now = Date.now();

    this.currentCourseId = courseId;
    this.currentModuleId = moduleId;

    // Fetch live perceptual debug info
    const debug = attentionMonitor.getDebugInfo();
    const isFaceDetected = debug.attentionScore > 0 || debug.eyeState !== 'OPEN';
    const headPose = attentionMonitor.getSmoothedPose ? attentionMonitor.getSmoothedPose() : { yaw: 0, pitch: 0, roll: 0 };
    const gazeDirection = attentionMonitor.getGazeDirection ? attentionMonitor.getGazeDirection() : 'CENTER';

    // Classify learner state with 3-Layer Decoupled Architecture
    const stateInfo = learnerStateClassifier.classify(
      metrics,
      debug,
      isFaceDetected,
      gazeDirection,
      headPose.yaw,
      headPose.pitch
    );

    // Throttle HTTP POST calls unless 3 seconds passed
    if (now - this.lastTelemetryTime < this.minTelemetryIntervalMs) {
      return;
    }

    this.lastTelemetryTime = now;

    // Do NOT trigger new intervention if one is already active or in cooldown
    if (this.activeInterventionId) {
      return;
    }

    try {
      // Send telemetry payload to backend with decoupled learner context
      const intervention = await affectiveApi.sendTelemetry({
        course_id: courseId,
        module_id: moduleId,
        timestamp_seconds: videoTimestamp,
        attention: metrics.attention,
        confusion: metrics.confusion,
        boredom: metrics.boredom,
        engagement: metrics.engagement,
        distraction: metrics.distraction,
        cognitive_load: metrics.cognitive_load,
        learner_state: stateInfo.state,
        eye_state: debug.eyeState,
        blink_count: debug.blinkCount,
        recent_quiz_score: stateInfo.context.recentQuizScore ?? undefined,
      });

      if (intervention.action_required && (now - this.lastTriggerTime > this.minTriggerIntervalMs)) {
        this.lastTriggerTime = now;

        const ineffectiveCount = this.getIneffectiveQuizCount(courseId, moduleId);
        const shouldEscalateToActivity = ineffectiveCount >= 3;

        let itype = intervention.intervention_type || 'MICRO_QUIZ';
        let msg = intervention.message;
        if (shouldEscalateToActivity) {
          itype = 'ATTENTION_ACTIVITY';
          msg = "Let's switch it up for a moment. Ready for a quick focus challenge to bring this idea into focus?";
          intervention.intervention_type = itype;
          intervention.message = msg;
        }

        const interventionId = (intervention as any).intervention_id || `INT-${Date.now().toString().slice(-6)}`;
        this.activeInterventionId = interventionId;
        this.activeInterventionTime = now;

        // Record historical trigger context
        this.lastInterventionRecord = {
          interventionId,
          type: itype,
          triggerReason: shouldEscalateToActivity
            ? 'Level 2 Escalation (3 Ineffective Quizzes)'
            : stateInfo.context.offTaskLikelihood === 'HIGH'
            ? 'Sustained Off-Task Behaviour'
            : stateInfo.context.knowledgeState === 'NEEDS_SUPPORT'
            ? 'Academic Knowledge Support'
            : 'Low Engagement',
          triggerScore: Math.round(metrics.attention * 100),
          triggerTimestamp: now,
          resolved: false,
        };

        // Schedule automatic outcome report after 60 seconds
        this.scheduleOutcomeReport(60000);

        // Dispatch via custom event for LearningPlayer
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('eduflow:intervention', {
            detail: {
              ...intervention,
              intervention_id: interventionId,
              timestamp: now,
              triggerScore: Math.round(metrics.attention * 100),
            }
          }));
        }

        this.notify(intervention);
      }
    } catch (err) {
      // Fallback: only trigger local intervention if sustained disengagement confirmed and cooldown met
      if (
        stateInfo.context.offTaskLikelihood === 'HIGH' &&
        stateInfo.context.offTaskDurationMs >= 5000 &&
        (now - this.lastTriggerTime > this.minTriggerIntervalMs) &&
        !this.activeInterventionId
      ) {
        this.lastTriggerTime = now;
        const interventionId = `INT-LOC-${Date.now().toString().slice(-6)}`;
        this.activeInterventionId = interventionId;

        const isAttentionActivity = this.consecutiveIneffectiveQuizzes >= 3;
        const itype = isAttentionActivity ? 'ATTENTION_ACTIVITY' : 'MICRO_QUIZ';

        this.lastInterventionRecord = {
          interventionId,
          type: itype,
          triggerReason: isAttentionActivity ? 'Level 2 Escalation (3 Ineffective Quizzes)' : 'Sustained Off-Task Behaviour (5s+)',
          triggerScore: Math.round(metrics.attention * 100),
          triggerTimestamp: now,
          resolved: false,
        };

        const msg = isAttentionActivity
          ? "Let's switch it up for a moment. Ready for a quick focus challenge?"
          : 'Sustained off-task indicators observed. A quick interactive quiz can help re-engage!';

        this.notify({
          action_required: true,
          intervention_type: itype,
          message: msg,
          suggested_content: undefined
        });
      }
    }
  }

  /**
   * Report intervention outcome to backend (MEASURE phase).
   */
  public async reportInterventionOutcome(options?: {
    quizScore?: number;
    dismissed?: boolean;
  }) {
    if (!this.activeInterventionId) {
      // Even if no active intervention, reset observation timers to avoid instant re-trigger
      learnerStateClassifier.resetObservationTimer();
      this.lastTriggerTime = Date.now();
      return;
    }

    const interventionId = this.activeInterventionId;
    const lastType = this.lastInterventionRecord?.type || '';
    this.activeInterventionId = null;
    this.lastTriggerTime = Date.now(); // Start 60s cooldown immediately

    // Reset temporal observation state so noisy frames right after dismissal don't re-trigger
    learnerStateClassifier.resetObservationTimer();

    if (this.outcomeTimerId) {
      clearTimeout(this.outcomeTimerId);
      this.outcomeTimerId = null;
    }

    if (this.lastInterventionRecord && this.lastInterventionRecord.interventionId === interventionId) {
      this.lastInterventionRecord.resolved = true;
    }

    const debug = attentionMonitor.getDebugInfo();
    const currentState = learnerStateClassifier.getCurrentState();
    const postAtt = Math.max(0, Math.min(1, debug.attentionScore / 100));

    // Track ineffective interventions based on quiz performance and post-intervention engagement
    if (lastType === 'ATTENTION_ACTIVITY') {
      // Completed Attention Activity: reset escalation counter
      this.resetIneffectiveCounter();
    } else if (lastType.includes('QUIZ')) {
      const isQuizPoor = options?.quizScore !== undefined && options.quizScore !== null && options.quizScore < 50;
      const isQuizPassed = options?.quizScore !== undefined && options.quizScore !== null && options.quizScore >= 50;

      if (isQuizPoor || options?.dismissed) {
        const nextCount = this.getIneffectiveQuizCount() + 1;
        this.setIneffectiveQuizCount(nextCount);
      } else if (isQuizPassed) {
        this.resetIneffectiveCounter();
      }
    }

    try {
      await api.post('/affective/intervention-outcome', {
        intervention_id: interventionId,
        post_attention: postAtt,
        post_confusion: 0.15,
        post_state: currentState,
        post_engagement: Math.max(0, Math.min(1, (debug.attentionScore / 100) * 0.9)),
        quiz_score: options?.quizScore ?? null,
      });
    } catch (err) {
      console.warn('[ClosedLoop] Failed to report intervention outcome:', err);
    }
  }

  /**
   * Manually enforce/refresh cooldown (e.g. when learner dismisses quiz or completes activity)
   */
  public resetInterventionCooldown() {
    this.lastTriggerTime = Date.now();
    this.activeInterventionId = null;
    if (this.outcomeTimerId) {
      clearTimeout(this.outcomeTimerId);
      this.outcomeTimerId = null;
    }
    learnerStateClassifier.resetObservationTimer();
  }

  private scheduleOutcomeReport(delayMs: number) {
    if (this.outcomeTimerId) {
      clearTimeout(this.outcomeTimerId);
    }
    this.outcomeTimerId = setTimeout(() => {
      this.reportInterventionOutcome();
    }, delayMs);
  }

  public getActiveInterventionId(): string | null {
    return this.activeInterventionId;
  }

  public getLastInterventionRecord(): LastInterventionRecord | null {
    return this.lastInterventionRecord;
  }

  private notify(intervention: ClosedLoopIntervention) {
    this.listeners.forEach((listener) => listener(intervention));
  }
}

export const closedLoopController = new ClosedLoopController();
