import React, { useState, useMemo, useEffect } from 'react';
import { LibraryResource, LibraryFilter, GeminiTopicBreakdown } from '../types/library';
import { INITIAL_LIBRARY_RESOURCES } from '../utils/libraryData';
import { DocumentReaderModal } from '../components/library/DocumentReaderModal';
import { libraryApi } from '../services/api';
import { 
  BookOpen, Search, Bookmark, Sparkles, ArrowRight, 
  RefreshCw, AlertTriangle, X, RotateCcw, LayoutGrid, 
  List, Clock, FileText, CheckCircle2, Compass, Layers, 
  Brain, ExternalLink
} from 'lucide-react';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';

export const DigitalLibraryPage: React.FC = () => {
  useEffect(() => {
    document.title = 'EduFlow | Digital Library';
  }, []);

  const [resources, setResources] = useState<LibraryResource[]>(INITIAL_LIBRARY_RESOURCES);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [activeSearchTerm, setActiveSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);

  // Gemini Topic Breakdown State
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [geminiResult, setGeminiResult] = useState<GeminiTopicBreakdown | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [lastGeminiQuery, setLastGeminiQuery] = useState<string>('');

  const categoryFilters = [
    'All',
    'Computer Science',
    'Artificial Intelligence',
    'Computer Vision',
    'Web Development',
    'Data Science',
    'System Design',
    'Saved'
  ];

  const resourceTypes = ['All', 'PDF', 'Research Paper', 'Notes', 'Book'];

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
    }).slice(0, 5);
  }, [inputQuery, resources]);

  // Execute Local Search
  const handleExecuteSearch = (queryToSearch?: string) => {
    const term = (queryToSearch !== undefined ? queryToSearch : inputQuery).trim();
    setIsSearching(true);
    setShowSuggestions(false);
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

  // Main Filtering Engine
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

        const isDSAMatch = (normQ.includes('datastructure') || normQ.includes('dsa') || normQ.includes('algorithm')) &&
                           (normalize(r.title).includes('datastructure') || normalize(r.title).includes('dsa') || normalize(r.title).includes('algorithm'));

        const isAIMatch = (normQ.includes('ai') || normQ.includes('deeplearning') || normQ.includes('neural')) &&
                          (normalize(r.title).includes('deep') || normalize(r.title).includes('neural') || normalize(r.category).includes('artificial'));

        const matches = titleMatch || excerptMatch || authorMatch || categoryMatch || courseMatch || tagMatch || isDSAMatch || isAIMatch;
        if (!matches) return false;
      }

      // Category filter
      if (activeFilter === 'Saved') {
        if (!r.is_saved) return false;
      } else if (activeFilter !== 'All') {
        if (r.category.toLowerCase() !== activeFilter.toLowerCase()) return false;
      }

      // Type filter
      if (selectedType !== 'All' && r.resource_type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [resources, activeSearchTerm, activeFilter, selectedType]);

  // Real Gemini Topic Breakdown call
  const handleAskGeminiTopic = async (overrideQuery?: string) => {
    const q = overrideQuery || activeSearchTerm || inputQuery || "Data Structures";
    setLastGeminiQuery(q);
    setGeminiLoading(true);
    setGeminiError(null);
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
      setGeminiError("Gemini Study Assistant is momentarily busy. Please try again shortly.");
    } finally {
      setGeminiLoading(false);
    }
  };

  const savedCount = useMemo(() => resources.filter(r => r.is_saved).length, [resources]);
  const avgProgress = useMemo(() => {
    const total = resources.reduce((acc, r) => acc + (r.reading_progress_percent || 0), 0);
    return Math.round(total / resources.length);
  }, [resources]);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto font-sans">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-cyan-50/30 dark:from-[#0d131a] dark:via-[#11171f] dark:to-[#0a1017] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800/90 shadow-sm space-y-6">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-widest shadow-xs">
              <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>SCHOLARLY RESEARCH & STUDY VAULT</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Digital Library
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
              Explore 16 peer-reviewed research papers, textbooks, and interactive notes with document-grounded Gemini AI study assistance.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md text-center">
              <span className="block font-mono font-black text-lg text-cyan-600 dark:text-cyan-400">
                {resources.length}
              </span>
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Volumes</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md text-center">
              <span className="block font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
                {savedCount}
              </span>
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Saved</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md text-center">
              <span className="block font-mono font-black text-lg text-purple-600 dark:text-purple-400">
                {avgProgress}%
              </span>
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Progress</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="relative z-10 space-y-4 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-7 relative">
              <form onSubmit={handleFormSubmit} className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  placeholder="Search books, notes, research papers, or try 'Algorithms', 'Deep Learning', 'React'..."
                  value={inputQuery}
                  onChange={(e) => {
                    setInputQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full bg-slate-50 dark:bg-[#070b10] border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-28 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all font-sans"
                />

                {inputQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-20 text-slate-400 hover:text-slate-200 p-1"
                    title="Clear Search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="submit"
                  className="absolute right-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Search className="w-3 h-3" />
                  <span>Search</span>
                </button>
              </form>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-[#0e141b] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl font-sans overflow-hidden">
                  <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    SUGGESTED LIBRARY VOLUMES
                  </div>
                  {suggestions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setInputQuery(s.title);
                        handleExecuteSearch(s.title);
                      }}
                      className="px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <BookOpen className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{s.title}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                        {s.resource_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Type Filter Select */}
            <div className="md:col-span-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#070b10] border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
              >
                {resourceTypes.map(t => (
                  <option key={t} value={t}>Type: {t}</option>
                ))}
              </select>
            </div>

            {/* Grid / List View Toggle */}
            <div className="md:col-span-2 flex items-center justify-end space-x-1.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'grid'
                    ? 'bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === 'list'
                    ? 'bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
            {categoryFilters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border font-bold ${
                  activeFilter === filter
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 shadow-xs'
                    : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {filter === 'Saved' ? `★ Saved (${savedCount})` : filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Adaptive Recommendation Card */}
      {!activeSearchTerm && activeFilter === 'All' && (
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent dark:from-cyan-950/30 dark:via-slate-900/40 border border-cyan-500/30 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                <span>Adaptive Recommendation</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                "Facial Landmark Detection & Mesh Geometry" (Section 18–21) — Core concepts for on-device attention telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedResource(resources[0])}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-cyan-950/20"
          >
            <span>Review Volume</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Search Results Indicator */}
      {activeSearchTerm && (
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>SEARCH RESULTS</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              <strong className="text-slate-900 dark:text-white font-bold">{filteredResources.length}</strong> resources found for "{activeSearchTerm}"
            </p>
          </div>

          <button
            onClick={handleClearSearch}
            className="text-xs font-mono font-bold text-slate-500 hover:text-cyan-500 underline"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isSearching ? (
        <div className="p-16 text-center bg-white dark:bg-[#0e141b] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 font-mono text-xs shadow-sm">
          <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
          <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            SEARCHING DIGITAL LIBRARY...
          </div>
        </div>
      ) : filteredResources.length > 0 ? (
        viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {filteredResources.map((res, idx) => (
              <div
                key={res.id}
                onClick={() => setSelectedResource(res)}
                className="bg-white dark:bg-[#0e141b] rounded-2xl border border-slate-200 dark:border-slate-800/90 overflow-hidden hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-950/20 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              >
                {/* Cover Image Container */}
                <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden">
                  <img
                    src={res.cover_image}
                    alt={res.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                    }}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                  {/* Index Number */}
                  <div className="absolute top-3.5 left-3.5 px-2.5 py-0.5 rounded-lg bg-slate-950/75 backdrop-blur-md border border-white/10 font-mono font-bold text-xs text-cyan-400 drop-shadow">
                    #{idx < 9 ? `0${idx + 1}` : idx + 1}
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => toggleSave(res.id, e)}
                    className={`absolute top-3.5 right-3.5 p-2 rounded-xl backdrop-blur-md border transition-all ${
                      res.is_saved 
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md' 
                        : 'bg-slate-950/75 text-white border-white/10 hover:bg-slate-900'
                    }`}
                    title={res.is_saved ? "Remove from Saved" : "Save Resource"}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${res.is_saved ? 'fill-current' : ''}`} />
                  </button>

                  {/* Resource Type & Pages */}
                  <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/90 text-slate-950 text-[10px] font-mono font-black uppercase tracking-wider">
                      {res.resource_type}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/70 text-[10px] font-mono text-slate-300">
                      {res.page_count} Pages
                    </span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                      {res.category}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors line-clamp-2 min-h-[2.75rem] leading-snug tracking-tight">
                      {res.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed min-h-[2.5rem] font-sans">
                      {res.excerpt}
                    </p>
                  </div>

                  {/* Author & Progress */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="truncate pr-2">By {res.author}</span>
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 shrink-0">
                        {res.reading_progress_percent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${res.reading_progress_percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {res.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedResource(res);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 text-white dark:text-slate-950 font-bold text-xs transition-all flex items-center gap-1 shadow-sm hover:shadow-cyan-500/20"
                    >
                      <span>Read</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-4">
            {filteredResources.map((res, idx) => (
              <div
                key={res.id}
                onClick={() => setSelectedResource(res)}
                className="bg-white dark:bg-[#0e141b] rounded-2xl border border-slate-200 dark:border-slate-800/90 overflow-hidden hover:border-cyan-500/50 hover:shadow-xl transition-all duration-200 p-5 flex flex-col md:flex-row items-center gap-6 group cursor-pointer"
              >
                {/* List Thumbnail */}
                <div className="relative w-full md:w-56 aspect-[16/9] md:aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 shrink-0">
                  <img
                    src={res.cover_image}
                    alt={res.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                    }}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-cyan-400 font-mono font-bold text-[10px]">
                    #{idx < 9 ? `0${idx + 1}` : idx + 1}
                  </span>
                  <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono font-black text-[9px] uppercase">
                    {res.resource_type}
                  </span>
                </div>

                {/* List Body */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                      {res.category} • {res.page_count} Pages
                    </span>
                    <button
                      onClick={(e) => toggleSave(res.id, e)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        res.is_saved
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${res.is_saved ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors truncate">
                    {res.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {res.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>By {res.author}</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{res.reading_progress_percent}% completed</span>
                  </div>
                </div>

                {/* List CTA */}
                <div className="shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedResource(res);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 text-white dark:text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Read Volume</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Empty Results Screen with Gemini Ask Option */
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0e141b] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 text-center space-y-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                NO LIBRARY RESOURCES FOUND
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                No matching volumes for "{activeSearchTerm || inputQuery || 'your query'}"
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can ask Gemini Study Assistant to generate a structured synthesis on this topic.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleAskGeminiTopic()}
              disabled={geminiLoading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all inline-flex items-center gap-2 shadow-md shadow-cyan-950/20 disabled:opacity-50"
            >
              {geminiLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Sparkles className="w-4 h-4 text-slate-950" />
              )}
              <span>Ask Gemini About This Topic</span>
            </button>
          </div>

          {/* Gemini Loading */}
          {geminiLoading && (
            <div className="bg-white dark:bg-[#0e141b] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 font-mono text-xs shadow-sm">
              <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
              <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                GEMINI STUDY ASSISTANT IS ANALYZING...
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Generating structured topic synthesis for "{lastGeminiQuery || activeSearchTerm || inputQuery}"...
              </p>
            </div>
          )}

          {/* Gemini Error */}
          {geminiError && !geminiLoading && (
            <div className="bg-white dark:bg-[#0e141b] rounded-3xl border border-rose-300 dark:border-rose-900/60 p-6 text-center space-y-4 shadow-sm font-sans">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 uppercase">
                  Service Temporarily Busy
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{geminiError}</p>
              </div>
              <button
                type="button"
                onClick={() => handleAskGeminiTopic(lastGeminiQuery)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Gemini Breakdown Card */}
          {geminiResult && !geminiLoading && (
            <div className="bg-white dark:bg-[#0e141b] rounded-3xl border border-cyan-500/40 p-6 md:p-8 space-y-6 shadow-xl">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                    GEMINI TOPIC SYNTHESIS
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {geminiResult.topic}
                  </h3>
                </div>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {geminiResult.overview}
              </p>

              {geminiResult.key_concepts && geminiResult.key_concepts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                    KEY CONCEPTS
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {geminiResult.key_concepts.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reader Modal */}
      {selectedResource && (
        <DocumentReaderModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}

    </div>
  );
};
