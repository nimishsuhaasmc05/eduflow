import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Activity, ShieldCheck, Zap, Bot } from 'lucide-react';

export interface HeroSlide {
  id: number;
  image: string;
  badge: string;
  title: string;
  description: string;
  telemetry: {
    attention: number;
    confusion: number;
    fps: number;
    mode: string;
  };
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&auto=format&fit=crop&q=80",
    badge: "VISION TELEMETRY",
    title: "Real-Time Engagement Detection",
    description: "Tracks focus and confusion as you learn, entirely on-device.",
    telemetry: { attention: 86, confusion: 12, fps: 44, mode: "ON-DEVICE" }
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&auto=format&fit=crop&q=80",
    badge: "PRIVACY GUARANTEE",
    title: "Privacy-First by Design",
    description: "No raw video ever leaves your browser.",
    telemetry: { attention: 91, confusion: 5, fps: 45, mode: "SECURE" }
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&auto=format&fit=crop&q=80",
    badge: "ADAPTIVE ENGINE",
    title: "Adaptive Micro-Quizzes",
    description: "Quizzes trigger automatically when attention drops.",
    telemetry: { attention: 74, confusion: 28, fps: 42, mode: "INTERVENTIONAL" }
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop&q=80",
    badge: "GEMINI TUTOR",
    title: "Closed-Loop AI Tutoring",
    description: "Your feedback loop adjusts content in real time.",
    telemetry: { attention: 89, confusion: 8, fps: 45, mode: "ACTIVE" }
  }
];

export const HeroCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  const slide = HERO_SLIDES[currentIndex];

  return (
    <div
      className="relative rounded-md overflow-hidden border border-[#26323A] bg-[#080B0F] group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Images Layer */}
      <div className="relative w-full h-[400px] md:h-[450px] overflow-hidden">
        {HERO_SLIDES.map((item, idx) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            {/* Scrim Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080B0F] via-[#080B0F]/50 to-transparent" />
          </div>
        ))}

        {/* Diagnostic Telemetry HUD Overlays (Upper Right) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end space-y-1 font-mono text-[10px]">
          <div className="bg-[#080B0F]/90 backdrop-blur-md px-2.5 py-1 border border-[#26323A] rounded flex items-center space-x-2 text-[#22D3EE]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse"></span>
            <span className="font-bold">LIVE TELEMETRY</span>
            <span className="text-slate-400">|</span>
            <span>{slide.telemetry.fps} FPS</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <div className="bg-[#080B0F]/90 backdrop-blur-md px-2 py-0.5 border border-[#26323A] rounded text-[#22D3EE] font-bold">
              ATTENTION <span className="text-white">{slide.telemetry.attention}%</span>
            </div>
            <div className="bg-[#080B0F]/90 backdrop-blur-md px-2 py-0.5 border border-[#26323A] rounded text-[#F59E0B] font-bold">
              CONFUSION <span className="text-white">{slide.telemetry.confusion}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Captions & Navigation Controls (Lower Area) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 space-y-3">
        <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 border border-[#22D3EE]/40 bg-[#080B0F]/90 text-[#22D3EE] text-[10px] font-mono font-bold tracking-wider rounded">
          <Activity className="w-3 h-3" />
          <span>{slide.badge}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-300">{slide.telemetry.mode}</span>
        </div>

        <div className="space-y-1 max-w-lg">
          <h3 className="text-2xl font-extrabold text-white leading-tight">
            {slide.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {slide.description}
          </p>
        </div>

        {/* Carousel Bottom Control Bar */}
        <div className="pt-2 flex items-center justify-between border-t border-[#26323A]">
          {/* Telemetry Counter */}
          <div className="font-mono text-xs text-slate-400 font-bold flex items-center space-x-1">
            <span className="text-[#22D3EE]">0{currentIndex + 1}</span>
            <span>/</span>
            <span>0{HERO_SLIDES.length}</span>
          </div>

          {/* Dot Indicators */}
          <div className="flex items-center space-x-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 transition-all duration-300 rounded-sm ${
                  i === currentIndex ? 'w-6 bg-[#22D3EE]' : 'w-2 bg-slate-600 hover:bg-slate-400'
                }`}
                title={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Arrow Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded bg-[#11171D] border border-[#26323A] text-slate-300 hover:text-white hover:border-[#22D3EE] transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded bg-[#11171D] border border-[#26323A] text-slate-300 hover:text-white hover:border-[#22D3EE] transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
