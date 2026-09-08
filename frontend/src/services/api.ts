import axios from 'axios';
import { User, Course, AffectiveMetrics, ClosedLoopIntervention, AITutorMessage, SystemMetrics } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout to prevent hanging requests
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getStoredToken = (): string | null => {
  const token = localStorage.getItem('eduflow_access_token') || localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return null;
  }
  return token;
};

export const setStoredToken = (accessToken: string, refreshToken?: string) => {
  if (accessToken && accessToken !== 'null' && accessToken !== 'undefined') {
    localStorage.setItem('eduflow_access_token', accessToken);
    localStorage.setItem('token', accessToken);
  }
  if (refreshToken) {
    localStorage.setItem('eduflow_refresh_token', refreshToken);
  }
};

export const clearStoredToken = () => {
  localStorage.removeItem('eduflow_access_token');
  localStorage.removeItem('eduflow_refresh_token');
  localStorage.removeItem('token');
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Parses any API error into a friendly, human-readable string.
 * Strips raw stack traces, database tracebacks, or Python internals.
 */
export const formatApiError = (err: any, defaultFallback: string): string => {
  if (!err) return defaultFallback;

  // Timeout error
  if (err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'))) {
    return defaultFallback.includes('create')
      ? 'Unable to create your account. Please check that the server is running and try again.'
      : 'Unable to sign in. Please check your connection and try again.';
  }

  // Network / server offline
  if (!err.response || err.code === 'ERR_NETWORK') {
    return 'EduFlow server is currently unavailable. Please check that the server is running and try again.';
  }

  const status = err.response.status;
  const data = err.response.data;

  if (status === 401) {
    return 'Incorrect email or password.';
  }

  if (status === 403) {
    return data?.detail && typeof data.detail === 'string'
      ? data.detail
      : 'Access denied. Your account may be deactivated or unauthorized.';
  }

  if (status === 409) {
    return data?.detail && typeof data.detail === 'string'
      ? data.detail
      : 'An account with this email or username already exists.';
  }

  if (status === 422) {
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      const firstErr = data.detail[0];
      const field = Array.isArray(firstErr.loc) ? firstErr.loc[firstErr.loc.length - 1] : '';
      if (field === 'email') return 'Please enter a valid email address.';
      if (field === 'password') return 'Please enter a valid password (minimum 6 characters).';
      return firstErr.msg ? `${field ? field + ': ' : ''}${firstErr.msg}` : 'Invalid input provided.';
    }
    return 'Please check your input values and try again.';
  }

  if (status >= 500) {
    return 'Unable to complete the request right now. Please try again.';
  }

  if (data?.detail && typeof data.detail === 'string' && !data.detail.includes('Traceback') && !data.detail.includes('SQLAlchemy')) {
    return data.detail;
  }

  return defaultFallback;
};

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setStoredToken(res.data.access_token, res.data.refresh_token);
    return res.data;
  },
  register: async (data: { email: string; username: string; full_name: string; password: string; role: string }) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: () => {
    clearStoredToken();
  }
};

export const userApi = {
  getLeaderboard: async (): Promise<User[]> => {
    const res = await api.get('/users/leaderboard');
    return res.data;
  },
  getUsers: async (): Promise<User[]> => {
    const res = await api.get('/users');
    return res.data;
  },
  getActivities: async (limit: number = 30): Promise<any[]> => {
    const res = await api.get(`/users/me/activities?limit=${limit}`);
    return res.data;
  },
  updateRole: async (userId: number, role: string): Promise<User> => {
    const res = await api.put(`/users/${userId}/role?role=${role}`);
    return res.data;
  },
  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  removeAvatar: async (): Promise<User> => {
    const res = await api.delete('/users/me/avatar');
    return res.data;
  }
};

export const courseApi = {
  getMyCertificates: async (): Promise<any[]> => {
    const res = await api.get('/courses/certificates/my');
    return res.data;
  },
  getCourses: async (params?: { teacher_id?: number; status?: string }): Promise<Course[]> => {
    const res = await api.get('/courses', { params });
    return res.data;
  },
  getCourseById: async (id: number): Promise<Course> => {
    const res = await api.get(`/courses/${id}`);
    return res.data;
  },
  createCourse: async (data: Partial<Course>): Promise<Course> => {
    const res = await api.post('/courses', data);
    return res.data;
  },
  updateCourse: async (id: number, data: Partial<Course>): Promise<Course> => {
    const res = await api.put(`/courses/${id}`, data);
    return res.data;
  },
  deleteCourse: async (id: number) => {
    const res = await api.delete(`/courses/${id}`);
    return res.data;
  },
  addModule: async (courseId: number, moduleData: Partial<import('../types').Module>) => {
    const res = await api.post(`/courses/${courseId}/modules`, moduleData);
    return res.data;
  },
  updateModule: async (courseId: number, moduleId: number, moduleData: Partial<import('../types').Module>) => {
    const res = await api.put(`/courses/${courseId}/modules/${moduleId}`, moduleData);
    return res.data;
  },
  deleteModule: async (courseId: number, moduleId: number) => {
    const res = await api.delete(`/courses/${courseId}/modules/${moduleId}`);
    return res.data;
  },
  reorderModules: async (courseId: number, modules: { id: number; order: number }[]) => {
    const res = await api.post(`/courses/${courseId}/modules/reorder`, { modules });
    return res.data;
  },
  enroll: async (courseId: number) => {
    const res = await api.post(`/courses/${courseId}/enroll`);
    return res.data;
  },
  getMyEnrollments: async () => {
    const res = await api.get('/courses/enrollments/my');
    return res.data;
  },
  updateProgress: async (courseId: number, progressPercentage: number) => {
    const res = await api.post(`/courses/${courseId}/progress`, { progress_percentage: progressPercentage });
    return res.data;
  }
};

