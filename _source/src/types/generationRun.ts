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
  created_at: string;
}
