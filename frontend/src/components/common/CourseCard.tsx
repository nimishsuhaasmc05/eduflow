import React from 'react';
import { Course } from '../../types';
import { getEducationImageUrl } from '../../utils/images';
import { Star, Clock, Eye, Edit3, Trash2, CheckCircle, ArrowRight, Lock } from 'lucide-react';
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
  const imageUrl = getEducationImageUrl(course.thumbnail_url, course.category);
  const isPublished = (course.status || 'published') === 'published';
  const isLocked = Boolean(course.is_premium && !course.is_enrolled);
  const indexStr = indexNum !== undefined ? (indexNum < 9 ? `0${indexNum + 1}` : `${indexNum + 1}`) : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
      {/* Thumbnail Container */}
      <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden">
        <img
          src={imageUrl}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        {/* Index Number Badge */}
        {indexStr && (
          <div className="absolute top-4 left-4 font-mono font-black text-2xl text-white/90 drop-shadow-md tracking-tighter">
            {indexStr}
          </div>
        )}

        {/* Category & Difficulty Badges */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          {course.is_premium && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-mono font-bold tracking-wider drop-shadow">
              👑 Premium
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-xs font-mono font-bold text-cyan-400 tracking-wider">
            {course.category}
          </span>
        </div>

        {/* Rating & Modules Badge */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-amber-400 text-xs font-mono font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{course.rating || 4.8}</span>
          </div>

          <span className="text-xs font-mono text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
            {course.modules?.length || 8} Modules
          </span>
        </div>

        {/* Status Badge (Teacher) */}
        {isTeacher && (
          <div className="absolute top-4 left-4">
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
      <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1 tracking-tight">
            {course.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">{course.description}</p>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <span>Instructor: <strong className="text-slate-800 dark:text-slate-200 font-semibold">Dr. Sarah Jenkins</strong></span>
          <span className="flex items-center space-x-1 font-mono text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{course.duration_hours || 5} Hrs</span>
          </span>
        </div>

        {/* Card Footer Actions */}
        {isTeacher ? (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
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
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Closed-Loop Telemetry
            </span>

            <Link
              to={`/course/${course.id}`}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md"
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" aria-hidden="true" />
                  <span>Unlock Course</span>
                </>
              ) : (
                <>
                  <span>Explore Course</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
