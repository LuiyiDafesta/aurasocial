export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed';

export type PreferredFormat = 'any' | 'video' | 'reel' | 'tiktok' | 'carousel' | 'post';

export interface GenerationContext {
  topic?: string | null;
  keywords?: string[];
  objective?: string | null;
  preferred_format?: PreferredFormat;
  web_research?: boolean;
  ideas_count?: number;
}

export interface ResearchSourceItem {
  title: string;
  url: string;
  snippet?: string;
  score?: number | null;
}

export interface GenerationRun {
  id: string;
  workspace_id: string;
  brand_id: string;
  user_id: string;
  workflow_name: string;
  status: GenerationStatus;
  started_at?: string | null;
  completed_at?: string | null;
  ideas_created: number;
  error_message?: string | null;
  generation_context?: GenerationContext | null;
  sample_ideas?: { id: string; title: string; pillar: string; format: string }[] | null;
  research_sources?: ResearchSourceItem[] | null;
  model_used?: string | null;
  prompt_version?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface PaginatedGenerationRunsResult {
  runs: GenerationRun[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

