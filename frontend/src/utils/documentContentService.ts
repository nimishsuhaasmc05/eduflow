import { LibraryResource } from '../types/library';

export interface DocumentSection {
  chapterNumber: number;
  chapterTitle: string;
  subtitle: string;
  summary: string;
  concepts: string[];
  formulaOrRule?: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  deepDive: string;
  takeaways: string[];
}

/**
 * Rich, domain-grounded chapter content generator tailored to each library resource.
 */
export function getDocumentSection(resource: LibraryResource, pageOrChapter: number): DocumentSection {
  // If the resource has explicit page text in pages_content, use it as part of the section
  const customPageText = resource.pages_content?.[pageOrChapter];

  const titleLower = resource.title.toLowerCase();
  const categoryLower = resource.category.toLowerCase();

  // Normalize page/chapter index (1 to 6)
  const chapterIdx = ((pageOrChapter - 1) % 6) + 1;

  // 1. DATA STRUCTURES & ALGORITHMS
  if (titleLower.includes('data structure') || titleLower.includes('algorithm') || titleLower.includes('compiler')) {
    const chapters: Record<number, DocumentSection> = {
      1: {
        chapterNumber: 1,
        chapterTitle: 'Asymptotic Analysis & Big-O Foundations',
        subtitle: 'Formalizing growth rates, time-space trade-offs, and worst-case bounds',
        summary: 'Asymptotic notation classifies algorithm efficiency based on how runtime and memory scale as input size n approaches infinity.',
        concepts: ['Worst-Case O(n)', 'Best-Case Omega(1)', 'Average-Case Theta(n log n)', 'Space-Time Invariants'],
        formulaOrRule: 'T(n) <= c * g(n)  for all n >= n_0  (Big-O definition)',
        codeSnippet: {
          language: 'python',
          code: `# Linear vs Binary Search Performance Invariant
def binary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1  # O(log N) runtime, O(1) auxiliary space`
        },
        deepDive: 'Linear data structures (arrays, linked lists) provide contiguous vs pointer-based memory representations. Array element retrieval operates in O(1) time through hardware memory address arithmetic: Address = Base + (Index * ElementSize). In contrast, linked lists require sequential traversal O(n) but achieve O(1) insertions when pointer references are known.',
        takeaways: [
          'Binary search requires sorted array access and halves the search space each iteration.',
          'Memory cache locality drastically favors contiguous array storage over pointer-heavy node graphs.',
          'Amortized analysis accounts for occasional expensive reallocations across long sequences of operations.'
        ]
      },
      2: {
        chapterNumber: 2,
        chapterTitle: 'Balanced Binary Search Trees & AVL Rotations',
        subtitle: 'Maintaining logarithmic tree depth to guarantee O(log N) operations',
        summary: 'Standard BSTs risk degenerating into linked lists of depth O(n). Self-balancing trees (AVL, Red-Black) enforce height balance invariants via tree rotations.',
        concepts: ['Balance Factor (BF)', 'Left-Right Rotations', 'Logarithmic Depth', 'Tree Traversal (Inorder, Preorder)'],
        formulaOrRule: 'Balance Factor: BF(node) = Height(LeftSubtree) - Height(RightSubtree)  where |BF| <= 1',
        codeSnippet: {
          language: 'typescript',
          code: `class TreeNode<T> {
  value: T;
  left: TreeNode<T> | null = null;
  right: TreeNode<T> | null = null;
  height: number = 1;

  constructor(val: T) {
    this.value = val;
  }
}

// Right rotation to rebalance Left-Heavy node
function rotateRight<T>(y: TreeNode<T>): TreeNode<T> {
  const x = y.left!;
  const T2 = x.right;
  x.right = y;
  y.left = T2;
  y.height = Math.max(getHeight(y.left), getHeight(y.right)) + 1;
  x.height = Math.max(getHeight(x.left), getHeight(x.right)) + 1;
  return x;
}`
        },
        deepDive: 'When inserting into an AVL tree, four balance conditions can occur: Left-Left (single right rotation), Right-Right (single left rotation), Left-Right (left rotation on child followed by right rotation on parent), and Right-Left. Red-Black trees trade off slightly looser balance invariants to execute fewer rotation operations during frequent write workloads.',
        takeaways: [
          'AVL trees are strictly height-balanced, offering faster search lookups than Red-Black trees.',
          'Red-Black trees are preferred in operating system schedulers and standard library maps due to faster insertions.',
          'Inorder traversal of any valid BST yields elements in strictly non-decreasing sorted order.'
        ]
      },
      3: {
        chapterNumber: 3,
        chapterTitle: 'Graph Theory & Shortest Path Traversal',
        subtitle: 'Dijkstra, A* heuristic search, and breadth-first shortest path algorithms',
        summary: 'Graph structures model relationships between arbitrary nodes connected by directed or undirected weighted edges.',
        concepts: ['Adjacency Lists vs Matrix', 'Breadth-First Search (BFS)', 'Priority Queue Dijkstra', 'Relaxation Step'],
        formulaOrRule: 'Dijkstra Relaxation: if dist[u] + weight(u, v) < dist[v] then dist[v] = dist[u] + weight(u, v)',
        codeSnippet: {
          language: 'python',
          code: `import heapq

def dijkstra(graph: dict, start: str) -> dict:
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    pq = [(0, start)]  # (current_distance, node)

    while pq:
        curr_dist, u = heapq.heappop(pq)
        if curr_dist > distances[u]:
            continue
        for v, weight in graph[u]:
            dist = curr_dist + weight
            if dist < distances[v]:
                distances[v] = dist
                heapq.heappush(pq, (dist, v))
    return distances`
        },
        deepDive: 'Breadth-First Search (BFS) operates using a FIFO queue to discover shortest paths in unweighted graphs in O(V + E) time. For weighted graphs with non-negative edges, Dijkstra uses a min-heap priority queue achieving O((V + E) log V). When negative edge weights exist, Bellman-Ford or Floyd-Warshall must be utilized.',
        takeaways: [
          'Adjacency lists are space-optimal O(V + E) for sparse graphs compared to O(V^2) matrices.',
          'Dijkstra guarantees optimal paths only when all edge weights are non-negative.',
          'Topological sorting via DFS or Kahn algorithm resolves acyclic dependency graphs (DAGs).'
        ]
      },
      4: {
        chapterNumber: 4,
        chapterTitle: 'Heap Invariants & Priority Queues',
        subtitle: 'Complete binary tree representations, sift-up, and sift-down mechanics',
        summary: 'Binary heaps maintain the heap property: every parent node is smaller (min-heap) or larger (max-heap) than its immediate children.',
        concepts: ['Array Heap Representation', 'Sift-Down / Heapify', 'O(1) Peek', 'O(log N) Extract-Min'],
        formulaOrRule: 'Parent(i) = (i - 1) // 2  |  LeftChild(i) = 2*i + 1  |  RightChild(i) = 2*i + 2',
        codeSnippet: {
          language: 'python',
          code: `# Sift-down operation to restore Min-Heap property
def sift_down(heap: list, i: int, size: int):
    smallest = i
    left = 2 * i + 1
    right = 2 * i + 2

    if left < size and heap[left] < heap[smallest]:
        smallest = left
    if right < size and heap[right] < heap[smallest]:
        smallest = right
    if smallest != i:
        heap[i], heap[smallest] = heap[smallest], heap[i]
        sift_down(heap, smallest, size)`
        },
        deepDive: 'Building a heap from an unordered array of N elements takes O(N) linear time using bottom-up Floyd heap construction, rather than O(N log N) from sequential insertions. Heaps form the core scheduling structure in operating systems CPU priority queues and real-time event simulation engines.',
        takeaways: [
          'Array-backed heaps have zero pointer overhead and maximum CPU cache locality.',
          'Heap-sort runs in guaranteed O(N log N) time in-place without auxiliary memory allocation.',
          'Fibonacci heaps achieve amortized O(1) decrease-key operations for theoretical graph optimization.'
        ]
      },
      5: {
        chapterNumber: 5,
        chapterTitle: 'Dynamic Programming & Memoization',
        subtitle: 'Decomposing optimal substructure and overlapping subproblems',
        summary: 'Dynamic programming solves complex optimization problems by storing solutions to overlapping subproblems to prevent exponential recomputations.',
        concepts: ['Top-Down Memoization', 'Bottom-Up Tabulation', 'State Transition Relations', 'Space Optimization'],
        formulaOrRule: 'Bellman Equation: Opt(i, w) = max(Opt(i-1, w), val_i + Opt(i-1, w - wt_i))',
        codeSnippet: {
          language: 'python',
          code: `# 0/1 Knapsack Bottom-Up Tabulation
def knapsack(weights: list[int], values: list[int], capacity: int) -> int:
    dp = [0] * (capacity + 1)
    for w, v in zip(weights, values):
        for cap in range(capacity, w - 1, -1):
            dp[cap] = max(dp[cap], dp[cap - w] + v)
    return dp[capacity]`
        },
        deepDive: 'Two critical prerequisites distinguish dynamic programming: Optimal Substructure (an optimal solution contains optimal sub-solutions) and Overlapping Subproblems (the same state is evaluated multiple times in recursion). Tabulation eliminates call-stack overhead and enables rolling-array space optimization.',
        takeaways: [
          'Memoization trades memory space to reduce exponential O(2^N) recursions to polynomial O(N * W).',
          'Bottom-up iteration often allows reducing 2D state matrices to 1D sliding arrays.',
          'Classic DP archetypes include Longest Common Subsequence (LCS), Knapsack, and Matrix Chain Multiplication.'
        ]
      },
      6: {
        chapterNumber: 6,
        chapterTitle: 'Compiler Design & AST Construction',
        subtitle: 'Lexical analysis, context-free grammars, and Intermediate Representation (IR)',
        summary: 'Compilers translate human-readable source code into efficient machine instructions via AST transformations, semantic analysis, and LLVM emission.',
        concepts: ['Lexing & Tokenization', 'Recursive Descent Parsing', 'Abstract Syntax Trees (AST)', 'Intermediate Representation'],
        formulaOrRule: 'Grammar Production: E -> T + E | T   (Context-Free Grammar)',
        codeSnippet: {
          language: 'typescript',
          code: `// Simple AST Node structure
type ASTNode = 
  | { type: 'BinaryExpr'; op: '+' | '-' | '*' | '/'; left: ASTNode; right: ASTNode }
  | { type: 'NumericLiteral'; value: number }
  | { type: 'Identifier'; name: string };

function evaluateAST(node: ASTNode): number {
  if (node.type === 'NumericLiteral') return node.value;
  if (node.type === 'BinaryExpr') {
    const l = evaluateAST(node.left);
    const r = evaluateAST(node.right);
    return node.op === '+' ? l + r : l * r;
  }
  throw new Error('Unsupported node');
}`
        },
        deepDive: 'Lexical analysis transforms raw character streams into token streams. Syntactic parsers construct an Abstract Syntax Tree (AST). The optimizer performs dead-code elimination, loop unrolling, and constant folding on an Intermediate Representation (IR) before emitting machine bytecode.',
        takeaways: [
          'AST representations decouple programming language frontend syntax from machine backend hardware.',
          'LLVM IR provides a portable static single assignment (SSA) representation for high-level optimizations.',
          'Type checking verifies semantic constraints before any native instructions are generated.'
        ]
      }
    };
    return chapters[chapterIdx];
  }

  // 2. COMPUTER VISION & FACIAL LANDMARKS
  if (titleLower.includes('facial') || titleLower.includes('vision') || titleLower.includes('mediapipe') || categoryLower.includes('vision')) {
    const chapters: Record<number, DocumentSection> = {
      1: {
        chapterNumber: 1,
        chapterTitle: '3D Facial Mesh Topology & Geometric Landmarks',
        subtitle: 'Computing 468 spatial coordinates in client memory at 30 FPS',
        summary: 'MediaPipe Face Mesh predicts 468 3D facial landmarks from monocular video frames using lightweight two-stage neural models without depth sensors.',
        concepts: ['468 Spatial Points', 'Monocular Depth Estimation', 'Normalized Coordinates (x, y, z)', 'Bounding Box Crop'],
        formulaOrRule: 'Euclidean Distance in 3D: D(p1, p2) = sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)',
        codeSnippet: {
          language: 'typescript',
          code: `// MediaPipe Landmark Mesh Point Structure
export interface FacialLandmark {
  x: number; // Normalized [0.0, 1.0] by frame width
  y: number; // Normalized [0.0, 1.0] by frame height
  z: number; // Relative depth normalized by face scale
}

function compute3DDistance(p1: FacialLandmark, p2: FacialLandmark): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = (p2.z || 0) - (p1.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}`
        },
        deepDive: 'The pipeline uses a detector network (BlazeFace) to locate the human face region in the image, followed by a regression mesh network that infers 468 landmark coordinates directly from the cropped bounding box. The z-coordinate represents relative depth anchored at the head center of rotation.',
        takeaways: [
          'Raw video frames are processed on-device in WebAssembly memory and never transmitted over network sockets.',
          'Landmark coordinates are normalized, ensuring metric consistency across varying webcam aspect ratios.',
          'Temporal Kalman filtering prevents high-frequency landmark jitter caused by camera sensor noise.'
        ]
      },
      2: {
        chapterNumber: 2,
        chapterTitle: 'Eye Aspect Ratio (EAR) & Blink Dynamics',
        subtitle: 'Mathematical formulations for ocular aperture and micro-closure tracking',
        summary: 'The Eye Aspect Ratio (EAR) calculates the ratio of vertical eye aperture distances to horizontal width to detect blinks, drowsy states, and microsleeps.',
        concepts: ['Vertical Eye Landmarks (p160, p144, p158, p153)', 'Horizontal Outer Corners (p33, p133)', 'EAR Threshold (0.21)', 'Blink Duration Filter'],
        formulaOrRule: 'EAR = (||p160 - p144|| + ||p158 - p153||) / (2 * ||p33 - p133||)',
        codeSnippet: {
          language: 'typescript',
          code: `function calculateEyeAspectRatio(pts: FacialLandmark[]): number {
  // Left eye indices: p33 (outer), p133 (inner), p160/p144 (vertical 1), p158/p153 (vertical 2)
  const dV1 = dist(pts[160], pts[144]);
  const dV2 = dist(pts[158], pts[153]);
  const dH  = dist(pts[33], pts[133]);

  if (dH === 0) return 0.28;
  return (dV1 + dV2) / (2.0 * dH);
}

// EAR < 0.21 denotes closed eye; closure > 750ms signals fatigue/boredom`
        },
        deepDive: 'In alert learners, normal spontaneous blinks last between 100ms and 250ms, during which EAR rapidly dips below 0.21 and recovers. When fatigue or boredom occurs, blink frequency drops or eye closure duration extends beyond 600ms, triggering adaptive pedagogical pacing.',
        takeaways: [
          'Normal human blinks must not be penalized as disengagement; algorithms require temporal duration gating.',
          'Inter-ocular normalization ensures EAR values are invariant to student distance from camera.',
          'Prolonged eye closure (>1.0s) reliably correlates with drowsiness and mind-wandering.'
        ]
      },
      3: {
        chapterNumber: 3,
        chapterTitle: 'Inner Eyebrow Furrowing & Cognitive Confusion',
        subtitle: 'Tracking corrugator muscle contractions as affective markers of cognitive load',
        summary: 'When individuals encounter conceptually difficult content, inner eyebrow landmarks contract inward and downward, reducing relative brow separation.',
        concepts: ['Brow Landmarks (p107, p336)', 'Inter-Ocular Distance (IOD)', 'Normalized Furrow Ratio', 'Cognitive Load Estimation'],
        formulaOrRule: 'Furrow Ratio = ||p107 - p336|| / ||p33 - p263||   (Normalized by Outer Eye Corner Span)',
        codeSnippet: {
          language: 'typescript',
          code: `function calculateEyebrowFurrow(pts: FacialLandmark[]): number {
  // Distance between inner eyebrows (107, 336)
  const ebDist = dist(pts[107], pts[336]);
  // Distance between outer eye corners (33, 263) for scale normalization
  const iod = dist(pts[33], pts[263]);

  const furrowRatio = ebDist / Math.max(iod, 0.01);
  // Neutral human face has ratio ~0.35-0.45; active furrow contracts < 0.28
  return furrowRatio < 0.28 ? 0.85 : 0.15;
}`
        },
        deepDive: 'Raw pixel distance between eyebrows changes drastically if a user leans forward toward their screen. Dividing inner eyebrow distance by the fixed skull span (outer eye corners p33 to p263) establishes an affine-invariant ratio that reflects genuine muscular contraction.',
        takeaways: [
          'Always normalize facial metrics using anatomical baselines like Inter-Ocular Distance (IOD).',
          'Sustained eyebrow furrowing indicates high cognitive effort or active confusion with learning material.',
          'When confusion exceeds 0.55 for consecutive frames, closed-loop systems offer simplified explanations.'
        ]
      },
      4: {
        chapterNumber: 4,
        chapterTitle: 'Head Pose Estimation (Yaw, Pitch, Roll) & Gaze Tracking',
        subtitle: 'Perspective-n-Point (PnP) alignment and off-screen distraction detection',
        summary: 'Estimating 3D head rotation angles via 2D-to-3D landmark projection enables robust detection of off-screen distraction and mobile phone glances.',
        concepts: ['Euler Angles (Yaw, Pitch, Roll)', 'SolvePnP Projection', 'Nose Vector (p1, p4)', 'Off-Task Thresholds (>20 deg)'],
        formulaOrRule: 'Yaw = atan2(dx_nose_midpoint, dz) * (180 / pi)',
        codeSnippet: {
          language: 'typescript',
          code: `function estimateHeadPose(pts: FacialLandmark[]): { yaw: number; pitch: number; roll: number } {
  const nose = pts[1];
  const leftEye = pts[33];
  const rightEye = pts[263];

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;

  const yaw = (nose.x - eyeMidX) * 120;   // Horizontal turn (degrees)
  const pitch = (nose.y - eyeMidY) * 100; // Vertical nod (degrees)
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

  return { yaw, pitch, roll };
}`
        },
        deepDive: 'When a learner turns their head more than 20 degrees sideways (yaw) or looks down at a mobile device (pitch > 20 degrees), gaze vector diverges from educational content. Sustained head deviations (>5 seconds) trigger micro-quizzes to re-orient learner attention.',
        takeaways: [
          'Combined head pose and iris gaze direction differentiate casual glances from persistent distraction.',
          'Natural head shifts while typing or taking physical notes must be accommodated with a hysteresis grace period.',
          'Euler angles above 25 degrees signal loss of visual engagement with instructional media.'
        ]
      },
      5: {
        chapterNumber: 5,
        chapterTitle: 'WebAssembly & WebGL GPU Pipeline Acceleration',
        subtitle: 'Executing neural inference at 30+ FPS inside browser sandboxes',
        summary: 'Client-side computer vision requires low latency. WebAssembly SIMD and WebGL/WebGPU shaders allow browser inference with sub-20ms per-frame overhead.',
        concepts: ['WASM SIMD 128-bit', 'WebGL Shader Textures', 'Off-Screen Canvas', 'Memory Zero-Copy'],
        formulaOrRule: 'Target Frame Budget: 1000ms / 30 FPS = 33.3ms maximum compute budget per video frame',
        codeSnippet: {
          language: 'javascript',
          code: `// Configure ONNX Runtime Web for WebAssembly SIMD & GPU execution
import * as ort from 'onnxruntime-web';

ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/';

const session = await ort.InferenceSession.create('./model.onnx', {
  executionProviders: ['webgl', 'wasm'],
  graphOptimizationLevel: 'all'
});`
        },
        deepDive: 'Running computer vision on the client avoids expensive server streaming bandwidth and eliminates cloud processing costs. Passing video elements directly to WebGL textures allows parallelized image normalization and color-space conversions directly on the client GPU.',
        takeaways: [
          'Zero-copy texture sharing prevents expensive CPU-GPU data transfers across JavaScript boundaries.',
          'WASM SIMD instructions process four 32-bit floating point operations in a single CPU clock cycle.',
          'Throttling state updates prevents unnecessary React virtual DOM reconciliation overhead.'
        ]
      },
      6: {
        chapterNumber: 6,
        chapterTitle: 'Privacy-by-Design & On-Device Telemetry Guarantees',
        subtitle: 'Strict zero-leakage security boundaries for educational biometrics',
        summary: 'Ethical educational monitoring mandates that raw webcam video frames remain exclusively in local browser RAM and are never persisted or streamed.',
        concepts: ['Zero Video Transmission', 'Scalar Telemetry Vectors', 'Client-Side Ephemeral Memory', 'GDPR / FERPA Compliance'],
        formulaOrRule: 'Outgoing Payload: { attention: 0.85, confusion: 0.12, state: "FOCUSED" }  (Zero Imagery)',
        codeSnippet: {
          language: 'json',
          code: `{
  "course_id": 1,
  "module_id": 2,
  "timestamp_seconds": 145.2,
  "attention": 0.88,
  "confusion": 0.14,
  "learner_state": "FOCUSED",
  "blink_count": 18,
  "eye_state": "OPEN"
}`
        },
        deepDive: 'Only anonymous scalar numbers (e.g. attention: 0.85) are transmitted to the backend API to drive pedagogical adaptation. Even if network traffic is intercepted, no facial imagery, identity geometry, or video streams can ever be extracted.',
        takeaways: [
          'On-device processing provides ironclad privacy guarantees that satisfy FERPA and GDPR standards.',
          'Learners retain full agency to toggle biometric telemetry monitoring on or off at any moment.',
          'Anonymous scalar metrics protect student psychological safety during remote learning sessions.'
        ]
      }
    };
    return chapters[chapterIdx];
  }

  // 3. ARTIFICIAL INTELLIGENCE & MACHINE LEARNING
  if (titleLower.includes('deep learning') || titleLower.includes('neural') || titleLower.includes('intelligence') || categoryLower.includes('artificial')) {
    const chapters: Record<number, DocumentSection> = {
      1: {
        chapterNumber: 1,
        chapterTitle: 'Multi-Layer Perceptrons & Backpropagation Calculus',
        subtitle: 'Gradient descent, chain rule propagation, and non-linear activation functions',
        summary: 'Deep neural networks parameterize arbitrary continuous functions through stacked affine transformations composed with non-linear activations.',
        concepts: ['Forward Propagation', 'Multivariate Chain Rule', 'Gradients & Loss Surfaces', 'ReLU & GELU Activations'],
        formulaOrRule: 'dLoss / dw_ij = (dLoss / dz) * (dz / dw_ij) = delta_j * a_i  (Backprop update)',
        codeSnippet: {
          language: 'python',
          code: `import torch
import torch.nn as nn

class FeedForwardNN(nn.Module):
    def __init__(self, in_dim: int, hidden_dim: int, out_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, out_dim)
        )
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)`
        },
        deepDive: 'The loss surface of deep networks is highly non-convex with numerous saddle points and ravines. Non-saturating activations like ReLU and GELU mitigate vanishing gradient problems that plagued early sigmoid networks during deep backpropagation.',
        takeaways: [
          'Backpropagation calculates exact analytical gradients in O(Weights) linear complexity.',
          'GELU activation weights inputs by their probability of being positive under a Gaussian distribution.',
          'Batch normalization stabilizes internal covariate shift across intermediate network activations.'
        ]
      },
      2: {
        chapterNumber: 2,
        chapterTitle: 'Optimization Landscapes: AdamW, Momentum & Learning Schedules',
        subtitle: 'Overcoming ill-conditioned curvature and saddle points in deep training',
        summary: 'First-order stochastic optimizers combine exponentially decaying moving averages of past gradients and squared gradients to navigate high-dimensional spaces.',
        concepts: ['AdamW Weight Decay', 'First Moment (Beta1)', 'Second Moment (Beta2)', 'Cosine Warmup Schedule'],
        formulaOrRule: 'm_t = beta1 * m_{t-1} + (1 - beta1) * g_t  |  v_t = beta2 * v_{t-1} + (1 - beta2) * g_t^2',
        codeSnippet: {
          language: 'python',
          code: `# AdamW Parameter Update Step
def adamw_step(param, grad, m, v, lr=1e-3, beta1=0.9, beta2=0.999, eps=1e-8, wd=0.01):
    param.data.mul_(1.0 - lr * wd)  # Decoupled weight decay
    m.mul_(beta1).add_(grad, alpha=1 - beta1)
    v.mul_(beta2).addcmul_(grad, grad, value=1 - beta2)
    step_size = lr / (v.sqrt().add_(eps))
    param.data.addcmul_(m, step_size, value=-1.0)`
        },
        deepDive: 'AdamW decouples L2 regularization from gradient momentum updates, preventing weight decay from being warped by adaptive learning rate denominators. Cosine annealing with linear warmup ensures stable early parameter initialization before rapid convergence.',
        takeaways: [
          'Decoupled weight decay (AdamW) prevents large gradient parameters from escaping regularization.',
          'Warmup schedules prevent gradient shocks during initial training steps when moment estimates are noisy.',
          'Learning rate decay is the single most impactful hyperparameter governing validation generalization.'
        ]
      },
      3: {
        chapterNumber: 3,
        chapterTitle: 'Self-Attention & Transformer Architecture',
        subtitle: 'Scaled dot-product attention, multi-head projections, and sequence modeling',
        summary: 'Transformers replace sequential recurrence with pairwise scaled dot-product attention, allowing tokens to attend across arbitrary contextual spans in parallel.',
        concepts: ['Query, Key, Value Projections', 'Scaled Dot-Product', 'Multi-Head Parallelism', 'Positional Encodings (RoPE)'],
        formulaOrRule: 'Attention(Q, K, V) = softmax( (Q * K^T) / sqrt(d_k) ) * V',
        codeSnippet: {
          language: 'python',
          code: `import math
import torch

def scaled_dot_product_attention(q, k, v, mask=None):
    d_k = q.size(-1)
    scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d_k)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)
    weights = torch.softmax(scores, dim=-1)
    return torch.matmul(weights, v), weights`
        },
        deepDive: 'Dividing dot products by sqrt(d_k) prevents logits from pushing softmax functions into regions with vanishingly small gradients. Rotary Position Embedding (RoPE) injects relative token distance by rotating query and key vectors in complex 2D subspaces.',
        takeaways: [
          'Self-attention captures global dependency paths in O(1) sequential operations compared to O(N) in RNNs.',
          'Quadratic O(N^2) complexity with respect to sequence length drives modern flash-attention optimizations.',
          'Multi-head projections allow the model to simultaneously attend to syntactic, semantic, and positional relationships.'
        ]
      },
      4: {
        chapterNumber: 4,
        chapterTitle: 'Convolutional Neural Networks & Computer Vision',
        subtitle: 'Spatial translation invariance, pooling, and residual skip connections',
        summary: 'Convolutional filters scan spatial feature maps to learn hierarchical representations from low-level edges to semantic object parts.',
        concepts: ['Kernels & Receptive Fields', 'Stride & Padding', 'Residual Skip Connections', 'Spatial Pooling'],
        formulaOrRule: 'Output Dim = floor((Input Dim - Kernel Size + 2*Padding) / Stride) + 1',
        codeSnippet: {
          language: 'python',
          code: `class ResidualBlock(nn.Module):
    def __init__(self, channels: int):
        super().__init__()
        self.conv1 = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(channels)
        self.conv2 = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(channels)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        identity = x
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return self.relu(out + identity)  # Residual skip connection`
        },
        deepDive: 'Residual skip connections (x + F(x)) guarantee that gradients can flow unimpeded directly back through deep networks, eliminating vanishing gradient bottlenecks and enabling training of networks with hundreds of layers.',
        takeaways: [
          'Convolutional parameter sharing enforces spatial translation invariance across visual inputs.',
          'Residual connections allow identity mappings to be learned effortlessly when additional depth is redundant.',
          'Dilated convolutions expand receptive field size without increasing parameter counts.'
        ]
      },
      5: {
        chapterNumber: 5,
        chapterTitle: 'Retrieval-Augmented Generation (RAG) & Vector Search',
        subtitle: 'Grounding generative models with dense semantic vector embeddings',
        summary: 'RAG augments LLM generation by retrieving semantically relevant document chunks from vector index databases, eliminating hallucinations.',
        concepts: ['Dense Vector Embeddings', 'Cosine Similarity', 'Hierarchical Navigable Small World (HNSW)', 'Top-K Grounding'],
        formulaOrRule: 'Cosine Similarity: cos(theta) = (A . B) / (||A|| * ||B||)',
        codeSnippet: {
          language: 'typescript',
          code: `interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}`
        },
        deepDive: 'Text chunks are passed through an embedding encoder (e.g. OpenAI text-embedding-3 or Gemini Embeddings). At query time, vector databases use HNSW graphs to return the top-k nearest neighbors in sub-10ms time across millions of documents.',
        takeaways: [
          'RAG dynamically updates model knowledge without expensive parameter fine-tuning cycles.',
          'Chunking strategy (size and overlap) directly determines precision vs recall of retrieved context.',
          'Reranking retrieved candidate chunks with cross-encoders significantly improves factual answer quality.'
        ]
      },
      6: {
        chapterNumber: 6,
        chapterTitle: 'Parameter-Efficient Fine-Tuning (LoRA & QLoRA)',
        subtitle: 'Decomposing weight updates into low-rank matrices for consumer GPU training',
        summary: 'LoRA freezes base pre-trained model weights and injects trainable low-rank decomposition matrices into attention layers, cutting memory usage by 80%.',
        concepts: ['Low-Rank Decomposition (W = W_0 + B*A)', 'Rank Parameter (r)', 'Quantized QLoRA 4-bit', 'Zero Inference Latency'],
        formulaOrRule: 'h = W_0 * x + (alpha / r) * (B * A) * x  where A in R^{r x d}, B in R^{k x r}',
        codeSnippet: {
          language: 'python',
          code: `# Conceptual LoRA Linear Layer
class LoRALinear(nn.Module):
    def __init__(self, in_features: int, out_features: int, rank: int = 8, alpha: float = 16.0):
        super().__init__()
        self.base_layer = nn.Linear(in_features, out_features, bias=False)
        self.base_layer.weight.requires_grad = False  # Freeze pre-trained weights
        self.lora_A = nn.Parameter(torch.randn(rank, in_features) * 0.01)
        self.lora_B = nn.Parameter(torch.zeros(out_features, rank))
        self.scaling = alpha / rank

    def forward(self, x):
        base_out = self.base_layer(x)
        lora_out = (x @ self.lora_A.T @ self.lora_B.T) * self.scaling
        return base_out + lora_out`
        },
        deepDive: 'Because parameter updates delta_W have a low intrinsic rank during task adaptation, training small rank matrices (r=8 or r=16) matches full fine-tuning performance while requiring only a fraction of GPU gradient memory.',
        takeaways: [
          'LoRA adapters can be merged back into base model weights before deployment for zero added inference latency.',
          'QLoRA normalizes base model weights to 4-bit NormalFloat (NF4) to fit 70B models onto single 24GB GPUs.',
          'Multiple task-specific LoRA adapters can be swapped in real-time over a single shared base model.'
        ]
      }
    };
    return chapters[chapterIdx];
  }

  // 4. WEB DEVELOPMENT, CLOUD & DISTRIBUTED SYSTEMS
  const chapters: Record<number, DocumentSection> = {
    1: {
      chapterNumber: 1,
      chapterTitle: 'Modern Web Architecture & Concurrency Models',
      subtitle: 'React 19 Actions, concurrent rendering, and asynchronous Python backends',
      summary: 'High-performance web applications decouple client-side reactive rendering from scalable asynchronous backend services.',
      concepts: ['Concurrent Rendering', 'React Fiber Tree', 'FastAPI Asyncio Event Loop', 'WebSocket Duplex Streams'],
      formulaOrRule: 'Non-blocking I/O: await fetch() delegates to OS epoll without blocking the worker thread',
      codeSnippet: {
        language: 'typescript',
        code: `// React 19 useTransition for non-blocking state updates
import { useState, useTransition } from 'react';

export function TabSelector() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  function selectTab(nextTab: string) {
    startTransition(() => {
      setTab(nextTab); // Scheduled without blocking user input
    });
  }
}`
      },
      deepDive: 'The React Fiber architecture breaks rendering work into incremental units, yielding CPU control back to the browser between chunks to process user input and maintain 60 FPS animations. FastAPI leverages Starlette and uvloop to deliver asynchronous ASGI performance rivaling Go and Node.',
      takeaways: [
        'useTransition prevents slow state updates from freezing button clicks and text inputs.',
        'Asynchronous Python backends use epoll/kqueue to handle tens of thousands of concurrent connections.',
        'WebSockets provide persistent 2-byte framing overhead compared to heavy repetitive HTTP header roundtrips.'
      ]
    },
    2: {
      chapterNumber: 2,
      chapterTitle: 'Database Storage Internals: B-Trees & MVCC',
      subtitle: 'PostgreSQL 8KB page structure, write-ahead logging, and snapshot isolation',
      summary: 'Relational databases guarantee ACID transaction properties using Multi-Version Concurrency Control (MVCC) and Write-Ahead Logging (WAL).',
      concepts: ['8KB Heap Pages', 'Write-Ahead Log (WAL)', 'MVCC Snapshots', 'Index Scans vs Bitmap Scans'],
      formulaOrRule: 'Index Search Cost: O(log_B N) where B is page fan-out (~100-300 keys per page)',
      codeSnippet: {
        language: 'sql',
        code: `-- B-Tree Multi-Column Index Optimization
CREATE INDEX CONCURRENTLY idx_telemetry_course_module_time 
ON affective_telemetry (course_id, module_id, created_at DESC);

-- Query execution plan inspection
EXPLAIN ANALYZE
SELECT student_id, attention, learner_state
FROM affective_telemetry
WHERE course_id = 1 AND module_id = 2
ORDER BY created_at DESC
LIMIT 10;`
      },
      deepDive: 'PostgreSQL stores rows in 8KB disk pages. When an UPDATE occurs, MVCC creates a new tuple version with an incremented xmin transaction identifier, leaving the old version intact for concurrent readers. The VACUUM background process reclaims dead tuple storage.',
      takeaways: [
        'CREATE INDEX CONCURRENTLY builds indexes without taking exclusive table locks in production.',
        'MVCC ensures that readers never block writers and writers never block readers.',
        'Multi-column B-Tree indexes must order columns from highest selectivity to lowest.'
      ]
    },
    3: {
      chapterNumber: 3,
      chapterTitle: 'Distributed Systems & Microservices Architecture',
      subtitle: 'CAP theorem, consistent hashing, load balancing, and message broker pipelines',
      summary: 'Scaling horizontally requires stateless application tiers backed by distributed caches, message brokers, and partitioned data stores.',
      concepts: ['CAP Theorem (Consistency vs Availability)', 'Consistent Hashing Ring', 'Redis Cache-Aside', 'Kafka Event Streaming'],
      formulaOrRule: 'Cache Hit Ratio: H = Hits / (Hits + Misses)  (Target: H > 95% for database shielding)',
      codeSnippet: {
        language: 'python',
        code: `# Cache-Aside pattern with Redis
async def get_course_data(course_id: int, redis_client, db_session) -> dict:
    cache_key = f"course:{course_id}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)  # Cache Hit: sub-millisecond return

    course = db_session.query(Course).filter_by(id=course_id).first()
    if course:
        await redis_client.setex(cache_key, 3600, json.dumps(course.to_dict()))
    return course.to_dict()`
      },
      deepDive: 'Consistent hashing maps both servers and data keys to a 32-bit circular space. When a node is added or removed, only K/N keys need to be remapped, preventing catastrophic cache invalidation across the entire cluster.',
      takeaways: [
        'Stateless API instances permit seamless auto-scaling behind reverse proxies like Nginx.',
        'Redis cache-aside shielding prevents sudden traffic surges from overwhelming relational databases.',
        'Event brokers (Kafka, RabbitMQ) decouple synchronous client request paths from background jobs.'
      ]
    },
    4: {
      chapterNumber: 4,
      chapterTitle: 'Web Security, Authentication & Cryptography',
      subtitle: 'TLS 1.3 handshakes, JWT tokens, OAuth2, and defense against injection vulnerabilities',
      summary: 'Securing web applications requires defense-in-depth: transport layer encryption, secure credential token rotation, and strict input validation.',
      concepts: ['TLS 1.3 Ephemeral Diffie-Hellman', 'Asymmetric JWT Signing (RS256)', 'HttpOnly SameSite Cookies', 'SQL Injection Mitigation'],
      formulaOrRule: 'Token Verification: Signature = HMAC_SHA256(Base64(Header) + "." + Base64(Payload), Secret)',
      codeSnippet: {
        language: 'python',
        code: `from datetime import datetime, timedelta
import jwt

SECRET_KEY = "secure-production-secret"
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=60)) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)`
      },
      deepDive: 'JWT tokens should never store sensitive personal information in unencrypted payloads. Secure deployments store refresh tokens in HttpOnly, SameSite=Lax cookies to prevent Cross-Site Scripting (XSS) token exfiltration.',
      takeaways: [
        'Never store plaintext passwords; use salted Argon2 or bcrypt with high work factors.',
        'Parameterized SQL queries eliminate injection vulnerabilities by separating SQL code from user data.',
        'Content Security Policy (CSP) headers block malicious third-party script injection in modern browsers.'
      ]
    },
    5: {
      chapterNumber: 5,
      chapterTitle: 'Real-Time Telemetry & WebSocket Protocol Pipelines',
      subtitle: 'Bidirectional duplex streaming, heartbeat liveness, and connection resilience',
      summary: 'Biometric closed-loop systems require real-time client-to-server messaging with sub-50ms latency.',
      concepts: ['WebSocket Duplex Framing', 'TCP Keep-Alive & Ping/Pong', 'Exponential Backoff Reconnect', 'Binary vs JSON Serialization'],
      formulaOrRule: 'WebSocket Framing: 2-byte header overhead for frames < 126 bytes',
      codeSnippet: {
        language: 'typescript',
        code: `class RealTimeClient {
  private ws: WebSocket | null = null;
  private retryCount = 0;

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.retryCount = 0;
      console.log('Connected to telemetry stream');
    };
    this.ws.onclose = () => {
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
      this.retryCount++;
      setTimeout(() => this.connect(url), delay); // Exponential backoff
    };
  }
}`
      },
      deepDive: 'WebSocket connections upgrade existing HTTP 1.1 handshakes to bidirectional TCP connections. Heartbeat ping-pong frames ensure that stale client connections behind network firewalls are cleaned up promptly.',
      takeaways: [
        'Exponential backoff reconnect prevents server stampedes when temporary network disruptions resolve.',
        'Message serialization should throttle high-frequency telemetry frames to prevent UI lag.',
        'Client-side buffering ensures smooth metric visualization even with variable network jitter.'
      ]
    },
    6: {
      chapterNumber: 6,
      chapterTitle: 'Cloud Deployment, Containerization & CI/CD Pipelines',
      subtitle: 'Docker multi-stage builds, Kubernetes pods, and automated quality gates',
      summary: 'Modern software engineering standardizes deployment artifacts through reproducible Docker containers orchestrated across cloud clusters.',
      concepts: ['Multi-Stage Dockerfiles', 'Kubernetes Deployments', 'Liveness vs Readiness Probes', 'Automated Testing Gates'],
      formulaOrRule: 'Docker Layer Caching: order instructions from least frequently changing to most frequent',
      codeSnippet: {
        language: 'dockerfile',
        code: `# Production Multi-Stage Dockerfile for Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`
      },
      deepDive: 'Multi-stage Docker builds separate build dependencies (Node, compilers, dev packages) from the minimal production runtime image, shrinking image size by up to 90% and reducing security attack surfaces.',
      takeaways: [
        'Multi-stage Docker images contain only necessary runtime binaries, minimizing security vulnerabilities.',
        'Readiness probes prevent Kubernetes from routing user traffic to pods that are still warming up.',
        'Immutable build tags ensure deterministic rollbacks to previous stable application releases.'
      ]
    }
  };

  return chapters[chapterIdx];
}
