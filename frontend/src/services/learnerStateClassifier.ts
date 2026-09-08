import { AffectiveMetrics } from '../types';
import { EyeDebugInfo } from './attentionMonitor';

/**
 * APPLICATION LEARNER STATES
 * Grounded in temporal observation & multimodal affective computing:
 * - FOCUSED: Sustained high attention (>= 68%), gaze on-screen, normal blinks
 * - ENGAGED: Normal learning engagement (48% - 67%), periodic natural glances
 * - LOW_ENGAGEMENT: Persistent disengagement (< 45% for >= 5s) confirmed by multiple signals
 * - INSUFFICIENT_DATA: Startup grace period, calibration, or sparse tracking
 */
export type ApplicationLearnerState = 'FOCUSED' | 'ENGAGED' | 'LOW_ENGAGEMENT' | 'INSUFFICIENT_DATA';

// Extended states for backward-compatible consumers while maintaining honest mapping
export type LearnerState = 'FOCUSED' | 'ENGAGED' | 'LOW_ENGAGEMENT' | 'INSUFFICIENT_DATA' | 'NEEDS_SUPPORT' | 'DISTRACTED' | 'INACTIVE';
export type EngagementState = 'FOCUSED' | 'ENGAGED' | 'LOW_ENGAGEMENT' | 'INSUFFICIENT_DATA' | 'FACE_NOT_DETECTED' | 'INACTIVE';
export type OffTaskLikelihood = 'LOW' | 'MEDIUM' | 'HIGH';
export type AcademicKnowledgeState = 'KNOWLEDGE_OK' | 'NEEDS_SUPPORT' | 'CONFUSION_ESTIMATE' | 'WEAK_TOPIC';

export interface SignalObservation {
  timestamp: number;
  attention: number;          // 0.0 to 1.0
  ear: number;
  eyeState: string;
  isNormalBlink: boolean;
  isProlongedClosure: boolean;
  gazeAway: boolean;
  headTurned: boolean;
  faceDetected: boolean;
  mar: number;
  interactionGapMs: number;
}

export interface LearnerContextState {
  engagementScore: number;                // 0 - 100 (smoothed temporal average)
  engagementState: EngagementState;
  applicationState: ApplicationLearnerState;
  offTaskLikelihood: OffTaskLikelihood;
  offTaskDurationMs: number;
  offTaskDescription: string;
  yawnCount: number;
  recentYawnCount: number;
  isFatigueSignal: boolean;
  observationCount: number;
  sufficientData: boolean;
  knowledgeState: AcademicKnowledgeState;
  recentQuizScore: number | null;
  weakTopics: string[];
}

export interface LearnerStateInfo {
  state: LearnerState;
  context: LearnerContextState;
  confidence: number;
  since: number;
  durationMs: number;
  previousState: LearnerState;
  transitionCount: number;
  description: string;
}

const CONFIG = {
  STARTUP_GRACE_PERIOD_MS: 15000,      // 15 seconds lesson startup grace
  ROLLING_WINDOW_MS: 5000,             // 5 seconds rolling temporal window
  MIN_OBSERVATIONS_FOR_DECISION: 30,   // At least 30 valid frames (~1-2s at 30fps)
  MIN_FACE_PRESENCE_RATIO: 0.50,       // Must have face in >= 50% of window
  FOCUSED_THRESHOLD: 0.68,             // 68%+ = FOCUSED
  ENGAGED_THRESHOLD: 0.48,             // 48%-67% = ENGAGED
  LOW_ENGAGEMENT_THRESHOLD: 0.45,      // < 45% = candidate LOW_ENGAGEMENT
  SUSTAINED_LOW_MS: 5000,              // Must persist 5 full seconds in rolling buffer
  HOLD_STATE_MS: 2500,                 // 2.5s hold before committing discrete state change
  INACTIVE_TIMEOUT_MS: 120000,         // 2 min no interaction + no face = INACTIVE
  FACE_LOSS_TIMEOUT_MS: 6000,          // 6s continuous face loss = INACTIVE
};

export class LearnerStateClassifier {
  private sessionStartTime: number = performance.now();
  private observationBuffer: SignalObservation[] = [];
  
  // States
  private currentAppLearnerState: ApplicationLearnerState = 'INSUFFICIENT_DATA';
  private previousAppLearnerState: ApplicationLearnerState = 'INSUFFICIENT_DATA';
  private stateStartTime: number = performance.now();
  private transitionCount: number = 0;

