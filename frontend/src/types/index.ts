export type Role = 'student' | 'teacher' | 'admin';

export type WebcamStatus = 'OFFLINE' | 'INITIALIZING' | 'CONNECTED' | 'PERMISSION_DENIED' | 'INSECURE_CONTEXT' | 'ERROR';

export type GazeDirection = 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
export type AttentionStatus = 'Focused' | 'Looking Away' | 'No Face Detected';

export interface HeadPose {
  yaw: number;   // Degrees
  pitch: number; // Degrees
  roll: number;  // Degrees
}

export interface AttentionMetrics {
  isFaceDetected: boolean;
  gazeDirection: GazeDirection;
  blinkRateBPM: number | string;
  ear: number;
  headPose: HeadPose;
  attentionScore: number; // 0 to 100
  status: AttentionStatus;
  fps: number;
  calibrationState?: 'CALIBRATING' | 'READY' | 'NO_FACE';
}

export interface FacialPoint {
  x: number;
  y: number;
  z?: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  learning_style: string;
  cognitive_pace: string;
  total_xp: number;
  streak_days: number;
  avg_attention_score: number;
  avatar_url?: string;
}

export interface Module {
  id?: number;
  course_id?: number;
  title: string;
  description?: string;
  order: number;
  duration_minutes: number;
  video_url: string;
  source_type?: 'url' | 'uploaded_file' | string;
  transcript: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  thumbnail_url: string;
  status?: string;
  learning_objectives?: string;
  duration_hours?: number;
  rating?: number;
  teacher_id: number;
  is_premium?: boolean;
  is_enrolled?: boolean;
  modules: Module[];
}

export interface AffectiveMetrics {
  attention: number;     // 0.0 to 1.0
  confusion: number;     // 0.0 to 1.0
  boredom: number;       // 0.0 to 1.0
  engagement: number;    // 0.0 to 1.0
  distraction: number;   // 0.0 to 1.0
  cognitive_load: number;// 0.0 to 1.0
  primary_state: 'ENGAGED' | 'CONFUSION' | 'DISTRACTION' | 'BOREDOM' | 'HIGH_COGNITIVE_LOAD';
  fps: number;
}

export interface ClosedLoopIntervention {
  action_required: boolean;
  intervention_type: 'NONE' | 'SIMPLIFY_EXPLANATION' | 'INTERACTIVE_QUIZ' | 'MICRO_QUIZ' | 'TARGETED_QUIZ' | 'FOCUS_NUDGE' | 'TAKE_BREAK' | 'PACING_FASTER_OR_STORY' | 'POSITIVE_REINFORCEMENT' | 'GENTLE_PROMPT' | string;
  message: string;
  suggested_content?: string;
  adaptive_quiz_id?: number;
}

export interface AITutorMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  simplified_explanation?: string;
  analogies?: string[];
  mermaid_diagram?: string;
  timestamp: string;
  grounding_type?: 'VIDEO_GROUNDED' | 'GENERAL_KNOWLEDGE' | 'UNGROUNDED';
  timestamp_reference?: string;
  timestamp_seconds?: number;
}

export interface SystemMetrics {
  total_users: number;
  active_students: number;
  active_teachers: number;
  total_courses: number;
  telemetry_events_processed: number;
  ai_tokens_consumed: number;
  system_health: string;
}

export type AttentionActivityType = 'spot_the_concept' | 'sequence_reorder' | 'match_pairs' | 'identify_mistake';

export interface SpotConceptOption {
  id: string;
  label: string;
  is_correct: boolean;
}

export interface SpotConceptPayload {
  prompt: string;
  options: SpotConceptOption[];
  explanation: string;
}

export interface SequenceItem {
  id: string;
  text: string;
  correct_position: number;
}

export interface SequencePayload {
  prompt: string;
  items: SequenceItem[];
  explanation: string;
}

export interface MatchPair {
  id: string;
  left: string;
  right: string;
}

export interface MatchPairsPayload {
  prompt: string;
  pairs: MatchPair[];
  explanation: string;
}

export interface IdentifyMistakeOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface IdentifyMistakePayload {
  snippet: string;
  prompt: string;
  options: IdentifyMistakeOption[];
  explanation: string;
}

export interface AttentionActivity {
  activity_id: string;
  activity_type: AttentionActivityType;
  title: string;
  instructions: string;
  topic: string;
  duration_seconds: number;
  payload: SpotConceptPayload | SequencePayload | MatchPairsPayload | IdentifyMistakePayload | any;
  encouragement: string;
}

