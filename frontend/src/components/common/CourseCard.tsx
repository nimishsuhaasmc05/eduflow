import React, { useState, useEffect } from 'react';
import { Course } from '../../types';
import { getEducationImageUrl, DEFAULT_FALLBACK_IMAGE } from '../../utils/images';
import { Star, Clock, Eye, Edit3, Trash2, CheckCircle, ArrowRight, Lock, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CourseCardProps {
  course: Course;
  indexNum?: number;
  isTeacher?: boolean;
  onEdit?: (course: Course) => void;
  onDelete?: (course: Course) => void;
  onToggleStatus?: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  indexNum,
  isTeacher = false,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const initialUrl = getEducationImageUrl(course.thumbnail_url, course.category);
  const [imgSrc, setImgSrc] = useState(initialUrl);

  useEffect(() => {
    setImgSrc(getEducationImageUrl(course.thumbnail_url, course.category));
  }, [course.thumbnail_url, course.category]);

  const isPublished = (course.status || 'published') === 'published';
  const isLocked = Boolean(course.is_premium && !course.is_enrolled);
  const indexStr = indexNum !== undefined ? (indexNum < 9 ? `0${indexNum + 1}` : `${indexNum + 1}`) : null;

  return (
    <div className="bg-white dark:bg-[#0e141b] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/90 shadow-sm hover:shadow-2xl hover:border-cyan-500/50 transition-all duration-300 flex flex-col justify-between group">
      {/* Thumbnail Container */}
      <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden">
        <img
          src={imgSrc}
          alt={course.title}
          onError={() => setImgSrc(DEFAULT_FALLBACK_IMAGE)}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

        {/* Index Number Badge */}
        {indexStr && (
          <div className="absolute top-3.5 left-3.5 px-2.5 py-0.5 rounded-lg bg-slate-950/75 backdrop-blur-md border border-white/10 font-mono font-bold text-xs text-cyan-400 drop-shadow">
            #{indexStr}
          </div>
        )}

        {/* Category & Premium Badges */}
        <div className="absolute top-3.5 right-3.5 flex items-center space-x-1.5">
          {course.is_premium && (
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/90 text-slate-950 text-[10px] font-mono font-black tracking-wider drop-shadow">
              👑 Premium
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 tracking-wider">
            {course.category}
          </span>
        </div>

        {/* Rating & Modules Badge */}
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-mono font-bold shadow-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{course.rating || 4.9}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/70 text-[11px] font-mono text-slate-300 shadow-xs">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{course.duration_hours || 5.5}h • {course.modules?.length || 8} Modules</span>
          </div>
        </div>

        {/* Status Badge (Teacher) */}
        {isTeacher && (
          <div className="absolute top-3.5 left-3.5">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider ${
                isPublished 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors line-clamp-2 min-h-[2.75rem] leading-snug tracking-tight">
            {course.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed min-h-[2.5rem] font-sans">
            {course.description}
          </p>
        </div>

        {/* Instructor & Difficulty Row */}
        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 dark:text-slate-500">Instructor:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">Dr. Sarah Jenkins</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            {course.difficulty || 'Beginner'}
          </span>
        </div>

        {/* Card Footer Actions */}
        {isTeacher ? (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <Link
              to={`/course/${course.id}`}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center space-x-1"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Preview</span>
            </Link>

            {onEdit && (
              <button
                onClick={() => onEdit(course)}
                className="flex-1 py-2 px-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-colors flex items-center justify-center space-x-1 border border-cyan-500/30"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            {onToggleStatus && (
              <button
                onClick={() => onToggleStatus(course)}
                title={isPublished ? "Unpublish to Draft" : "Publish to Students"}
                className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                  isPublished 
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(course)}
                title="Delete Course"
                className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-600 dark:text-cyan-400/90 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>Closed-Loop Telemetry</span>
            </div>

            <Link
              to={`/course/${course.id}`}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500 text-white dark:text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-950/30 hover:shadow-cyan-500/20"
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>Unlock Course</span>
                </>
              ) : (
                <>
                  <span>Explore Course</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </>
              )}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