  // Candidate temporal hold
  private candidateState: ApplicationLearnerState | null = null;
  private candidateStartTime: number = 0;

  // Off-task persistent tracking
  private lowEngagementStartTime: number | null = null;
  private offTaskDurationMs: number = 0;
  private offTaskLikelihood: OffTaskLikelihood = 'LOW';

  // Interaction tracking
  private lastInteractionTime: number = performance.now();
  private lastFaceDetectedTime: number = performance.now();

  // Academic / Cognitive Layer
  private currentKnowledgeState: AcademicKnowledgeState = 'KNOWLEDGE_OK';
  private recentQuizScore: number | null = null;
  private weakTopics: string[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const onUserInteraction = () => {
        this.lastInteractionTime = performance.now();
      };
      window.addEventListener('click', onUserInteraction, { passive: true });
      window.addEventListener('keypress', onUserInteraction, { passive: true });
      window.addEventListener('scroll', onUserInteraction, { passive: true });
      window.addEventListener('mousemove', onUserInteraction, { passive: true });
    }
  }

  public resetSession(courseId?: number, moduleId?: number): void {
    this.sessionStartTime = performance.now();
    this.observationBuffer = [];
    this.currentAppLearnerState = 'INSUFFICIENT_DATA';
    this.previousAppLearnerState = 'INSUFFICIENT_DATA';
    this.stateStartTime = performance.now();
    this.candidateState = null;
    this.lowEngagementStartTime = null;
    this.offTaskDurationMs = 0;
    this.offTaskLikelihood = 'LOW';
    this.lastInteractionTime = performance.now();
    this.lastFaceDetectedTime = performance.now();
  }

  public resetObservationTimer(): void {
    this.lowEngagementStartTime = null;
    this.offTaskDurationMs = 0;
    this.candidateState = null;
    // Clear recent negative observations to enforce a fresh post-intervention observation window
    const now = performance.now();
    this.observationBuffer = this.observationBuffer.filter(o => now - o.timestamp < 1000);
  }

  public setRecentQuizScore(score: number, weakTopic?: string): void {
    this.recentQuizScore = score;
    if (weakTopic && !this.weakTopics.includes(weakTopic)) {
      this.weakTopics.push(weakTopic);
    }
    if (score < 50) {
      this.currentKnowledgeState = 'NEEDS_SUPPORT';
    } else {
      this.currentKnowledgeState = 'KNOWLEDGE_OK';
    }
  }

  public recordExplanationRequest(topic?: string): void {
    this.currentKnowledgeState = 'NEEDS_SUPPORT';
    if (topic && !this.weakTopics.includes(topic)) {
      this.weakTopics.push(topic);
    }
  }

  public getCurrentState(): ApplicationLearnerState {
    return this.currentAppLearnerState;
  }

  /**
   * Main temporal classification pipeline called with extracted features.
   */
  public classify(
    metrics: AffectiveMetrics,
    eyeDebug: EyeDebugInfo,
    faceDetected: boolean,
    gazeDirection: string = 'CENTER',
    headPoseYaw: number = 0,
    headPosePitch: number = 0
  ): LearnerStateInfo {
    const now = performance.now();

    if (faceDetected) {
      this.lastFaceDetectedTime = now;
    }

    const faceLostMs = faceDetected ? 0 : (now - this.lastFaceDetectedTime);
    const interactionGapMs = now - this.lastInteractionTime;

    // Normal blink vs prolonged closure
    const isNormalBlink = eyeDebug.blinkStatus === 'NORMAL' || (eyeDebug.closureDurationMs > 40 && eyeDebug.closureDurationMs < 400);
    const isProlongedClosure = eyeDebug.closureDurationMs >= 750 || eyeDebug.eyeState === 'PROLONGED_CLOSURE';
    const isGazeAway = gazeDirection !== 'CENTER';
    const isHeadTurned = Math.abs(headPoseYaw) > 20 || Math.abs(headPosePitch) > 20;

    // Instantaneous attention normalized, but protecting normal blinks from unfair penalty
    let instantAttention = metrics.attention;
    if (isNormalBlink && instantAttention < 0.50) {
      // Normal human blink: retain neutral engagement during the 150ms blink
      instantAttention = Math.max(instantAttention, 0.65);
    }

    // 1. PUSH INTO ROLLING BUFFER
    this.observationBuffer.push({
      timestamp: now,
      attention: instantAttention,
      ear: eyeDebug.avgEAR || 0.28,
      eyeState: eyeDebug.eyeState,
      isNormalBlink,
      isProlongedClosure,
      gazeAway: isGazeAway,
      headTurned: isHeadTurned,
      faceDetected,
      mar: eyeDebug.mar || 0.15,
      interactionGapMs,
    });

    // 2. PRUNE BUFFER (Keep only last ROLLING_WINDOW_MS)
    const windowCutoff = now - CONFIG.ROLLING_WINDOW_MS;
    while (this.observationBuffer.length > 0 && this.observationBuffer[0].timestamp < windowCutoff) {
      this.observationBuffer.shift();
    }

    // 3. CHECK FOR STARTUP GRACE & DATA SUFFICIENCY
    const sessionAgeMs = now - this.sessionStartTime;
    const isStartupGrace = sessionAgeMs < CONFIG.STARTUP_GRACE_PERIOD_MS;
    const observationCount = this.observationBuffer.length;
    const facePresentCount = this.observationBuffer.filter(o => o.faceDetected).length;
    const facePresenceRatio = observationCount > 0 ? (facePresentCount / observationCount) : 0;
    const sufficientData = !isStartupGrace && (observationCount >= CONFIG.MIN_OBSERVATIONS_FOR_DECISION) && (facePresenceRatio >= CONFIG.MIN_FACE_PRESENCE_RATIO);

    // 4. CALCULATE ROLLING AGGREGATES
    let avgAttention = 0.55;
    let prolongedClosureCount = 0;
    let gazeAwayCount = 0;
    let headTurnedCount = 0;

    if (observationCount > 0) {
      const sumAtt = this.observationBuffer.reduce((acc, o) => acc + o.attention, 0);
      avgAttention = sumAtt / observationCount;
      prolongedClosureCount = this.observationBuffer.filter(o => o.isProlongedClosure).length;
      gazeAwayCount = this.observationBuffer.filter(o => o.gazeAway).length;
      headTurnedCount = this.observationBuffer.filter(o => o.headTurned).length;
    }

    const smoothedScore = Math.round(avgAttention * 100);

    // 5. EVALUATE APPLICATION STATE CANDIDATE
    let candidateState: ApplicationLearnerState;
    let confidence = 0.5;

    if (!sufficientData) {
      candidateState = 'INSUFFICIENT_DATA';
      confidence = Math.min(0.85, sessionAgeMs / CONFIG.STARTUP_GRACE_PERIOD_MS);
      this.lowEngagementStartTime = null;
      this.offTaskDurationMs = 0;
      this.offTaskLikelihood = 'LOW';
    } else if (faceLostMs > CONFIG.FACE_LOSS_TIMEOUT_MS || interactionGapMs > CONFIG.INACTIVE_TIMEOUT_MS) {
      candidateState = 'LOW_ENGAGEMENT';
      confidence = 0.90;
      this.offTaskLikelihood = 'HIGH';
    } else {
      // Evaluate multi-signal evidence over the rolling window
      const isMultiSignalDisengagement = (
        (avgAttention < CONFIG.LOW_ENGAGEMENT_THRESHOLD) &&
        (prolongedClosureCount >= 5 || gazeAwayCount >= (observationCount * 0.45) || headTurnedCount >= (observationCount * 0.45) || interactionGapMs > 25000)
      );

      if (isMultiSignalDisengagement) {
        if (!this.lowEngagementStartTime) {
          this.lowEngagementStartTime = now;
        }
        this.offTaskDurationMs = now - this.lowEngagementStartTime;

        if (this.offTaskDurationMs >= CONFIG.SUSTAINED_LOW_MS) {
          candidateState = 'LOW_ENGAGEMENT';
          this.offTaskLikelihood = 'HIGH';
          confidence = 0.82;
        } else {
          // Still in the observation window before confirming low engagement
          candidateState = this.currentAppLearnerState === 'LOW_ENGAGEMENT' ? 'LOW_ENGAGEMENT' : 'ENGAGED';
          this.offTaskLikelihood = 'MEDIUM';
          confidence = 0.65;
        }
      } else {
        // Clear low engagement timers upon clear on-screen engagement
        this.lowEngagementStartTime = null;
        this.offTaskDurationMs = 0;
        this.offTaskLikelihood = 'LOW';

        if (avgAttention >= CONFIG.FOCUSED_THRESHOLD) {
          candidateState = 'FOCUSED';
          confidence = 0.85;
        } else {
          candidateState = 'ENGAGED';
          confidence = 0.75;
        }
      }
    }

    // 6. APPLY TEMPORAL HYSTERESIS (Prevent rapid flickering)
    if (candidateState !== this.currentAppLearnerState) {
      if (this.candidateState === candidateState) {
        if (now - this.candidateStartTime >= CONFIG.HOLD_STATE_MS) {
          this.previousAppLearnerState = this.currentAppLearnerState;
          this.currentAppLearnerState = candidateState;
          this.stateStartTime = now;
          this.transitionCount++;
          this.candidateState = null;

          if (typeof window !== 'undefined') {
            console.log(`[EduFlow State] state=${candidateState} confidence=${confidence.toFixed(2)} window=${observationCount}frames reason=${this.offTaskLikelihood}`);
            window.dispatchEvent(new CustomEvent('learnerstate:changed', {
              detail: {
                previousState: this.previousAppLearnerState,
                newState: this.currentAppLearnerState,
                timestamp: now,
                confidence,
              }
            }));
          }
        }
      } else {
        this.candidateState = candidateState;
        this.candidateStartTime = now;
      }
    } else {
      this.candidateState = null;
    }

    const durationMs = now - this.stateStartTime;
    const yawnCount = eyeDebug.yawnCount || 0;
    const recentYawnCount = eyeDebug.recentYawnCount || 0;
    const isFatigueSignal = recentYawnCount >= 2 && (gazeAwayCount > 5 || interactionGapMs > 20000);

    const offTaskDescription = candidateState === 'INSUFFICIENT_DATA'
      ? (isStartupGrace ? 'Lesson startup grace period active.' : 'Collecting baseline telemetry...')
      : this.offTaskLikelihood === 'HIGH'
      ? `Persistent low engagement observed (${Math.round(this.offTaskDurationMs / 1000)}s sustained).`
      : isFatigueSignal
      ? 'Mild fatigue indicators observed.'
      : 'Learner is oriented toward learning content.';

    // Map to downstream legacy compatibility format
    const context: LearnerContextState = {
      engagementScore: smoothedScore,
      engagementState: this.currentAppLearnerState as EngagementState,
      applicationState: this.currentAppLearnerState,
      offTaskLikelihood: this.offTaskLikelihood,
      offTaskDurationMs: this.offTaskDurationMs,
      offTaskDescription,
      yawnCount,
      recentYawnCount,
      isFatigueSignal,
      observationCount,
      sufficientData: observationCount >= 15 && !isStartupGrace,
      knowledgeState: this.currentKnowledgeState,
      recentQuizScore: this.recentQuizScore,
      weakTopics: [...this.weakTopics],
    };

    const descriptions: Record<ApplicationLearnerState, string> = {
      FOCUSED: 'Learner shows sustained high attention and active focus.',
      ENGAGED: 'Learner is actively following along with natural glances.',
      LOW_ENGAGEMENT: 'Persistent low engagement indicators observed.',
      INSUFFICIENT_DATA: isStartupGrace ? 'Lesson startup grace period active.' : 'Gathering sufficient perceptual frames...',
    };

    return {
      state: this.currentAppLearnerState,
      context,
      confidence,
      since: this.stateStartTime,
      durationMs: Math.round(now - this.stateStartTime),
      previousState: this.previousAppLearnerState,
      transitionCount: this.transitionCount,
      description: descriptions[this.currentAppLearnerState] || 'Monitoring learner state.',
    };
  }

  public getContext(): LearnerContextState {
    return {
      engagementScore: 100,
      engagementState: this.currentAppLearnerState as EngagementState,
      applicationState: this.currentAppLearnerState,
      offTaskLikelihood: this.offTaskLikelihood,
      offTaskDurationMs: this.offTaskDurationMs,
      offTaskDescription: '',
      yawnCount: 0,
      recentYawnCount: 0,
      isFatigueSignal: false,
      observationCount: this.observationBuffer.length,
      sufficientData: this.observationBuffer.length >= 15,
      knowledgeState: this.currentKnowledgeState,
      recentQuizScore: this.recentQuizScore,
      weakTopics: [...this.weakTopics],
    };
  }

  public getSessionSummary() {
    const totalMs = Math.round(performance.now() - this.sessionStartTime) || 1;
    return {
      totalMs,
      transitionCount: this.transitionCount,
      currentState: this.currentAppLearnerState,
    };
  }
}

export const learnerStateClassifier = new LearnerStateClassifier();
