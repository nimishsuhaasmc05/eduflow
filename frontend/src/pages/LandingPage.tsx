import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, ArrowRight, Activity, Lock, Cpu, Layers } from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { ScrollStackGroup } from '../components/common/ScrollStackGroup';

export const LandingPage: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Compute smooth hero scale down as user scrolls down
  const heroScale = Math.max(0.94, 1 - scrollY * 0.0003);
  const heroOpacity = Math.max(0.7, 1 - scrollY * 0.0008);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-150 font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Editorial Navigation Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-extrabold text-sm shadow-md">
              <BrainCircuit className="w-5 h-5 text-cyan-600 dark:text-cyan-500" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-sans">
                Edu<span className="text-cyan-600 dark:text-cyan-400">-Flow</span>
              </span>
              <span className="hidden sm:inline-block ml-3 text-xs font-mono font-semibold tracking-wider px-2.5 py-0.5 rounded border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900">
                Editorial Intelligence v2.5
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />

            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-800 hover:border-cyan-500 transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md flex items-center space-x-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION WITH SCROLL TRANSITION */}
      <section className="relative pt-6 pb-12 px-6 max-w-7xl mx-auto overflow-hidden">
        <div 
          className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl transition-transform duration-200 ease-out p-8 md:p-12"
          style={{
            transform: `scale(${heroScale})`,
            opacity: heroOpacity
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-5 z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700/80 text-cyan-400 text-xs font-mono font-medium backdrop-blur-md">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>On-Device Affective Computing</span>
                </span>
                <span className="hidden sm:inline-flex items-center space-x-1.5 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800 text-xs font-mono text-slate-300 font-medium">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Privacy Secured</span>
                </span>
                <span className="hidden sm:inline-flex items-center space-x-1.5 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800 text-xs font-mono text-slate-300 font-medium">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gemini AI Engine</span>
                </span>
              </div>

              <h1 className="editorial-title text-white font-black tracking-tight leading-[1.05] text-3xl md:text-5xl">
                Adaptive Learning <br />
                <span className="text-cyan-400">that responds to you.</span>
              </h1>

              <p className="editorial-subtitle text-slate-300 max-w-xl font-sans leading-relaxed text-sm">
                Edu-Flow measures computer vision facial landmark signals directly in your browser to personalize video explanations, adapt quiz difficulty, and optimize focus.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  to="/courses"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20"
                >
                  <span>Explore Catalog & Start</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-600 hover:border-slate-500 text-white font-mono font-bold text-xs transition-colors text-center backdrop-blur-md shadow-sm"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Right Hero Photographic Frame (Proportioned & Responsive) */}
            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl max-h-[340px] aspect-[4/3] w-full hero-photo-frame">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&auto=format&fit=crop&q=80"
                alt="Edu-Flow Adaptive Learning Platform"
                className="w-full h-full object-cover filter brightness-[0.9] contrast-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3.5 left-3.5 right-3.5 px-3.5 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700/80 text-xs font-mono text-white flex items-center justify-between shadow-lg pointer-events-none">
                <span className="font-bold text-cyan-400">Vision Telemetry Engine</span>
                <span className="text-slate-300 font-medium">30 FPS Sampling</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ZENBRIX-INSPIRED EDITORIAL STACKED CARDS SECTION */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-10">
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5" />
            <span>System Capabilities • Editorial Card Stacking</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
            Designed for Educational Intelligence
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl font-sans leading-relaxed">
            Scroll down to watch our core pedagogical intelligence layers join and physically stack together.
          </p>
        </div>

        <ScrollStackGroup baseTopPx={85} topOffsetStepPx={32}>
          {/* Card 01: Intelligent Learning */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 md:p-8 items-center bg-white dark:bg-slate-900 min-h-[380px]">
            <div className="md:col-span-6 space-y-3.5">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  01
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
                  Intelligent Learning
                </h3>
              </div>
              <p className="text-base text-slate-800 dark:text-slate-200 font-semibold font-sans leading-snug">
                "Learning that responds to the student, not just the syllabus."
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                EduFlow continuously analyzes engagement patterns to adjust instructional pacing, ensuring every learner masters foundational concepts before advancing.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-sans text-slate-600 dark:text-slate-400">
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Adaptive Pacing</span>
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Student-Centric AI</span>
              </div>
            </div>

            <div className="md:col-span-6 aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80"
                alt="Intelligent Learning System"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                <span className="font-mono text-xs text-cyan-400 font-semibold">Real-Time Instructional Attunement</span>
              </div>
            </div>
          </div>

          {/* Card 02: Closed-Loop Learning Adaptation */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 md:p-8 items-center bg-white dark:bg-slate-900 min-h-[380px]">
            <div className="md:col-span-6 space-y-3.5">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  02
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
                  Closed-Loop Learning Adaptation
                </h3>
              </div>
              <p className="text-base text-slate-800 dark:text-slate-200 font-semibold font-sans leading-snug">
                "When confusion or distraction is detected, Edu-Flow dynamically presents simplified explanations, Socratic hints, or interactive diagnostic micro-quizzes."
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                Sustained cognitive struggle triggers targeted assistance without breaking lecture immersion, preventing knowledge gaps from cascading.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-sans text-slate-600 dark:text-slate-400">
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Socratic Dialogue</span>
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Micro-Quizzes</span>
              </div>
            </div>

            <div className="md:col-span-6 aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1000&auto=format&fit=crop&q=80"
                alt="Closed-Loop Learning Adaptation"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                <span className="font-mono text-xs text-cyan-400 font-semibold">Dynamic Intervention Engine</span>
              </div>
            </div>
          </div>

          {/* Card 03: Privacy-First Isolated Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 md:p-8 items-center bg-white dark:bg-slate-900 min-h-[380px]">
            <div className="md:col-span-6 space-y-3.5">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  03
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
                  Privacy-First Isolated Telemetry
                </h3>
              </div>
              <p className="text-base text-slate-800 dark:text-slate-200 font-semibold font-sans leading-snug">
                "Learning signals are processed as privacy-conscious derived telemetry rather than stored raw webcam footage."
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                Webcam frames are analyzed strictly in client-side RAM using lightweight browser computer vision. Zero video or raw image frames ever touch our servers or persistent disks.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-sans text-slate-600 dark:text-slate-400">
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Client-Side RAM</span>
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Zero Raw Recording</span>
              </div>
            </div>

            <div className="md:col-span-6 aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&auto=format&fit=crop&q=80"
                alt="Privacy-First Isolated Telemetry"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                <span className="font-mono text-xs text-cyan-400 font-semibold">On-Device Perceptual Pipeline</span>
              </div>
            </div>
          </div>

          {/* Card 04: Detect -> Intervene */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 md:p-8 items-center bg-white dark:bg-slate-900 min-h-[380px]">
            <div className="md:col-span-6 space-y-3.5">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  04
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
                  Detect → Intervene
                </h3>
              </div>
              <p className="text-base text-slate-800 dark:text-slate-200 font-semibold font-sans leading-snug">
                "EduFlow identifies meaningful changes in learning engagement and responds with contextual support."
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                By decoupling perceptual metrics (gaze, blink rate, head pose) from academic knowledge states, interventions are timely, grounded, and anti-spam debounced with 60s cooldowns.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-sans text-slate-600 dark:text-slate-400">
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Debounced Triggers</span>
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Grounded Context</span>
              </div>
            </div>

            <div className="md:col-span-6 aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1000&auto=format&fit=crop&q=80"
                alt="Detect to Intervene Flow"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                <span className="font-mono text-xs text-cyan-400 font-semibold">State-Adapted Pedagogy</span>
              </div>
            </div>
          </div>

          {/* Card 05: Measure -> Adapt */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 md:p-8 items-center bg-white dark:bg-slate-900 min-h-[380px]">
            <div className="md:col-span-6 space-y-3.5">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  05
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
                  Measure → Adapt
                </h3>
              </div>
              <p className="text-base text-slate-800 dark:text-slate-200 font-semibold font-sans leading-snug">
                "Intervention outcomes inform what happens next, creating a continuous adaptive learning loop."
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                Post-quiz recovery telemetry, weak topic recommendations, and video timestamp bookmarks calibrate subsequent recommendations for long-term learning retention.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-sans text-slate-600 dark:text-slate-400">
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Closed-Loop Measure</span>
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium"># Long-Term Mastery</span>
              </div>
            </div>

            <div className="md:col-span-6 aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000&auto=format&fit=crop&q=80"
                alt="Measure to Adapt Loop"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                <span className="font-mono text-xs text-cyan-400 font-semibold">Continuous Mastery Refinement</span>
              </div>
            </div>
          </div>
        </ScrollStackGroup>
      </section>

      {/* 3. STICKY SCROLL-DRIVEN LEARNING INTELLIGENCE NARRATIVE */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Sticky Anchor Visual */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl relative">
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80"
                alt="Student Engaged in Adaptive Learning"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-end p-6 text-white space-y-2">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  Live Cognitive Anchor
                </span>
                <h4 className="text-xl font-bold">Continuous Learner Signal Monitoring</h4>
                <p className="text-xs text-slate-300">As you scroll, Edu-Flow evaluates focus indicators to optimize learning efficiency.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Scrolling Narrative Blocks */}
          <div className="lg:col-span-7 space-y-12 py-2">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">01 / Real-Time Signals</span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Subtle Attention Indicators
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                Edu-Flow monitors non-invasive facial landmarks (head direction, gaze concentration, blink intervals) to form an ongoing engagement signal.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <span>Attention Score: 88%</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                  Gaze: On-Screen
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">02 / Adaptive Quizzes</span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Contextual Socratic Interventions
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                When confusion is detected over a 15-second window, Edu-Flow automatically pauses the lecture to present a 3-question adaptive micro-quiz.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>Confusion Hotspot: Solved</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                  Quiz Score: 100%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">03 / AI Explanations</span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Multimodal Course Guidance
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                Ask questions at any time. The Gemini AI Tutor reads video captions, transcript timelines, and course notes to give precise step-by-step guidance.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                  Gemini 2.5 Flash
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                  Response Latency: 320ms
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">04 / Learning Reports</span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Instructor Pedagogical Telemetry
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                Instructors receive automated post-class reports highlighting precise timestamps where students experienced confusion, enabling targeted curriculum refinement.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                  Class Attendance: 92%
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                  Export: CSV Report
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. AFFECTIVE COMPUTING SECTION */}
      <section className="py-20 px-6 max-w-7xl mx-auto bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-bold tracking-wider">
              Affective Telemetry Engine
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Edu-Flow understands how you are learning.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-lg">
              By monitoring subtle facial landmark metrics locally in client RAM, Edu-Flow measures attention indicators and confusion signals to deliver closed-loop educational responses.
            </p>

            {/* Diagnostic Signals Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Attention Signal</span>
                <p className="text-lg font-bold text-cyan-400">88% Focused</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Confusion Signal</span>
                <p className="text-lg font-bold text-slate-200">12% Low</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Cognitive Load</span>
                <p className="text-lg font-bold text-cyan-400">38% Balanced</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Adaptive Response</span>
                <p className="text-lg font-bold text-cyan-400">Optimal</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"
                alt="Learner Affective Vision Detection"
                className="w-full h-full object-cover filter contrast-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-6">
                <div className="text-xs font-mono text-cyan-400 bg-slate-950/90 px-3 py-1.5 rounded-lg border border-cyan-800/60 inline-block">
                  OpenCV Mesh • 468 Landmark Vectors
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION & FOOTER */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Ready to experience adaptive learning?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Join students and instructors utilizing on-device cognitive vision and multimodal AI tutoring today.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all shadow-xl hover:scale-105 flex items-center justify-center space-x-2 shadow-cyan-500/20"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs hover:border-cyan-500 transition-colors text-center"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Editorial Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-8 px-6 text-center text-slate-500 dark:text-slate-400 text-xs font-mono">
        Edu-Flow v2.5 • Editorial Educational Intelligence • Closed-Loop MediaPipe & Gemini 2.5 Architecture
      </footer>
    </div>
  );
};

export default LandingPage;

