import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, CameraOff, Mic, MicOff, Video, Users, UserCheck, 
  ArrowRight, Shield, AlertCircle, Sparkles, BookOpen 
} from 'lucide-react';

import { getStoredToken } from '../services/api';

interface ClassLobbyDetails {
  class_id: number;
  title: string;
  teacher_name: string;
  course_title?: string;
  module_title?: string;
  class_code: string;
  join_token: string;
  status: string;
}

export const LiveClassLobby: React.FC = () => {
  const { joinToken } = useParams<{ joinToken: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [classDetails, setClassDetails] = useState<ClassLobbyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Media Device Toggles
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);

  // Local Preview Video Stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (joinToken) {
      validateClassToken(joinToken);
    }
    return () => {
      stopPreviewStream();
    };
  }, [joinToken]);

  useEffect(() => {
    if (cameraActive) {
      startPreviewStream();
    } else {
      stopPreviewStream();
    }
  }, [cameraActive]);

  const validateClassToken = async (tokenStr: string) => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/v1/live-classes/validate-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ token_or_code: tokenStr })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setClassDetails(data);
      } else {
        setError(data.error_message || 'Class code or link not valid.');
      }
    } catch (e) {
      setError('Unable to connect to live classroom server.');
    } finally {
      setLoading(false);
    }
  };

  const startPreviewStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera preview access denied or unavailable:', err);
      setCameraActive(false);
    }
  };

  const stopPreviewStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleJoinClass = async () => {
    if (!classDetails) return;

    try {
      const token = getStoredToken();
      await fetch(`/api/v1/live-classes/${classDetails.class_id}/join`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });

      // Save user media preferences in sessionStorage for classroom initialization
      sessionStorage.setItem(`live_cam_${classDetails.join_token}`, cameraActive ? 'true' : 'false');
      sessionStorage.setItem(`live_mic_${classDetails.join_token}`, micActive ? 'true' : 'false');

      navigate(`/live/${classDetails.join_token}/room`);
    } catch (err) {
      console.error('Error joining class session:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-cyan-400 font-mono text-xs font-bold">
        VALIDATING LIVE CLASSROOM PERMISSIONS...
      </div>
    );
  }

  if (error || !classDetails) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Unable to Join Class</h2>
          <p className="text-sm text-slate-400">{error || 'This live class is currently unavailable.'}</p>
        </div>
        <button
          onClick={() => navigate('/live')}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
        >
          Return to Live Classes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Header Info */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE CLASSROOM READY</span>
            </span>
            <h1 className="text-2xl font-bold text-slate-100">{classDetails.title}</h1>
            <p className="text-sm text-slate-400">Instructor: <span className="text-slate-200 font-semibold">{classDetails.teacher_name}</span></p>
          </div>

          <div className="text-right font-mono text-xs space-y-1 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <p className="text-slate-400">Class Code: <span className="text-cyan-400 font-bold">{classDetails.class_code}</span></p>
            <p className="text-slate-400">Topic: <span className="text-slate-200">{classDetails.course_title || 'General Lecture'}</span></p>
          </div>
        </div>
      </div>

      {/* Lobby Device Setup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Camera Preview Box */}
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between aspect-video md:aspect-auto">
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="w-full h-64 md:h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <CameraOff className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-400">
                Camera is <span className="text-slate-200 font-semibold">OFF</span>. You can still join and participate in the live classroom normally.
              </p>
            </div>
          )}

          {/* Device Controls Overlay */}
          <div className="p-4 bg-gradient-to-t from-slate-950/90 to-transparent flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCameraActive(!cameraActive)}
              className={`p-3 rounded-full border transition-all ${
                cameraActive
                  ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
              }`}
              title={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {cameraActive ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => setMicActive(!micActive)}
              className={`p-3 rounded-full border transition-all ${
                micActive
                  ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
              }`}
              title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Classroom Info & Join Action */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span>Privacy & Classroom Policies</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <p>
                  <strong className="text-slate-200">No Raw Video Storage:</strong> Student webcam feeds are processed locally for affective engagement state metrics only.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <p>
                  <strong className="text-slate-200">Camera Optional:</strong> Joining with Camera OFF sets telemetry to <code className="text-cyan-400">UNKNOWN</code> without restricting classroom access.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <p>
                  <strong className="text-slate-200">Real-Time Interaction:</strong> Ask questions, participate in micro-quizzes, and use Socratic AI Tutor anytime.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800">
            <button
              onClick={handleJoinClass}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>JOIN LIVE CLASSROOM</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/live')}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveClassLobby;