export const affectiveApi = {
  sendTelemetry: async (payload: {
    course_id?: number;
    module_id?: number;
    timestamp_seconds: number;
    attention: number;
    confusion: number;
    boredom: number;
    engagement: number;
    distraction: number;
    cognitive_load: number;
    learner_state?: string;
    eye_state?: string;
    blink_count?: number;
    recent_quiz_score?: number;
  }): Promise<ClosedLoopIntervention> => {
    const res = await api.post('/affective/telemetry', payload);
    return res.data;
  }
};

export const videoApi = {
  uploadVideo: async (
    file: File,
    courseId?: number,
    moduleId?: number,
    onProgress?: (percent: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (courseId !== undefined && courseId !== null) {
      formData.append('course_id', String(courseId));
    }
    if (moduleId !== undefined && moduleId !== null) {
      formData.append('module_id', String(moduleId));
    }
    const res = await api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return res.data;
  },
  analyzeVideo: async (payload: {
    video_url: string;
    course_id?: number;
    module_id?: number;
    title?: string;
    description?: string;
    transcript?: string;
    force_reanalyze?: boolean;
  }) => {
    const res = await api.post('/videos/analyze', payload);
    return res.data;
  },
  getModuleKnowledge: async (moduleId: number) => {
    const res = await api.get(`/videos/module/${moduleId}/knowledge`);
    return res.data;
  },
  getVideoKnowledge: async (videoId: string) => {
    const res = await api.get(`/videos/${videoId}/knowledge`);
    return res.data;
  }
};

export const aiTutorApi = {
  query: async (payload: {
    course_id: number;
    module_id?: number;
    query?: string;
    question?: string;
    student_affective_state?: string;
    affective_state?: string;
    course_title?: string;
    module_title?: string;
    module_description?: string;
    video_url?: string;
    video_type?: string;
    video_id?: string;
    video_title?: string;
    video_topic?: string;
    module_topic?: string;
    course_topic?: string;
    transcript?: string;
    current_timestamp?: number;
    mode?: string;
  }) => {
    const res = await api.post('/ai-tutor/query', payload);
    return res.data;
  }
};

export const quizApi = {
  generate: async (payload: {
    course_id?: number;
    module_id?: number;
    topic: string;
    target_affect?: string;
    num_questions?: number;
    video_url?: string;
    video_id?: string;
    transcript?: string;
    current_timestamp?: number;
    exclude_question_ids?: string[];
    session_index?: number;
  }) => {
    const res = await api.post('/quizzes/generate', payload);
    return res.data;
  },
  submit: async (quizId: number, answers: number[]) => {
    const res = await api.post('/quizzes/submit', { quiz_id: quizId, answers });
    return res.data;
  }
};

export const libraryApi = {
  performAction: async (payload: {
    resource_id: string;
    resource_title: string;
    action: string;
    page_number?: number;
    query?: string;
    document_content?: string;
  }) => {
    const res = await api.post('/ai-tutor/library/action', payload);
    return res.data;
  },
  askQuestion: async (payload: {
    resource_id: string;
    resource_title: string;
    query: string;
    page_number?: number;
  }) => {
    const res = await api.post('/ai-tutor/library/ask', {
      ...payload,
      action: 'ask_question'
    });
    return res.data;
  },
  askGeminiTopic: async (query: string) => {
    const res = await api.post('/ai-tutor/library/ask-gemini', { query });
    return res.data;
  }
};

export const analyticsApi = {
  getCourseAnalytics: async (courseId: number) => {
    const res = await api.get(`/teacher/courses/${courseId}/analytics`);
    return res.data;
  },
  getCourseStudents: async (courseId: number = 1) => {
    const res = await api.get(`/teacher/courses/${courseId}/students`);
    return res.data;
  },
  getSystemMetrics: async (): Promise<SystemMetrics> => {
    const res = await api.get('/admin/system-metrics');
    return res.data;
  }
};

export const activityApi = {
  generateAttentionActivity: async (payload: {
    course_id?: number;
    module_id?: number;
    topic: string;
    preferred_type?: string;
    video_url?: string;
    video_id?: string;
    transcript?: string;
    current_timestamp?: number;
    session_index?: number;
  }): Promise<import('../types').AttentionActivity> => {
    const res = await api.post('/quizzes/attention-activity/generate', payload);
    return res.data;
  },
  submitAttentionActivity: async (payload: {
    activity_id: string;
    activity_type: string;
    completed: boolean;
    score_percentage?: number;
    time_spent_seconds: number;
    course_id?: number;
    module_id?: number;
  }) => {
    const res = await api.post('/quizzes/attention-activity/submit', payload);
    return res.data;
  }
};

