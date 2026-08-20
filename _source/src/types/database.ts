export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Brand {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  audience?: string | null;
  tone?: string | null;
  objectives?: string[] | Record<string, any> | null;
  rules?: string[] | Record<string, any> | null;
  content_pillars?: string[] | Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface StatusCounts {
  all: number;
  draft: number;
  approved: number;
  scheduled: number;
  published: number;
  rejected: number;
}
