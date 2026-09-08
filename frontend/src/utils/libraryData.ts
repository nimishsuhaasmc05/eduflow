import { LibraryResource } from '../types/library';

export const INITIAL_LIBRARY_RESOURCES: LibraryResource[] = [
  {
    id: 'res-1',
    title: 'Facial Landmark Detection & Mesh Geometry',
    author: 'Dr. Sarah Jenkins & Edu-Flow Research Group',
    category: 'Computer Vision',
    resource_type: 'PDF',
    page_count: 42,
    reading_progress_percent: 72,
    course_association: 'PostgreSQL Affective Computer Vision',
    cover_image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['facial landmark', 'facial', 'mesh', 'mediapipe', 'affective', 'computer vision', 'ear'],
    excerpt: 'Comprehensive guide to computing 468 3D facial landmark mesh vectors in browser memory at ~30 FPS to track eye closure (EAR) and inner eyebrow furrowing.',
    pages_content: {
      1: "CHAPTER 1: INTRODUCTION TO FACIAL MESH GEOMETRY\nFacial landmark detection calculates 3D spatial coordinates across predefined facial points. Unlike bounding boxes, landmark meshes provide high-resolution geometric vectors suitable for affective signal processing.",
      18: "PAGE 18: EYE ASPECT RATIO (EAR) CALCULATIONS\nThe Eye Aspect Ratio (EAR) measures relative distances between vertical and horizontal eye landmarks:\nEAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)\nWhen EAR drops below 0.20 for consecutive frames, an eye-closure or blink event is recorded. Continuous suppression indicates drowsiness or low attention state.",
      19: "PAGE 19: INNER EYEBROW CONTRACTION DISTANCE\nInner eyebrow landmark distance (points 107 and 336) decreases when forehead muscles contract during active confusion or high cognitive effort.",
      42: "PAGE 42: ON-DEVICE PRIVACY GUARANTEES\nPrivacy-by-design ensures that raw video camera pixels are processed locally within client WebAssembly/WebGL memory. Zero video frames leave the user device."
    }
  },
  {
    id: 'res-2',
    title: 'Data Structures & Algorithms Fundamentals',
    author: 'Prof. Donald Knuth & Dr. Sarah Jenkins',
    category: 'Computer Science',
    resource_type: 'PDF',
    page_count: 48,
    reading_progress_percent: 60,
    course_association: 'Computer Science & DSA',
    cover_image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['datastructures', 'data structures', 'dsa', 'algorithms', 'trees', 'graphs', 'sorting', 'arrays'],
    excerpt: 'Foundational guide to core Data Structures and Algorithms including Binary Trees, Hash Tables, Graph Traversal, and Big-O Time Complexity analysis.',
    pages_content: {
      1: "CHAPTER 1: INTRODUCTION TO DATA STRUCTURES\nData structures organize and store data in memory for efficient access and modification. Primitive structures include arrays and pointers, while linear and non-linear structures include linked lists, stacks, queues, trees, and graphs.",
      12: "PAGE 12: BINARY SEARCH TREES & BALANCING\nA Binary Search Tree (BST) maintains sorted key order allowing fast O(log N) search, insertion, and deletion operations when balanced using AVL or Red-Black rotations.",
      24: "PAGE 24: GRAPH ALGORITHMS & TRAVERSAL\nBreadth-First Search (BFS) uses a queue data structure for shortest-path exploration, whereas Depth-First Search (DFS) leverages a stack or recursion."
    }
  },
  {
    id: 'res-3',
    title: 'Advanced Data Structures & DSA Notes',
    author: 'Edu-Flow Algorithms Research',
    category: 'Algorithms',
    resource_type: 'Notes',
    page_count: 32,
    reading_progress_percent: 85,
    course_association: 'Computer Science & DSA',
    cover_image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['datastructures', 'data structures', 'dsa', 'heaps', 'trie', 'disjoint set', 'notes'],
    excerpt: 'Concise lecture notes covering advanced data structures such as Heaps, Tries, Disjoint-Set Union (DSU), and Segment Trees.',
    pages_content: {
      1: "SECTION 1: HEAP & PRIORITY QUEUE DATA STRUCTURES\nBinary heaps maintain min or max heap invariants allowing O(1) peek and O(log N) extraction of highest priority elements.",
      15: "PAGE 15: TRIE (PREFIX TREE) ARCHITECTURE\nTries store associative arrays where keys are strings. Each node represents a common prefix, enabling O(L) string search where L is string length."
    }
  },
  {
    id: 'res-4',
    title: 'Deep Learning & CNN Fundamentals',
    author: 'Prof. Alan Turing & Dr. Sarah Jenkins',
    category: 'Artificial Intelligence',
    resource_type: 'Book',
    page_count: 128,
    reading_progress_percent: 45,
    course_association: 'Advanced AI & Machine Learning',
    cover_image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=80',
    is_saved: false,
    tags: ['deep learning', 'cnn', 'convolutional neural networks', 'machine learning', 'ai', 'neural networks'],
    excerpt: 'Foundational textbook covering Convolutional Neural Networks, spatial feature extraction, pooling, and backpropagation.',
    pages_content: {
      1: "CHAPTER 1: INTRODUCTION TO CONVOLUTION\nConvolutional layers apply spatial filters over input feature maps to detect low-level edges, textures, and high-level structural semantics.",
      45: "PAGE 45: RESNET & RESIDUAL CONNECTIONS\nResidual skip connections mitigate vanishing gradient problems in deep neural networks by passing activations across convolutional layers."
    }
  },
  {
    id: 'res-5',
    title: 'MediaPipe Computer Vision Architecture Notes',
    author: 'Edu-Flow AI Team',
    category: 'Computer Vision',
    resource_type: 'Notes',
    page_count: 18,
    reading_progress_percent: 90,
    course_association: 'PostgreSQL Affective Computer Vision',
    cover_image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['mediapipe', 'computer vision', 'facial landmark', 'mesh', 'gpu'],
    excerpt: 'Technical notes on integrating MediaPipe Face Mesh client-side GPU pipelines for zero-latency telemetry.',
    pages_content: {
      1: "SECTION 1: MEDIAPIPE PIPELINE SETUP\nMediaPipe utilizes lightweight neural network pipelines designed for client-side web browser execution.",
      5: "PAGE 5: GPU ACCELERATION VIA WEBGL\nBy leveraging WebGL textures, landmark detection achieves consistent 30-45 FPS rendering even on integrated graphics hardware."
    }
  },
  {
    id: 'res-6',
    title: 'Affective Computing & Closed-Loop Feedback',
    author: 'MIT Media Lab & Edu-Flow Research',
    category: 'Computer Vision',
    resource_type: 'Research Paper',
    page_count: 24,
    reading_progress_percent: 100,
    course_association: 'PostgreSQL Affective Computer Vision',
    cover_image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['affective computing', 'affective', 'closed loop', 'cognitive load', 'attention'],
    excerpt: 'Peer-reviewed research paper detailing closed-loop pedagogical feedback systems driven by real-time learner affective computing.',
    pages_content: {
      1: "ABSTRACT: CLOSED-LOOP PEDAGOGICAL SYSTEMS\nClosed-loop feedback systems adjust instructional pacing, explanation granularity, and assessment timing based on real-time learner affective vectors.",
      12: "PAGE 12: STATE CONTROLLER INTERVENTIONS\nWhen confusion metric exceeds 0.70 for >15 seconds, the state controller automatically triggers an intuitive analogy or micro-quiz."
    }
  },
  {
    id: 'res-7',
    title: 'PostgreSQL Relational Schema & Indexing',
    author: 'Edu-Flow Systems Engineering',
    category: 'Data Science',
    resource_type: 'PDF',
    page_count: 56,
    reading_progress_percent: 30,
    course_association: 'PostgreSQL Affective Computer Vision',
    cover_image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80',
    is_saved: false,
    tags: ['postgresql', 'sql', 'database', 'indexing', 'btree', 'schema'],
    excerpt: 'Database schema design for persisting course metadata, user enrollments, module sequences, and student progress vectors.',
    pages_content: {
      1: "SECTION 1: RELATIONAL DATA MODELS\nPostgreSQL handles relational persistence for courses, modules, user enrollments, and JWT authentication tokens.",
      20: "PAGE 20: B-TREE INDEX OPTIMIZATION\nB-tree indexing on course_id and user_id guarantees sub-millisecond query execution during dashboard page loads."
    }
  }
];
