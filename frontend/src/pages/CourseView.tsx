import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LearningPlayer } from '../components/student/LearningPlayer';
import { courseApi } from '../services/api';
import { Course, Module } from '../types';
import { getEducationImageUrl } from '../utils/images';
import { 
  BookOpen, Layers, FileText, Sparkles, RefreshCw, Play, Star, Clock, 
  CheckCircle, ChevronRight, User as UserIcon, Activity 
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const CourseView: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id) || 1;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // CRITICAL REQUIREMENT: Course Overview MUST be the FIRST active section/tab by default!
  const [activeTab, setActiveTab] = useState<'overview' | 'video' | 'flashcards' | 'notes'>('overview');
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number>(0);
  const [flippedCard, setFlippedCard] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadCourse = async () => {
      try {
        const fetchedCourse = await courseApi.getCourseById(courseId);
        if (isMounted) {
          setCourse(fetchedCourse);
          document.title = fetchedCourse?.title ? `EduFlow | ${fetchedCourse.title}` : 'EduFlow | Course';
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Failed to load course details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const handleEnrollClick = async () => {
    try {
      setLoading(true);
      await courseApi.enroll(courseId);
      const updated = await courseApi.getCourseById(courseId);
      setCourse(updated);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to enroll in course.");
    } finally {
      setLoading(false);
    }
  };

  const modules = course?.modules || [];
  const currentModule = modules[selectedModuleIndex] || modules[0];

  // MODULE-AWARE FLASHCARDS
  const getModuleFlashcards = (moduleTitle: string = '', moduleDesc: string = '') => {
    const titleLower = (moduleTitle || '').toLowerCase();
    
    if (titleLower.includes('sort') || titleLower.includes('merge') || titleLower.includes('quick') || titleLower.includes('selection')) {
      return [
        { front: 'What is Merge Sort and what is its time complexity?', back: 'A divide-and-conquer algorithm that recursively bisects the array into halves, sorts them, and merges them in O(n log n) time in all cases.' },
        { front: 'How does Selection Sort work?', back: 'It repeatedly scans the unsorted subarray to find the minimum element and swaps it to the front, running in O(n²) time.' },
        { front: 'What is Quick Sort\'s average and worst-case complexity?', back: 'Quick Sort averages O(n log n) using pivot partitioning, but can degrade to O(n²) if poor pivot selection causes unbalanced partitions.' },
        { front: 'When is a sorting algorithm considered stable?', back: 'When it preserves the relative order of duplicate elements with equal keys in the sorted output.' },
        { front: 'When is sorting useful in computational problem solving?', back: 'Sorting enables efficient O(log n) binary searching, deduplication, order statistics, and interval scheduling.' }
      ];
    } else if (titleLower.includes('search') || titleLower.includes('binary')) {
      return [
        { front: 'What is the essential precondition for Binary Search?', back: 'The input collection or array must be sorted in monotonic order prior to searching.' },
        { front: 'What is the time complexity of Binary Search?', back: 'O(log n) logarithmic time, because each step eliminates half of the remaining search space.' },
        { front: 'What is Linear Search and when should it be used?', back: 'Sequentially scanning elements from start to finish in O(n) time; suitable for unsorted or unordered collections.' },
        { front: 'Why compute middle as low + (high - low) / 2?', back: 'To prevent integer arithmetic overflow that can occur when adding (low + high) in fixed-width numerical types.' },
        { front: 'How many comparisons does Binary Search need for 1,000,000 elements?', back: 'At most 20 comparisons, since 2^20 is approximately 1,048,576.' }
      ];
    } else if (titleLower.includes('array') || titleLower.includes('linked list') || titleLower.includes('list')) {
      return [
        { front: 'What is a linked list?', back: 'A linear data structure in which elements (nodes) are stored non-contiguously and connected through memory links/pointers.' },
        { front: 'What is the difference between singly and doubly linked lists?', back: 'Singly linked lists have next pointers only; doubly linked lists maintain both next and prev pointers enabling bidirectional traversal.' },
        { front: 'What is the time complexity of prepending to a linked list vs an array?', back: 'Prepending to a linked list is O(1) (pointer update); prepending to an array is O(n) because all existing elements must be shifted in memory.' },
        { front: 'What is amortized O(1) time in dynamic arrays?', back: 'Although doubling capacity takes O(n) during a resize, the average cost per append across n operations remains O(1).' }
      ];
    } else if (titleLower.includes('data structure') || titleLower.includes('structure') || titleLower.includes('ram')) {
      return [
        { front: 'What is the purpose of a data structure?', back: 'To organize and store data in computer memory so it can be accessed, searched, and manipulated effectively.' },
        { front: 'How does Random Access Memory (RAM) work for contiguous arrays?', back: 'RAM provides addressable cells allowing any memory address to be accessed in O(1) constant time using arithmetic offset calculations.' },
        { front: 'What is the primary tradeoff between contiguous arrays and pointer nodes?', back: 'Arrays provide instant O(1) index access with contiguous memory; linked nodes allow dynamic growth without reallocations but require O(n) traversal.' }
      ];
    } else if (titleLower.includes('final') || titleLower.includes('review') || titleLower.includes('assessment')) {
      return [
        { front: 'Compare Linear Search vs Binary Search on 1,000,000 elements.', back: 'Linear Search may require up to 1,000,000 comparisons (O(n)), whereas Binary Search requires at most ~20 comparisons (O(log n)).' },
        { front: 'What is the theoretical lower bound for comparison-based sorting?', back: 'Ω(n log n) is the mathematical minimum comparison bound for any general sorting algorithm (e.g. Merge Sort).' },
        { front: 'Which data structure allows O(1) insertions at the head without memory reallocations?', back: 'A Linked List, which inserts nodes in O(1) time by updating head pointer references.' }
      ];
    } else {
      // Default Module 1: Introduction to Algorithms
      return [
        { front: 'What is an algorithm?', back: 'A defined sequence of unambiguous steps used to solve a computational problem or perform a computation.' },
        { front: 'How is algorithmic efficiency measured and evaluated?', back: 'Using asymptotic analysis (Big-O notation) to evaluate how runtime and memory grow as input size n approaches infinity.' },
        { front: 'What does O(1) constant time complexity mean?', back: 'The execution time remains identical regardless of input size, such as accessing an array element by index.' },
        { front: 'What is the time complexity of a linear scan?', back: 'O(n) linear time, because every element in the collection may need to be inspected once.' }
      ];
    }
  };

  // MODULE-AWARE SMART NOTES
  const getModuleSmartNotes = (moduleTitle: string = '', moduleDesc: string = '') => {
    const titleLower = (moduleTitle || '').toLowerCase();

    if (titleLower.includes('sort') || titleLower.includes('merge') || titleLower.includes('quick') || titleLower.includes('selection')) {
      return {
        unit: 'MODULE 4: SORTING ALGORITHMS',
        takeaways: [
          'Sorting arranges unordered elements into monotonic non-decreasing or non-increasing sequences.',
          'Merge Sort applies divide-and-conquer: recursively bisects arrays, sorts halves, and merges them in guaranteed O(n log n) time with O(n) auxiliary space.',
          'Quick Sort partitions elements around a selected pivot with O(n log n) average runtime and superior in-place cache locality.',
          'Selection Sort repeatedly finds the minimum element from the unsorted partition and places it at the front in O(n²) time.',
          'Stability in sorting preserves the original relative order of elements that have identical keys.'
        ]
      };
    } else if (titleLower.includes('search') || titleLower.includes('binary')) {
      return {
        unit: 'MODULE 5: SEARCHING ALGORITHMS',
        takeaways: [
          'Searching is the computational process of locating target elements within a collection or verifying their absence.',
          'Linear search scans elements sequentially from index 0 to n-1 in O(n) time and requires no preconditions or sorting.',
          'Binary search operates strictly on sorted arrays, halving the remaining search space at each step in O(log n) time.',
          'Calculating middle index as `low + (high - low) // 2` prevents integer arithmetic overflow in fixed-width systems.',
          'For a collection of 1,000,000 elements, binary search requires at most 20 comparisons to locate any key.'
        ]
      };
    } else if (titleLower.includes('array') || titleLower.includes('linked list') || titleLower.includes('list')) {
      return {
        unit: 'MODULE 3: ARRAYS AND LINKED LISTS',
        takeaways: [
          'Static arrays allocate fixed contiguous memory blocks in RAM, enabling instantaneous O(1) random access by index.',
          'Dynamic arrays double their capacity when full, achieving O(1) amortized append time despite occasional O(n) resize operations.',
          'Linked lists store elements as independent node objects connected by pointers/references across non-contiguous heap memory.',
          'Singly linked lists support O(1) head prepends but require O(n) traversal for index lookups; doubly linked lists enable bidirectional traversal.'
        ]
      };
    } else if (titleLower.includes('data structure') || titleLower.includes('structure') || titleLower.includes('ram')) {
      return {
        unit: 'MODULE 2: INTRODUCTION TO DATA STRUCTURES',
        takeaways: [
          'Data structures organize and structure information in computer memory for efficient retrieval, storage, and mutation.',
          'Random Access Memory (RAM) provides addressable byte cells accessible in O(1) constant time using base + offset arithmetic.',
          'Contiguous memory structures (arrays) optimize CPU cache locality and direct mathematical indexing.',
          'Pointer-based node structures allocate memory dynamically on the heap, eliminating the need for large contiguous memory blocks.'
        ]
      };
    } else if (titleLower.includes('final') || titleLower.includes('review') || titleLower.includes('assessment')) {
      return {
        unit: 'MODULE 6: FINAL REVIEW AND ASSESSMENT',
        takeaways: [
          'Algorithmic problem solving requires evaluating problem constraints, time complexity, and memory space trade-offs.',
          'Comparison-based sorting has a mathematical lower bound of Ω(n log n).',
          'Binary search and divide-and-conquer paradigms provide exponential reductions in search space from O(n) to O(log n).',
          'Mastery of arrays, linked lists, sorting, and searching forms the foundation for advanced graph and tree algorithms.'
        ]
      };
    } else {
      return {
        unit: 'MODULE 1: INTRODUCTION TO ALGORITHMS',
        takeaways: [
          'An algorithm is a well-defined computational procedure that transforms specified inputs into desired outputs.',
          'Algorithmic performance is evaluated through asymptotic analysis (Big-O notation) as input size n approaches infinity.',
          'Time complexity measures execution steps; Space complexity measures auxiliary memory consumed during computation.',
          'Linear search provides an intuitive baseline algorithm with O(n) time complexity for unsorted collections.'
        ]
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center space-x-2 text-[#0EA5E9] dark:text-[#22D3EE] text-xs font-mono font-bold">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>LOADING DIAGNOSTIC COURSE ENVIRONMENT...</span>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#11171D] rounded border border-rose-200 dark:border-rose-900/60 max-w-md mx-auto space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">COURSE NOT FOUND</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">{error || 'Unable to retrieve course details.'}</p>
      </div>
    );
  }

  const imageUrl = getEducationImageUrl(course.thumbnail_url, course.category);
  const objectives = (course.learning_objectives || 
    "✓ Explain what algorithms are and how they are used to solve problems.\n✓ Understand fundamental data-structure concepts.\n✓ Work with arrays and linked lists.\n✓ Explain and compare common sorting algorithms covered in the course.\n✓ Understand linear and binary searching.\n✓ Evaluate algorithm approaches at an introductory level.\n✓ Apply the concepts through quizzes and practice questions."
  ).split('\n').filter(line => line.trim().length > 0);

  const activeFlashcards = getModuleFlashcards(currentModule?.title, currentModule?.description);
  const activeSmartNotes = getModuleSmartNotes(currentModule?.title, currentModule?.description);

  const instructorName = course.title?.toLowerCase().includes('algorithm') 
    ? 'freeCodeCamp.org' 
    : 'Edu-Flow Faculty';

  return (
    <div className="space-y-6">
      
      {/* Course Navigation Header Bar (Hairline Divider Navigation) */}
      <div className="border-b border-slate-200 dark:border-[#26323A] pb-0 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          
          {/* TAB 1: COURSE OVERVIEW (DEFAULT ORDER FIRST) */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'border-[#0EA5E9] dark:border-[#22D3EE] text-[#0EA5E9] dark:text-[#22D3EE] bg-cyan-50/50 dark:bg-[#11171D]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>COURSE OVERVIEW</span>
          </button>

          {/* TAB 2: INTERACTIVE VIDEO PLAYER */}
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'video'
                ? 'border-[#0EA5E9] dark:border-[#22D3EE] text-[#0EA5E9] dark:text-[#22D3EE] bg-cyan-50/50 dark:bg-[#11171D]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>INTERACTIVE VIDEO PLAYER</span>
          </button>

          {/* TAB 3: ADAPTIVE FLASHCARDS */}
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'flashcards'
                ? 'border-[#0EA5E9] dark:border-[#22D3EE] text-[#0EA5E9] dark:text-[#22D3EE] bg-cyan-50/50 dark:bg-[#11171D]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ADAPTIVE FLASHCARDS</span>
          </button>

          {/* TAB 4: AI NOTES & SUMMARIES */}
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2.5 text-xs font-mono font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'notes'
                ? 'border-[#0EA5E9] dark:border-[#22D3EE] text-[#0EA5E9] dark:text-[#22D3EE] bg-cyan-50/50 dark:bg-[#11171D]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>AI NOTES & SUMMARIES</span>
          </button>

        </div>
      </div>

      {/* SECTION 1: COURSE OVERVIEW (DEFAULT FIRST VISIBLE VIEW) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Visual & Overview Header */}
          <div className="bg-white dark:bg-[#11171D] rounded border border-slate-200 dark:border-[#26323A] overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Left Content Area */}
            <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded border border-[#0EA5E9]/40 dark:border-[#22D3EE]/40 text-[10px] font-mono font-bold text-[#0EA5E9] dark:text-[#22D3EE] bg-cyan-50 dark:bg-[#080B0F]">
                    {course.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded border border-slate-300 dark:border-[#26323A] text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                    {course.difficulty}
                  </span>
                  {course.is_premium && (
                    <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold">
                      👑 PREMIUM COURSE
                    </span>
                  )}
                </div>

                {/* Course Title */}
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight font-sans">
                  {course.title}
                </h1>

                {/* Un-enrolled Premium Locked Banner / Admin Banner */}
                {user?.role === 'admin' ? (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2 font-mono text-xs text-purple-700 dark:purple-300">
                    <div className="font-bold flex items-center space-x-2">
                      <span>🛠️ ADMIN MANAGEMENT MODE</span>
                    </div>
                    <p className="text-[11px]">You are inspecting this course as a System Administrator. Admins manage courses and live classrooms via the Admin Dashboard and do not enroll as student participants.</p>
                  </div>
                ) : course.is_premium && !course.is_enrolled && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 font-mono text-xs text-amber-700 dark:text-amber-300">
                    <div className="font-bold flex items-center space-x-2">
                      <span>🔒 PREMIUM CONTENT LOCKED</span>
                    </div>
                    <p className="text-[11px]">Enroll or purchase access to unlock lesson videos, interactive flashcards, AI transcripts, and live classroom sessions.</p>
                    <button
                      onClick={handleEnrollClick}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold font-sans text-xs transition-all shadow-md mt-1"
                    >
                      Enroll to Access Course →
                    </button>
                  </div>
                )}
                
                {/* Course Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  {course.description}
                </p>
              </div>

              {/* Course Telemetry & Metrics Data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-[#26323A]">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400">PROVIDER</span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">{instructorName}</div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400">RATING</span>
                  <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{course.rating || 4.9} / 5.0</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400">MODULES</span>
                  <div className="text-xs font-mono font-bold text-[#0EA5E9] dark:text-[#22D3EE]">
                    {course.modules?.length || 6} UNITS
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400">DURATION</span>
                  <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {course.duration_hours || 5.5} HOURS
                  </div>
                </div>
              </div>

              {/* Start / Continue Button */}
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('video')}
                  className="px-6 py-2.5 rounded bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-[#22D3EE] dark:hover:bg-[#06B6D4] text-white dark:text-slate-950 font-bold font-mono text-xs transition-all flex items-center space-x-2 shadow-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START COURSE EXPERIENCE →</span>
                </button>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative bg-slate-900 min-h-[260px] lg:min-h-full border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-[#26323A]">
              <img
                src={imageUrl}
                alt={course.title}
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                <div className="text-white space-y-1">
                  <div className="text-[11px] font-mono text-[#0EA5E9] dark:text-[#22D3EE] font-bold">EDUCATIONAL SHOWCASE</div>
                  <div className="text-xs font-semibold text-slate-200">freeCodeCamp Official Course Curriculum</div>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Objectives */}
          <div className="bg-white dark:bg-[#11171D] rounded p-6 border border-slate-200 dark:border-[#26323A] space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#0EA5E9] dark:text-[#22D3EE]" />
              <span>WHAT YOU WILL LEARN</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {objectives.map((obj, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300">
                  <span className="text-[#0EA5E9] dark:text-[#22D3EE] font-bold">✓</span>
                  <span>{obj.replace(/^✓\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Module Syllabus Outline */}
          <div className="bg-white dark:bg-[#11171D] rounded p-6 border border-slate-200 dark:border-[#26323A] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">
                COURSE MODULES & SYLLABUS ({course.modules?.length || 0} UNITS)
              </h3>
              <span className="text-[10px] font-mono text-slate-500">CLICK MODULE TO VIEW DETAILS</span>
            </div>

            <div className="space-y-2">
              {course.modules?.map((mod: Module, index: number) => (
                <div
                  key={mod.id || index}
                  onClick={() => {
                    setSelectedModuleIndex(index);
                    setActiveTab('video');
                  }}
                  className="p-4 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] hover:border-[#0EA5E9] dark:hover:border-[#22D3EE] transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded bg-slate-200 dark:bg-[#11171D] text-slate-700 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                      {mod.order || index + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0EA5E9] dark:group-hover:text-[#22D3EE] transition-colors font-sans">
                        {mod.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-sans line-clamp-1">{mod.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-slate-500 font-mono">{mod.duration_minutes || 25} MIN</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModuleIndex(index);
                        setActiveTab('video');
                      }}
                      className="p-1.5 rounded bg-slate-100 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] text-slate-600 dark:text-slate-300 hover:text-[#0EA5E9] dark:hover:text-[#22D3EE]"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* SECTION 2: INTERACTIVE VIDEO PLAYER */}
      {activeTab === 'video' && <LearningPlayer course={course} />}

      {/* SECTION 3: ADAPTIVE FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="space-y-5 max-w-3xl mx-auto">
          {/* Module Selector Pill Bar */}
          {modules.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">SELECT MODULE FOR ADAPTIVE FLASHCARDS:</span>
              <div className="flex flex-wrap gap-2">
                {modules.map((m, idx) => (
                  <button
                    key={m.id || idx}
                    onClick={() => {
                      setSelectedModuleIndex(idx);
                      setFlippedCard({});
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                      selectedModuleIndex === idx
                        ? 'bg-[#0EA5E9] dark:bg-[#22D3EE] text-white dark:text-slate-950 font-bold shadow-sm'
                        : 'bg-white dark:bg-[#11171D] border border-slate-200 dark:border-[#26323A] text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {idx + 1}. {m.title.replace(/^Module \d+:\s*/i, '')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#0EA5E9] dark:text-[#22D3EE]" />
              <span>MODULE {selectedModuleIndex + 1} FLASHCARDS: {currentModule?.title}</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">GROUNDED IN OFFICIAL COURSE CONCEPTS</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {activeFlashcards.map((card, idx) => {
              const isFlipped = flippedCard[idx];
              return (
                <div
                  key={idx}
                  onClick={() => setFlippedCard({ ...flippedCard, [idx]: !isFlipped })}
                  className="bg-white dark:bg-[#11171D] rounded p-6 border border-slate-200 dark:border-[#26323A] hover:border-[#0EA5E9] dark:hover:border-[#22D3EE] cursor-pointer min-h-[130px] flex items-center justify-center text-center select-none transition-all shadow-sm hover:shadow"
                >
                  {isFlipped ? (
                    <div className="space-y-1.5 animate-fade-in">
                      <span className="text-[10px] font-mono uppercase font-bold text-[#0EA5E9] dark:text-[#22D3EE]">CORRECT ANSWER / DEFINITION</span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">{card.back}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400">CLICK CARD TO REVEAL ANSWER</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-sans">{card.front}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: AI NOTES & SUMMARIES */}
      {activeTab === 'notes' && (
        <div className="space-y-5 max-w-3xl mx-auto">
          {/* Module Selector Pill Bar */}
          {modules.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">SELECT MODULE FOR SMART AI NOTES:</span>
              <div className="flex flex-wrap gap-2">
                {modules.map((m, idx) => (
                  <button
                    key={m.id || idx}
                    onClick={() => setSelectedModuleIndex(idx)}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                      selectedModuleIndex === idx
                        ? 'bg-[#0EA5E9] dark:bg-[#22D3EE] text-white dark:text-slate-950 font-bold shadow-sm'
                        : 'bg-white dark:bg-[#11171D] border border-slate-200 dark:border-[#26323A] text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {idx + 1}. {m.title.replace(/^Module \d+:\s*/i, '')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#11171D] rounded p-6 border border-slate-200 dark:border-[#26323A] space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26323A] pb-3">
              <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#0EA5E9] dark:text-[#22D3EE]" />
                <span>SMART COURSE NOTES: {currentModule?.title || 'Algorithms and Data Structures'}</span>
              </h3>
              <span className="text-[10px] font-mono text-[#0EA5E9] dark:text-[#22D3EE] font-bold">MODULE {selectedModuleIndex + 1} OF {modules.length || 6}</span>
            </div>

            <div className="p-4 rounded bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <h4 className="font-bold text-slate-900 dark:text-white font-mono text-xs uppercase text-[#0EA5E9] dark:text-[#22D3EE]">
                {activeSmartNotes.unit}
              </h4>
              <div className="font-mono text-[10px] uppercase font-bold text-slate-400 pt-1">Key Takeaways & Computational Invariants:</div>
              <ul className="list-disc list-inside space-y-2 leading-relaxed text-slate-700 dark:text-slate-300 font-sans">
                {activeSmartNotes.takeaways.map((point, pIdx) => (
                  <li key={pIdx} className="leading-normal">{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
