export type ResourceType = 'PDF' | 'Research Paper' | 'Notes' | 'Book';

export interface LibraryResource {
  id: string;
  title: string;
  author: string;
  category: string;
  resource_type: ResourceType;
  page_count: number;
  reading_progress_percent: number;
  course_association?: string;
  cover_image: string;
  is_saved: boolean;
  excerpt: string;
  tags?: string[];
  pages_content: { [pageNumber: number]: string };
}

export type LibraryFilter = 
  | 'All' 
  | 'Course Resources' 
  | 'PDFs' 
  | 'Research Papers' 
  | 'Notes' 
  | 'Books' 
  | 'Saved';

export type GeminiStudyAction = 
  | 'summarize'
  | 'explain_simply'
  | 'generate_mcqs'
  | 'important_points'
  | 'explain_page'
  | 'create_flashcards'
  | 'create_revision_notes'
  | 'ask_question'
  | 'research_mode';

export interface StudyAssistantResponse {
  action: string;
  title: string;
  result: string;
  sources: string[];
  key_points?: string[];
}

export interface GeminiTopicBreakdown {
  topic: string;
  overview: string;
  key_concepts?: string[];
  algorithms?: string[];
  complexity?: string[];
  next_steps?: string[];
  sources?: string[];
  error_code?: string;
  error_message?: string;
}
