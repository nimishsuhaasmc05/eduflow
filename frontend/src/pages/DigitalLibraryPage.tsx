import React, { useState, useMemo, useEffect } from 'react';
import { LibraryResource, LibraryFilter, GeminiTopicBreakdown } from '../types/library';
import { INITIAL_LIBRARY_RESOURCES } from '../utils/libraryData';
import { DocumentReaderModal } from '../components/library/DocumentReaderModal';
import { libraryApi } from '../services/api';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { 
  BookOpen, Search, Bookmark, Sparkles, ArrowRight, 
  RefreshCw, AlertTriangle, X, RotateCcw 
} from 'lucide-react';

export const DigitalLibraryPage: React.FC = () => {
  useEffect(() => {
    document.title = 'EduFlow | Digital Library';
  }, []);
  const [resources, setResources] = useState<LibraryResource[]>(INITIAL_LIBRARY_RESOURCES);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [activeSearchTerm, setActiveSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('All');
  const [activeTab, setActiveTab] = useState<'home' | 'my_library' | 'research'>('home');
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);

  // Gemini Topic Breakdown State
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [geminiResult, setGeminiResult] = useState<GeminiTopicBreakdown | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [lastGeminiQuery, setLastGeminiQuery] = useState<string>('');

  const filters: LibraryFilter[] = ['All', 'Course Resources', 'PDFs', 'Research Papers', 'Notes', 'Books', 'Saved'];

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResources(prev => prev.map(r => r.id === id ? { ...r, is_saved: !r.is_saved } : r));
  };

  // Query normalization helper
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Live Auto-suggestions dropdown while typing
  const suggestions = useMemo(() => {
    const q = normalize(inputQuery);
    if (!q || q.length < 2) return [];
    return resources.filter(r => {
      const titleNorm = normalize(r.title);
      const catNorm = normalize(r.category);
      const tagsNorm = r.tags ? r.tags.map(normalize) : [];
      return titleNorm.includes(q) || catNorm.includes(q) || tagsNorm.some(t => t.includes(q));
    }).slice(0, 4);
  }, [inputQuery, resources]);

  // Execute Local Search - Immediately reset stale Gemini state
  const handleExecuteSearch = (queryToSearch?: string) => {
    const term = (queryToSearch !== undefined ? queryToSearch : inputQuery).trim();
    setIsSearching(true);
    setShowSuggestions(false);
    
    // Clear stale Gemini breakdown immediately upon new search
    setGeminiResult(null);
    setGeminiError(null);

    setTimeout(() => {
      setActiveSearchTerm(term);
      setIsSearching(false);
    }, 150);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteSearch();
  };

  const handleClearSearch = () => {
    setInputQuery('');
    setActiveSearchTerm('');
    setShowSuggestions(false);
    setGeminiResult(null);
    setGeminiError(null);
  };

  // Main Filtering Engine: Search Query + Category Filter
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      if (activeSearchTerm.trim()) {
        const rawQ = activeSearchTerm.toLowerCase();
        const normQ = normalize(activeSearchTerm);

        const titleMatch = r.title.toLowerCase().includes(rawQ) || normalize(r.title).includes(normQ);
        const excerptMatch = r.excerpt.toLowerCase().includes(rawQ) || normalize(r.excerpt).includes(normQ);
        const authorMatch = r.author.toLowerCase().includes(rawQ) || normalize(r.author).includes(normQ);
        const categoryMatch = r.category.toLowerCase().includes(rawQ) || normalize(r.category).includes(normQ);
        const courseMatch = r.course_association ? (r.course_association.toLowerCase().includes(rawQ) || normalize(r.course_association).includes(normQ)) : false;
        const tagMatch = r.tags ? r.tags.some(t => t.toLowerCase().includes(rawQ) || normalize(t).includes(normQ)) : false;

        const isDSAMatch = (normQ.includes('datastructure') || normQ.includes('dsa') || normQ.includes('data')) &&
                           (normalize(r.title).includes('datastructure') || normalize(r.title).includes('dsa') || (r.tags && r.tags.some(t => t.includes('dsa') || t.includes('data structures'))));

        const isCNNMatch = (normQ.includes('cnn') || normQ.includes('deeplearning')) && 
                           (normalize(r.title).includes('cnn') || normalize(r.title).includes('deeplearning') || (r.tags && r.tags.some(t => t.includes('cnn') || t.includes('deep learning'))));

        const isPostgresMatch = (normQ.includes('postgres') || normQ.includes('sql')) && 
                                (normalize(r.title).includes('postgres') || normalize(r.title).includes('sql'));

        const isLandmarkMatch = (normQ.includes('landmark') || normQ.includes('facial')) && 
                                (normalize(r.title).includes('landmark') || normalize(r.title).includes('facial'));

        const matches = titleMatch || excerptMatch || authorMatch || categoryMatch || courseMatch || tagMatch || isDSAMatch || isCNNMatch || isPostgresMatch || isLandmarkMatch;

        if (!matches) return false;
      }

      if (activeFilter === 'Saved') return r.is_saved;
      if (activeFilter === 'PDFs') return r.resource_type === 'PDF';
      if (activeFilter === 'Research Papers') return r.resource_type === 'Research Paper';
      if (activeFilter === 'Notes') return r.resource_type === 'Notes';
      if (activeFilter === 'Books') return r.resource_type === 'Book';
      if (activeFilter === 'Course Resources') return !!r.course_association;

      return true;
    });
  }, [resources, activeSearchTerm, activeFilter]);

  // REAL GEMINI TOPIC BREAKDOWN CALL WITH EXACT QUERY GROUNDING & BLUE THEME
  const handleAskGeminiTopic = async (overrideQuery?: string) => {
    const q = overrideQuery || activeSearchTerm || inputQuery || "Data Structures";
    setLastGeminiQuery(q);
    setGeminiLoading(true);
    setGeminiError(null);
    
    // Clear stale state immediately before sending request
    setGeminiResult(null);

    try {
      const data = await libraryApi.askGeminiTopic(q);
      if (data.error_code || data.error_message) {
        setGeminiError(data.error_message || "AI service is temporarily unavailable.");
      } else {
        setGeminiResult(data);
      }
    } catch (err: any) {
      console.error("Gemini Topic Breakdown API Error:", err);
      const status = err?.response?.status;
      if (status === 400) {
        setGeminiError("Invalid request. Please refine your query.");
      } else if (status === 401 || status === 403) {
        setGeminiError("AI service is not configured correctly.");
      } else if (status === 404) {
        setGeminiError("Gemini model configuration problem.");
      } else if (status === 429) {
        setGeminiError("Gemini rate limit reached. Please try again shortly.");
      } else {
        setGeminiError("GEMINI TEMPORARILY UNAVAILABLE. Please try again.");
      }
    } finally {
      setGeminiLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans bg-[#F5F9FC] dark:bg-[#07111F] text-[#10243A] dark:text-[#F5F9FC] min-h-screen p-2 md:p-4 rounded transition-colors duration-150">
      
      {/* Header Banner - Edu-Flow Blue Palette */}
      <div className="bg-white dark:bg-[#10243A] rounded-md border border-[#D6E3ED] dark:border-[#24425C] p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-[#F5F9FC] dark:bg-[#0B1728] border border-[#0891A5]/30 dark:border-[#27D7E8]/30 text-[#0891A5] dark:text-[#27D7E8] text-[10px] font-mono font-bold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>DIGITAL RESEARCH DATABASE & GEMINI STUDY ASSISTANT</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#10243A] dark:text-white tracking-tight font-sans">
              DIGITAL LIBRARY
            </h1>
            <p className="text-xs text-[#526B7D] dark:text-[#9FB2C5] font-sans">
              Explore, understand and learn from your study resources with document-grounded Gemini AI.
            </p>
          </div>

          {/* Controls Right: Tabs + Theme Switcher */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />

            <div className="flex items-center space-x-1 font-mono text-xs font-bold bg-[#F5F9FC] dark:bg-[#0B1728] p-1 rounded-md border border-[#D6E3ED] dark:border-[#24425C]">
              <button
                onClick={() => { setActiveTab('home'); handleClearSearch(); }}
                className={`px-3 py-1.5 rounded transition-all ${
                  activeTab === 'home' 
                    ? 'bg-[#176B87] dark:bg-[#27D7E8] text-white dark:text-[#07111F] font-bold shadow-sm' 
                    : 'text-[#526B7D] dark:text-[#9FB2C5] hover:text-[#10243A] dark:hover:text-white'
                }`}
              >
                LIBRARY HOME
              </button>

              <button
                onClick={() => setActiveTab('my_library')}
                className={`px-3 py-1.5 rounded transition-all ${
                  activeTab === 'my_library' 
                    ? 'bg-[#176B87] dark:bg-[#27D7E8] text-white dark:text-[#07111F] font-bold shadow-sm' 
                    : 'text-[#526B7D] dark:text-[#9FB2C5] hover:text-[#10243A] dark:hover:text-white'
                }`}
              >
                MY LIBRARY
              </button>

              <button
                onClick={() => setActiveTab('research')}
                className={`px-3 py-1.5 rounded transition-all ${
                  activeTab === 'research' 
                    ? 'bg-[#176B87] dark:bg-[#27D7E8] text-white dark:text-[#07111F] font-bold shadow-sm' 
                    : 'text-[#526B7D] dark:text-[#9FB2C5] hover:text-[#10243A] dark:hover:text-white'
                }`}
              >
                RESEARCH MODE
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH BAR — EDU-FLOW BLUE PALETTE */}
        <div className="relative pt-2">
          <form onSubmit={handleFormSubmit} className="relative flex items-center">
            <input
              type="text"
              placeholder="Search books, notes, papers, or try 'India', 'Data Structures', 'Photosynthesis'..."
              value={inputQuery}
              onChange={(e) => {
                setInputQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full bg-white dark:bg-[#0B1728] border border-[#D6E3ED] dark:border-[#24425C] rounded-md pl-4 pr-28 py-3 text-xs text-[#10243A] dark:text-white placeholder-[#526B7D] dark:placeholder-[#647B91] focus:outline-none focus:border-[#176B87] dark:focus:border-[#27D7E8] font-sans"
            />

            {inputQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-24 text-[#526B7D] dark:text-[#647B91] hover:text-[#10243A] dark:hover:text-white p-1"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              className="absolute right-1.5 px-4 py-2 rounded-md bg-[#176B87] dark:bg-[#27D7E8] hover:bg-[#12556b] dark:hover:bg-[#58E6F2] text-white dark:text-[#07111F] font-mono font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Search className="w-3.5 h-3.5 text-white dark:text-[#07111F]" />
              <span>SEARCH</span>
            </button>
          </form>

          {/* Search Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-[#10243A] border border-[#D6E3ED] dark:border-[#24425C] rounded-md shadow-xl font-sans overflow-hidden">
              <div className="px-3 py-1.5 border-b border-[#D6E3ED] dark:border-[#24425C] text-[10px] font-mono text-[#526B7D] dark:text-[#9FB2C5] uppercase">
                SUGGESTED LIBRARY RESOURCES
              </div>
              {suggestions.map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    setInputQuery(s.title);
                    handleExecuteSearch(s.title);
                  }}
                  className="px-3 py-2.5 hover:bg-[#F5F9FC] dark:hover:bg-[#0B1728] cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#176B87] dark:text-[#27D7E8]" />
                    <span className="font-bold text-[#10243A] dark:text-[#F5F9FC]">{s.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#526B7D] dark:text-[#9FB2C5]">{s.resource_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Filters Pill Row */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-1 font-mono text-xs">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors border ${
                activeFilter === filter
                  ? 'bg-[#176B87] dark:bg-[#27D7E8] text-white dark:text-[#07111F] font-bold border-[#176B87] dark:border-[#27D7E8]'
                  : 'bg-white dark:bg-[#10243A] text-[#10243A] dark:text-[#9FB2C5] border-[#D6E3ED] dark:border-[#24425C] hover:border-[#176B87] dark:hover:border-[#27D7E8] hover:text-[#176B87] dark:hover:text-[#58E6F2]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* ADAPTIVE RECOMMENDATION BANNER */}
      {!activeSearchTerm && (
        <div className="bg-white dark:bg-[#10243A] border-l-2 border-[#176B87] dark:border-[#27D7E8] border border-[#D6E3ED] dark:border-[#24425C] p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-[#176B87]/10 dark:bg-[#27D7E8]/10 text-[#176B87] dark:text-[#27D7E8] font-bold flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#176B87] dark:text-[#27D7E8]" />
            </div>
            <div>
              <div className="font-bold text-[#176B87] dark:text-[#27D7E8]">ADAPTIVE RECOMMENDATION • NEED A QUICK REVIEW?</div>
              <p className="text-[#10243A] dark:text-[#9FB2C5] text-xs font-sans">
                "Facial Landmark Detection & Mesh Geometry (Page 18–21)" — Related to your current attention signals.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedResource(resources[0])}
            className="px-4 py-2 rounded-md bg-[#176B87] dark:bg-[#27D7E8] hover:bg-[#12556b] dark:hover:bg-[#58E6F2] text-white dark:text-[#07111F] font-bold text-xs shrink-0 transition-colors"
          >
            REVIEW NOW →
          </button>
        </div>
      )}

      {/* DEDICATED SEARCH RESULTS HEADER WITH MONOSPACE COUNT */}
      {activeSearchTerm && (
        <div className="flex items-center justify-between border-b border-[#D6E3ED] dark:border-[#24425C] pb-3">
          <div className="space-y-0.5">
            <h2 className="text-xs font-mono font-bold uppercase text-[#10243A] dark:text-white tracking-wider flex items-center space-x-2">
              <Search className="w-4 h-4 text-[#176B87] dark:text-[#27D7E8]" />
              <span>SEARCH RESULTS</span>
            </h2>
            <p className="text-xs font-mono text-[#526B7D] dark:text-[#9FB2C5]">
              <strong className="text-[#176B87] dark:text-[#27D7E8] font-extrabold">{filteredResources.length}</strong> {filteredResources.length === 1 ? 'RESOURCE' : 'RESOURCES'} FOUND FOR "{activeSearchTerm}"
            </p>
          </div>

          <button
            onClick={handleClearSearch}
            className="text-xs font-mono font-bold text-[#526B7D] dark:text-[#9FB2C5] hover:text-[#176B87] dark:hover:text-[#27D7E8] underline"
          >
            CLEAR SEARCH
          </button>
        </div>
      )}

      {/* SEARCHING LOADING INDICATOR */}
      {isSearching ? (
        <div className="p-12 text-center bg-white dark:bg-[#10243A] rounded-md border border-[#D6E3ED] dark:border-[#24425C] space-y-3 font-mono text-xs">
          <RefreshCw className="w-6 h-6 text-[#176B87] dark:text-[#27D7E8] animate-spin mx-auto" />
          <div className="font-bold text-[#10243A] dark:text-white uppercase">SEARCHING DIGITAL LIBRARY...</div>
        </div>
      ) : filteredResources.length > 0 ? (
        /* STACKED RESOURCE CARDS GROUP */
        <div className="space-y-6">
          {filteredResources.map((res, idx) => (
            <div
              key={res.id}
              onClick={() => setSelectedResource(res)}
              className="bg-white dark:bg-[#11171D] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-cyan-500/50 transition-all duration-300 cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-6 p-6 group shadow-md hover:-translate-y-0.5"
            >
              {/* Cover Image */}
              <div className="md:col-span-4 relative aspect-video md:aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden">
                <img
                  src={res.cover_image}
                  alt={res.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                {/* Index Number Badge */}
                <div className="absolute top-3 left-3 font-mono font-black text-xl text-white/90 drop-shadow">
                  {idx < 9 ? `0${idx + 1}` : `${idx + 1}`}
                </div>

                <div className="absolute bottom-3 left-3 flex items-center space-x-2 font-mono text-[10px]">
                  <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold uppercase">
                    {res.resource_type}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-950/80 text-white font-bold border border-slate-800">
                    {res.page_count} PAGES
                  </span>
                </div>

                <button
                  onClick={(e) => toggleSave(res.id, e)}
                  className={`absolute top-3 right-3 p-2 rounded-lg backdrop-blur-md transition-colors ${
                    res.is_saved ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950/80 text-white hover:bg-slate-900'
                  }`}
                  title={res.is_saved ? "Saved" : "Save Resource"}
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Card Content Body */}
              <div className="md:col-span-8 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                      {res.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      AUTHOR: {res.author}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
                    {res.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">
                    {res.excerpt}
                  </p>
                </div>

                {/* Progress bar line */}
                <div className="space-y-1.5 font-mono text-xs pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>READING PROGRESS</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">{res.reading_progress_percent}% COMPLETED</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-800">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-300" style={{ width: `${res.reading_progress_percent}%` }} />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {res.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setSelectedResource(res)}
                    className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-mono font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
                  >
                    <span>READ RESOURCE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* EMPTY RESULT SCREEN & REAL GEMINI TOPIC EXECUTION */
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#10243A] rounded-md border border-[#D6E3ED] dark:border-[#24425C] p-8 md:p-12 text-center space-y-6 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#F5F9FC] dark:bg-[#0B1728] border border-[#176B87]/40 dark:border-[#27D7E8]/40 text-[#176B87] dark:text-[#27D7E8] flex items-center justify-center mx-auto font-mono font-bold text-xl">
              ◉
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="font-mono text-xs font-bold text-[#176B87] dark:text-[#27D7E8] uppercase tracking-wider">
                NO LIBRARY RESOURCES FOUND
              </span>
              <h2 className="text-xl font-extrabold text-[#10243A] dark:text-white">
                No library resources match "{activeSearchTerm || inputQuery || 'your query'}"
              </h2>
              <p className="text-xs text-[#526B7D] dark:text-[#9FB2C5]">
                Ask Gemini Study Assistant to explain this topic using general knowledge.
              </p>
            </div>

            {/* PRIMARY BUTTON: ASK GEMINI ABOUT THIS TOPIC */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleAskGeminiTopic()}
                disabled={geminiLoading}
                className="px-6 py-3 rounded-md bg-[#176B87] dark:bg-[#27D7E8] hover:bg-[#12556b] dark:hover:bg-[#58E6F2] text-white dark:text-[#07111F] font-mono font-extrabold text-xs transition-colors inline-flex items-center space-x-2 shadow-md disabled:opacity-50"
              >
                {geminiLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-[#07111F]" />
                ) : (
                  <Sparkles className="w-4 h-4 text-white dark:text-[#07111F]" />
                )}
                <span>ASK GEMINI ABOUT THIS TOPIC</span>
              </button>
            </div>
          </div>

          {/* LOADING STATE: ASKING GEMINI... */}
          {geminiLoading && (
            <div className="bg-white dark:bg-[#10243A] rounded-md border border-[#D6E3ED] dark:border-[#24425C] p-8 text-center space-y-3 font-mono text-xs shadow-sm">
              <RefreshCw className="w-6 h-6 text-[#176B87] dark:text-[#27D7E8] animate-spin mx-auto" />
              <div className="font-bold text-[#10243A] dark:text-white uppercase tracking-wider">GEMINI STUDY ASSISTANT</div>
              <p className="text-[#526B7D] dark:text-[#9FB2C5]">Analyzing: "{lastGeminiQuery || activeSearchTerm || inputQuery}"...</p>
            </div>
          )}

          {/* ERROR HANDLING: GEMINI TEMPORARILY UNAVAILABLE + TRY AGAIN BUTTON */}
          {geminiError && !geminiLoading && (
            <div className="bg-white dark:bg-[#10243A] rounded-md border border-rose-300 dark:border-rose-800 p-6 text-center space-y-4 shadow-sm font-sans">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 uppercase">
                  GEMINI TEMPORARILY UNAVAILABLE
                </h3>
                <p className="text-xs text-[#526B7D] dark:text-[#9FB2C5]">
                  {geminiError}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAskGeminiTopic(lastGeminiQuery)}
                className="px-5 py-2 rounded-md bg-[#10243A] dark:bg-[#0B1728] border border-[#176B87] dark:border-[#27D7E8] text-[#176B87] dark:text-[#58E6F2] font-mono font-bold text-xs hover:bg-[#176B87]/10 transition-all inline-flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          )}

          {/* STRUCTURED GEMINI RESULT CARD — BLUE & CYAN THEME */}
          {geminiResult && !geminiLoading && (
            <div className="bg-white dark:bg-[#10243A] rounded-md border border-[#D6E3ED] dark:border-[#24425C] p-6 md:p-8 space-y-6 shadow-md font-sans">
              
              {/* Header */}
              <div className="border-b border-[#D6E3ED] dark:border-[#24425C] pb-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#176B87] dark:text-[#27D7E8]" />
                    <span className="text-xs font-mono font-extrabold text-[#176B87] dark:text-[#27D7E8] uppercase tracking-wider">
                      ✦ GEMINI STUDY ASSISTANT
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#10243A] dark:text-white">
                    {geminiResult.topic}
                  </h2>
                  <span className="text-[11px] font-mono text-[#526B7D] dark:text-[#9FB2C5]">
                    AI-generated educational overview
                  </span>
                </div>
              </div>

              {/* OVERVIEW SECTION */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase text-[#176B87] dark:text-[#27D7E8]">OVERVIEW</h3>
                <p className="text-xs text-[#10243A] dark:text-[#F5F9FC] leading-relaxed font-sans font-medium">
                  {geminiResult.overview}
                </p>
              </div>

              {/* KEY CONCEPTS SECTION */}
              {geminiResult.key_concepts && geminiResult.key_concepts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold uppercase text-[#176B87] dark:text-[#27D7E8]">KEY CONCEPTS</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                    {geminiResult.key_concepts.map((kc, i) => (
                      <li key={i} className="p-2.5 rounded-md bg-[#F5F9FC] dark:bg-[#0B1728] border border-[#D6E3ED] dark:border-[#24425C] text-[#10243A] dark:text-[#F5F9FC] font-medium flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#176B87] dark:bg-[#27D7E8]" />
                        <span>{kc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ALGORITHMS / MECHANISMS SECTION */}
              {geminiResult.algorithms && geminiResult.algorithms.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold uppercase text-[#176B87] dark:text-[#27D7E8]">KEY MECHANISMS & MILESTONES</h3>
                  <div className="flex flex-wrap gap-2 font-mono text-xs">
                    {geminiResult.algorithms.map((alg, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-md bg-[#F5F9FC] dark:bg-[#0B1728] border border-[#D6E3ED] dark:border-[#24425C] text-[#10243A] dark:text-[#F5F9FC] font-bold">
                        • {alg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* COMPLEXITY / METRICS SECTION - MONOSPACE METRICS */}
              {geminiResult.complexity && geminiResult.complexity.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold uppercase text-[#176B87] dark:text-[#27D7E8]">METRICS & SPECIFICATIONS</h3>
                  <div className="flex flex-wrap gap-2 font-mono text-xs">
                    {geminiResult.complexity.map((cx, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-md bg-[#176B87]/10 dark:bg-[#27D7E8]/10 border border-[#176B87]/30 dark:border-[#27D7E8]/40 text-[#176B87] dark:text-[#27D7E8] font-extrabold">
                        {cx}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="pt-2 flex flex-wrap gap-3 border-t border-[#D6E3ED] dark:border-[#24425C]">
                <button className="px-4 py-2 rounded-md bg-[#176B87] dark:bg-[#27D7E8] hover:bg-[#12556b] dark:hover:bg-[#58E6F2] text-white dark:text-[#07111F] font-mono font-bold text-xs transition-colors">
                  [ GENERATE MCQS ]
                </button>
                <button className="px-4 py-2 rounded-md bg-[#F5F9FC] dark:bg-[#0B1728] border border-[#D6E3ED] dark:border-[#24425C] text-[#10243A] dark:text-[#F5F9FC] font-mono font-bold text-xs hover:border-[#176B87] dark:hover:border-[#27D7E8] hover:text-[#176B87] dark:hover:text-[#58E6F2] transition-colors">
                  [ CREATE FLASHCARDS ]
                </button>
              </div>

              {/* FURTHER STUDY SECTION */}
              {geminiResult.next_steps && geminiResult.next_steps.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#D6E3ED] dark:border-[#24425C]">
                  <h3 className="text-xs font-mono font-bold uppercase text-[#176B87] dark:text-[#27D7E8]">FURTHER STUDY</h3>
                  <div className="flex flex-wrap gap-2 font-mono text-xs">
                    {geminiResult.next_steps.map((ns, i) => (
                      <span key={i} className="px-3 py-1 rounded bg-[#F5F9FC] dark:bg-[#0B1728] text-[#526B7D] dark:text-[#9FB2C5]">
                        → {ns}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SOURCES & CITATIONS SECTION */}
              {geminiResult.sources && geminiResult.sources.length > 0 && (
                <div className="pt-4 border-t border-[#D6E3ED] dark:border-[#24425C] space-y-1.5 font-mono text-[11px]">
                  <span className="font-bold text-[#526B7D] dark:text-[#9FB2C5] uppercase">SOURCES & ACADEMIC CITATIONS:</span>
                  {geminiResult.sources.map((src, i) => (
                    <div key={i} className="text-[#176B87] dark:text-[#27D7E8] font-bold flex items-center space-x-1.5">
                      <span>✓</span>
                      <span>{src}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* 3-COLUMN DOCUMENT READER MODAL */}
      {selectedResource && (
        <DocumentReaderModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}

    </div>
  );
};
