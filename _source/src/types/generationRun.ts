export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed';

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
  created_at: string;
}
