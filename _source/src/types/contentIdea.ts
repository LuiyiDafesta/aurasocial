export type IdeaPriority = 'high' | 'normal' | 'low';
export type IdeaStatus = 'proposed' | 'in_production' | 'approved' | 'rejected';
export type IdeaSource = 'ai' | 'human';

export interface ContentIdea {
  id: string;
  workspace_id: string;
  brand_id: string;
  title: string;
  concept: string;
  objective: string;
  pillar: string;
  format: string;
  hook?: string | null;
  cta?: string | null;
  status: IdeaStatus;
  source: IdeaSource;
  reason?: string | null;
  priority: IdeaPriority;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at: string;
}

export interface IdeaFilterOptions {
  priority?: IdeaPriority | 'all';
  pillar?: string | 'all';
  status?: IdeaStatus | 'all';
  searchQuery?: string;
  workspaceId?: string | null;
  brandId?: string | null;
}
