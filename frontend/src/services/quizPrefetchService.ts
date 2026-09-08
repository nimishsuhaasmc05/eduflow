import { quizApi } from './api';

export interface PreloadedQuizData {
  quiz_id: number;
  title: string;
  topic: string;
  questions: any[];
  timestamp: number;
}

// Compute a stable deterministic string hash from question text
export function computeClientQuestionHash(questionText: string, topic?: string): string {
  const norm = `${(topic || '').trim().toLowerCase()}_${(questionText || '').trim().toLowerCase().replace(/\s+/g, ' ')}`;
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    const char = norm.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `q_${Math.abs(hash).toString(16)}`;
}

const _LOCAL_STORAGE_PREFIX = 'eduflow_seen_quiz_questions_';
const _SESSION_COUNT_PREFIX = 'eduflow_quiz_session_index_';

// In-memory cache isolated by course_id and module_id
const _MODULE_QUESTION_BANK = new Map<string, any[]>();
const _PRELOADED_QUIZ_CACHE = new Map<string, PreloadedQuizData>();
const _IN_FLIGHT_PROMISES = new Map<string, Promise<PreloadedQuizData | null>>();

function buildModuleKey(courseId: number, moduleId: number): string {
  return `c${courseId || 0}_m${moduleId || 0}`;
}

function buildCacheKey(courseId: number, moduleId: number, topic: string): string {
  const mKey = buildModuleKey(courseId, moduleId);
  const t = (topic || '').trim().toLowerCase();
  return `${mKey}_${t}`;
}

