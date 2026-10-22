import React, { useState, useEffect } from 'react';
import { courseApi } from '../services/api';
import { Course } from '../types';
import { CourseCard } from '../components/common/CourseCard';
import { Search, BookOpen, Compass, X, Sparkles, Brain, Cpu, ShieldCheck } from 'lucide-react';

export const ExploreCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  useEffect(() => {
    document.title = 'EduFlow | Explore Courses';
    courseApi.getCourses()
      .then(setCourses)
      .catch(err => console.error("Failed to load course library:", err))
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    'All',
    'Computer Science',
    'Web Development',
    'Programming',
    'Data Science',
    'Artificial Intelligence'
  ];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || c.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesDiff = selectedDifficulty === 'All' || c.difficulty?.toLowerCase().includes(selectedDifficulty.toLowerCase());
    return matchesSearch && matchesCat && matchesDiff;
  });

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-cyan-50/30 dark:from-[#0d131a] dark:via-[#11171f] dark:to-[#0a1017] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800/90 shadow-sm space-y-6">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-widest shadow-xs">
              <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>EDITORIAL COURSE CATALOG</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Explore Courses
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
              Discover adaptive curriculums in Computer Science, Full-Stack Development, and Machine Learning featuring real-time closed-loop cognitive telemetry.
            </p>
          </div>

          {/* Quick Value Props */}
          <div className="grid grid-cols-2 gap-2.5 md:w-72 shrink-0">
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-mono font-bold text-xs mb-1">
                <Brain className="w-3.5 h-3.5" />
                <span>AI Grounded</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Socratic assistance per video module</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Biometrics</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Privacy-first on-device attention gauge</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search courses by topic, title, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#070b10] border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#070b10] border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>Category: {cat}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#070b10] border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
            >
              {difficulties.map(diff => (
                <option key={diff} value={diff}>Difficulty: {diff}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 dark:text-slate-400 text-xs font-mono font-bold tracking-wider animate-pulse">
          LOADING CURRICULUM CATALOG...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white dark:bg-[#0e141b] p-12 rounded-3xl text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No courses match your filter</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Try searching for a different keyword or reset filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredCourses.map((course, idx) => (
            <CourseCard key={course.id} course={course} indexNum={idx} />
          ))}
        </div>
      )}
    </div>
  );
};
