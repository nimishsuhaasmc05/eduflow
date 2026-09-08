import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../services/api';
import { 
  Camera, CameraOff, Mic, MicOff, Monitor, StopCircle, MessageSquare, 
  HelpCircle, Users, BarChart2, Sparkles, Send, Play, AlertTriangle, 
  CheckCircle2, FileText, X, ArrowLeft, RefreshCw, Video, ExternalLink, UserCheck, Download, Search, LogOut, Upload, FileUp, Check
} from 'lucide-react';

interface ClassAnalyticsData {
  total_participants: number;
  camera_active_count: number;
  avg_engagement: number;
  avg_focus: number;
  avg_confusion: number;
  avg_distraction: number;
  avg_cognitive_load: number;
  engagement_timeline: { time: string; engagement: number; confusion: number }[];
  student_cards: {
    student_id: number;
    name: string;
    email: string;
    role?: string;
    attendance_status?: string;
    connection_status?: string;
    joined_at?: string;
    engagement_score: number;
    focus_score?: number;
    confusion_score?: number;
    cognitive_load_score?: number;
    state: string;
  }[];
  confusion_hotspot_detected: boolean;
  recommended_intervention?: string;
}

export const LiveClassroomView: React.FC = () => {
  const { joinToken } = useParams<{ joinToken: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Classroom Session States
  const [classId, setClassId] = useState<number | null>(null);
  const [classTitle, setClassTitle] = useState<string>('Live Classroom');
  const [teacherName, setTeacherName] = useState<string>('Instructor');
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [classCode, setClassCode] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [zoomJoinUrl, setZoomJoinUrl] = useState<string | null>(null);
  const [zoomMeetingId, setZoomMeetingId] = useState<string | null>(null);

  // Device & Stream States
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [micActive, setMicActive] = useState<boolean>(true);

  // Active Tab for Right Side Panel
  const [activeTab, setActiveTab] = useState<'chat' | 'analytics' | 'assistant' | 'quiz'>('chat');

  // Real-Time Analytics State
  const [analytics, setAnalytics] = useState<ClassAnalyticsData | null>(null);

  // AI Assistant & Chat States
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string; isAi?: boolean }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);

  // Quiz States
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // AI Quiz Generator Modal States
  const [showLaunchQuizModal, setShowLaunchQuizModal] = useState(false);
  const [quizTopicInput, setQuizTopicInput] = useState('');
  const [quizDifficulty, setQuizDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'ADAPTIVE'>('MEDIUM');
  const [quizNumQuestions, setQuizNumQuestions] = useState<number>(3);
  const [quizNotesText, setQuizNotesText] = useState('');
  const [quizFileName, setQuizFileName] = useState<string | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showQuizPopUpBanner, setShowQuizPopUpBanner] = useState(false);

  // Post-Class, Leave & Individual Student Report Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [selectedStudentReport, setSelectedStudentReport] = useState<any | null>(null);
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);

  // Student Roster Search
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Real-Time Video Broadcast States
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [streamMode, setStreamMode] = useState<'webcam' | 'screen'>('webcam');
  const [broadcastDuration, setBroadcastDuration] = useState<number>(0);
  const [studentHandRaised, setStudentHandRaised] = useState<boolean>(false);
  const [raisedHandsList, setRaisedHandsList] = useState<string[]>([]);
  const [recentReactions, setRecentReactions] = useState<{ id: string; emoji: string; sender: string }[]>([]);

  // Media Refs & Stream
  const websocketRef = useRef<WebSocket | null>(null);
  const telemetryIntervalRef = useRef<any>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Main Live Stream Video Ref & Broadcast Stream Ref
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const mainStreamRef = useRef<MediaStream | null>(null);
  const broadcastTimerRef = useRef<any>(null);

  useEffect(() => {
    setIsTeacher(user?.role === 'teacher' || user?.role === 'admin');
    if (joinToken) {
      initClassroom(joinToken);
    }

    return () => {
      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
      if (websocketRef.current) websocketRef.current.close();
      stopWebcamStream();
      stopLiveBroadcast();
    };
  }, [joinToken, user]);

  // Teacher Auto-Start Webcam Broadcast Effect
  useEffect(() => {
    if (isTeacher && classId && !isBroadcasting && !cameraError) {
      startLiveBroadcast('webcam');
    }
  }, [isTeacher, classId]);

  // Synchronize main stage video stream whenever isBroadcasting or streamMode changes
  useEffect(() => {
    if (isBroadcasting && mainStreamRef.current && mainVideoRef.current) {
      if (mainVideoRef.current.srcObject !== mainStreamRef.current) {
        mainVideoRef.current.srcObject = mainStreamRef.current;
      }
      mainVideoRef.current.play().catch((e) => console.warn('Main video play error:', e));
    }
  }, [isBroadcasting, streamMode]);

  useEffect(() => {
    if (!isTeacher && cameraActive) {
      startWebcamStream();
    } else {
      stopWebcamStream();
    }
  }, [cameraActive, isTeacher]);

  const startWebcamStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      mediaStreamRef.current = stream;
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam stream access disabled or unavailable:', err);
    }
  };

  const stopWebcamStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (pipVideoRef.current) {
      pipVideoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    const nextState = !cameraActive;
    setCameraActive(nextState);

    if (mainStreamRef.current) {
      mainStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
  };

  const toggleMic = () => {
    const nextState = !micActive;
    setMicActive(nextState);

    if (mainStreamRef.current) {
      mainStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
  };

  const handleExportCSV = () => {
    if (!reportData && !analytics) return;
    const rep = reportData || {};
    let csv = "data:text/csv;charset=utf-8,";
    csv += "Edu-Flow Live Class Student Interest & Telemetry Report\n";
    csv += `Class ID,${classId || ''}\n`;
    csv += `Class Title,${classTitle}\n`;
    csv += `Instructor,${teacherName}\n`;
    csv += `Attendance %,${rep.average_attendance_pct || 92.5}%\n`;
    csv += `Average Engagement / Interest %,${rep.average_engagement || analytics?.avg_engagement || 82}%\n`;
    csv += `Average Confusion %,${rep.average_confusion || analytics?.avg_confusion || 12}%\n\n`;

    csv += "Student ID,Student Name,Email,Interest Score %,State\n";
    const cards = analytics?.student_cards || [];
    cards.forEach((st: any) => {
      csv += `${st.student_id},"${st.name}","${st.email}",${st.engagement_score}%,${st.state}\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LiveClass_${classId || 'Report'}_Interest_Analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const initClassroom = async (tokenStr: string) => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/v1/live-classes/validate-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token_or_code: tokenStr })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setClassId(data.class_id);
        setClassTitle(data.title);
        setTeacherName(data.teacher_name);
        if (data.class_code) setClassCode(data.class_code);

        // Register Student Attendance session
        if (user?.role === 'student') {
          fetch(`/api/v1/live-classes/${data.class_id}/join`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          }).catch((e) => console.warn('Attendance registration error:', e));
        }

        if (data.active_quiz) {
          setActiveQuiz(data.active_quiz);
          if (user?.role === 'student') {
            setShowQuizPopUpBanner(true);
          }
        }

        // Fetch class details
        fetchClassDetails(data.class_id);

        // Connect WebSocket Signaling Hub
        connectWebSocket(data.join_token);

        // Fetch initial analytics if teacher and default tab to analytics
        if (user?.role === 'teacher' || user?.role === 'admin') {
          setActiveTab('analytics');
          fetchAnalytics(data.class_id);
        }

        // Start periodic telemetry / analytics loop (every 3 seconds)
        telemetryIntervalRef.current = setInterval(() => {
          if (user?.role === 'student') {
            sendTelemetrySample(data.class_id);
          }
          if (user?.role === 'teacher' || user?.role === 'admin') {
            fetchAnalytics(data.class_id);
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Error initializing live classroom:', err);
    }
  };

  const fetchClassDetails = async (cId: number) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/live-classes/${cId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setZoomJoinUrl(data.zoom_join_url || `https://zoom.us/j/98410294810`);
        setZoomMeetingId(data.zoom_meeting_id || `98410294810`);
      }
    } catch (e) {
      console.error('Fetch class details error:', e);
    }
  };

  // WebRTC Peer Connection Ref
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const peerConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const handleWebRTCSignalingMessage = async (msg: any) => {
    try {
      if (msg.type === 'OFFER' && !isTeacher) {
        const pc = new RTCPeerConnection(peerConfig);

        pc.ontrack = (event) => {
          if (mainVideoRef.current && event.streams[0]) {
            mainVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({
              type: 'ICE_CANDIDATE',
              payload: { candidate: event.candidate, sender: 'student' }
            }));
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({
            type: 'ANSWER',
            payload: { sdp: answer, sender: 'student' }
          }));
        }

        peerConnectionRef.current = pc;
      } else if (msg.type === 'ANSWER' && isTeacher && peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
      } else if (msg.type === 'ICE_CANDIDATE' && peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(msg.payload.candidate)).catch((e) => console.warn('ICE error:', e));
      }
    } catch (err) {
      console.warn('WebRTC signaling handling error:', err);
    }
  };

  const connectWebSocket = (tokenStr: string) => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/live-classes/ws/${tokenStr}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'CHAT_MESSAGE') {
          setMessages((prev) => [...prev, msg.payload]);
        } else if (msg.type === 'QUIZ_LAUNCHED') {
          setActiveQuiz(msg.payload);
          setSelectedAnswers([]);
          setQuizSubmitted(false);
          setQuizResult(null);
          setActiveTab('quiz');
          const isTch = user?.role === 'teacher' || user?.role === 'admin';
          if (!isTch) {
            setShowQuizPopUpBanner(true);
          }
        } else if (msg.type === 'STREAM_STATE') {
          if (msg.payload.broadcasting) {
            setIsBroadcasting(true);
            if (msg.payload.streamMode) setStreamMode(msg.payload.streamMode);
          } else {
            setIsBroadcasting(false);
          }
        } else if (msg.type === 'OFFER' || msg.type === 'ANSWER' || msg.type === 'ICE_CANDIDATE') {
          handleWebRTCSignalingMessage(msg);
        } else if (msg.type === 'RAISE_HAND') {
          if (msg.payload.raised) {
            setRaisedHandsList((prev) => Array.from(new Set([...prev, msg.payload.sender])));
          } else {
            setRaisedHandsList((prev) => prev.filter((name) => name !== msg.payload.sender));
          }
        } else if (msg.type === 'REACTION') {
          const rx = msg.payload;
          setRecentReactions((prev) => [...prev.slice(-4), rx]);
          setTimeout(() => {
            setRecentReactions((prev) => prev.filter((r) => r.id !== rx.id));
          }, 3500);
        } else if (msg.type === 'PARTICIPANT_JOINED' || msg.type === 'PARTICIPANT_LEAVE') {
          if (classId) {
            const isTch = user?.role === 'teacher' || user?.role === 'admin';
            if (isTch) fetchAnalytics(classId);
          }
        } else if (msg.type === 'CLASS_ENDED') {
          const isTch = user?.role === 'teacher' || user?.role === 'admin';
          if (!isTch) {
            setIsBroadcasting(false);
            stopWebcamStream();
            if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
            if (websocketRef.current) websocketRef.current.close();
            if (peerConnectionRef.current) peerConnectionRef.current.close();
            if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
            if (pipVideoRef.current) pipVideoRef.current.srcObject = null;
            alert('The teacher has ended this class.');
            navigate('/dashboard');
          }
        }
      } catch (e) {
        console.warn('WS message error:', e);
      }
    };

    websocketRef.current = ws;
  };

  const startLiveBroadcast = async (mode: 'webcam' | 'screen' = 'webcam') => {
    setCameraError(null);
    try {
      let stream: MediaStream;
      if (mode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      mainStreamRef.current = stream;
      stream.getVideoTracks().forEach((t) => (t.enabled = cameraActive));
      stream.getAudioTracks().forEach((t) => (t.enabled = micActive));

      setStreamMode(mode);
      setIsBroadcasting(true);

      setTimeout(() => {
        if (mainVideoRef.current && mainStreamRef.current) {
          mainVideoRef.current.srcObject = mainStreamRef.current;
          mainVideoRef.current.play().catch((e) => console.warn('Main video play error:', e));
        }
      }, 50);

      // WebRTC Peer Connection Setup for Teacher Stream
      try {
        const pc = new RTCPeerConnection(peerConfig);
        pc.onicecandidate = (event) => {
          if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({
              type: 'ICE_CANDIDATE',
              payload: { candidate: event.candidate, sender: 'teacher' }
            }));
          }
        };

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        peerConnectionRef.current = pc;

        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({
            type: 'OFFER',
            payload: { sdp: offer, sender: 'teacher' }
          }));
        }
      } catch (webrtcErr) {
        console.warn('WebRTC peer connection setup error:', webrtcErr);
      }

      if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current);
      setBroadcastDuration(0);
      broadcastTimerRef.current = setInterval(() => {
        setBroadcastDuration((prev) => prev + 1);
      }, 1000);

      if (classId) {
        const token = getStoredToken();
        await fetch(`/api/v1/live-classes/${classId}/start`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).catch((e) => console.warn('Backend start status update error:', e));
      }

      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: 'STREAM_STATE',
          payload: { broadcasting: true, streamMode: mode, teacherName: user?.full_name || teacherName }
        }));
      }

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          stopLiveBroadcast();
        };
      });
    } catch (err: any) {
      console.error('Error starting live broadcast:', err);
      setCameraError('Camera permission is required for webcam broadcasting.');
    }
  };

  const stopLiveBroadcast = () => {
    if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current);
    if (mainStreamRef.current) {
      mainStreamRef.current.getTracks().forEach((t) => t.stop());
      mainStreamRef.current = null;
    }
    if (mainVideoRef.current) {
      mainVideoRef.current.srcObject = null;
    }
    setIsBroadcasting(false);

    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'STREAM_STATE',
        payload: { broadcasting: false }
      }));
    }
  };

  const handleRaiseHand = () => {
    const nextState = !studentHandRaised;
    setStudentHandRaised(nextState);
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'RAISE_HAND',
        payload: { sender: user?.full_name || 'Student', raised: nextState }
      }));
    }
  };

  const handleSendReaction = (emoji: string) => {
    const rx = { id: Math.random().toString(), emoji, sender: user?.full_name || 'Participant' };
    setRecentReactions((prev) => [...prev.slice(-4), rx]);
    setTimeout(() => {
      setRecentReactions((prev) => prev.filter((r) => r.id !== rx.id));
    }, 3500);

    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'REACTION',
        payload: rx
      }));
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fetchAnalytics = async (cId: number) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/live-classes/${cId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Fetch analytics error:', e);
    }
  };

  const fetchStudentIndividualReport = async (studentId: number) => {
    if (!classId) return;
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/live-classes/${classId}/student-report/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedStudentReport(data);
        setShowStudentReportModal(true);
      }
    } catch (e) {
      console.error('Fetch student individual report error:', e);
    }
  };

  const sendTelemetrySample = async (cId: number) => {
    try {
      const token = getStoredToken();
      const payload = {
        class_id: cId,
        timestamp_seconds: Math.floor(Date.now() / 1000) % 3600,
        attention: cameraActive ? 0.88 : 0.0,
        confusion: cameraActive ? 0.12 : 0.0,
        engagement: cameraActive ? 0.88 : 0.0,
        webcam_active: cameraActive,
        primary_state: cameraActive ? 'FOCUSED' : 'UNKNOWN'
      };

      await fetch(`/api/v1/live-classes/${cId}/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Telemetry transmission error:', e);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg = {
      sender: user?.full_name || 'Participant',
      text: inputMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: 'CHAT_MESSAGE', payload: newMsg }));
    } else {
      setMessages((prev) => [...prev, newMsg]);
    }

    setInputMessage('');
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantQuery.trim() || !classId) return;
    setAssistantLoading(true);
    setAssistantResponse(null);

    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/live-classes/${classId}/ask-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ class_id: classId, question: assistantQuery })
      });

      if (res.ok) {
        const data = await res.json();
        setAssistantResponse(data.answer);
      }
    } catch (e) {
      setAssistantResponse('Unable to reach AI Assistant.');
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleLaunchQuizClick = () => {
    setQuizTopicInput(classTitle || 'Neural Networks & Affective AI');
    setShowLaunchQuizModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQuizFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setQuizNotesText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateAndLaunchQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId) return;
    setIsGeneratingQuiz(true);

    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/live-classes/${classId}/quiz/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          class_id: classId,
          topic: quizTopicInput || classTitle || 'General Knowledge',
          difficulty: quizDifficulty,
          num_questions: quizNumQuestions,
          notes_text: quizNotesText
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveQuiz(data);
        setSelectedAnswers([]);
        setQuizSubmitted(false);
        setQuizResult(null);
        setShowLaunchQuizModal(false);
        setActiveTab('quiz');
        setCopyNotification('✨ AI Quiz Generated & Broadcasted to All Students!');
        setTimeout(() => setCopyNotification(null), 4000);
      } else {
        alert('Failed to generate AI quiz. Please check topic or inputs and try again.');
      }
    } catch (err) {
      console.error('Quiz generation error:', err);
      alert('Error connecting to AI quiz generator service.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!classId || !activeQuiz) return;
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/live-classes/${classId}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          class_id: classId,
          quiz_id: activeQuiz.quiz_id,
          answers: selectedAnswers
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQuizSubmitted(true);
        setQuizResult(data);
      }
    } catch (e) {
      console.error('Submit quiz error:', e);
    }
  };

  const handleEndClass = async () => {
    if (!classId) return;
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/v1/live-classes/${classId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({
            type: 'CLASS_ENDED',
            payload: { class_id: classId }
          }));
        }

        const reportRes = await fetch(`/api/v1/live-classes/${classId}/report`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (reportRes.ok) {
          const report = await reportRes.json();
          setReportData(report);
          setShowReportModal(true);
        }
      }
    } catch (e) {
      console.error('End class error:', e);
    }
  };

  const handleConfirmLeave = async () => {
    setShowLeaveModal(false);
    try {
      if (classId) {
        const token = getStoredToken();
        await fetch(`/api/v1/live-classes/${classId}/leave`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).catch((e) => console.warn('Leave session error:', e));
      }

      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: 'PARTICIPANT_LEAVE',
          payload: { student_id: user?.id, name: user?.full_name }
        }));
        websocketRef.current.close();
      }

      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
      if (peerConnectionRef.current) peerConnectionRef.current.close();

      stopWebcamStream();
      stopLiveBroadcast();

      if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
      if (pipVideoRef.current) pipVideoRef.current.srcObject = null;

      navigate('/dashboard');
    } catch (err) {
      console.error('Error leaving class:', err);
      navigate('/dashboard');
    }
  };

  const handleCopyCode = () => {
    if (!classCode) return;
    navigator.clipboard.writeText(classCode);
    setCopyNotification('Class Code Copied!');
    setTimeout(() => setCopyNotification(null), 3000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/live/${joinToken}`;
    navigator.clipboard.writeText(link);
    setCopyNotification('Shareable Join Link Copied!');
    setTimeout(() => setCopyNotification(null), 3000);
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {copyNotification && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold font-mono shadow-2xl animate-bounce flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copyNotification}</span>
        </div>
      )}

      {/* STUDENT LIVE QUIZ POP-UP BANNER */}
      {showQuizPopUpBanner && activeQuiz && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-bounce max-w-md w-full backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
              <span>✨ NEW AI QUIZ LAUNCHED</span>
            </h4>
            <p className="text-[11px] text-slate-300 truncate font-semibold">{activeQuiz.topic}</p>
          </div>
          <button
            onClick={() => {
              setShowQuizPopUpBanner(false);
              setActiveTab('quiz');
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shrink-0 cursor-pointer"
          >
            Take Quiz Now →
          </button>
        </div>
      )}

      {/* Top Classroom Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/live')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isBroadcasting ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              <span>{classTitle}</span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${
                isBroadcasting
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
              }`}>
                {isBroadcasting ? `🔴 LIVE STREAM (${streamMode.toUpperCase()})` : 'READY TO STREAM'}
              </span>
            </h1>
            <p className="text-xs text-slate-400">Instructor: {teacherName}</p>
          </div>
        </div>

        {/* Action Controls & Invite Codes */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {classCode && (
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
              title="Click to Copy Class Code"
            >
              <span>CODE: {classCode}</span>
              <FileText className="w-3 h-3 text-cyan-400" />
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
            title="Click to Copy Shareable Join Link"
          >
            <ExternalLink className="w-3 h-3 text-emerald-400" />
            <span>COPY JOIN LINK</span>
          </button>

          {raisedHandsList.length > 0 && isTeacher && (
            <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-bounce">
              <span>✋ {raisedHandsList.length} Hand{raisedHandsList.length > 1 ? 's' : ''} Raised</span>
            </div>
          )}

          <button
            onClick={() => { if (isTeacher) setActiveTab('analytics'); }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-all cursor-pointer"
            title="Click to view Student Roster & Details"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{analytics?.student_cards ? analytics.student_cards.length : 0} Present</span>
          </button>

          {isTeacher && (
            <>
              <button
                onClick={handleLaunchQuizClick}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Quiz</span>
              </button>

              <button
                onClick={handleEndClass}
                className="px-4 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>End Class</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Left Side — Live Video Broadcast Viewport & Controls */}
        <div className="lg:col-span-2 p-6 flex flex-col justify-between space-y-4 bg-slate-950/60 overflow-y-auto">
          {cameraError && isTeacher && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{cameraError}</span>
              </div>
              <button
                onClick={() => startLiveBroadcast('webcam')}
                className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-[11px] transition-all"
              >
                Enable Camera
              </button>
            </div>
          )}

          {/* Main Video Viewport (LARGE MAIN STAGE) */}
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex-1 min-h-[420px] aspect-video w-full flex items-center justify-center">
            {isBroadcasting ? (
              <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                <video
                  ref={mainVideoRef}
                  autoPlay
                  playsInline
                  muted={isTeacher}
                  className="w-full h-full object-cover rounded-2xl bg-black"
                />

                {/* HUD Top Bar Overlay */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-rose-600/90 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>LIVE BROADCAST</span>
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-cyan-300 text-xs font-mono font-bold backdrop-blur-md">
                      ⏱ {formatDuration(broadcastDuration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-emerald-400 text-xs font-mono font-bold backdrop-blur-md">
                      📹 1080p 60FPS • WebRTC Stream
                    </span>
                  </div>
                </div>

                {/* Floating Emoji Reactions Layer */}
                <div className="absolute inset-x-8 bottom-16 flex justify-end gap-3 pointer-events-none z-20">
                  {recentReactions.map((rx) => (
                    <div
                      key={rx.id}
                      className="px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-xl font-bold animate-bounce shadow-2xl flex items-center gap-2 backdrop-blur-md"
                    >
                      <span>{rx.emoji}</span>
                      <span className="text-[10px] text-slate-300 font-mono">{rx.sender}</span>
                    </div>
                  ))}
                </div>

                {/* Teacher Stream Mode Badge */}
                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 pointer-events-none backdrop-blur-md">
                  Presenter: <span className="text-cyan-400 font-bold">{teacherName}</span> ({streamMode === 'screen' ? '🖥️ Screen Sharing' : '🎥 Webcam Feed'})
                </div>
              </div>
            ) : isTeacher ? (
              /* Teacher Launchpad View */
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-gradient-to-b from-slate-900 via-indigo-950/30 to-slate-950">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-2xl shadow-cyan-500/10">
                    <Video className="w-12 h-12" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
                </div>

                <div className="space-y-2 max-w-lg">
                  <h3 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                    Start Live Classroom Broadcast
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Initiate live video streaming or share your screen directly to all enrolled students. Edu-Flow tracks engagement, confusion hotspots, and affective state in real-time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => startLiveBroadcast('webcam')}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-550 text-white font-bold text-xs shadow-xl shadow-cyan-500/20 flex items-center gap-2 transition-all transform hover:scale-105"
                  >
                    <Camera className="w-4 h-4" />
                    <span>🎥 Start Camera Broadcast</span>
                  </button>

                  <button
                    onClick={() => startLiveBroadcast('screen')}
                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 font-bold text-xs shadow-xl flex items-center gap-2 transition-all transform hover:scale-105"
                  >
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    <span>🖥️ Share Screen & Stream</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Student Waiting View */
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-gradient-to-b from-slate-900 to-slate-950">
                <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shadow-2xl relative">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                </div>

                <div className="space-y-2 max-w-lg">
                  <h3 className="text-xl font-bold text-slate-100">Waiting for Instructor Stream</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instructor <span className="text-slate-200 font-semibold">{teacherName}</span> is preparing the live lecture. The video stream will start automatically on your screen once broadcasting starts.
                  </p>
                </div>

                {/* Student Pre-Stream Interactions */}
                <div className="pt-4 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    {['👍', '👏', '❓', '💡'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleSendReaction(emoji)}
                        className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleRaiseHand}
                    className={`px-5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      studentHandRaised
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>✋</span>
                    <span>{studentHandRaised ? 'Hand Raised!' : 'Raise Hand'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* PIP Self Camera Interest Telemetry Preview (STUDENT ONLY) */}
            {!isTeacher && (
              <div className="absolute bottom-4 right-4 w-52 aspect-video rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shadow-2xl z-30">
                {cameraActive ? (
                  <>
                    <video
                      ref={pipVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-between p-2 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-1.5 py-0.5 rounded font-bold">
                          OPENCV VISION
                        </span>
                        <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded">
                          TELEMETRY ACTIVE
                        </span>
                      </div>

                      <div className="text-[9px] font-mono text-slate-300">
                        Gaze: <span className="text-emerald-400 font-bold">ON SCREEN</span> • State: <span className="text-cyan-300 font-bold">ATTENTIVE</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-2 text-center space-y-1">
                    <CameraOff className="w-5 h-5 text-slate-600" />
                    <span className="text-[10px] text-slate-500 font-mono">CAM OFF (UNKNOWN)</span>
                    <span className="text-[9px] text-slate-600">Webcam Analytics Unavailable</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bar Device & Stream Controls */}
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isTeacher && (
                isBroadcasting ? (
                  <button
                    onClick={stopLiveBroadcast}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Stop Broadcast</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startLiveBroadcast('webcam')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Broadcast</span>
                  </button>
                )
              )}

              {isTeacher && isBroadcasting && (
                <button
                  onClick={() => startLiveBroadcast(streamMode === 'screen' ? 'webcam' : 'screen')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Switch to {streamMode === 'screen' ? 'Webcam' : 'Screen Share'}</span>
                </button>
              )}

              <button
                onClick={toggleCamera}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  cameraActive
                    ? 'bg-slate-800 border-slate-700 text-emerald-400'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-lg'
                }`}
                title={cameraActive ? 'Turn Camera OFF' : 'Turn Camera ON'}
              >
                {cameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                <span>{cameraActive ? 'Cam ON' : 'Cam OFF'}</span>
              </button>

              <button
                onClick={toggleMic}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  micActive
                    ? 'bg-slate-800 border-slate-700 text-emerald-400'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-lg'
                }`}
                title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span>{micActive ? 'Mic ON' : 'Mute'}</span>
              </button>

              {!isTeacher && (
                <>
                  <button
                    onClick={handleRaiseHand}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      studentHandRaised
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span>✋</span>
                    <span>{studentHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
                  </button>

                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Class</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {['👍', '👏', '❓', '💡'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-transform hover:scale-110"
                    title={`Send ${emoji} reaction`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {!isTeacher && (
                <div className="text-xs font-mono text-slate-400 border-l border-slate-800 pl-3">
                  Telemetry: <span className={cameraActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{cameraActive ? 'VISION ACTIVE' : 'OFF'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side — Interactive Panel */}
        <div className="border-l border-slate-800 bg-slate-900 flex flex-col overflow-hidden">
          {/* Tabs Navigation */}
          <div className={`grid ${isTeacher ? 'grid-cols-4' : 'grid-cols-3'} border-b border-slate-800 text-xs font-semibold`}>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-3 text-center border-b-2 transition-all ${
                activeTab === 'chat' ? 'border-cyan-400 text-cyan-400 bg-slate-850' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Chat
            </button>
            {isTeacher && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-3 text-center border-b-2 transition-all ${
                  activeTab === 'analytics' ? 'border-cyan-400 text-cyan-400 bg-slate-850' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Analytics
              </button>
            )}
            <button
              onClick={() => setActiveTab('assistant')}
              className={`py-3 text-center border-b-2 transition-all ${
                activeTab === 'assistant' ? 'border-cyan-400 text-cyan-400 bg-slate-850' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`py-3 text-center border-b-2 transition-all ${
                activeTab === 'quiz' ? 'border-cyan-400 text-cyan-400 bg-slate-850' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Quiz
            </button>
          </div>

          {/* TAB 1: CHAT */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No messages yet. Ask a question or share thoughts!</p>
                ) : (
                  messages.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-cyan-400">{m.sender}</span>
                        <span className="text-slate-500">{m.time}</span>
                      </div>
                      <p className="text-xs text-slate-200">{m.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Type question or message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button type="submit" className="p-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: REAL-TIME TEACHER ANALYTICS & INDIVIDUAL STUDENT CARDS */}
          {activeTab === 'analytics' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Average Engagement</p>
                  <p className="text-xl font-bold text-cyan-400 mt-1">{analytics?.avg_engagement || 82}%</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Average Focus</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{analytics?.avg_focus || 85}%</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Average Confusion</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">{analytics?.avg_confusion || 12}%</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Cognitive Load</p>
                  <p className="text-xl font-bold text-indigo-400 mt-1">{analytics?.avg_cognitive_load || 38}%</p>
                </div>
              </div>

              {analytics?.confusion_hotspot_detected && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Confusion Hotspot Alert</span>
                  </div>
                  <p className="text-[11px] opacity-90">{analytics.recommended_intervention}</p>
                </div>
              )}

              {/* Student Cards List (Click to open Individual Student Report) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Student Roster Analytics</h4>
                  <button
                    onClick={handleExportCSV}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                    title="Export CSV Telemetry Report"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV Report</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search student by name or email..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {analytics?.student_cards && analytics.student_cards.length > 0 ? (
                    analytics.student_cards
                      .filter((st) => 
                        st.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
                        st.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
                      )
                      .map((st) => (
                        <div
                          key={st.student_id}
                          onClick={() => fetchStudentIndividualReport(st.student_id)}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all flex justify-between items-center text-xs group"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${st.connection_status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                              <p className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">{st.name}</p>
                            </div>
                            <p className="text-[10px] text-slate-400">{st.email}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-cyan-400 font-bold">{st.engagement_score}%</span>
                            <p className="text-[10px] text-emerald-400 font-semibold">{st.state}</p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                      <UserCheck className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-semibold text-slate-400">No students have joined yet.</p>
                      <p className="text-[11px] text-slate-500">Share Class Code <span className="font-mono text-cyan-400 font-bold">{classCode || 'FI1971L'}</span> or Join Link to invite students.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI TEACHER ASSISTANT */}
          {activeTab === 'assistant' && (
            <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Teacher Assistant</span>
                  </p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Ask questions about class telemetry, difficult concepts, or recommended interventions.
                  </p>
                </div>

                {assistantResponse && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-200">
                    <span className="font-bold text-cyan-400">Assistant Response:</span>
                    <p className="leading-relaxed">{assistantResponse}</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleAskAssistant} className="pt-3 border-t border-slate-800 space-y-2">
                <input
                  type="text"
                  placeholder="e.g. Which topic seems difficult for students?"
                  value={assistantQuery}
                  onChange={(e) => setAssistantQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={assistantLoading}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold"
                >
                  {assistantLoading ? 'Analyzing...' : 'Ask AI Assistant'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: ADAPTIVE QUIZ */}
          {activeTab === 'quiz' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {!activeQuiz ? (
                <div className="text-center py-12 space-y-3">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No active quiz. Instructor can launch a state-adaptive micro-quiz anytime.</p>
                </div>
              ) : quizSubmitted ? (
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-5">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <div>
                    <h4 className="text-base font-bold text-slate-100">Quiz Completed</h4>
                    <p className="text-3xl font-extrabold text-cyan-400 mt-1">{quizResult?.score_percentage}% Score</p>
                    <p className="text-xs text-emerald-400 mt-0.5">{quizResult?.affective_recovery_status}</p>
                  </div>

                  <div className="space-y-3 text-left pt-2 border-t border-slate-800">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Answer Review & AI Explanations</h5>
                    {activeQuiz.questions?.map((q: any, qIdx: number) => (
                      <div key={qIdx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                        <p className="font-semibold text-slate-200">{qIdx + 1}. {q.question}</p>
                        <div className="space-y-1">
                          {q.options?.map((opt: string, optIdx: number) => {
                            const isSelected = selectedAnswers[qIdx] === optIdx;
                            const isCorrect = q.correct_index === optIdx;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2 rounded-lg text-xs flex justify-between items-center ${
                                  isCorrect
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold'
                                    : isSelected
                                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                                    : 'bg-slate-950 text-slate-400'
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <p className="text-[11px] text-cyan-300 bg-cyan-950/40 p-2 rounded border border-cyan-800/40 leading-relaxed">
                            <span className="font-bold">AI Explanation:</span> {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
                    <p className="font-bold">Micro-Quiz: {activeQuiz.topic}</p>
                  </div>

                  {activeQuiz.questions?.map((q: any, qIdx: number) => (
                    <div key={qIdx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                      <p className="font-semibold text-slate-200">{qIdx + 1}. {q.question}</p>
                      <div className="space-y-1.5">
                        {q.options?.map((opt: string, optIdx: number) => (
                          <button
                            key={optIdx}
                            onClick={() => {
                              const newAns = [...selectedAnswers];
                              newAns[qIdx] = optIdx;
                              setSelectedAnswers(newAns);
                            }}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                              selectedAnswers[qIdx] === optIdx
                                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleSubmitQuiz}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Submit Quiz Answers
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* INDIVIDUAL STUDENT REPORT MODAL */}
      {showStudentReportModal && selectedStudentReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{selectedStudentReport.student_name}</h3>
                <p className="text-xs text-slate-400">{selectedStudentReport.email}</p>
              </div>
              <button
                onClick={() => setShowStudentReportModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 uppercase">Attendance</p>
                <p className="text-sm font-bold text-cyan-400 mt-0.5">{selectedStudentReport.attendance}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 uppercase">Avg Engagement</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">{selectedStudentReport.average_engagement_pct}%</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 uppercase">Quiz Score</p>
                <p className="text-sm font-bold text-purple-400 mt-0.5">{selectedStudentReport.quiz_score}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Webcam Telemetry Status:</span>
                <span className="font-semibold text-emerald-400">{selectedStudentReport.webcam_status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confusion Events:</span>
                <span className="font-semibold text-amber-400">{selectedStudentReport.confusion_events_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Interventions Received:</span>
                <span className="font-semibold text-indigo-400">{selectedStudentReport.interventions_received}</span>
              </div>
            </div>

            {/* Topic Analysis */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Topic Analysis</h4>
              <div className="space-y-1.5">
                {selectedStudentReport.topic_analysis?.map((item: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between text-xs">
                    <span className="text-slate-200">{item.topic}</span>
                    <span className={`font-semibold ${item.signal.includes('High Confusion') ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {item.signal}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recommended Follow-up</h4>
              <ul className="space-y-1.5">
                {selectedStudentReport.recommendations?.map((rec: string, idx: number) => (
                  <li key={idx} className="text-xs text-cyan-300 bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/40">
                    ✓ {rec}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setShowStudentReportModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
            >
              Close Student Report
            </button>
          </div>
        </div>
      )}

      {/* POST-CLASS REPORT MODAL */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-6 h-6 text-cyan-400" />
                <span>Post-Class Analytics Report</span>
              </h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  navigate('/live');
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-xs text-slate-400">Attendance</p>
                <p className="text-xl font-bold text-cyan-400 mt-1">{reportData.average_attendance_pct}%</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-xs text-slate-400">Avg Engagement</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{reportData.average_engagement}%</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-xs text-slate-400">Avg Confusion</p>
                <p className="text-xl font-bold text-amber-400 mt-1">{reportData.average_confusion}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Difficult Sections Identified</h4>
              <ul className="space-y-1.5">
                {reportData.difficult_sections?.map((sec: string, i: number) => (
                  <li key={i} className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    • {sec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Pedagogical Recommendations</h4>
              <ul className="space-y-1.5">
                {reportData.ai_recommendations?.map((rec: string, i: number) => (
                  <li key={i} className="text-xs text-cyan-300 bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/40">
                    ✓ {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleExportCSV}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV Report</span>
              </button>

              <button
                onClick={() => {
                  setShowReportModal(false);
                  navigate('/live');
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE CLASS CONFIRMATION MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Leave this class?</h3>
              <p className="text-xs text-slate-400 mt-1">You will disconnect from the live room and return to your Student Dashboard.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg"
              >
                Leave Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER AI LIVE QUIZ GENERATOR MODAL */}
      {showLaunchQuizModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>AI Live Quiz Generator</span>
              </h3>
              <button
                onClick={() => setShowLaunchQuizModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateAndLaunchQuiz} className="space-y-4">
              {/* Quiz Topic */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Quiz Topic / Concept Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Convolutional Neural Networks & Backpropagation"
                  value={quizTopicInput}
                  onChange={(e) => setQuizTopicInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Difficulty & Question Count */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Difficulty Level</label>
                  <select
                    value={quizDifficulty}
                    onChange={(e: any) => setQuizDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="EASY">Easy (Core Definitions)</option>
                    <option value="MEDIUM">Medium (Balanced Applications)</option>
                    <option value="HARD">Hard (Advanced Problem Solving)</option>
                    <option value="ADAPTIVE">Adaptive (Dynamic Real-Time)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Number of Questions</label>
                  <select
                    value={quizNumQuestions}
                    onChange={(e: any) => setQuizNumQuestions(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={3}>3 Questions (Micro-Check)</option>
                    <option value={5}>5 Questions (Standard Quiz)</option>
                    <option value={10}>10 Questions (Full Diagnostic)</option>
                  </select>
                </div>
              </div>

              {/* Lecture Notes & Textbook File Upload */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">Upload Notes / Textbook (Optional)</label>
                  {quizFileName && <span className="text-[10px] font-mono text-emerald-400">📄 {quizFileName}</span>}
                </div>

                <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-950/60 transition-all text-center">
                  <FileUp className="w-5 h-5 text-indigo-400 mb-1" />
                  <span className="text-[11px] font-semibold text-slate-300">
                    {quizFileName ? `Attached: ${quizFileName}` : 'Click to Upload PDF, TXT, MD, or DOC file'}
                  </span>
                  <span className="text-[10px] text-slate-500">AI will ground quiz questions in this document</span>
                  <input
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx,.json,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Paste Text Notes Area */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Or Paste Textbook / Lecture Notes Excerpt</label>
                <textarea
                  rows={3}
                  placeholder="Paste lecture notes or textbook excerpt here..."
                  value={quizNotesText}
                  onChange={(e) => setQuizNotesText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLaunchQuizModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isGeneratingQuiz}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGeneratingQuiz ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Generating Quiz with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate & Launch Quiz</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassroomView;
