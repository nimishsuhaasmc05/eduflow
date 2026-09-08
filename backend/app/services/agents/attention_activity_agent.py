"""
ATTENTION ACTIVITY AGENT
========================
Generates grounded 30-60 second interactive attention-reset activities
for Level 2 Adaptive Escalations.

Supported Activity Types:
  1. spot_the_concept    — Select the term matching a concise lesson description
  2. sequence_reorder     — Arrange 3-4 execution steps or concept stages in order
  3. match_pairs          — Connect 3-4 terms to their definitions/characteristics
  4. identify_mistake     — Pinpoint the single logical error in a lesson example
"""

import json
import random
import hashlib
import logging
from typing import Dict, Any, Optional, List

from app.core.config import settings
from app.services.ai_provider import get_ai_provider

logger = logging.getLogger(__name__)


def compute_activity_id(topic: str, act_type: str, session_index: int = 0) -> str:
    raw = f"{topic}_{act_type}_{session_index}_{random.randint(1000, 9999)}"
    return f"ACT_{hashlib.sha256(raw.encode('utf-8')).hexdigest()[:10]}"


class AttentionActivityAgent:
    ACTIVITY_TYPES = ["spot_the_concept", "sequence_reorder", "match_pairs", "identify_mistake"]

    @classmethod
    def generate_activity(
        cls,
        topic: str,
        preferred_type: Optional[str] = None,
        course_id: Optional[int] = None,
        module_id: Optional[int] = None,
        context: Optional[str] = None,
        video_knowledge: Optional[Dict[str, Any]] = None,
        session_index: int = 0
    ) -> Dict[str, Any]:
        """
        Generate a fast, grounded attention-reset activity.
        """
        act_type = preferred_type if preferred_type in cls.ACTIVITY_TYPES else random.choice(cls.ACTIVITY_TYPES)
        act_id = compute_activity_id(topic, act_type, session_index)

        # Attempt generation via AI provider
        provider = get_ai_provider()
        if hasattr(provider, "client") and provider.client:
            try:
                activity_data = cls._generate_with_gemini(
                    provider=provider,
                    topic=topic,
                    act_type=act_type,
                    context=context,
                    video_knowledge=video_knowledge
                )
                if activity_data:
                    return {
                        "activity_id": act_id,
                        "activity_type": act_type,
                        "title": activity_data.get("title", f"Quick Focus: {topic}"),
                        "instructions": activity_data.get("instructions", "Bring this idea into focus with a quick 30-second challenge."),
                        "topic": topic,
                        "duration_seconds": 45,
                        "payload": activity_data.get("payload", {}),
                        "encouragement": activity_data.get("encouragement", "Let's switch it up for a moment and bring this concept into sharp focus!")
                    }
            except Exception as err:
                logger.warning(f"AI generation for attention activity failed: {err}")

        # Fallback to rich grounded curriculum activities
        return cls._get_fallback_activity(topic, act_type, act_id)

    @classmethod
    def _generate_with_gemini(
        cls,
        provider: Any,
        topic: str,
        act_type: str,
        context: Optional[str],
        video_knowledge: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        from google.genai import types

        type_instructions = {
            "spot_the_concept": (
                'payload must have: "prompt" (string description), "options" (array of 4 objects: [{"id": "c1", "label": "...", "is_correct": true/false}]), "explanation" (string).'
            ),
            "sequence_reorder": (
                'payload must have: "prompt" (string), "items" (array of 3-4 objects in scrambled order with correct 0-indexed positions: [{"id": "s1", "text": "...", "correct_position": 0}]), "explanation" (string).'
            ),
            "match_pairs": (
                'payload must have: "prompt" (string), "pairs" (array of 3-4 objects: [{"id": "p1", "left": "Term", "right": "Definition/Role"}]), "explanation" (string).'
            ),
            "identify_mistake": (
                'payload must have: "snippet" (short code or logic snippet with 1 error), "prompt" (string), "options" (array of 4 objects: [{"id": "m1", "text": "...", "is_correct": true/false}]), "explanation" (string).'
            )
        }

        grounding = f"\nLesson Context: {context}\n" if context else ""
        if video_knowledge:
            grounding += f"\nVideo Summary: {video_knowledge.get('summary', '')}\nKey Concepts: {', '.join(video_knowledge.get('concepts', []))}\n"

        prompt = f"""
        Create a 30-second interactive learning activity of type '{act_type}' for the topic '{topic}'.
        {grounding}

        Requirements:
        1. Ground strictly in the topic '{topic}'.
        2. {type_instructions.get(act_type, "")}
        3. Friendly, motivating tone without diagnostic or clinical labels.

        Return JSON matching:
        {{
            "title": "Quick Challenge: {topic}",
            "instructions": "Clear instruction for learner",
            "payload": {{ ... }},
            "encouragement": "Positive motivating line"
        }}
        """

        chat = provider.client.chats.create(
            model=settings.GEMINI_MODEL,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        res = chat.send_message(prompt)
        if res and res.text:
            return json.loads(res.text)
        return None

    @classmethod
    def _get_fallback_activity(cls, topic: str, act_type: str, act_id: str) -> Dict[str, Any]:
        """High quality curriculum fallback activities."""
        topic_lower = topic.lower()

        # Algorithms Fallbacks
        if "algo" in topic_lower:
            if act_type == "spot_the_concept":
                return {
                    "activity_id": act_id,
                    "activity_type": "spot_the_concept",
                    "title": "Spot the Concept — Algorithm Essentials",
                    "instructions": "Read the definition below and select the matching core concept.",
                    "topic": topic,
                    "duration_seconds": 35,
                    "payload": {
                        "prompt": "A step-by-step computational procedure that transforms valid inputs into a guaranteed correct output in finite time with O(1) extra space.",
                        "options": [
                            {"id": "c1", "label": "In-Place Algorithm", "is_correct": True},
                            {"id": "c2", "label": "Infinite Loop", "is_correct": False},
                            {"id": "c3", "label": "Random Number Generator", "is_correct": False},
                            {"id": "c4", "label": "Database Index", "is_correct": False}
                        ],
                        "explanation": "An in-place algorithm satisfies finite correctness while consuming only O(1) auxiliary memory beyond the input array."
                    },
                    "encouragement": "Spot on! That sharp distinction brings the whole concept into focus."
                }
            elif act_type == "sequence_reorder":
                return {
                    "activity_id": act_id,
                    "activity_type": "sequence_reorder",
                    "title": "Sequence the Steps — Algorithm Lifecycle",
                    "instructions": "Arrange these algorithmic development stages into the correct order.",
                    "topic": topic,
                    "duration_seconds": 40,
                    "payload": {
                        "prompt": "Put the algorithm design workflow in logical order:",
                        "items": [
                            {"id": "s1", "text": "1. Formally define inputs, preconditions, and expected outputs", "correct_position": 0},
                            {"id": "s2", "text": "2. Design step-by-step logic and prove algorithmic correctness", "correct_position": 1},
                            {"id": "s3", "text": "3. Analyze Big-O time and space asymptotic growth rates", "correct_position": 2},
                            {"id": "s4", "text": "4. Optimize memory and code execution for edge cases", "correct_position": 3}
                        ],
                        "explanation": "Correctness always precedes asymptotic analysis and optimization."
                    },
                    "encouragement": "Excellent sequencing! You've locked in the foundational logic flow."
                }
            elif act_type == "match_pairs":
                return {
                    "activity_id": act_id,
                    "activity_type": "match_pairs",
                    "title": "Match the Complexity Bounds",
                    "instructions": "Connect each Big-O complexity class with its real-world performance characteristic.",
                    "topic": topic,
                    "duration_seconds": 45,
                    "payload": {
                        "prompt": "Match each asymptotic bound to its description:",
                        "pairs": [
                            {"id": "p1", "left": "O(1) Constant", "right": "Direct index calculation regardless of n"},
                            {"id": "p2", "left": "O(log n) Logarithmic", "right": "Halves candidate space at every step"},
                            {"id": "p3", "left": "O(n log n) Linearithmic", "right": "Optimal comparison-based sorting bound"},
                            {"id": "p4", "left": "O(2^n) Exponential", "right": "Doubles operations with every additional element"}
                        ],
                        "explanation": "These asymptotic bounds define how software scales from a few items to billions."
                    },
                    "encouragement": "All pairs matched perfectly! Your grasp on complexity is razor sharp."
                }
            else: # identify_mistake
                return {
                    "activity_id": act_id,
                    "activity_type": "identify_mistake",
                    "title": "Identify the Logic Flaw — Asymptotic Claim",
                    "instructions": "Find the incorrect statement among these performance claims.",
                    "topic": topic,
                    "duration_seconds": 40,
                    "payload": {
                        "snippet": "Claim A: O(1) direct access is faster than O(n) search.\nClaim B: An algorithm taking 1,000,000 operations is always O(n^2).\nClaim C: Merge Sort is guaranteed O(n log n) worst-case.\nClaim D: Big-O measures upper bound scaling as n approaches infinity.",
                        "prompt": "Which claim contains a fundamental misunderstanding?",
                        "options": [
                            {"id": "m1", "text": "Claim B — Fixed constant operations (even 1,000,000) evaluate to O(1) constant time because they do not grow with n", "is_correct": True},
                            {"id": "m2", "text": "Claim A is wrong because O(n) is faster than O(1)", "is_correct": False},
                            {"id": "m3", "text": "Claim C is wrong because Merge Sort is always O(n^2)", "is_correct": False},
                            {"id": "m4", "text": "Claim D is wrong because Big-O only measures disk storage", "is_correct": False}
                        ],
                        "explanation": "Constant execution time that does not scale with input size n is always O(1), regardless of the constant magnitude."
                    },
                    "encouragement": "Brilliant catch! You spotted the subtle nuance immediately."
                }

        # Sorting / Searching Fallbacks
        elif "sort" in topic_lower or "search" in topic_lower:
            if act_type == "spot_the_concept":
                return {
                    "activity_id": act_id,
                    "activity_type": "spot_the_concept",
                    "title": "Spot the Concept — Binary Search Precondition",
                    "instructions": "Select the mandatory prerequisite for binary search.",
                    "topic": topic,
                    "duration_seconds": 30,
                    "payload": {
                        "prompt": "What invariant must hold before Binary Search can be executed on a dataset?",
                        "options": [
                            {"id": "c1", "label": "Elements must be in monotonic sorted order", "is_correct": True},
                            {"id": "c2", "label": "Dataset must be stored in a linked list", "is_correct": False},
                            {"id": "c3", "label": "Array must contain only even numbers", "is_correct": False},
                            {"id": "c4", "label": "Array size must be an exact power of two", "is_correct": False}
                        ],
                        "explanation": "Binary search relies on monotonic ordering so it can safely discard half the candidate elements at each comparison."
                    },
                    "encouragement": "Exactly right! Keeping preconditions in mind makes coding foolproof."
                }
            elif act_type == "sequence_reorder":
                return {
                    "activity_id": act_id,
                    "activity_type": "sequence_reorder",
                    "title": "Sequence Binary Search Execution",
                    "instructions": "Put the Binary Search execution loop in the correct sequence.",
                    "topic": topic,
                    "duration_seconds": 40,
                    "payload": {
                        "prompt": "Arrange the binary search iterations in order:",
                        "items": [
                            {"id": "s1", "text": "1. Initialize search boundaries low = 0 and high = length - 1", "correct_position": 0},
                            {"id": "s2", "text": "2. Calculate middle index: mid = low + (high - low) // 2", "correct_position": 1},
                            {"id": "s3", "text": "3. Compare target with arr[mid] to check for match", "correct_position": 2},
                            {"id": "s4", "text": "4. Narrow bounds: set low = mid + 1 or high = mid - 1", "correct_position": 3}
                        ],
                        "explanation": "This 4-step sequence ensures logarithmic O(log n) convergence on the target."
                    },
                    "encouragement": "Perfect order! You've visualized the whole search loop."
                }
            elif act_type == "match_pairs":
                return {
                    "activity_id": act_id,
                    "activity_type": "match_pairs",
                    "title": "Match Sorting Strategies",
                    "instructions": "Pair each sorting algorithm with its design strategy.",
                    "topic": topic,
                    "duration_seconds": 45,
                    "payload": {
                        "prompt": "Match the algorithm to its mechanism:",
                        "pairs": [
                            {"id": "p1", "left": "Merge Sort", "right": "Divide into halves, recursively sort, merge in O(n)"},
                            {"id": "p2", "left": "Quick Sort", "right": "Partition around a pivot element into smaller/larger subarrays"},
                            {"id": "p3", "left": "Binary Search", "right": "Halve sorted search space in O(log n)"},
                            {"id": "p4", "left": "Insertion Sort", "right": "Insert elements one-by-one into sorted prefix"}
                        ],
                        "explanation": "Divide-and-conquer powers both Merge Sort and Quick Sort to beat quadratic curves."
                    },
                    "encouragement": "Flawless matching! You've mastered these algorithmic paradigms."
                }
            else: # identify_mistake
                return {
                    "activity_id": act_id,
                    "activity_type": "identify_mistake",
                    "title": "Spot the Bug — Binary Search Range Update",
                    "instructions": "Spot the bug in this Python binary search snippet.",
                    "topic": topic,
                    "duration_seconds": 40,
                    "payload": {
                        "snippet": "while low <= high:\n    mid = (low + high) // 2\n    if arr[mid] == target:\n        return mid\n    elif arr[mid] < target:\n        high = mid - 1   # <-- Line 5\n    else:\n        low = mid + 1    # <-- Line 7",
                        "prompt": "What is the logical bug in the boundary updates?",
                        "options": [
                            {"id": "m1", "text": "When arr[mid] < target, target is in the right half, so low should be mid + 1 (the branches are inverted)", "is_correct": True},
                            {"id": "m2", "text": "The while loop condition must use strictly < instead of <=", "is_correct": False},
                            {"id": "m3", "text": "mid cannot use integer floor division //", "is_correct": False},
                            {"id": "m4", "text": "The function must always return None", "is_correct": False}
                        ],
                        "explanation": "When arr[mid] < target, the search space must shift rightwards by advancing low = mid + 1."
                    },
                    "encouragement": "Sharp eye! Inverted search boundaries are one of the most classic bugs in software engineering."
                }

        # Data Structures Fallbacks (Default)
        else:
            if act_type == "spot_the_concept":
                return {
                    "activity_id": act_id,
                    "activity_type": "spot_the_concept",
                    "title": "Spot the Concept — Memory & Locality",
                    "instructions": "Identify the data structure that best matches this description.",
                    "topic": topic,
                    "duration_seconds": 35,
                    "payload": {
                        "prompt": "Stores elements contiguously in RAM, granting O(1) indexed reads and maximum CPU cache line spatial locality.",
                        "options": [
                            {"id": "c1", "label": "Contiguous Array", "is_correct": True},
                            {"id": "c2", "label": "Doubly Linked List", "is_correct": False},
                            {"id": "c3", "label": "Binary Search Tree", "is_correct": False},
                            {"id": "c4", "label": "Hash Map with Chaining", "is_correct": False}
                        ],
                        "explanation": "Contiguous arrays pack elements consecutively, taking full advantage of CPU cache pre-fetching."
                    },
                    "encouragement": "Right on the money! Memory hierarchy is central to high performance."
                }
            elif act_type == "sequence_reorder":
                return {
                    "activity_id": act_id,
                    "activity_type": "sequence_reorder",
                    "title": "Sequence Linked List Node Insertion",
                    "instructions": "Put the pointer manipulation steps in the correct safe order.",
                    "topic": topic,
                    "duration_seconds": 40,
                    "payload": {
                        "prompt": "Order the steps to insert a new node at the head of a singly linked list:",
                        "items": [
                            {"id": "s1", "text": "1. Allocate new node in heap with payload value", "correct_position": 0},
                            {"id": "s2", "text": "2. Point new_node.next to the current head node", "correct_position": 1},
                            {"id": "s3", "text": "3. Update list head pointer to reference the new node", "correct_position": 2},
                            {"id": "s4", "text": "4. Increment list length counter", "correct_position": 3}
                        ],
                        "explanation": "Always link the new node's next pointer BEFORE repointing the head to avoid losing the chain."
                    },
                    "encouragement": "Order is key to memory safety! You nailed it."
                }
            elif act_type == "match_pairs":
                return {
                    "activity_id": act_id,
                    "activity_type": "match_pairs",
                    "title": "Match Structures to Capabilities",
                    "instructions": "Connect each data structure with its primary advantage.",
                    "topic": topic,
                    "duration_seconds": 45,
                    "payload": {
                        "prompt": "Match data structure with its key benefit:",
                        "pairs": [
                            {"id": "p1", "left": "Array", "right": "O(1) direct indexing via memory arithmetic"},
                            {"id": "p2", "left": "Singly Linked List", "right": "O(1) insertion at head without shifting elements"},
                            {"id": "p3", "left": "Doubly Linked List", "right": "Bidirectional traversal with prev and next pointers"},
                            {"id": "p4", "left": "Dynamic Array", "right": "Amortized O(1) append with capacity doubling"}
                        ],
                        "explanation": "Choosing the right data structure aligns your algorithm's bottlenecks with hardware efficiency."
                    },
                    "encouragement": "All matched! You're completely dialed in."
                }
            else: # identify_mistake
                return {
                    "activity_id": act_id,
                    "activity_type": "identify_mistake",
                    "title": "Spot the Bug — Node Memory Leak",
                    "instructions": "Identify what is wrong with this linked list head deletion.",
                    "topic": topic,
                    "duration_seconds": 40,
                    "payload": {
                        "snippet": "def delete_head(head):\n    # Buggy version:\n    head = None\n    return head.next",
                        "prompt": "What critical error occurs in this code?",
                        "options": [
                            {"id": "m1", "text": "Setting head = None destroys the pointer before reading head.next, triggering an AttributeError / NullPointerException", "is_correct": True},
                            {"id": "m2", "text": "Python functions cannot return objects", "is_correct": False},
                            {"id": "m3", "text": "Linked lists cannot have their head deleted", "is_correct": False},
                            {"id": "m4", "text": "head must always be a float number", "is_correct": False}
                        ],
                        "explanation": "Overwriting head with None before saving head.next causes immediate crash or losing access to the rest of the list."
                    },
                    "encouragement": "Sharp catch! Pointer order is everything in low-level data structures."
                }
