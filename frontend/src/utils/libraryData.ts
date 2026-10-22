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
    course_association: 'Algorithms and Data Structures',
    cover_image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['facial landmark', 'mesh', 'mediapipe', 'affective', 'computer vision', 'ear'],
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
    title: 'Data Structures & Algorithms: The Complete Reference',
    author: 'Prof. Donald Knuth & Dr. Sarah Jenkins',
    category: 'Computer Science',
    resource_type: 'PDF',
    page_count: 58,
    reading_progress_percent: 85,
    course_association: 'Algorithms and Data Structures',
    cover_image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['dsa', 'data structures', 'algorithms', 'trees', 'graphs', 'sorting', 'arrays'],
    excerpt: 'Foundational guide to core Data Structures and Algorithms including Binary Trees, Hash Tables, Graph Traversal, and Big-O Time Complexity analysis.',
    pages_content: {
      1: "CHAPTER 1: ASYMPTOTIC NOTATION AND TIME COMPLEXITY\nAlgorithms represent deterministic computational sequences converting inputs to outputs. Big-O notation characterizes upper-bound asymptotic complexity as input size n grows indefinitely.",
      12: "PAGE 12: BINARY SEARCH TREES & BALANCING\nA Binary Search Tree (BST) maintains sorted key order allowing fast O(log N) search, insertion, and deletion operations when balanced using AVL or Red-Black rotations.",
      24: "PAGE 24: GRAPH ALGORITHMS & TRAVERSAL\nBreadth-First Search (BFS) uses a queue data structure for shortest-path exploration, whereas Depth-First Search (DFS) leverages a stack or recursion."
    }
  },
  {
    id: 'res-3',
    title: 'Deep Learning & Neural Network Architectures',
    author: 'Dr. Yann LeCun & Dr. Geoffrey Hinton',
    category: 'Artificial Intelligence',
    resource_type: 'Book',
    page_count: 144,
    reading_progress_percent: 45,
    course_association: 'Python for Data Science & Machine Learning',
    cover_image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80',
    is_saved: false,
    tags: ['deep learning', 'neural networks', 'transformers', 'backpropagation', 'ai'],
    excerpt: 'Comprehensive study of multi-layer perceptrons, backpropagation gradients, convolutional layers, and self-attention Transformer blocks.',
    pages_content: {
      1: "CHAPTER 1: FOUNDATIONS OF BACKPROPAGATION\nBackpropagation efficiently calculates the partial derivatives of an objective cost function with respect to every weight in a deep neural network via recursive application of the multivariate chain rule.",
      35: "PAGE 35: OPTIMIZATION LANDSCAPES & ADAM\nStochastic Gradient Descent (SGD) with momentum and adaptive learning rate optimizers like Adam mitigate saddle points and ill-conditioned ravines in non-convex loss surfaces.",
      88: "PAGE 88: MULTI-HEAD SELF-ATTENTION IN TRANSFORMERS\nAttention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V enables parallelized context aggregation across arbitrary sequence lengths without recurrence bottlenecks."
    }
  },
  {
    id: 'res-4',
    title: 'Advanced Full-Stack Web Development with React 19',
    author: 'Dan Abramov & Edu-Flow Engineering',
    category: 'Web Development',
    resource_type: 'Notes',
    page_count: 36,
    reading_progress_percent: 60,
    course_association: 'Full-Stack Web Development with React & FastAPI',
    cover_image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['react', 'typescript', 'fastapi', 'fullstack', 'state management', 'hooks'],
    excerpt: 'Modern patterns for building reactive web applications using React 19 actions, server components, optimistic UI updates, and typed FastAPI backends.',
    pages_content: {
      1: "CHAPTER 1: THE REACT 19 CONCURRENCY MODEL\nReact 19 formalizes concurrent scheduling with useTransition, useActionState, and automatic batching, preventing frame drops during state transitions.",
      14: "PAGE 14: FASTAPI ASYNC EVENT LOOPS & WEBSOCKETS\nFastAPI integrates Starlette and Pydantic to provide asynchronous request handling through Python's asyncio event loop with automatic OpenAPI documentation.",
      28: "PAGE 28: CLIENT-SIDE STATE SYNCHRONIZATION\nPattern for synchronizing WebSocket telemetry streams with React context states without triggering unnecessary reconciliation re-renders."
    }
  },
  {
    id: 'res-5',
    title: 'Affective Computing & Closed-Loop Educational Systems',
    author: 'MIT Media Lab & Edu-Flow Research Group',
    category: 'Computer Vision',
    resource_type: 'Research Paper',
    page_count: 28,
    reading_progress_percent: 100,
    course_association: 'Algorithms and Data Structures',
    cover_image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['affective computing', 'closed loop', 'cognitive load', 'attention', 'pedagogy'],
    excerpt: 'Peer-reviewed research detailing closed-loop pedagogical intervention systems driven by real-time learner affective vectors and head-pose telemetry.',
    pages_content: {
      1: "ABSTRACT: CLOSED-LOOP PEDAGOGICAL SYSTEMS\nClosed-loop feedback systems adjust instructional pacing, explanation granularity, and assessment timing based on real-time learner affective vectors.",
      12: "PAGE 12: STATE CONTROLLER INTERVENTIONS\nWhen confusion metric exceeds 0.70 for >15 seconds, the state controller automatically triggers an intuitive analogy or micro-quiz.",
      22: "PAGE 22: PREVENTING FATIGUE IN CONTINUOUS MONITORING\nIntervention escalation requires hysteresis cooling windows: repeated micro-quizzes must escalate to calming focus exercises to prevent student frustration."
    }
  },
  {
    id: 'res-6',
    title: 'PostgreSQL Relational Schema & Indexing Internals',
    author: 'Edu-Flow Systems Engineering & Dr. Sarah Jenkins',
    category: 'Data Science',
    resource_type: 'PDF',
    page_count: 64,
    reading_progress_percent: 38,
    course_association: 'Algorithms and Data Structures',
    cover_image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
    is_saved: false,
    tags: ['postgresql', 'sql', 'database', 'indexing', 'btree', 'concurrency', 'mvcc'],
    excerpt: 'Deep-dive into PostgreSQL storage engines, write-ahead logging (WAL), multi-version concurrency control (MVCC), and multi-column B-Tree index optimization.',
    pages_content: {
      1: "SECTION 1: RELATIONAL DATA MODELS & HEAP PAGES\nPostgreSQL stores table tuples in 8KB disk pages. Tuples are identified by ItemPointer (ctid) pointing to page offset header entries.",
      20: "PAGE 20: B-TREE INDEX TUNING & DEDUPLICATION\nB-Tree indexes maintain logarithmic depth. Version 13+ introduced index tuple deduplication, drastically reducing index memory consumption for repetitive columns.",
      45: "PAGE 45: EXPLAIN ANALYZE & QUERY PLANNER STRATEGIES\nUnderstanding sequential scans vs index scans vs bitmap index scans helps engineers identify missing indexes and prevent disk-bound I/O thrashing."
    }
  },
  {
    id: 'res-7',
    title: 'Python for Data Science, Vectorized Computation & Pandas',
    author: 'Wes McKinney & Edu-Flow Data Group',
    category: 'Programming',
    resource_type: 'Book',
    page_count: 112,
    reading_progress_percent: 52,
    course_association: 'Python for Data Science & Machine Learning',
    cover_image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['python', 'pandas', 'numpy', 'data science', 'vectorization'],
    excerpt: 'Master vectorized array processing with NumPy, memory-efficient data manipulation with Pandas, and exploratory statistical analysis in Python.',
    pages_content: {
      1: "CHAPTER 1: MEMORY CONTIGUITY IN NUMPY STRIDED ARRAYS\nNumPy arrays utilize homogeneous memory buffers with stride strides metadata, allowing O(1) slicing and SIMD vectorization without copying underlying bytes.",
      32: "PAGE 32: BROADCASTING RULES & PERFORMANCE TRAPS\nBroadcasting stretches singleton dimensions without allocating memory. Avoiding Python-level for-loops over DataFrames yields 100x speedups in statistical transformations.",
      74: "PAGE 74: ADVANCED PANDAS GROUPBY OPTIMIZATIONS\nSplitting, applying, and combining tabular datasets with custom aggregation functions and categorical dtype indexing."
    }
  },
  {
    id: 'res-8',
    title: 'Operating Systems & Concurrency: Threads, Locks & Memory',
    author: 'Prof. Andrew Tanenbaum & Dr. Sarah Jenkins',
    category: 'Computer Science',
    resource_type: 'PDF',
    page_count: 82,
    reading_progress_percent: 90,
    course_association: 'Algorithms and Data Structures',
    cover_image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['operating systems', 'concurrency', 'threads', 'virtual memory', 'mutex', 'deadlock'],
    excerpt: 'Principles of kernel architecture, preemptive scheduling, page replacement algorithms, virtual memory translation (TLB), and mutex synchronization primitives.',
    pages_content: {
      1: "CHAPTER 1: THE KERNEL SPACE / USER SPACE ABSTRACTION\nHardware privilege rings protect physical hardware from unprivileged user space processes. System calls trigger trap instructions transferring CPU control to kernel dispatch routines.",
      28: "PAGE 28: VIRTUAL MEMORY TRANSLATION & PAGE FAULTS\nTranslation Lookaside Buffers (TLB) cache recent multi-level page table lookups. Page faults invoke the demand-paging subsystem to retrieve blocks from secondary storage.",
      54: "PAGE 54: DEADLOCK CONDITIONS & MUTEX PROTOCOLS\nCoffman conditions for deadlock: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. Avoiding circular wait guarantees deadlock-free concurrent executions."
    }
  },
  {
    id: 'res-9',
    title: 'Cybersecurity, Cryptography & Secure Web Architectures',
    author: 'Bruce Schneier & Edu-Flow Security Lab',
    category: 'Computer Science',
    resource_type: 'Research Paper',
    page_count: 46,
    reading_progress_percent: 25,
    course_association: 'Full-Stack Web Development with React & FastAPI',
    cover_image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    is_saved: false,
    tags: ['security', 'cryptography', 'jwt', 'tls', 'oauth2', 'encryption'],
    excerpt: 'Modern security standards for protecting web services: asymmetric RSA/ECDSA key pairs, AES-GCM encryption, OAuth 2.0 flows, and secure JWT handling.',
    pages_content: {
      1: "SECTION 1: THE TLS 1.3 CRYPTOGRAPHIC HANDSHAKE\nTLS 1.3 reduces handshake latency to a single round-trip (1-RTT) while enforcing forward secrecy via ephemeral Diffie-Hellman key exchange.",
      18: "PAGE 18: ZERO-TRUST WEB TOKEN (JWT) LIFECYCLES\nJSON Web Tokens should be signed using modern asymmetric algorithms (RS256/ES256). Short expiration times paired with revolving refresh tokens in secure HttpOnly cookies prevent credential leakage."
    }
  },
  {
    id: 'res-10',
    title: 'System Design & Scalable Cloud Architecture',
    author: 'Martin Kleppmann & Edu-Flow Cloud Team',
    category: 'System Design',
    resource_type: 'Book',
    page_count: 160,
    reading_progress_percent: 70,
    course_association: 'Full-Stack Web Development with React & FastAPI',
    cover_image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['system design', 'scalability', 'redis', 'caching', 'microservices', 'load balancing'],
    excerpt: 'Designing reliable, scalable, and maintainable applications: consistent hashing, event-driven architectures, Redis caching layers, and partition tolerance.',
    pages_content: {
      1: "CHAPTER 1: THE CAP THEOREM & EVENTUAL CONSISTENCY\nIn distributed storage systems, network partitions are inevitable. Engineers must choose between strong consistency (CP) or high availability (AP).",
      40: "PAGE 40: CONSISTENT HASHING & DYNAMIC NODE REBALANCING\nConsistent hashing maps both servers and data keys to a virtual ring space, minimizing key reshuffling when nodes join or leave a cluster.",
      95: "PAGE 95: DISTRIBUTED CACHING PATTERNS: CACHE-ASIDE VS WRITE-THROUGH\nStrategies for mitigating cache stampedes and dog-piling using probabilistic early expiration and distributed mutex locking."
    }
  },
  {
    id: 'res-11',
    title: 'Natural Language Processing & Large Language Models',
    author: 'Ashish Vaswani & Edu-Flow AI Lab',
    category: 'Artificial Intelligence',
    resource_type: 'Research Paper',
    page_count: 52,
    reading_progress_percent: 64,
    course_association: 'Python for Data Science & Machine Learning',
    cover_image: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['nlp', 'llm', 'transformers', 'tokenization', 'rag', 'gemini'],
    excerpt: 'Theoretical foundations of modern language models: byte-pair encoding (BPE), rotary position embeddings (RoPE), retrieval-augmented generation (RAG), and LoRA.',
    pages_content: {
      1: "SECTION 1: SUB-WORD TOKENIZATION DYNAMICS\nByte-Pair Encoding (BPE) and WordPiece compress natural language text into discrete token identifiers, handling out-of-vocabulary words smoothly.",
      22: "PAGE 22: RETRIEVAL-AUGMENTED GENERATION (RAG) VECTOR PIPELINES\nRAG architectures retrieve top-k semantically relevant chunks from high-dimensional vector databases, providing dynamic grounding for generative prompts.",
      45: "PAGE 45: LOW-RANK ADAPTATION (LORA) PARAMETER-EFFICIENT FINE-TUNING\nLoRA decomposes weight updates into low-rank matrices W = W_0 + B*A, enabling parameter adaptation using <1% of active GPU memory."
    }
  },
  {
    id: 'res-12',
    title: 'Computer Vision & Real-Time Edge Video Processing',
    author: 'Dr. Sarah Jenkins & Edu-Flow AI Team',
    category: 'Computer Vision',
    resource_type: 'Notes',
    page_count: 30,
    reading_progress_percent: 80,
    course_association: 'Algorithms and Data Structures',
    cover_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    is_saved: false,
    tags: ['computer vision', 'opencv', 'webgl', 'edge computing', 'face mesh'],
    excerpt: 'Optimizing visual machine learning models for execution inside browser WebAssembly runtimes with SIMD vector instructions and WebGL shader pipelines.',
    pages_content: {
      1: "CHAPTER 1: REAL-TIME FRAME ACQUISITION\nNavigator.mediaDevices.getUserMedia provides raw video streams. Rendering video to an off-screen HTML5 canvas allows direct pixel array extraction for neural inputs.",
      15: "PAGE 15: WEBASSEMBLY SIMD ACCELERATION\nONNX Runtime Web leverages WebAssembly SIMD and WebGL/WebGPU backends to execute convolutional inference pipelines in ~15 milliseconds."
    }
  },
  {
    id: 'res-13',
    title: 'Statistical Inference, Probability & Stochastic Processes',
    author: 'Prof. Ronald Fisher & Dr. Sarah Jenkins',
    category: 'Data Science',
    resource_type: 'PDF',
    page_count: 74,
    reading_progress_percent: 30,
    course_association: 'Python for Data Science & Machine Learning',
    cover_image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    is_saved: false,
    tags: ['statistics', 'probability', 'data science', 'bayesian', 'hypothesis testing'],
    excerpt: 'Comprehensive treatment of probability distributions, Bayesian inference, maximum likelihood estimation (MLE), and hypothesis significance testing.',
    pages_content: {
      1: "CHAPTER 1: AXIOMATIC PROBABILITY & BAYES THEOREM\nBayes' theorem updates probability estimates for a hypothesis as new empirical evidence is acquired: P(H|E) = (P(E|H) * P(H)) / P(E).",
      28: "PAGE 28: MAXIMUM LIKELIHOOD ESTIMATION (MLE)\nMLE determines parameter values that maximize the likelihood of observing empirical data samples under an assumed parametric probability density function."
    }
  },
  {
    id: 'res-14',
    title: 'Compiler Construction & Abstract Syntax Tree Interpretation',
    author: 'Alfred Aho, Jeffrey Ullman & Edu-Flow Systems',
    category: 'Computer Science',
    resource_type: 'Book',
    page_count: 130,
    reading_progress_percent: 50,
    course_association: 'Algorithms and Data Structures',
    cover_image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['compiler', 'ast', 'parsing', 'grammar', 'codegen', 'llvm'],
    excerpt: 'From source code to machine executable: lexical analysis, LR/LL parsing algorithms, semantic type checking, intermediate representations, and register allocation.',
    pages_content: {
      1: "CHAPTER 1: COMPILATION PIPELINE PHASES\nA modern compiler is split into Frontend (Lexing, Parsing, Semantic Type Checking) and Backend (Optimization, LLVM Intermediate Representation, Machine Code Emission).",
      42: "PAGE 42: ABSTRACT SYNTAX TREE (AST) TRANSFORMATIONS\nASTs represent hierarchical syntactic structures. Tree-walking visitor patterns enable type inference and dead code elimination passes."
    }
  },
  {
    id: 'res-15',
    title: 'Computer Networking: TCP/IP, WebSockets & Real-Time Media',
    author: 'James Kurose, Keith Ross & Edu-Flow Lab',
    category: 'Web Development',
    resource_type: 'Notes',
    page_count: 38,
    reading_progress_percent: 95,
    course_association: 'Full-Stack Web Development with React & FastAPI',
    cover_image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    is_saved: true,
    tags: ['networking', 'tcp', 'websockets', 'webrtc', 'streaming', 'latency'],
    excerpt: 'Protocols governing real-time web telemetry: TCP congestion control, WebSocket framing, HTTP/3 QUIC streams, and WebRTC peer-to-peer data channels.',
    pages_content: {
      1: "CHAPTER 1: TRANSPORT LAYER RELIABILITY\nTCP ensures ordered, reliable byte stream delivery using sliding window flow control and additive-increase/multiplicative-decrease (AIMD) congestion control.",
      16: "PAGE 16: WEBSOCKET DUPLEX FRAMING FOR LIVE BIOMETRICS\nWebSocket connections upgrade standard HTTP 1.1 handshakes to bidirectional persistent TCP connections with minimal 2-byte framing overhead."
    }
  },
  {
    id: 'res-16',
    title: 'Quantum Computing Algorithms & Superposition Principles',
    author: 'Prof. David Deutsch & Edu-Flow Advanced Research',
    category: 'Computer Science',
    resource_type: 'Research Paper',
    page_count: 50,
    reading_progress_percent: 15,
    course_association: 'Algorithms and Data Structures',
    cover_image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
    is_saved: false,
    tags: ['quantum', 'algorithms', 'qubit', 'superposition', 'shor', 'grover'],
    excerpt: 'Mathematical formalism of quantum computing: Hilbert spaces, unitary operators, Hadamard gates, quantum entanglement, and Grover search acceleration.',
    pages_content: {
      1: "SECTION 1: QUBITS & QUANTUM SUPERPOSITION\nA qubit exists in a linear superposition |psi> = alpha|0> + beta|1> where |alpha|^2 + |beta|^2 = 1. Measurement collapses the state probabilistically.",
      25: "PAGE 25: GROVER SEARCH AMPLIFICATION\nGrover's algorithm provides a quadratic speedup O(sqrt(N)) for searching unsorted databases through repeated quantum amplitude amplification."
    }
  }
];
