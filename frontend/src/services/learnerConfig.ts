/**
 * CENTRALIZED LEARNER STATE & INTERVENTION CONFIGURATION
 * =======================================================
 * Grounded in multimodal learning analytics and research-aligned temporal modeling.
 * Single source of truth for all perception, state estimation, and intervention thresholds.
 */

export const LEARNER_CONFIG = {
  // 1. Perception & Eye Detection
  EAR_OPEN_RATIO: 0.75,                 // Above 75% of baseline = OPEN
  EAR_PARTIAL_RATIO: 0.55,              // 55% - 75% = PARTIALLY_CLOSED
  NORMAL_BLINK_MIN_MS: 50,              // 50ms - 400ms = NORMAL_BLINK (Neutral weight)
  NORMAL_BLINK_MAX_MS: 400,
  PROLONGED_CLOSURE_MS: 800,            // >800ms = PROLONGED_CLOSURE
  DEFAULT_BASELINE_EAR: 0.28,

  // 2. Gaze & Head Orientation Thresholds
  GAZE_DEVIATION_ANGLE_DEG: 16,         // Degrees offset to trigger approximate gaze deviation
  HEAD_YAW_THRESHOLD_DEG: 18,           // Approximate head turn threshold
  HEAD_PITCH_THRESHOLD_DEG: 18,
  GAZE_BRIEF_FILTER_MS: 2000,           // Glances under 2s filtered out by temporal smoothing
  HEAD_BRIEF_FILTER_MS: 2000,           // Head movements under 2s filtered out

  // 3. Multimodal Attention Fusion Weights (Sum = 1.0)
  WEIGHT_EYE_OPENNESS: 0.35,            // Calibrated EAR & blink normality
  WEIGHT_HEAD_ORIENTATION: 0.25,        // Forward vs deviated orientation
  WEIGHT_FACE_PRESENCE: 0.20,           // Visual detection confirmation
  WEIGHT_INTERACTION: 0.15,             // Active mouse, scroll, keyboard, or quiz input
  WEIGHT_BLINK_RATE: 0.05,              // Blinks per minute normality

  // 4. Temporal Smoothing
  LANDMARK_SMOOTHING_ALPHA: 0.20,       // EMA alpha for 3D landmarks & head pose
  SCORE_SMOOTHING_ALPHA: 0.18,          // EMA alpha for fused engagement score

  // 5. State Hysteresis Thresholds (Dual-threshold to prevent boundary flickering)
  FOCUSED_ENTER_SCORE: 70,              // Score >= 70 = FOCUSED
  FOCUSED_EXIT_SCORE: 55,               // Score drops below 55 to exit FOCUSED
  LOW_ENGAGEMENT_ENTER_SCORE: 45,       // Score < 45 = enters LOW_ENGAGEMENT candidate
  LOW_ENGAGEMENT_EXIT_SCORE: 60,        // Score > 60 = exits LOW_ENGAGEMENT

  // 6. Grace Periods & Durations
  FACE_LOST_GRACE_PERIOD_MS: 3000,      // 3s grace period for brief face occlusion/movement
  FACE_LOST_INACTIVE_MS: 6000,          // 6s without face = INACTIVE
  INACTIVITY_TIMEOUT_MS: 120000,        // 2 minutes without user interaction

  // 7. Escalation & Intervention Hierarchy Timers
  NUDGE_SUSTAINED_DURATION_MS: 8000,    // 8s sustained disengagement -> LEVEL 1: Gentle Nudge
  MICRO_QUIZ_SUSTAINED_DURATION_MS: 15000,// 15s repeated/sustained disengagement -> LEVEL 2: Micro Quiz
  INTERVENTION_COOLDOWN_MS: 30000,      // 30s cooldown before next automatic intervention
  MAX_INTERVENTIONS_PER_10MIN: 3,       // Rate limiting to prevent fatigue

  // 8. Academic State Grounding
  QUIZ_SUPPORT_THRESHOLD: 50,           // Quiz score < 50% -> NEEDS_SUPPORT
  QUIZ_MASTERY_THRESHOLD: 75,           // Quiz score >= 75% -> KNOWLEDGE_OK

  // 9. Yawning Detection (Mouth Aspect Ratio - MAR)
  MAR_OPEN_THRESHOLD: 0.60,             // MAR >= 0.60 indicates wide vertical mouth opening
  MAR_CLOSE_THRESHOLD: 0.35,            // MAR < 0.35 indicates mouth returned to closed/neutral
  YAWN_MIN_SUSTAINED_MS: 1500,          // Must be sustained >= 1.5s to distinguish from speech/smile
  YAWN_MAX_SUSTAINED_MS: 6000,          // Max 6s
  YAWN_COOLDOWN_MS: 5000,               // 5s cooldown between detected yawn events
  FATIGUE_YAWN_WINDOW_MS: 300000,       // 5-minute rolling window for fatigue analysis
  FATIGUE_YAWN_COUNT_THRESHOLD: 2,      // 2+ yawns in window acts as supporting disengagement indicator
};
