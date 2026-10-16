import re
import abc
import json
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

def safe_json_loads(text: str) -> Any:
    if not text:
        return {}
    clean = text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    clean = clean.strip()

    try:
        return json.loads(clean, strict=False)
    except Exception:
        # Fix unescaped backslashes often emitted by LLMs in LaTeX / code
        sanitized = re.sub(r'\\(?![/"\\bfnrtu]|u[0-9a-fA-F]{4})', r'\\\\', clean)
        return json.loads(sanitized, strict=False)

class AIProvider(abc.ABC):
    """
    Abstract AI Provider Interface for Edu-Flow.
    Supports vendor switching between Gemini, OpenAI, and other LLM providers.
    """

    @abc.abstractmethod
    def generate_answer(
        self,
        prompt: str,
        system_instruction: str,
        detected_topic: str = "Lesson Topic"
    ) -> Dict[str, Any]:
        """Generate structured tutor answer JSON."""
        pass

    @abc.abstractmethod
    def analyze_video(
        self,
        title: str,
        description: str,
        transcript: str
    ) -> Dict[str, Any]:
        """Extract structured video knowledge JSON."""
        pass

    @abc.abstractmethod
    def generate_quiz(
        self,
        topic: str,
        target_affect: str,
        num_questions: int = 1,
        context: Optional[str] = None,
        video_knowledge: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate state-adapted quiz JSON grounded in lesson content."""
        pass

    @abc.abstractmethod
    def generate_socratic_question(
        self,
        query: str,
        topic: str,
        affect_state: str
    ) -> str:
        """Generate a Socratic guiding question."""
        pass


class GeminiProvider(AIProvider):
    def __init__(self):
        from google import genai
        api_key = settings.GEMINI_API_KEY
        if api_key and len(api_key.strip()) >= 10 and not api_key.startswith("dummy"):
            self.client = genai.Client(api_key=api_key.strip())
        else:
            self.client = None

    def generate_answer(
        self,
        prompt: str,
        system_instruction: str,
        detected_topic: str = "Lesson Topic"
    ) -> Dict[str, Any]:
        if not self.client:
            return self._fallback_answer(prompt, detected_topic)

        try:
            from google.genai import types
            candidates = [settings.GEMINI_MODEL]
            models_to_try = list(dict.fromkeys(c for c in candidates if c))
            
            schema_prompt = (
                f"{prompt}\n\n"
                "IMPORTANT: Respond with a valid JSON object matching this schema:\n"
                "{\n"
                '  "answer": "Detailed, step-by-step educational explanation and Socratic response answering the question based on the retrieved course materials.",\n'
                '  "hint": "A guiding pedagogical hint or question prompting deeper reasoning.",\n'
                '  "socratic_question": "A thought-provoking question to check understanding.",\n'
                '  "simplified_explanation": "1-2 sentence simplified breakdown of the core concept.",\n'
                '  "analogies": ["An intuitive real-world analogy illustrating the concept."],\n'
                '  "suggested_followups": ["Followup Question 1", "Followup Question 2", "Followup Question 3"]\n'
                "}"
            )

            for model_name in models_to_try:
                try:
                    chat = self.client.chats.create(
                        model=model_name,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            response_mime_type="application/json",
                            temperature=0.2
                        )
                    )
                    res = chat.send_message(schema_prompt)
                    if res and res.text:
                        parsed = safe_json_loads(res.text)
                        if isinstance(parsed, dict):
                            return parsed
                except Exception as e:
                    logger.warning(f"Gemini model {model_name} failed: {e}")
        except Exception as err:
            logger.error(f"GeminiProvider generate_answer error: {err}")

        # Failover to OpenAI GPT-4 if configured
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY.strip()) >= 10:
            try:
                oa_prov = OpenAIProvider()
                if oa_prov.client:
                    return oa_prov.generate_answer(prompt, system_instruction, detected_topic)
            except Exception as oa_err:
                logger.warning(f"OpenAI failover generate_answer error: {oa_err}")

        return self._fallback_answer(prompt, detected_topic)

    def analyze_video(
        self,
        title: str,
        description: str,
        transcript: str
    ) -> Dict[str, Any]:
        if not self.client:
            return self._fallback_video_analysis(title)

        try:
            from google.genai import types
            analysis_prompt = f"""
            Perform structured educational analysis of this video lesson.
            TITLE: {title}
            DESCRIPTION: {description}
            TRANSCRIPT: {transcript[:4000]}

            Return JSON object with keys:
            - "detected_topic": main topic
            - "subject": subject area
            - "summary": 2-3 sentence overview
            - "learning_objectives": list of string goals
            - "concepts": list of core concept names
            - "definitions": dict of concept: definition
            - "important_points": list of key takeaways
            - "examples": list of real-world examples
            - "procedures": list of step-by-step procedures
            - "formulas": list of formulas or equations
            - "timestamps": dict of timestamp: concept
            """

            chat = self.client.chats.create(
                model=settings.GEMINI_MODEL,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            res = chat.send_message(analysis_prompt)
            if res and res.text:
                return safe_json_loads(res.text)
        except Exception as e:
            logger.warning(f"Gemini analyze_video exception: {e}")

        return self._fallback_video_analysis(title)

    def generate_quiz(
        self,
        topic: str,
        target_affect: str,
        num_questions: int = 1,
        context: Optional[str] = None,
        video_knowledge: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not self.client:
            return self._fallback_quiz(topic, target_affect, num_questions, video_knowledge)

        try:
            from google.genai import types
            grounding_text = f"\nLesson Context / Transcript:\n{context}\n" if context else ""
            vk_text = ""
            if video_knowledge:
                summary = video_knowledge.get("summary", "")
                concepts = ", ".join(video_knowledge.get("concepts", []))
                vk_text = f"\nVideo Summary: {summary}\nKey Concepts: {concepts}\n"

            prompt = f"""
            Generate an adaptive multiple-choice micro-quiz ({num_questions} targeted questions) for a student studying: '{topic}'.
            Target affective state: {target_affect}.
            {grounding_text}{vk_text}

            Strictly ground questions in the provided lesson/video content.
            Use image_required: true ONLY when a visual diagram (such as tree structure, linked list, or algorithmic flow) is genuinely essential to answer the question. Otherwise set image_required: false.

            Return JSON matching this exact structure:
            {{
                "title": "Adaptive Knowledge Check: {topic}",
                "questions": [
                    {{
                        "id": 1,
                        "topic": "Core Concept",
                        "question": "Question text here?",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correct_index": 0,
                        "explanation": "Why this is correct grounded in lesson facts.",
                        "image_required": false,
                        "image_optional": false,
                        "image_reference": null,
                        "timestamp_reference": "02:30",
                        "timestamp_seconds": 150
                    }}
                ]
            }}
            """
            candidates = [settings.GEMINI_MODEL]
            models_to_try = list(dict.fromkeys(c for c in candidates if c))
            for model_name in models_to_try:
                try:
                    chat = self.client.chats.create(
                        model=model_name,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2
                        )
                    )
                    res = chat.send_message(prompt)
                    if res and res.text:
                        parsed = safe_json_loads(res.text)
                        if isinstance(parsed, dict) and "questions" in parsed and len(parsed["questions"]) > 0:
                            return parsed
                except Exception as model_err:
                    logger.warning(f"Gemini quiz generation with model {model_name} failed: {model_err}")
        except Exception as e:
            logger.warning(f"Gemini generate_quiz exception: {e}")

        return self._fallback_quiz(topic, target_affect, num_questions, video_knowledge)

    def generate_socratic_question(
        self,
        query: str,
        topic: str,
        affect_state: str
    ) -> str:
        return f"To help you understand '{query}' in {topic}: What step would you take first to break this down?"

    def _fallback_answer(self, prompt: str, topic: str) -> Dict[str, Any]:
        question_clean = ""
        for line in str(prompt).split("\n"):
            if "STUDENT QUESTION:" in line or "QUESTION:" in line:
                question_clean = line.split(":", 1)[-1].strip()
                break
        if not question_clean:
            question_clean = f"Key concepts of {topic}"

        ans_body = (
            f"Here is the step-by-step educational breakdown regarding '{question_clean}' in **{topic}**:\n\n"
            f"1. **Core Concept**: In {topic}, we define clear computational rules where input data is methodically transformed into the desired result.\n"
            f"2. **Step-by-Step Logic**: First, analyze the preconditions and constraints. Next, apply the algorithmic steps iteratively or recursively, ensuring boundary conditions are handled.\n"
            f"3. **Efficiency Consideration**: Always consider time complexity (growth rate of operations) and auxiliary space complexity in memory.\n"
            f"4. **Practical Example**: For instance, when executing operations in {topic}, choosing the right structure ensures optimal execution time."
        )

        return {
            "answer": ans_body,
            "hint": f"Think about how the data is structured and which property allows you to simplify the operations in {topic}.",
            "socratic_question": f"In {topic}, what condition must be satisfied before this operation can execute safely?",
            "simplified_explanation": f"In {topic}, steps must be executed in a logical sequence to produce the correct output efficiently.",
            "analogies": [f"Think of {topic} as a recipe where each step must be followed in exact order with the right ingredients."],
            "suggested_followups": [
                f"How does {topic} perform with large inputs?",
                f"Can you give a code example for {topic}?",
                "Can you give me a practice problem on this?"
            ],
            "sources": [f"Course Materials: {topic}"]
        }

    def _fallback_video_analysis(self, title: str) -> Dict[str, Any]:
        return {
            "detected_topic": title,
            "subject": "Computer Science & Education",
            "summary": f"Structured video lesson covering {title}.",
            "learning_objectives": [f"Master core principles of {title}"],
            "concepts": [title, "Core Principles", "Key Techniques"],
            "definitions": {title: f"Foundational subject covering {title}."},
            "important_points": [f"Key takeaways from {title}."],
            "examples": [f"Practical applications of {title}."],
            "procedures": ["Standard step-by-step execution."],
            "formulas": [],
            "timestamps": {"00:00": f"Introduction to {title}"}
        }

    def _fallback_quiz(
        self,
        topic: str,
        target_affect: str,
        num_questions: int = 1,
        video_knowledge: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        topic_lower = topic.lower()
        if "algorithm" in topic_lower and "search" not in topic_lower and "sort" not in topic_lower:
            questions = [
                {
                    "id": "q_algo_1",
                    "question": "What is the primary definition of an algorithm in computer science?",
                    "options": [
                        "A well-defined computational procedure that takes inputs and produces an output",
                        "A physical hardware component inside the central processing unit",
                        "A programming language designed exclusively for database management",
                        "An unorganized collection of random instructions"
                    ],
                    "correct_index": 0,
                    "explanation": "An algorithm is a formal step-by-step recipe that transforms valid input values into desired output values."
                },
                {
                    "id": "q_algo_2",
                    "question": "What does Big-O asymptotic notation primarily measure?",
                    "options": [
                        "The exact number of CPU clock cycles required on a specific computer",
                        "The upper bound on how runtime or memory grows as the input size n approaches infinity",
                        "The total size of the source code file in kilobytes",
                        "The network transmission bandwidth between client and server"
                    ],
                    "correct_index": 1,
                    "explanation": "Big-O notation characterizes the asymptotic growth rate of an algorithm's resource consumption as input size scales."
                },
                {
                    "id": "q_algo_3",
                    "question": "Why is algorithmic correctness essential before optimizing for speed?",
                    "options": [
                        "Incorrect algorithms cannot be compiled by modern programming languages",
                        "An efficient algorithm that produces incorrect output has zero computational value",
                        "Computer processors automatically slow down when executing buggy code",
                        "All algorithms are required by law to execute in constant time"
                    ],
                    "correct_index": 1,
                    "explanation": "An algorithm must first be provably correct; producing incorrect answers fast is useless."
                },
                {
                    "id": "q_algo_4",
                    "question": "Which asymptotic growth rate represents the fastest growing runtime for large inputs?",
                    "options": [
                        "O(2^n) exponential time",
                        "O(n log n) linearithmic time",
                        "O(n^2) quadratic time",
                        "O(log n) logarithmic time"
                    ],
                    "correct_index": 0,
                    "explanation": "Exponential growth O(2^n) scales much faster than polynomial or linearithmic curves as n grows."
                },
                {
                    "id": "q_algo_5",
                    "question": "In algorithm design, what does the term 'in-place' mean regarding memory consumption?",
                    "options": [
                        "The algorithm uses O(1) auxiliary space beyond the input data structure itself",
                        "The algorithm only runs on a local machine rather than the cloud",
                        "The algorithm saves output directly to disk rather than RAM",
                        "The algorithm requires allocating a secondary array equal to size n"
                    ],
                    "correct_index": 0,
                    "explanation": "An in-place algorithm transforms the input using a small, constant amount O(1) of extra memory."
                },
                {
                    "id": "q_algo_6",
                    "question": "What distinguishes best-case complexity (Big-Omega) from worst-case complexity (Big-O)?",
                    "options": [
                        "Big-Omega provides the asymptotic lower bound on runtime for favorable inputs, while Big-O provides the upper bound",
                        "Big-Omega only applies to hardware memory while Big-O applies to CPU clock speed",
                        "Big-Omega measures compilation time while Big-O measures runtime",
                        "They are mathematically identical terms with different names"
                    ],
                    "correct_index": 0,
                    "explanation": "Big-Omega describes the minimum runtime required on any input of size n, whereas Big-O guarantees an upper bound."
                }
            ]
        elif "data structure" in topic_lower and "array" not in topic_lower:
            questions = [
                {
                    "id": "q_ds_1",
                    "question": "What is the primary characteristic of Random Access Memory (RAM) in modern computing?",
                    "options": [
                        "Any memory address can be read or written in O(1) constant time regardless of physical location",
                        "Memory can only be accessed sequentially from the lowest address to the highest",
                        "Data is permanently retained even after the system is completely powered down",
                        "Accessing memory requires traversing pointers through all intermediate cells"
                    ],
                    "correct_index": 0,
                    "explanation": "RAM allows constant time O(1) direct addressing to any memory byte via numerical hardware addresses."
                },
                {
                    "id": "q_ds_2",
                    "question": "How does contiguous memory allocation in an array differ from pointer-based nodes?",
                    "options": [
                        "Contiguous memory stores sequential elements in adjacent RAM cells, enabling direct index arithmetic",
                        "Contiguous memory scatters elements randomly across the heap without order",
                        "Pointer-based nodes always require less memory than contiguous arrays",
                        "Contiguous memory requires traversing pointers from the head node"
                    ],
                    "correct_index": 0,
                    "explanation": "Contiguous arrays place elements back-to-back, allowing address calculation via Address = Base + i * Size in O(1) time."
                },
                {
                    "id": "q_ds_3",
                    "question": "Why does a dynamic array double its capacity when full instead of growing by 1 element?",
                    "options": [
                        "To achieve O(1) amortized insertion time by reducing the frequency of expensive memory reallocations",
                        "Because computer hardware only supports memory allocations in powers of two",
                        "To prevent other programs from utilizing system RAM",
                        "It is required by programming language syntax rules"
                    ],
                    "correct_index": 0,
                    "explanation": "Geometric resizing (doubling capacity) ensures that appending n elements takes O(n) total time, giving O(1) amortized cost per append."
                },
                {
                    "id": "q_ds_4",
                    "question": "What trade-off is made when choosing an array over a linked list for frequent search operations?",
                    "options": [
                        "Arrays provide faster O(1) indexed reads and cache locality but cost O(n) to insert into the middle",
                        "Arrays require more pointer overhead per item than linked lists",
                        "Linked lists allow O(1) random binary search while arrays do not",
                        "Arrays cannot store numerical values"
                    ],
                    "correct_index": 0,
                    "explanation": "Arrays excel at fast random access and cache performance, but shifting elements on middle insertion costs O(n)."
                },
                {
                    "id": "q_ds_5",
                    "question": "What is spatial locality in CPU cache architecture and why does it benefit contiguous arrays?",
                    "options": [
                        "When memory near recently accessed data is loaded into CPU cache lines ahead of time",
                        "The physical geographical location of the server data center",
                        "The process of translating domain names into IP addresses",
                        "The encryption of data at rest in storage drives"
                    ],
                    "correct_index": 0,
                    "explanation": "CPUs fetch contiguous chunks of memory into fast cache lines; arrays leverage spatial locality directly."
                },
                {
                    "id": "q_ds_6",
                    "question": "What is the primary memory overhead in a Doubly Linked List compared to an Array?",
                    "options": [
                        "Each node requires two additional pointers (next and prev) in heap memory",
                        "Doubly linked lists require reserving double the entire RAM capacity upfront",
                        "Arrays consume pointer overhead while linked lists do not",
                        "Doubly linked lists cannot store objects or records"
                    ],
                    "correct_index": 0,
                    "explanation": "Each node in a doubly linked list stores two pointer references along with its payload."
                }
            ]
        elif "array" in topic_lower or "linked list" in topic_lower:
            questions = [
                {
                    "id": "q_arr_1",
                    "question": "What is the time complexity of accessing an element by index in a standard array?",
                    "options": [
                        "O(1) constant time",
                        "O(n) linear time",
                        "O(log n) logarithmic time",
                        "O(n^2) quadratic time"
                    ],
                    "correct_index": 0,
                    "explanation": "Array indexing calculates the exact memory offset in O(1) constant time."
                },
                {
                    "id": "q_arr_2",
                    "question": "In a singly linked list, what does each node object contain?",
                    "options": [
                        "The stored data value and a memory reference/pointer to the next node",
                        "Only the numerical index of the element in the array",
                        "A contiguous block of memory for all future elements",
                        "A pointer to the operating system kernel"
                    ],
                    "correct_index": 0,
                    "explanation": "Each node in a singly linked list contains its payload data and a pointer referencing the next node in the sequence."
                },
                {
                    "id": "q_arr_3",
                    "question": "What is the time complexity of inserting a new head node into a singly linked list when given the pointer to the current head?",
                    "options": [
                        "O(1) constant time",
                        "O(n) linear time",
                        "O(log n) logarithmic time",
                        "O(n^2) quadratic time"
                    ],
                    "correct_index": 0,
                    "explanation": "Inserting at the head simply creates a node, points its next reference to the old head, and updates the head pointer in O(1) steps."
                },
                {
                    "id": "q_arr_4",
                    "question": "What happens to the remaining nodes when an element is removed from the middle of a standard array of size n?",
                    "options": [
                        "All subsequent elements must be shifted one position left in O(n) time to maintain contiguous layout",
                        "The array automatically becomes a linked list without shifting elements",
                        "The middle element is permanently replaced with a pointer to NULL",
                        "All elements are immediately sorted in ascending order"
                    ],
                    "correct_index": 0,
                    "explanation": "Contiguous arrays cannot have holes; deleting at index k requires shifting n - k - 1 elements left."
                },
                {
                    "id": "q_arr_5",
                    "question": "How do you detect a cycle in a singly linked list with O(1) auxiliary space?",
                    "options": [
                        "Using Floyd's Tortoise and Hare algorithm with slow and fast pointers",
                        "Storing every visited pointer address in a secondary hash table",
                        "Counting total elements and comparing with list capacity",
                        "Reversing the list from tail to head"
                    ],
                    "correct_index": 0,
                    "explanation": "Floyd's cycle-finding algorithm moves two pointers at different speeds (1x and 2x) in O(1) space."
                },
                {
                    "id": "q_arr_6",
                    "question": "What is the time complexity to find the k-th element from the end of a singly linked list of length n in one pass?",
                    "options": [
                        "O(n) time using two pointers separated by distance k",
                        "O(1) constant time direct access",
                        "O(n^2) quadratic nested iteration",
                        "O(log n) binary traversal"
                    ],
                    "correct_index": 0,
                    "explanation": "Using two pointers spaced k nodes apart allows finding the target in a single O(n) pass."
                }
            ]
        elif "sort" in topic_lower:
            questions = [
                {
                    "id": "q_sort_1",
                    "question": "What is the worst-case time complexity of Merge Sort on an array of size n?",
                    "options": [
                        "O(n log n) linearithmic time",
                        "O(n^2) quadratic time",
                        "O(n) linear time",
                        "O(1) constant time"
                    ],
                    "correct_index": 0,
                    "explanation": "Merge Sort guarantees O(n log n) runtime in all cases (best, average, and worst) using divide-and-conquer."
                },
                {
                    "id": "q_sort_2",
                    "question": "How does the divide-and-conquer strategy operate in Merge Sort?",
                    "options": [
                        "It recursively splits the array into two halves until singletons remain, then merges sorted halves",
                        "It repeatedly swaps adjacent out-of-order elements until the entire list is sorted",
                        "It randomly shuffles elements until they happen to be in sorted order",
                        "It selects the smallest element and shifts it to index 0 repeatedly"
                    ],
                    "correct_index": 0,
                    "explanation": "Merge Sort bisects the array, recursively sorts the subarrays, and combines them in linear O(n) merge steps."
                },
                {
                    "id": "q_sort_3",
                    "question": "What is the auxiliary space complexity of standard Merge Sort on an array of size n?",
                    "options": [
                        "O(n) auxiliary space to hold temporary merged subarrays",
                        "O(1) in-place auxiliary space",
                        "O(n^2) auxiliary space",
                        "O(log n) auxiliary space without extra arrays"
                    ],
                    "correct_index": 0,
                    "explanation": "Standard Merge Sort requires O(n) auxiliary buffer space to merge the two sorted halves."
                },
                {
                    "id": "q_sort_4",
                    "question": "What does it mean for a sorting algorithm to be 'stable'?",
                    "options": [
                        "Elements with equal keys preserve their relative input order in the sorted output",
                        "The algorithm never crashes even when system memory is low",
                        "The runtime is exactly identical across all input permutations",
                        "The algorithm does not use recursion"
                    ],
                    "correct_index": 0,
                    "explanation": "Stability ensures equal-value elements remain in the exact relative sequence as they appeared initially."
                },
                {
                    "id": "q_sort_5",
                    "question": "What is the worst-case time complexity of Quicksort when an unbalanced pivot is chosen repeatedly?",
                    "options": [
                        "O(n^2) quadratic time",
                        "O(n log n) linearithmic time",
                        "O(n) linear time",
                        "O(log n) logarithmic time"
                    ],
                    "correct_index": 0,
                    "explanation": "When partitions split into sizes 0 and n-1 each time (e.g. already sorted array with naive pivot), Quicksort degrades to O(n^2)."
                },
                {
                    "id": "q_sort_6",
                    "question": "What is the theoretical lower bound for comparison-based sorting algorithms on n items?",
                    "options": [
                        "Omega(n log n)",
                        "Omega(n)",
                        "Omega(1)",
                        "Omega(n^2)"
                    ],
                    "correct_index": 0,
                    "explanation": "Decision-tree lower bound proofs establish that any comparison sort requires at least log2(n!) = Omega(n log n) comparisons."
                }
            ]
        else: # Searching / Binary Search / Trees
            questions = [
                {
                    "id": "q_search_1",
                    "question": "What is the mandatory prerequisite before applying Binary Search on a collection?",
                    "options": [
                        "The elements in the collection must be sorted in monotonic order",
                        "The collection must contain an even number of elements",
                        "All elements in the collection must be positive integers",
                        "The collection must be stored in a linked list rather than an array"
                    ],
                    "correct_index": 0,
                    "explanation": "Binary Search relies on sorted order so that comparing against the middle element can safely discard half the remaining search space."
                },
                {
                    "id": "q_search_2",
                    "question": "What is the worst-case time complexity of Binary Search on a sorted array of size n?",
                    "options": [
                        "O(log n) logarithmic time",
                        "O(n) linear time",
                        "O(n log n) linearithmic time",
                        "O(1) constant time"
                    ],
                    "correct_index": 0,
                    "explanation": "Because Binary Search halves the candidate elements at each step, it completes in at most log2(n) comparisons, which is O(log n)."
                },
                {
                    "id": "q_search_3",
                    "question": "How does Binary Search calculate the middle index safely to prevent arithmetic overflow in languages with fixed-width integers?",
                    "options": [
                        "mid = low + (high - low) // 2",
                        "mid = (low * high) // 2",
                        "mid = low + high + 1",
                        "mid = (low - high) // 2"
                    ],
                    "correct_index": 0,
                    "explanation": "Using low + (high - low) // 2 avoids potential integer overflow that can occur when adding (low + high)."
                },
                {
                    "id": "q_search_4",
                    "question": "In a Binary Search Tree (BST), where is a key k inserted if k is smaller than the root value?",
                    "options": [
                        "In the left subtree of the root node",
                        "In the right subtree of the root node",
                        "Replacing the root node directly",
                        "At a random leaf position"
                    ],
                    "correct_index": 0,
                    "explanation": "The BST invariant dictates that all keys in the left subtree must be strictly less than the parent node."
                },
                {
                    "id": "q_search_5",
                    "question": "What is the worst-case search time complexity in an unbalanced Binary Search Tree of n nodes?",
                    "options": [
                        "O(n) linear time (degraded into a linked list chain)",
                        "O(log n) logarithmic time",
                        "O(1) constant time",
                        "O(n log n) linearithmic time"
                    ],
                    "correct_index": 0,
                    "explanation": "If inserted in sequential sorted order without rebalancing, a BST degenerates into a linear chain of depth n."
                },
                {
                    "id": "q_search_6",
                    "question": "Which tree traversal order visits nodes of a Binary Search Tree in sorted ascending order?",
                    "options": [
                        "In-order traversal (Left, Root, Right)",
                        "Pre-order traversal (Root, Left, Right)",
                        "Post-order traversal (Left, Right, Root)",
                        "Level-order traversal (Breadth-first)"
                    ],
                    "correct_index": 0,
                    "explanation": "In-order traversal visits left subtree first, then root, then right subtree, producing monotonic sorted keys."
                }
            ]

        return {
            "quiz_id": 101,
            "title": f"Adaptive Micro-Quiz: {topic}",
            "target_affect": target_affect,
            "questions": questions
        }


class OpenAIProvider(AIProvider):
    def __init__(self):
        api_key = settings.OPENAI_API_KEY
        if api_key and len(api_key.strip()) >= 10:
            try:
                import openai
                self.client = openai.OpenAI(api_key=api_key.strip())
            except Exception as err:
                logger.warning(f"Failed to initialize OpenAI client: {err}")
                self.client = None
        else:
            self.client = None

    def generate_answer(
        self,
        prompt: str,
        system_instruction: str,
        detected_topic: str = "Lesson Topic"
    ) -> Dict[str, Any]:
        if not self.client:
            return GeminiProvider()._fallback_answer(prompt, detected_topic)

        try:
            res = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            if res.choices and res.choices[0].message.content:
                return json.loads(res.choices[0].message.content.strip())
        except Exception as e:
            logger.warning(f"OpenAI generate_answer failed: {e}")

        return GeminiProvider()._fallback_answer(prompt, detected_topic)

    def analyze_video(
        self,
        title: str,
        description: str,
        transcript: str
    ) -> Dict[str, Any]:
        if not self.client:
            return GeminiProvider()._fallback_video_analysis(title)

        try:
            analysis_prompt = f"Extract structured educational JSON for video '{title}'. Transcript: {transcript[:4000]}"
            res = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": analysis_prompt}],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            if res.choices and res.choices[0].message.content:
                return json.loads(res.choices[0].message.content.strip())
        except Exception as e:
            logger.warning(f"OpenAI analyze_video failed: {e}")

        return GeminiProvider()._fallback_video_analysis(title)

    def generate_quiz(
        self,
        topic: str,
        target_affect: str,
        num_questions: int = 3
    ) -> Dict[str, Any]:
        if not self.client:
            return GeminiProvider()._fallback_quiz(topic, target_affect, num_questions)

        try:
            prompt = f"Generate JSON quiz for '{topic}' targeting student state '{target_affect}'."
            res = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            if res.choices and res.choices[0].message.content:
                return json.loads(res.choices[0].message.content.strip())
        except Exception as e:
            logger.warning(f"OpenAI generate_quiz failed: {e}")

        return GeminiProvider()._fallback_quiz(topic, target_affect, num_questions)

    def generate_socratic_question(
        self,
        query: str,
        topic: str,
        affect_state: str
    ) -> str:
        return f"Regarding '{query}' in {topic}: What principle do you think connects the inputs to the expected result?"


def get_ai_provider() -> AIProvider:
    provider_name = (settings.AI_PROVIDER or "gemini").lower()
    if provider_name == "openai" and settings.OPENAI_API_KEY:
        return OpenAIProvider()
    return GeminiProvider()
