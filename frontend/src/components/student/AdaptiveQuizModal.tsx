import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { quizApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { learnerStateClassifier } from '../../services/learnerStateClassifier';
import { closedLoopController } from '../../services/closedLoopController';
import { findRelevantDiagram, DiagramData } from '../../utils/quizVisuals';
import { quizPrefetchService, computeClientQuestionHash } from '../../services/quizPrefetchService';
import { Sparkles, CheckCircle2, XCircle, BookOpen, Loader2, Image as ImageIcon, CornerDownLeft, Clock, ArrowRight, HelpCircle } from 'lucide-react';

export interface QuizOptionItem {
  text: string;
  image_url?: string;
  label?: string;
}

export interface QuizQuestionItem {
  id: string | number;
  question_hash?: string;
  topic: string;
  text: string;
  options: (string | QuizOptionItem)[];
  correct: number;
  explanation: string;
  hint?: string;
  image_required?: boolean;
  image_optional?: boolean;
  image_reference?: string;
  image_url?: string;
  diagram_svg?: string;
  timestamp_reference?: string;
  timestamp_seconds?: number;
}

interface AdaptiveQuizModalProps {
  onClose: () => void;
  courseId?: number;
  moduleId?: number;
  topic?: string;
  onOpenAITutor?: (weakTopic?: string) => void;
  onNavigateToTopic?: (topic: string, timestampSeconds?: number) => void;
}

const getDefaultQuestionsForTopic = (topic: string): QuizQuestionItem[] => {
  const t = (topic || "").toLowerCase();

  if (t.includes("intro") || t.includes("algorithm") || t.includes("module 1")) {
    return [
      {
        id: 1,
        topic: "Algorithmic Problem Solving",
        text: "SCENARIO: A food-delivery application needs to calculate an optimal delivery route. What fundamental property makes an algorithm suitable for solving this problem?",
        options: [
          "It provides an unambiguous, finite sequence of computational steps guaranteed to terminate with a valid solution",
          "It randomly guesses routes until a human driver manually takes over navigation",
          "It requires unbounded computation time to simulate infinite possible world states",
          "It executes arbitrary operations without using computer memory or instructions"
        ],
        correct: 0,
        explanation: "An algorithm is a formal, finite sequence of well-defined computational instructions that transforms inputs into the correct output.",
        hint: "Consider the requirements of determinism, finiteness, and clear step-by-step logic.",
        image_required: false,
        timestamp_reference: "02:15",
        timestamp_seconds: 135
      },
      {
        id: 2,
        topic: "Asymptotic Complexity",
        text: "What does Big-O asymptotic notation primarily quantify in algorithm analysis?",
        options: [
          "The upper bound on how runtime or memory requirements scale as the input size n approaches infinity",
          "The exact number of CPU clock cycles required on a specific physical machine",
          "The byte size of the compiled binary executable on disk",
          "The latency of the physical network connection between client and database"
        ],
        correct: 0,
        explanation: "Big-O characterizes the asymptotic upper bound of resource consumption as the problem size scales arbitrarily large.",
        hint: "Think about input scaling (n) rather than hardware-dependent clock measurements.",
        image_required: false,
        timestamp_reference: "04:45",
        timestamp_seconds: 285
      },
      {
        id: 3,
        topic: "Algorithmic Correctness",
        text: "Why is algorithmic correctness established prior to applying performance optimizations?",
        options: [
          "An algorithm that executes rapidly but produces incorrect output has zero computational utility",
          "Compilers automatically refuse to build code that hasn't been mathematically proven",
          "Optimized algorithms are forbidden from using conditional branching logic",
          "Modern processors degrade clock frequencies when running unoptimized procedures"
        ],
        correct: 0,
        explanation: "Correctness is paramount; fast execution is meaningless if the computed output violates problem constraints.",
        hint: "Consider the real-world value of a fast result versus an accurate result.",
        image_required: false,
        timestamp_reference: "07:10",
        timestamp_seconds: 430
      }
    ];
  }

  if (t.includes("search") || t.includes("binary") || t.includes("tree")) {
    return [
      {
        id: 1,
        topic: "Binary Search Tree",
        text: "SCENARIO: In the Binary Search Tree diagram shown below, where should a new key '35' be inserted relative to root node 50 and node 30?",
        options: [
          "In the left subtree of 50, as the right child of node 30",
          "In the right subtree of 50, as the left child of node 70",
          "Replacing the root node 50 directly",
          "As the left child of node 20"
        ],
        correct: 0,
        explanation: "In a BST, keys less than 50 go left; since 35 > 30, it belongs in the right subtree of node 30.",
        hint: "Compare 35 with root 50, then compare 35 with child node 30.",
        image_required: true,
        timestamp_reference: "05:40",
        timestamp_seconds: 340
      },
      {
        id: 2,
        topic: "Binary Search Prerequisite",
        text: "What essential precondition must be satisfied before applying Binary Search to a collection?",
        options: [
          "The collection elements must be arranged in sorted monotonic order",
          "The collection must contain an even number of elements",
          "All elements must be stored in a linked list rather than an array",
          "The elements must all be positive integer values"
        ],
        correct: 0,
        explanation: "Binary Search depends on monotonic sorted order so comparing the target with the middle element eliminates half the remaining search space.",
        hint: "How does the algorithm safely eliminate half the candidates in each step?",
        image_required: false,
        timestamp_reference: "08:15",
        timestamp_seconds: 495
      },
      {
        id: 3,
        topic: "Binary Search Complexity",
        text: "What is the worst-case time complexity of Binary Search on a sorted array of n elements?",
        options: [
          "O(log n) logarithmic time",
          "O(n) linear time",
          "O(n log n) linearithmic time",
          "O(1) constant time"
        ],
        correct: 0,
        explanation: "Because the search interval is halved at each comparison, the maximum iterations is log2(n), yielding O(log n) time complexity.",
        hint: "How many times can you divide n by 2 before reaching 1?",
        image_required: false,
        timestamp_reference: "11:20",
        timestamp_seconds: 680
      }
    ];
  }

  if (t.includes("sort") || t.includes("merge")) {
    return [
      {
        id: 1,
        topic: "Divide and Conquer Recursion",
        text: "Observe the Merge Sort recursion tree below. How does the 'Divide' step operate before merging elements back together?",
        options: [
          "It recursively splits the array into two halves until single-element subproblems remain",
          "It randomly swaps adjacent elements until no inversions remain",
          "It scans for the global maximum and moves it to the end",
          "It discards half of the elements entirely without sorting them"
        ],
        correct: 0,
        explanation: "Merge sort recursively divides the problem into subproblems of size N/2 until base case arrays of size 1 are reached.",
        hint: "Focus on the recursive bisection of the input array.",
        image_required: true,
        timestamp_reference: "12:10",
        timestamp_seconds: 730
      },
      {
        id: 2,
        topic: "Merge Sort Complexity",
        text: "What is the guaranteed worst-case time complexity of standard Merge Sort on an array of size n?",
        options: [
          "O(n log n) linearithmic time",
          "O(n^2) quadratic time",
          "O(n) linear time",
          "O(1) constant time"
        ],
        correct: 0,
        explanation: "Merge Sort divides in O(log n) levels and takes O(n) work per level to merge, guaranteeing O(n log n) in all cases.",
        hint: "Recall the depth of the recursion tree multiplied by the linear merge step.",
        image_required: false,
        timestamp_reference: "14:30",
        timestamp_seconds: 870
      },
      {
        id: 3,
        topic: "Merge Step Auxiliary Space",
        text: "What is the auxiliary memory complexity required by standard Merge Sort during the merge phase?",
        options: [
          "O(n) auxiliary buffer space to hold temporary merged elements",
          "O(1) in-place auxiliary space",
          "O(n^2) auxiliary space",
          "O(log n) without external arrays"
        ],
        correct: 0,
        explanation: "Standard Merge Sort allocates a temporary array of size n to merge two sorted halves before copying back.",
        hint: "Where are the sorted elements placed during the merge comparison?",
        image_required: false,
        timestamp_reference: "16:05",
        timestamp_seconds: 965
      }
    ];
  }

  if (t.includes("list") || t.includes("pointer") || t.includes("linked")) {
    return [
      {
        id: 1,
        topic: "Linked List Structure",
        text: "Examine the Linked List diagram below. What does the final node point to in a standard singly linked list?",
        options: [
          "NULL (indicating the end of the sequence)",
          "The head node (circular pointer)",
          "A random unallocated memory address",
          "The previous node's data field"
        ],
        correct: 0,
        explanation: "In a singly linked list, the tail node's next pointer points to NULL to signify the termination of the chain.",
        hint: "Look at the terminal pointer at the end of the chain.",
        image_required: true,
        timestamp_reference: "08:30",
        timestamp_seconds: 510
      },
      {
        id: 2,
        topic: "Pointer-Based Node Allocation",
        text: "How do nodes in a linked list differ from elements in a contiguous array regarding memory layout?",
        options: [
          "Nodes can be scattered non-contiguously in heap memory connected via explicit pointer addresses",
          "Nodes must always reside in strictly adjacent memory addresses",
          "Nodes require less memory per element than simple primitive arrays",
          "Nodes cannot store custom structured data types"
        ],
        correct: 0,
        explanation: "Linked list nodes reside wherever heap memory is available and maintain sequential order strictly via pointer references.",
        hint: "Think about dynamic heap allocation vs contiguous static blocks.",
        image_required: false,
        timestamp_reference: "10:15",
        timestamp_seconds: 615
      },
      {
        id: 3,
        topic: "Linked List Head Insertion",
        text: "What is the time complexity of inserting a new element at the head of a singly linked list?",
        options: [
          "O(1) constant time",
          "O(n) linear time",
          "O(log n) logarithmic time",
          "O(n^2) quadratic time"
        ],
        correct: 0,
        explanation: "Inserting at the head simply creates the node, links its next pointer to the current head, and updates the head reference in O(1) operations.",
        hint: "Does inserting at the head require shifting the remaining nodes?",
        image_required: false,
        timestamp_reference: "12:50",
        timestamp_seconds: 770
      }
    ];
  }

  // Default Course Fundamentals (3 Grounded Questions)
  return [
    {
      id: 1,
      topic: "Core Concept & Method",
      text: `What is the foundational principle taught in ${topic || "this module"}?`,
      options: [
        "Applying structured algorithmic steps to systematically solve computational problems",
        "Memorizing programming keywords without analyzing complexity",
        "Executing brute-force operations without evaluating efficiency",
        "Relying solely on external libraries without understanding core principles"
      ],
      correct: 0,
      explanation: "Understanding systematic problem-solving principles and complexity analysis is the primary educational goal.",
      hint: "Focus on structured reasoning over raw memorization.",
      image_required: false,
      timestamp_reference: "01:00",
      timestamp_seconds: 60
    },
    {
      id: 2,
      topic: "Efficiency & Scalability",
      text: `How do we evaluate whether a solution in ${topic || "this module"} scales efficiently for large inputs?`,
      options: [
        "By analyzing the asymptotic growth rate of time and space complexity with respect to input size n",
        "By measuring how many lines of source code were written in the editor",
        "By running the code once on a high-end workstation",
        "By checking if the code compiles without compiler warnings"
      ],
      correct: 0,
      explanation: "Asymptotic analysis gives machine-independent bounds on resource growth as inputs scale.",
      hint: "Think about mathematical growth rates (Big-O).",
      image_required: false,
      timestamp_reference: "03:20",
      timestamp_seconds: 200
    },
    {
      id: 3,
      topic: "Practical Application",
      text: `When applying concepts from ${topic || "this module"} in real software systems, what is the key trade-off to consider?`,
      options: [
        "Balancing runtime speed, memory consumption, and implementation clarity according to system constraints",
        "Always prioritizing code shortness over correctness and readability",
        "Avoiding all built-in data structures regardless of requirements",
        "Assuming infinite memory and zero network latency"
      ],
      correct: 0,
      explanation: "Engineering involves evaluating space-time trade-offs and selecting the optimal data structures and algorithms for the problem constraints.",
      hint: "Consider trade-offs between memory, CPU runtime, and maintainability.",
      image_required: false,
      timestamp_reference: "05:40",
      timestamp_seconds: 340
    }
  ];
};

const parseRawQuestions = (rawQuestions: any[], currentTopic: string): QuizQuestionItem[] => {
  const parsed: QuizQuestionItem[] = rawQuestions.slice(0, 3).map((q: any, idx: number) => {
    const qHash = String(q.question_hash || q.question_id || q.id || computeClientQuestionHash(q.question || q.text || `Q_${idx}`, q.topic || currentTopic));
    return {
      id: qHash,
      question_hash: qHash,
      topic: q.topic || currentTopic || "Module Concept",
      text: q.question || q.text || `Question ${idx + 1}`,
      options: Array.isArray(q.options) && q.options.length >= 4 
        ? q.options 
        : ["Option A", "Option B", "Option C", "Option D"],
      correct: q.correct_index !== undefined ? Number(q.correct_index) : (q.correct !== undefined ? Number(q.correct) : 0),
      explanation: q.explanation || "Understanding this principle ensures algorithmic mastery.",
      hint: q.hint || undefined,
      image_required: Boolean(q.image_required),
      image_optional: Boolean(q.image_optional),
      image_reference: q.image_reference || undefined,
      image_url: q.image_url || undefined,
      diagram_svg: q.diagram_svg || undefined,
      timestamp_reference: q.timestamp_reference || undefined,
      timestamp_seconds: q.timestamp_seconds || undefined
    };
  });

  if (parsed.length < 3) {
    const defaults = getDefaultQuestionsForTopic(currentTopic);
    while (parsed.length < 3 && defaults.length >= parsed.length + 1) {
      parsed.push(defaults[parsed.length]);
    }
  }
  return parsed.slice(0, 3);
};

export const AdaptiveQuizModal: React.FC<AdaptiveQuizModalProps> = ({
  onClose,
  courseId = 1,
  moduleId = 1,
  topic = "Introduction to Algorithms",
  onOpenAITutor,
  onNavigateToTopic
}) => {
  const { user, updateUser } = useAuth();
  
  // Synchronous pre-check of background preloaded quiz
  const preloaded = quizPrefetchService.getCachedQuiz(courseId, moduleId, topic);
  const initialQuestions = preloaded ? parseRawQuestions(preloaded.questions, topic) : [];
  
  // Quiz Question Navigation State
  const [questions, setQuestions] = useState<QuizQuestionItem[]>(initialQuestions);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([null, null, null]);
  const [isCurrentAnswerSubmitted, setIsCurrentAnswerSubmitted] = useState<boolean>(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Overall Quiz State
  const [isLoading, setIsLoading] = useState<boolean>(initialQuestions.length === 0);
  const [quizId, setQuizId] = useState<number>(preloaded?.quiz_id || 1);
  const [isQuizComplete, setIsQuizComplete] = useState<boolean>(false);
  const [scoreCount, setScoreCount] = useState<number>(0);

  // Safe close handler that enforces the 60s cooldown and reports outcome
  const handleSafeClose = useCallback(() => {
    if (!isQuizComplete) {
      // If student closed without completing all 3 questions, register ineffective attempt
      closedLoopController.reportInterventionOutcome({ dismissed: true, quizScore: 0 });
    }
    closedLoopController.resetInterventionCooldown();
    onClose();
  }, [onClose, isQuizComplete]);

  // Fetch or resolve pre-generated 3-question adaptive micro-quiz
  useEffect(() => {
    let isMounted = true;
    const tModalMounted = performance.now();
    const t0 = (window as any).__ADAPTIVE_TRIGGER_T0__ || (tModalMounted - 50);

    console.log(`[Adaptive] T2: Modal mounted & visible at ${(tModalMounted - t0).toFixed(1)}ms after trigger`);

    // Case 1: Already in memory from background prefetch
    if (initialQuestions.length === 3) {
      const tQ1Visible = performance.now();
      console.log(`[Adaptive] T3: Question 1 visible at ${(tQ1Visible - t0).toFixed(1)}ms after trigger [ZERO LATENCY PRELOAD]`);
      console.log(`[Adaptive] Measured Latency: Detection → Modal: ${(tModalMounted - t0).toFixed(1)}ms | Modal → Question: ${(tQ1Visible - tModalMounted).toFixed(1)}ms | Detection → Question: ${(tQ1Visible - t0).toFixed(1)}ms`);
      return;
    }

    // Case 2: Asynchronously retrieve prefetch or generate
    const loadQuiz = async () => {
      try {
        const payload = await quizPrefetchService.prefetchQuizForContext(courseId, moduleId, topic);
        if (isMounted && payload && Array.isArray(payload.questions) && payload.questions.length > 0) {
          setQuizId(payload.quiz_id || 1);
          const parsed = parseRawQuestions(payload.questions, topic);
          setQuestions(parsed);
          setIsLoading(false);

          const tQ1Visible = performance.now();
          console.log(`[Adaptive] T3: Question 1 visible at ${(tQ1Visible - t0).toFixed(1)}ms after trigger [ASYNC PRELOAD RESOLVED]`);
          console.log(`[Adaptive] Measured Latency: Detection → Modal: ${(tModalMounted - t0).toFixed(1)}ms | Modal → Question: ${(tQ1Visible - tModalMounted).toFixed(1)}ms | Detection → Question: ${(tQ1Visible - t0).toFixed(1)}ms`);
          return;
        }
      } catch (err) {
        console.warn("[Adaptive] Quiz prefetch exception, applying contextual lesson fallback:", err);
      }

      if (isMounted) {
        setQuestions(getDefaultQuestionsForTopic(topic).slice(0, 3));
        setIsLoading(false);
        const tQ1Visible = performance.now();
        console.log(`[Adaptive] T3: Question 1 visible at ${(tQ1Visible - t0).toFixed(1)}ms [FALLBACK]`);
      }
    };

    loadQuiz();
    return () => {
      isMounted = false;
    };
  }, [courseId, moduleId, topic, initialQuestions.length]);

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length || 3;

  const handleSelectOption = (optionIdx: number) => {
    if (isCurrentAnswerSubmitted) return;
    setSelectedAnswer(optionIdx);
  };

  // Submit Answer for the CURRENT question
  const handleSubmitCurrentAnswer = () => {
    if (selectedAnswer === null || !currentQuestion || isCurrentAnswerSubmitted) return;

    const correct = selectedAnswer === currentQuestion.correct;
    setIsCurrentCorrect(correct);
    setIsCurrentAnswerSubmitted(true);

    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentIdx] = selectedAnswer;
    setUserAnswers(updatedAnswers);

    if (correct) {
      setScoreCount(prev => prev + 1);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  // Move to next question or complete quiz
  const handleProceedNext = async () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setIsCurrentAnswerSubmitted(false);
      setIsCurrentCorrect(false);
      setShowHint(false);
    } else {
      // Completed all 3 questions -> Final Summary
      setIsQuizComplete(true);

      // Mark these 3 questions as seen so they never repeat in subsequent interventions
      const completedQuestionIds = questions.map((q, idx) => 
        String(q.id || computeClientQuestionHash(q.text, q.topic || topic))
      );
      quizPrefetchService.markQuestionsAsSeen(courseId, moduleId, completedQuestionIds);

      // Proactively prefetch next unique batch in the background
      quizPrefetchService.prefetchQuizForContext(courseId, moduleId, topic, true);

      const finalScoreCount = userAnswers.reduce<number>((acc, ans, idx) => {
        if (ans !== null && questions[idx] && ans === questions[idx].correct) {
          return acc + 1;
        }
        return acc;
      }, 0);

      const scorePercent = Math.round((finalScoreCount / totalQuestions) * 100);
      learnerStateClassifier.setRecentQuizScore(scorePercent);
      closedLoopController.reportInterventionOutcome({ quizScore: scorePercent });

      const finalAnswersClean = userAnswers.map(a => (a !== null ? a : 0));
      try {
        const res = await quizApi.submit(quizId, finalAnswersClean);
        if (user && res.xp_earned) {
          updateUser({ total_xp: (user.total_xp || 0) + res.xp_earned });
        }
      } catch (e) {
        const xp = finalScoreCount * 15 + (finalScoreCount === 3 ? 15 : 0);
        if (user) {
          updateUser({ total_xp: (user.total_xp || 0) + xp });
        }
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSafeClose();
        return;
      }

      if (isLoading || isQuizComplete || !currentQuestion) return;

      if (!isCurrentAnswerSubmitted) {
        const optsCount = currentQuestion.options.length;

        // Number keys 1-4
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx >= 0 && idx < optsCount) {
            handleSelectOption(idx);
          }
        }

        // Letter keys A-D / a-d
        const lower = e.key.toLowerCase();
        if (['a', 'b', 'c', 'd'].includes(lower)) {
          const idx = lower.charCodeAt(0) - 97;
          if (idx >= 0 && idx < optsCount) {
            handleSelectOption(idx);
          }
        }

        // Enter key to submit answer
        if (e.key === 'Enter' && selectedAnswer !== null) {
          handleSubmitCurrentAnswer();
        }
      } else {
        // If already submitted, Enter key advances to Next Question
        if (e.key === 'Enter') {
          handleProceedNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, selectedAnswer, isCurrentAnswerSubmitted, isQuizComplete, isLoading, handleSafeClose, currentIdx, totalQuestions, userAnswers]);

  // Pedagogical diagram check
  let activeDiagram: DiagramData | null = null;
  if (currentQuestion) {
    if (currentQuestion.diagram_svg) {
      activeDiagram = {
        id: 'custom',
        title: currentQuestion.topic,
        topic: currentQuestion.topic,
        svg: currentQuestion.diagram_svg
      };
    } else {
      activeDiagram = findRelevantDiagram(currentQuestion.text, currentQuestion.topic);
    }
  }

  // Exact Score-Based Performance Message (Strict requirement: No psychological/cognitive claims)
  const getPerformanceMessage = (score: number) => {
    switch (score) {
      case 3:
        return "Excellent — you're right on track.";
      case 2:
        return "Good progress. One concept is worth a quick review.";
      case 1:
        return "Let's reinforce this topic before moving on.";
      case 0:
      default:
        return "Let's revisit this concept together.";
    }
  };

  // Short, friendly humorous learning-related lines
  const getHumorLine = (score: number) => {
    if (score === 3) {
      return "One concept at a time — that's how the boss level gets unlocked. 😎";
    }
    if (score === 2) {
      return "Strong momentum! Even top-tier code has an occasional commit fix. 🚀";
    }
    if (score === 1) {
      return "Good effort! Even neural networks need a few training epochs. 🧠";
    }
    return "No stress! Debugging is where real programmers level up. 🛠️";
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Zenbrix Diagnostic Panel */}
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-[#26323A] p-6 space-y-4 shadow-2xl bg-white dark:bg-[#11171D] text-slate-900 dark:text-slate-100 relative max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26323A] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-[#080B0F] border border-[#0EA5E9]/40 dark:border-[#22D3EE]/40 flex items-center justify-center text-[#0EA5E9] dark:text-[#22D3EE]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2 font-sans">
                <span>ADAPTIVE MICRO-QUIZ</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#0EA5E9]/40 dark:border-[#22D3EE]/40 text-[#0EA5E9] dark:text-[#22D3EE] bg-cyan-50 dark:bg-[#080B0F]">
                  {topic}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                {!isQuizComplete ? `Question ${currentIdx + 1} of ${totalQuestions} • Grounded in Lesson Content` : '3-Question Diagnostic Evaluation Complete'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSafeClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm font-mono font-bold px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#080B0F] transition-colors"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar (3 Segmented Steps) */}
        {!isLoading && !isQuizComplete && (
          <div className="flex items-center space-x-2 pt-1 pb-1">
            {[0, 1, 2].map((stepIdx) => {
              const isDone = stepIdx < currentIdx || (stepIdx === currentIdx && isCurrentAnswerSubmitted);
              const isCurrent = stepIdx === currentIdx;
              return (
                <div key={stepIdx} className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-[#1A232C]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isDone
                        ? 'bg-[#0EA5E9] dark:bg-[#22D3EE]'
                        : isCurrent
                        ? 'bg-[#0EA5E9]/50 dark:bg-[#22D3EE]/50 animate-pulse'
                        : 'bg-transparent'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-8 h-8 text-[#0EA5E9] dark:text-[#22D3EE] animate-spin" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Loading 3-question adaptive quiz for <span className="text-[#0EA5E9] dark:text-[#22D3EE] font-bold">{topic}</span>...
            </p>
            <p className="text-[10px] text-slate-500 font-mono">Retrieving grounded knowledge checks in a single payload</p>
          </div>
        ) : !isQuizComplete && currentQuestion ? (
          <div className="space-y-4">
            {/* Question Counter & Topic Bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                QUESTION {currentIdx + 1} OF {totalQuestions}
              </span>
              <span className="text-[10px] text-[#0EA5E9] dark:text-[#22D3EE] font-bold bg-cyan-50 dark:bg-[#080B0F] px-2 py-0.5 rounded border border-[#0EA5E9]/30 dark:border-[#22D3EE]/30">
                {currentQuestion.topic}
              </span>
            </div>

            {/* Pedagogical Diagram (Rendered ONLY when image_required is true) */}
            {activeDiagram && (
              <div className="p-3 bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#0EA5E9] dark:text-[#22D3EE] font-mono font-bold">
                  <span className="flex items-center space-x-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Visual Reference: {activeDiagram.title}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Interactive Diagram</span>
                </div>
                <div
                  className="flex justify-center items-center py-1 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: activeDiagram.svg }}
                />
              </div>
            )}

            {currentQuestion.image_url && !activeDiagram && currentQuestion.image_required && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#26323A] bg-slate-50 dark:bg-[#080B0F] max-h-48 flex items-center justify-center p-2">
                <img
                  src={currentQuestion.image_url}
                  alt={currentQuestion.topic}
                  className="max-h-44 object-contain rounded-lg"
                />
              </div>
            )}

            {/* Clear Question Text */}
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
              {currentQuestion.text}
            </p>

            {/* Large 4-Option Answer Cards */}
            <div className="space-y-2.5 pt-1">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isObjectOption = typeof opt === 'object' && opt !== null;
                const optionText = isObjectOption ? opt.text : opt;

                let cardStyle = 'bg-slate-50 dark:bg-[#080B0F] border-slate-200 dark:border-[#26323A] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white';
                let badgeStyle = 'bg-slate-200 dark:bg-[#1A232C] text-slate-700 dark:text-slate-300';

                if (isCurrentAnswerSubmitted) {
                  const isThisCorrect = idx === currentQuestion.correct;
                  if (isThisCorrect) {
                    cardStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-medium ring-1 ring-emerald-500';
                    badgeStyle = 'bg-emerald-500 text-white font-bold';
                  } else if (isSelected && !isThisCorrect) {
                    cardStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 font-medium ring-1 ring-rose-500';
                    badgeStyle = 'bg-rose-500 text-white font-bold';
                  } else {
                    cardStyle = 'opacity-50 bg-slate-50 dark:bg-[#080B0F] border-slate-200 dark:border-[#26323A] text-slate-500';
                  }
                } else if (isSelected) {
                  cardStyle = 'bg-cyan-50/70 dark:bg-[#080B0F] border-[#0EA5E9] dark:border-[#22D3EE] text-slate-900 dark:text-white shadow-sm ring-1 ring-[#0EA5E9] dark:ring-[#22D3EE]';
                  badgeStyle = 'bg-[#0EA5E9] dark:bg-[#22D3EE] text-white dark:text-slate-950 shadow-sm';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    disabled={isCurrentAnswerSubmitted}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-start space-x-3 font-sans ${cardStyle} ${isCurrentAnswerSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className={`font-mono font-bold shrink-0 px-2.5 py-0.5 rounded text-[11px] ${badgeStyle}`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-relaxed flex-1 pt-0.5 font-medium">{optionText}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional Hidden Hint */}
            {currentQuestion.hint && !isCurrentAnswerSubmitted && (
              <div className="pt-1">
                {!showHint ? (
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="text-[11px] text-[#0EA5E9] dark:text-[#22D3EE] hover:underline font-mono flex items-center space-x-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Need a hint? (Reveal)</span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-amber-50 dark:bg-[#1A232C] border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-300 font-sans animate-fade-in">
                    <strong className="font-mono text-[10px] uppercase block text-amber-700 dark:text-amber-400">Socratic Hint:</strong>
                    {currentQuestion.hint}
                  </div>
                )}
              </div>
            )}

            {/* Immediate Result Banner for Current Question */}
            {isCurrentAnswerSubmitted && (
              <div className={`p-3.5 rounded-xl border space-y-1.5 animate-fade-in ${
                isCurrentCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-500/30 text-rose-900 dark:text-rose-200'
              }`}>
                <div className="flex items-center space-x-2 font-bold font-sans text-xs">
                  {isCurrentCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Correct ✓</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Incorrect ✗</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Bottom Action Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#26323A]">
              <span className="text-[11px] text-slate-500 font-mono">
                {!isCurrentAnswerSubmitted
                  ? `Select option (1–${currentQuestion.options.length}) & Submit`
                  : currentIdx < totalQuestions - 1 ? 'Answer evaluated. Ready for next question.' : 'All questions answered!'}
              </span>

              {!isCurrentAnswerSubmitted ? (
                <button
                  type="button"
                  onClick={handleSubmitCurrentAnswer}
                  disabled={selectedAnswer === null}
                  className="px-5 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-[#22D3EE] dark:hover:bg-[#06B6D4] text-white dark:text-slate-950 text-xs font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <span>SUBMIT ANSWER</span>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedNext}
                  className="px-5 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-[#22D3EE] dark:hover:bg-[#06B6D4] text-white dark:text-slate-950 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <span>{currentIdx < totalQuestions - 1 ? 'NEXT QUESTION →' : 'VIEW SUMMARY →'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Final Quiz Summary Screen in Zenbrix Style */
          <div className="text-center py-2 space-y-4 animate-fade-in">
            {/* Score Badge */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
              scoreCount >= 2
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-cyan-50 dark:bg-[#080B0F] border-[#0EA5E9]/40 dark:border-[#22D3EE]/40 text-[#0EA5E9] dark:text-[#22D3EE]'
            }`}>
              <span className="text-xl font-mono font-extrabold">{scoreCount}/{totalQuestions}</span>
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase font-sans tracking-wide">
                QUIZ COMPLETE
              </h4>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {scoreCount} / {totalQuestions} Correct
              </p>

              {/* Exact Concise Score-Based Performance Message */}
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold font-sans">
                {getPerformanceMessage(scoreCount)}
              </p>

              {/* "Go and Study This" Button linking directly to current lesson/timestamp */}
              <div className="mt-3 p-3.5 bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] rounded-xl text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#0EA5E9] dark:text-[#22D3EE] font-bold">
                    Recommended Study Focus:
                  </span>
                  {questions[0]?.timestamp_reference && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Timestamp: {questions[0].timestamp_reference}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 font-sans">
                  Topic: <strong className="text-slate-900 dark:text-white">{topic}</strong>
                </p>
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const ts = questions[0]?.timestamp_seconds;
                      handleSafeClose();
                      if (onNavigateToTopic) {
                        onNavigateToTopic(topic, ts);
                      } else if (onOpenAITutor) {
                        onOpenAITutor(topic);
                      }
                    }}
                    className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-[#22D3EE] dark:hover:bg-[#06B6D4] text-white dark:text-slate-950 font-mono font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 shadow-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Go and Study This →</span>
                  </button>
                </div>
              </div>

              {/* ONE Short, Friendly Humorous Learning-Related Line */}
              <div className="mt-3 px-3.5 py-2.5 bg-slate-50 dark:bg-[#080B0F] border border-slate-200 dark:border-[#26323A] rounded-xl text-slate-700 dark:text-slate-300 text-xs font-medium italic text-center">
                "{getHumorLine(scoreCount)}"
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-3 pt-3 border-t border-slate-100 dark:border-[#26323A]">
              <button
                type="button"
                onClick={handleSafeClose}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-[#1A232C] hover:bg-slate-200 dark:hover:bg-[#26323A] text-slate-700 dark:text-slate-200 font-mono font-bold text-xs transition-colors"
              >
                CONTINUE LESSON
              </button>
              {onOpenAITutor && (
                <button
                  type="button"
                  onClick={() => {
                    handleSafeClose();
                    onOpenAITutor(topic);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] dark:bg-[#22D3EE] text-white dark:text-slate-950 font-mono font-bold text-xs transition-colors shadow-sm flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ASK AI SOCRATIC TUTOR</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

