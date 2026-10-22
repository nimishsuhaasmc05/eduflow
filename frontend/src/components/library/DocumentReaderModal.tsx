import React, { useState, useMemo } from 'react';
import { LibraryResource } from '../../types/library';
import { GeminiStudyAssistant } from './GeminiStudyAssistant';
import { getDocumentSection } from '../../utils/documentContentService';
import { 
  X, ChevronLeft, ChevronRight, BookOpen, Bookmark, 
  Code2, CheckCircle2, Sigma, Lightbulb, Clock, Layers 
} from 'lucide-react';

interface DocumentReaderModalProps {
  resource: LibraryResource;
  onClose: () => void;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({ resource, onClose }) => {
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [isSaved, setIsSaved] = useState<boolean>(resource.is_saved);

  // Pre-generate chapter metadata for the left sidebar (6 distinct chapters per volume)
  const chapters = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map(chNum => {
      const sec = getDocumentSection(resource, chNum);
      return {
        number: chNum,
        title: sec.chapterTitle,
        subtitle: sec.subtitle,
      };
    });
  }, [resource]);

  const activeSection = useMemo(() => {
    return getDocumentSection(resource, currentChapter);
  }, [resource, currentChapter]);

  const handlePrev = () => {
    if (currentChapter > 1) setCurrentChapter(currentChapter - 1);
  };

  const handleNext = () => {
    if (currentChapter < 6) setCurrentChapter(currentChapter + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fade-in">
      <div className="bg-white dark:bg-[#0c1219] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Top Header Bar */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0f1722] px-6 flex items-center justify-between shrink-0 font-sans">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {resource.title}
              </h2>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {resource.author} • <span className="text-cyan-600 dark:text-cyan-400 font-bold">{resource.resource_type} • Chapter {currentChapter} of 6</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 border transition-all ${
                isSaved 
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 shadow-xs' 
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'SAVED' : 'SAVE'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-COLUMN READER LAYOUT */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* COLUMN 1: LEFT CHAPTER NAVIGATION */}
          <div className="hidden lg:block lg:col-span-3 border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#090e15] p-4 overflow-y-auto font-sans text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                TABLE OF CONTENTS
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                6 CHAPTERS
              </span>
            </div>

            <div className="space-y-1.5">
              {chapters.map((ch) => (
                <button
                  key={ch.number}
                  onClick={() => setCurrentChapter(ch.number)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all ${
                    currentChapter === ch.number 
                      ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-900 dark:text-cyan-300 font-bold shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className={currentChapter === ch.number ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-slate-400'}>
                      CHAPTER 0{ch.number}
                    </span>
                    {currentChapter === ch.number && (
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950 font-black text-[9px]">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs leading-snug line-clamp-1">
                    {ch.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                    {ch.subtitle}
                  </p>
                </button>
              ))}
            </div>

            {/* Course Association Tag */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 font-mono text-[11px] space-y-1 text-slate-500">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">COURSE CURRICULUM</span>
              <span className="block text-slate-800 dark:text-slate-300 font-semibold">{resource.course_association || 'General Engineering'}</span>
            </div>
          </div>

          {/* COLUMN 2: CENTER DOCUMENT VIEWER */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-white dark:bg-[#0c1219] p-6 md:p-8 overflow-y-auto">
            
            {/* Main Document Content */}
            <div className="space-y-6 max-w-3xl">
              
              {/* Chapter Header */}
              <div className="space-y-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                  <span>CHAPTER 0{activeSection.chapterNumber}</span>
                  <span>•</span>
                  <span>{resource.category}</span>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {activeSection.chapterTitle}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {activeSection.subtitle}
                </p>
              </div>

              {/* Executive Summary */}
              <div className="bg-slate-50 dark:bg-[#111923] p-4 md:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>EXECUTIVE OVERVIEW</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {activeSection.summary}
                </p>
              </div>

              {/* Core Concepts Badges */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  KEY PRINCIPLES & MECHANISMS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeSection.concepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 font-mono text-xs font-bold"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mathematical Formulation or Invariant */}
              {activeSection.formulaOrRule && (
                <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 space-y-1.5 shadow-md">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 uppercase">
                    <Sigma className="w-3.5 h-3.5" />
                    <span>MATHEMATICAL FORMULATION / INVARIANT</span>
                  </div>
                  <code className="block font-mono text-xs text-amber-300 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 overflow-x-auto">
                    {activeSection.formulaOrRule}
                  </code>
                </div>
              )}

              {/* Code Snippet / Algorithm Implementation */}
              {activeSection.codeSnippet && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase">
                    <div className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-cyan-500" />
                      <span>SOURCE CODE IMPLEMENTATION</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono uppercase">
                      {activeSection.codeSnippet.language}
                    </span>
                  </div>
                  <pre className="bg-[#070b10] text-emerald-400 p-4 rounded-2xl border border-slate-800 overflow-x-auto font-mono text-xs leading-relaxed shadow-inner">
                    <code>{activeSection.codeSnippet.code}</code>
                  </pre>
                </div>
              )}

              {/* Deep Dive Discussion */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  ENGINEERING ANALYSIS & TRADE-OFFS
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans font-normal">
                  {activeSection.deepDive}
                </p>
              </div>

              {/* Key Takeaways */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  CRITICAL CHAPTER TAKEAWAYS
                </span>
                <div className="space-y-1.5">
                  {activeSection.takeaways.map((takeaway, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{takeaway}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Pagination Control Bar */}
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between font-mono text-xs">
              <button
                onClick={handlePrev}
                disabled={currentChapter <= 1}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-40 flex items-center space-x-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>PREV CHAPTER</span>
              </button>

              <span className="text-slate-500 dark:text-slate-400 font-bold">
                CHAPTER {currentChapter} OF 6
              </span>

              <button
                onClick={handleNext}
                disabled={currentChapter >= 6}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-40 flex items-center space-x-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <span>NEXT CHAPTER</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* COLUMN 3: RIGHT GEMINI STUDY ASSISTANT */}
          <div className="lg:col-span-3 h-full overflow-hidden border-l border-slate-200 dark:border-slate-800/80">
            <GeminiStudyAssistant resource={resource} currentPage={currentChapter} />
          </div>

        </div>

      </div>
    </div>
  );
};