export const quizPrefetchService = {
  /**
   * Get all seen question IDs for a student in a course/module from localStorage.
   */
  getSeenQuestionIds(courseId: number, moduleId: number): string[] {
    try {
      const key = `${_LOCAL_STORAGE_PREFIX}${courseId || 0}_${moduleId || 0}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  },

  /**
   * Mark question IDs as seen for this course & module.
   */
  markQuestionsAsSeen(courseId: number, moduleId: number, questionIds: string[]) {
    try {
      const key = `${_LOCAL_STORAGE_PREFIX}${courseId || 0}_${moduleId || 0}`;
      const current = new Set(this.getSeenQuestionIds(courseId, moduleId));
      questionIds.forEach((id) => {
        if (id) current.add(String(id));
      });
      localStorage.setItem(key, JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('[Adaptive] Could not write seen questions to localStorage:', e);
    }
  },

  /**
   * Get and increment session intervention index for variation diversity.
   */
  getAndIncrementSessionIndex(courseId: number, moduleId: number): number {
    try {
      const key = `${_SESSION_COUNT_PREFIX}${courseId || 0}_${moduleId || 0}`;
      const val = parseInt(localStorage.getItem(key) || '0', 10);
      const next = val + 1;
      localStorage.setItem(key, String(next));
      return next;
    } catch {
      return 1;
    }
  },

  /**
   * Clear seen questions history for a student/module if they restart the lesson.
   */
  clearSeenQuestions(courseId: number, moduleId: number) {
    try {
      const key = `${_LOCAL_STORAGE_PREFIX}${courseId || 0}_${moduleId || 0}`;
      localStorage.removeItem(key);
      const mKey = buildModuleKey(courseId, moduleId);
      _MODULE_QUESTION_BANK.delete(mKey);
      _PRELOADED_QUIZ_CACHE.delete(buildCacheKey(courseId, moduleId, ''));
    } catch {
      // Ignore
    }
  },

  /**
   * Preload 3 grounded adaptive questions in the background without blocking video, webcam, or UI.
   */
  async prefetchQuizForContext(
    courseId: number,
    moduleId: number,
    topic: string,
    forceRefresh: boolean = false
  ): Promise<PreloadedQuizData | null> {
    const key = buildCacheKey(courseId, moduleId, topic);
    const mKey = buildModuleKey(courseId, moduleId);
    const seenIds = new Set(this.getSeenQuestionIds(courseId, moduleId));

    // If cache already has 3 unseen questions and forceRefresh is false, return it
    if (!forceRefresh && _PRELOADED_QUIZ_CACHE.has(key)) {
      const cached = _PRELOADED_QUIZ_CACHE.get(key)!;
      const unseenCached = cached.questions.filter((q) => {
        const qId = String(q.id || computeClientQuestionHash(q.question || q.text || '', q.topic || topic));
        return !seenIds.has(qId);
      });
      if (unseenCached.length >= 3) {
        return {
          ...cached,
          questions: unseenCached.slice(0, 3)
        };
      }
    }

    // Check if bank has enough unseen questions
    const bank = _MODULE_QUESTION_BANK.get(mKey) || [];
    const unseenFromBank = bank.filter((q) => {
      const qId = String(q.id || computeClientQuestionHash(q.question || q.text || '', q.topic || topic));
      return !seenIds.has(qId);
    });

    if (!forceRefresh && unseenFromBank.length >= 3) {
      const payload: PreloadedQuizData = {
        quiz_id: Date.now(),
        title: `Adaptive Micro-Quiz: ${topic}`,
        topic: topic || 'Module Concept',
        questions: unseenFromBank.slice(0, 3),
        timestamp: Date.now(),
      };
      _PRELOADED_QUIZ_CACHE.set(key, payload);
      return payload;
    }

    // Return in-flight request to avoid duplicate network calls
    if (_IN_FLIGHT_PROMISES.has(key)) {
      return _IN_FLIGHT_PROMISES.get(key)!;
    }

    const tStart = performance.now();
    const sessionIdx = this.getAndIncrementSessionIndex(courseId, moduleId);

    const fetchPromise = (async () => {
      try {
        const res = await quizApi.generate({
          course_id: courseId,
          module_id: moduleId,
          topic: topic || 'Introduction to Algorithms',
          target_affect: 'CONFUSION',
          num_questions: 3,
          exclude_question_ids: Array.from(seenIds),
          session_index: sessionIdx,
        });

        if (res && Array.isArray(res.questions) && res.questions.length > 0) {
          // Tag each question with stable ID if missing
          const enrichedQuestions = res.questions.map((q: any, idx: number) => {
            const hash = String(q.question_hash || q.question_id || q.id || computeClientQuestionHash(q.question || q.text || `Q_${idx}`, q.topic || topic));
            return {
              ...q,
              id: hash,
              question_hash: hash,
              raw_id: q.raw_id || idx + 1,
            };
          });

          // Add to module bank
          const currentBank = _MODULE_QUESTION_BANK.get(mKey) || [];
          const existingBankIds = new Set(currentBank.map((q: any) => String(q.id)));
          enrichedQuestions.forEach((q: any) => {
            if (!existingBankIds.has(String(q.id))) {
              currentBank.push(q);
            }
          });
          _MODULE_QUESTION_BANK.set(mKey, currentBank);

          const payload: PreloadedQuizData = {
            quiz_id: res.quiz_id || Date.now(),
            title: res.title || `Adaptive Micro-Quiz: ${topic}`,
            topic: topic || 'Module Concept',
            questions: enrichedQuestions.slice(0, 3),
            timestamp: Date.now(),
          };
          _PRELOADED_QUIZ_CACHE.set(key, payload);
          const tDuration = (performance.now() - tStart).toFixed(1);
          console.log(`[Adaptive] Background unique quiz pre-generation ready for [${key}] in ${tDuration}ms (excluded ${seenIds.size} seen questions)`);
          return payload;
        }
      } catch (err) {
        console.warn(`[Adaptive] Background quiz prefetch notice for [${key}]:`, err);
      } finally {
        _IN_FLIGHT_PROMISES.delete(key);
      }
      return null;
    })();

    _IN_FLIGHT_PROMISES.set(key, fetchPromise);
    return fetchPromise;
  },

  /**
   * Synchronously retrieve preloaded quiz if available with unseen questions.
   */
  getCachedQuiz(courseId: number, moduleId: number, topic: string): PreloadedQuizData | null {
    const key = buildCacheKey(courseId, moduleId, topic);
    const cached = _PRELOADED_QUIZ_CACHE.get(key);
    if (!cached) return null;

    const seenIds = new Set(this.getSeenQuestionIds(courseId, moduleId));
    const unseen = cached.questions.filter((q) => {
      const qId = String(q.id || computeClientQuestionHash(q.question || q.text || '', q.topic || topic));
      return !seenIds.has(qId);
    });

    if (unseen.length >= 3) {
      return {
        ...cached,
        questions: unseen.slice(0, 3),
      };
    }
    return null;
  },

  /**
   * Clear cache when switching courses/modules or on demand.
   */
  invalidate(courseId?: number, moduleId?: number) {
    if (courseId === undefined && moduleId === undefined) {
      _PRELOADED_QUIZ_CACHE.clear();
      _IN_FLIGHT_PROMISES.clear();
      _MODULE_QUESTION_BANK.clear();
      return;
    }

    for (const key of Array.from(_PRELOADED_QUIZ_CACHE.keys())) {
      if (courseId !== undefined && key.startsWith(`c${courseId}_`)) {
        _PRELOADED_QUIZ_CACHE.delete(key);
      } else if (moduleId !== undefined && key.includes(`_m${moduleId}_`)) {
        _PRELOADED_QUIZ_CACHE.delete(key);
      }
    }
  },
};

