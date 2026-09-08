import React, { useState, useEffect } from 'react';
import { courseApi } from '../services/api';
import { Course } from '../types';
import { CourseCard } from '../components/common/CourseCard';
import { Search, Filter, BookOpen, Compass } from 'lucide-react';

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

  const categories = ['All', 'Computer Science', 'Artificial Intelligence', 'Data Science', 'Programming'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || c.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesDiff = selectedDifficulty === 'All' || c.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase();
    return matchesSearch && matchesCat && matchesDiff;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#11171D] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 text-[10px] font-mono font-bold uppercase tracking-widest">
            <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>EDITORIAL COURSE CATALOG</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Explore Courses</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl font-sans">
            Discover adaptive curriculums in Artificial Intelligence, Data Science, and Computer Science with closed-loop telemetry.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search courses by topic, title, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none transition-colors font-sans"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none"
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
              className="w-full bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none"
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
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs font-mono font-bold">LOADING CURRICULUM CATALOG...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white dark:bg-[#11171D] p-12 rounded-3xl text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No courses match your filter</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Try searching for a different keyword or reset filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, idx) => (
            <CourseCard key={course.id} course={course} indexNum={idx} />
          ))}
        </div>
      )}
    </div>
  );
};
