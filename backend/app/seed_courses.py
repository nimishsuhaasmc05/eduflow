"""
EduFlow course seeder — Real Educational freeCodeCamp Showcase Course + 2 Clean Courses.
"""

from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.course import Course, Module

Base.metadata.create_all(bind=engine)

def get_or_create_teacher(db, email, username, full_name, password):
    teacher = db.query(User).filter(User.email == email).first()
    if teacher:
        return teacher
    teacher = User(
        email=email,
        username=username,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        role="teacher",
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher

COURSES = [
    {
        "title": "Algorithms and Data Structures",
        "description": "A beginner-friendly course covering algorithms and data structures, with a focus on how they are represented, evaluated, and used to solve computational problems. The course also explores sorting and searching algorithms, including practical examples involving arrays, linked lists, linear search, binary search, and common sorting techniques.",
        "category": "Computer Science",
        "difficulty": "Beginner to Intermediate",
        "thumbnail_url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=80",
        "learning_objectives": "✓ Explain what algorithms are and how they are used to solve problems.\n✓ Understand fundamental data-structure concepts.\n✓ Work with arrays and linked lists.\n✓ Explain and compare common sorting algorithms covered in the course.\n✓ Understand linear and binary searching.\n✓ Evaluate algorithm approaches at an introductory level.\n✓ Apply the concepts through quizzes and practice questions.",
        "duration_hours": 5.5,
        "rating": 4.9,
        "modules": [
            (
                "Introduction to Algorithms",
                "What algorithms are, algorithmic problem solving, measuring and evaluating algorithms with Big-O notation, and linear search baseline.",
                25,
                "https://www.youtube.com/watch?v=8hly31xKli0",
                "An algorithm is a well-defined computational procedure that takes some value or set of values as input "
                "and produces some value or set of values as output. In essence, an algorithm is a formal recipe for solving "
                "a computational problem. Algorithmic efficiency is measured using asymptotic analysis, predominantly Big-O notation. "
                "Big-O characterizes the growth rate of runtime or memory as input size n approaches infinity. Constant time O(1) "
                "represents operations that execute in identical steps regardless of input size, such as array indexing. Logarithmic "
                "time O(log n) characterizes divide-and-conquer algorithms like binary search. Linear time O(n) denotes algorithms "
                "that scan each input element once. Linearithmic time O(n log n) describes optimal comparison-based sorting such as "
                "merge sort. Quadratic time O(n^2) represents nested loops, common in naive bubble sort. Space complexity measures "
                "auxiliary memory consumed during execution."
            ),
            (
                "Introduction to Data Structures",
                "What data structures are, why they are used, organizing and representing data in Random Access Memory (RAM), and contiguous storage.",
                25,
                "https://www.youtube.com/watch?v=8hly31xKli0",
                "Data structures organize and structure information in computer memory for efficient retrieval and modification. "
                "Random Access Memory (RAM) provides addressable bytes where any memory address can be read or written in O(1) constant time. "
                "Contiguous memory allocations place sequential elements directly adjacent in physical RAM cells. This allows instantaneous "
                "arithmetic addressing: Address(Index i) = Base_Address + i * Element_Size. In contrast, dynamic reference-based data "
                "structures utilize node allocations distributed across the heap, connected via memory pointers. Choosing the appropriate "
                "data structure directly governs the asymptotic runtime of search, insertion, deletion, and iteration operations."
            ),
            (
                "Arrays and Linked Lists",
                "Array characteristics and storage, dynamic array amortized resizing, linked lists, singly linked lists, doubly linked lists, and operations.",
                30,
                "https://www.youtube.com/watch?v=8hly31xKli0",
                "Static arrays have fixed capacity initialized at memory allocation. Dynamic arrays (such as Python lists or Java ArrayLists) "
                "dynamically resize when capacity is exceeded by allocating a new array of 2x capacity and copying elements, achieving O(1) "
                "amortized append time. Access by index in arrays is O(1). However, insertion or deletion at arbitrary index k requires O(n) "
                "element shifting. Linked lists consist of discrete node objects containing data and pointers. Singly linked lists contain "
                "a next pointer; doubly linked lists maintain both next and prev pointers. Prepending to a linked list is O(1) without reallocation, "
                "but random access requires O(n) linear pointer traversal."
            ),
            (
                "Sorting Algorithms",
                "Sorting concepts, Merge Sort divide-and-conquer mechanics, Selection Sort, Quick Sort partitioning, and stability.",
                35,
                "https://www.youtube.com/watch?v=8hly31xKli0",
                "Sorting algorithms arrange unordered elements into monotonic sequences. Insertion Sort constructs a sorted prefix by shifting "
                "elements one by one, operating in O(n^2) worst-case time but O(n) on nearly-sorted data. Merge Sort applies divide-and-conquer: "
                "it recursively bisects the array into halves, sorts the subarrays, and merges them in linear time, guaranteeing O(n log n) "
                "runtime in all cases with O(n) auxiliary space. Quick Sort selects a pivot element, partitions smaller values to the left "
                "and larger values to the right, and recursively sorts partitions. Quick Sort achieves O(n log n) expected average runtime "
                "with excellent cache locality, though pathological pivot selection degrades to O(n^2)."
            ),
            (
                "Searching Algorithms",
                "Linear search, binary search concepts, searching strategies, comparison of searching approaches, and search space reduction.",
                25,
                "https://www.youtube.com/watch?v=8hly31xKli0",
                "Searching is the algorithmic task of locating a target key within a collection. Linear search scans each element from index 0 "
                "to n-1 until a match is found or the collection is exhausted. Linear search requires no preconditions or sorting and operates "
                "in O(n) time. When data is pre-sorted or monotonic, search efficiency can be dramatically improved by discarding portions of the "
                "search space after each test."
            ),
            (
                "Final Review and Assessment",
                "Course-wide review covering algorithms, data structures, arrays, linked lists, sorting, searching, and final adaptive assessment.",
                35,
                "https://www.youtube.com/watch?v=8hly31xKli0",
                "Binary search is an optimal search algorithm that operates strictly on sorted arrays. It maintains two pointers: low and high. "
                "In each iteration, it computes middle = low + (high - low) // 2 to avoid arithmetic overflow. It compares the target against array[mid]. "
                "If array[mid] == target, the element is found. If target < array[mid], the right half is discarded by setting high = mid - 1. "
                "If target > array[mid], the left half is discarded by setting low = mid + 1. Because each comparison halves the remaining elements, "
                "binary search executes in O(log n) time. For an array of 1,000,000 items, binary search locates any element in at most 20 comparisons. "
                "This comprehensive review synthesizes algorithm design principles, complexity bounds, and core data structure operations."
            ),
        ],
    },
    {
        "title": "Full-Stack Web Development with React & FastAPI",
        "description": "Learn to architect modern high-performance web applications using HTML5, CSS3, modern TypeScript React frontend components, RESTful FastAPI backend endpoints, and PostgreSQL database persistence.",
        "category": "Web Development",
        "difficulty": "Intermediate",
        "thumbnail_url": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
        "learning_objectives": "✓ Build responsive web layouts with semantic HTML and Flexbox/Grid\n✓ Master asynchronous JavaScript, Promises, and REST API consumption\n✓ Develop modular component-based user interfaces with React & TypeScript\n✓ Build secure backend API endpoints with FastAPI and SQLAlchemy",
        "duration_hours": 6.0,
        "rating": 4.9,
        "modules": [
            (
                "Semantic HTML5 & Responsive CSS Layouts",
                "Semantic elements, responsive layout techniques, CSS Grid and Flexbox.",
                25,
                "/media/sample_course_video.mp4",
                "HTML5 provides semantic structural elements including header, nav, main, section, article, and footer. "
                "CSS Grid provides two-dimensional grid layouts with grid-template-columns and fractional units. "
                "Flexbox provides one-dimensional alignment along primary and cross axes. Responsive design uses media queries."
            ),
            (
                "Modern React & Component State Architecture",
                "Component design, React hooks (useState, useEffect, useCallback), and client routing.",
                30,
                "/media/sample_course_video.mp4",
                "React utilizes a virtual DOM and declarative component hierarchy. React hooks allow functional components "
                "to manage state and lifecycle events. useState handles local component memory. useEffect synchronizes external systems. "
                "React Router provides client-side single page application navigation."
            ),
            (
                "FastAPI REST Endpoints & Database Integration",
                "Building RESTful API endpoints with Pydantic validation and SQLAlchemy ORM.",
                30,
                "/media/sample_course_video.mp4",
                "FastAPI is a modern Python framework built on Starlette and Pydantic for high-performance async APIs. "
                "Pydantic schemas enforce type safety and automated validation. SQLAlchemy ORM maps relational database tables "
                "to Python models with transactional session handling."
            ),
        ],
    },
    {
        "title": "Python for Data Science & Machine Learning",
        "description": "Hands-on data science with Python: data manipulation with NumPy & Pandas, visualization with Matplotlib, statistical inference, and foundational machine learning algorithms.",
        "category": "Programming",
        "difficulty": "Beginner",
        "thumbnail_url": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&auto=format&fit=crop&q=80",
        "learning_objectives": "✓ Master idiomatic Python syntax, data structures, and comprehensions\n✓ Manipulate multidimensional arrays with NumPy and DataFrames with Pandas\n✓ Visualize statistical distributions and correlations\n✓ Train supervised machine learning models with scikit-learn",
        "duration_hours": 5.0,
        "rating": 4.8,
        "modules": [
            (
                "Python Syntax & Data Structures",
                "Core Python fundamentals: variables, dynamic typing, lists, dicts, and functions.",
                25,
                "/media/sample_course_video.mp4",
                "Python features clean readable syntax and dynamic typing. Built-in collections include mutable lists, "
                "immutable tuples, key-value dictionaries, and unique sets. List comprehensions provide concise data transformations."
            ),
            (
                "Data Manipulation with NumPy & Pandas",
                "Vectorized operations, multidimensional arrays, DataFrame filtering and aggregation.",
                30,
                "/media/sample_course_video.mp4",
                "NumPy introduces ndarray for vectorized numerical computing in contiguous C-memory blocks. "
                "Pandas provides DataFrame and Series structures for tabular data manipulation, filtering, grouping, and joining."
            ),
        ],
    },
]

def seed():
    db = SessionLocal()
    try:
        fcc_teacher = get_or_create_teacher(
            db,
            email="curriculum@freecodecamp.org",
            username="freecodecamp",
            full_name="freeCodeCamp.org",
            password="teacher123",
        )
        teacher = get_or_create_teacher(
            db,
            email="teacher@eduflow.ai",
            username="dr_sarah",
            full_name="Dr. Sarah Jenkins (AI & Cognitive Systems)",
            password="teacher123",
        )

        created, updated = 0, 0
        for course_data in COURSES:
            is_fcc = course_data["title"] == "Algorithms and Data Structures"
            assigned_teacher = fcc_teacher if is_fcc else teacher

            if is_fcc:
                existing = db.query(Course).filter(Course.title.ilike("%Algorithms and Data Structures%")).first()
            else:
                existing = db.query(Course).filter(Course.title == course_data["title"]).first()

            if existing:
                existing.title = course_data["title"]
                existing.status = "published"
                existing.description = course_data["description"]
                existing.thumbnail_url = course_data["thumbnail_url"]
                existing.learning_objectives = course_data["learning_objectives"]
                existing.duration_hours = course_data["duration_hours"]
                existing.rating = course_data["rating"]
                existing.category = course_data["category"]
                existing.difficulty = course_data["difficulty"]
                existing.teacher_id = assigned_teacher.id
                
                # Update or add modules in-place to avoid breaking telemetry foreign keys
                existing_modules = db.query(Module).filter(Module.course_id == existing.id).order_by(Module.order).all()
                for order, mod_tuple in enumerate(course_data["modules"], start=1):
                    title = mod_tuple[0]
                    desc = mod_tuple[1]
                    duration = mod_tuple[2]
                    v_url = mod_tuple[3] if len(mod_tuple) > 3 else "/media/sample_course_video.mp4"
                    transcript = mod_tuple[4] if len(mod_tuple) > 4 else mod_tuple[3]
                    
                    if order <= len(existing_modules):
                        mod = existing_modules[order - 1]
                        mod.title = title
                        mod.description = desc
                        mod.order = order
                        mod.duration_minutes = duration
                        mod.video_url = v_url
                        mod.transcript = transcript
                    else:
                        db.add(Module(
                            course_id=existing.id,
                            title=title,
                            description=desc,
                            order=order,
                            duration_minutes=duration,
                            video_url=v_url,
                            transcript=transcript,
                        ))
                db.commit()
                updated += 1
                
                # Auto-index RAG
                try:
                    from app.services.rag_service import RAGService
                    RAGService.index_course_content(db, existing.id)
                except Exception as e:
                    print(f"RAG re-indexing warning: {e}")
                continue

            course = Course(
                title=course_data["title"],
                description=course_data["description"],
                category=course_data["category"],
                difficulty=course_data["difficulty"],
                thumbnail_url=course_data["thumbnail_url"],
                status="published",
                learning_objectives=course_data["learning_objectives"],
                duration_hours=course_data["duration_hours"],
                rating=course_data["rating"],
                teacher_id=teacher.id,
            )
            db.add(course)
            db.commit()
            db.refresh(course)

            for order, mod_tuple in enumerate(course_data["modules"], start=1):
                title = mod_tuple[0]
                desc = mod_tuple[1]
                duration = mod_tuple[2]
                v_url = mod_tuple[3] if len(mod_tuple) > 3 else "/media/sample_course_video.mp4"
                transcript = mod_tuple[4] if len(mod_tuple) > 4 else mod_tuple[3]
                
                db.add(Module(
                    course_id=course.id,
                    title=title,
                    description=desc,
                    order=order,
                    duration_minutes=duration,
                    video_url=v_url,
                    transcript=transcript,
                ))
            db.commit()
            created += 1

            # Auto-index course content into RAGChunk table
            try:
                from app.services.rag_service import RAGService
                RAGService.index_course_content(db, course.id)
            except Exception as e:
                print(f"RAG indexing warning: {e}")

        print(f"Seeding complete. {created} course(s) created, {updated} course(s) updated.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
