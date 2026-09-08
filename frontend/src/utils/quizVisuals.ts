/**
 * QUIZ VISUALS UTILITY
 * =====================
 * Generates lightweight, crisp SVG vector diagrams for computer science and data structure topics.
 * These are used optionally in micro-quizzes when a diagram enhances conceptual understanding.
 */

export interface DiagramData {
  id: string;
  title: string;
  topic: string;
  svg: string;
}

export const CS_DIAGRAMS: Record<string, DiagramData> = {
  linked_list: {
    id: 'linked_list',
    title: 'Singly Linked List Structure',
    topic: 'Linked Lists',
    svg: `<svg viewBox="0 0 420 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto max-h-32">
      <!-- Node 1 -->
      <rect x="10" y="25" width="55" height="50" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
      <text x="37" y="55" fill="#f8fafc" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">12</text>
      <rect x="65" y="25" width="25" height="50" rx="2" fill="#334155" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="77" cy="50" r="4" fill="#60a5fa"/>
      
      <!-- Arrow 1 -> 2 -->
      <path d="M77 50 H125" stroke="#60a5fa" stroke-width="2.5" marker-end="url(#arrow)"/>
      
      <!-- Node 2 -->
      <rect x="135" y="25" width="55" height="50" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
      <text x="162" y="55" fill="#f8fafc" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">45</text>
      <rect x="190" y="25" width="25" height="50" rx="2" fill="#334155" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="202" cy="50" r="4" fill="#60a5fa"/>
      
      <!-- Arrow 2 -> 3 -->
      <path d="M202 50 H250" stroke="#60a5fa" stroke-width="2.5"/>
      
      <!-- Node 3 -->
      <rect x="260" y="25" width="55" height="50" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
      <text x="287" y="55" fill="#f8fafc" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">99</text>
      <rect x="315" y="25" width="25" height="50" rx="2" fill="#334155" stroke="#3b82f6" stroke-width="1.5"/>
      
      <!-- Arrow 3 -> NULL -->
      <path d="M327 50 H365" stroke="#ef4444" stroke-width="2.5"/>
      <text x="390" y="55" fill="#ef4444" font-size="13" font-weight="bold" text-anchor="middle" font-family="monospace">NULL</text>
      
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#60a5fa"/>
        </marker>
      </defs>
    </svg>`
  },

  binary_search_tree: {
    id: 'binary_search_tree',
    title: 'Binary Search Tree (BST)',
    topic: 'Trees & BST',
    svg: `<svg viewBox="0 0 380 140" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto max-h-36">
      <!-- Edges -->
      <line x1="190" y1="28" x2="105" y2="75" stroke="#475569" stroke-width="2"/>
      <line x1="190" y1="28" x2="275" y2="75" stroke="#475569" stroke-width="2"/>
      <line x1="105" y1="75" x2="65" y2="120" stroke="#475569" stroke-width="2"/>
      <line x1="105" y1="75" x2="145" y2="120" stroke="#475569" stroke-width="2"/>
      <line x1="275" y1="75" x2="315" y2="120" stroke="#475569" stroke-width="2"/>

      <!-- Root Node (50) -->
      <circle cx="190" cy="28" r="18" fill="#1e1b4b" stroke="#6366f1" stroke-width="2.5"/>
      <text x="190" y="33" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">50</text>

      <!-- Left Subtree (30) -->
      <circle cx="105" cy="75" r="16" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <text x="105" y="80" fill="#e0f2fe" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">30</text>

      <!-- Right Subtree (70) -->
      <circle cx="275" cy="75" r="16" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <text x="275" y="80" fill="#e0f2fe" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">70</text>

      <!-- Leaf Nodes -->
      <circle cx="65" cy="120" r="14" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
      <text x="65" y="124" fill="#d1fae5" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">20</text>

      <circle cx="145" cy="120" r="14" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
      <text x="145" y="124" fill="#d1fae5" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">40</text>

      <circle cx="315" cy="120" r="14" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
      <text x="315" y="124" fill="#d1fae5" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">85</text>
    </svg>`
  },

  divide_and_conquer: {
    id: 'divide_and_conquer',
    title: 'Divide & Conquer Recursion (Merge Sort)',
    topic: 'Sorting & Recursion',
    svg: `<svg viewBox="0 0 400 130" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto max-h-36">
      <!-- Top Array [38, 27, 43, 3] -->
      <rect x="130" y="10" width="140" height="28" rx="4" fill="#1e293b" stroke="#8b5cf6" stroke-width="2"/>
      <text x="200" y="28" fill="#f1f5f9" font-size="12" font-weight="bold" text-anchor="middle" font-family="monospace">[ 38, 27, 43, 3 ]</text>
      
      <!-- Split Arrows -->
      <path d="M170 42 L110 65" stroke="#a78bfa" stroke-width="2" marker-end="url(#purple-arr)"/>
      <path d="M230 42 L290 65" stroke="#a78bfa" stroke-width="2" marker-end="url(#purple-arr)"/>

      <!-- Level 2 Sub-arrays -->
      <rect x="60" y="68" width="100" height="24" rx="4" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.5"/>
      <text x="110" y="84" fill="#e0e7ff" font-size="11" font-weight="bold" text-anchor="middle" font-family="monospace">[ 38, 27 ]</text>

      <rect x="240" y="68" width="100" height="24" rx="4" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.5"/>
      <text x="290" y="84" fill="#e0e7ff" font-size="11" font-weight="bold" text-anchor="middle" font-family="monospace">[ 43, 3 ]</text>

      <!-- Label -->
      <text x="200" y="118" fill="#94a3b8" font-size="11" font-weight="500" text-anchor="middle">Divide step: O(log n) tree depth</text>

      <defs>
        <marker id="purple-arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#a78bfa"/>
        </marker>
      </defs>
    </svg>`
  },

  big_o_complexity: {
    id: 'big_o_complexity',
    title: 'Time Complexity Growth Curves',
    topic: 'Big-O Analysis',
    svg: `<svg viewBox="0 0 360 140" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto max-h-36">
      <!-- Axis -->
      <line x1="30" y1="120" x2="330" y2="120" stroke="#64748b" stroke-width="1.5"/>
      <line x1="30" y1="120" x2="30" y2="15" stroke="#64748b" stroke-width="1.5"/>
      <text x="325" y="132" fill="#94a3b8" font-size="10" font-family="sans-serif">n (Input)</text>
      <text x="15" y="20" fill="#94a3b8" font-size="10" font-family="sans-serif">Ops</text>

      <!-- Curves -->
      <!-- O(1) -->
      <line x1="30" y1="110" x2="320" y2="110" stroke="#10b981" stroke-width="2"/>
      <text x="325" y="112" fill="#10b981" font-size="10" font-weight="bold">O(1)</text>

      <!-- O(log n) -->
      <path d="M30 110 Q 150 95, 320 85" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <text x="325" y="87" fill="#38bdf8" font-size="10" font-weight="bold">O(log n)</text>

      <!-- O(n) -->
      <line x1="30" y1="110" x2="300" y2="40" stroke="#f59e0b" stroke-width="2"/>
      <text x="305" y="42" fill="#f59e0b" font-size="10" font-weight="bold">O(n)</text>

      <!-- O(n^2) -->
      <path d="M30 110 Q 140 100, 200 20" fill="none" stroke="#ef4444" stroke-width="2"/>
      <text x="205" y="24" fill="#ef4444" font-size="10" font-weight="bold">O(n²)</text>
    </svg>`
  }
};

/**
 * Checks if question or module context matches any available educational diagram
 */
export function findRelevantDiagram(text?: string, topic?: string): DiagramData | null {
  if (!text && !topic) return null;
  const combined = `${text || ''} ${topic || ''}`.toLowerCase();

  if (combined.includes('linked list') || combined.includes('pointer') || combined.includes('node.next')) {
    return CS_DIAGRAMS.linked_list;
  }
  if (combined.includes('binary tree') || combined.includes('bst') || combined.includes('traversal') || combined.includes('tree node')) {
    return CS_DIAGRAMS.binary_search_tree;
  }
  if (combined.includes('merge sort') || combined.includes('divide and conquer') || combined.includes('subproblem') || combined.includes('recursion')) {
    return CS_DIAGRAMS.divide_and_conquer;
  }
  if (combined.includes('time complexity') || combined.includes('big o') || combined.includes('o(n') || combined.includes('growth rate')) {
    return CS_DIAGRAMS.big_o_complexity;
  }

  return null;
}
