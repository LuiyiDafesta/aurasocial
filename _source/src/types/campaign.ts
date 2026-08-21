export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface CampaignKPI {
  name: string;
  target: string;
  current?: string;
  unit?: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  brand_id: string;
  name: string;
  slug: string;
  description?: string | null;
  strategic_objective: string;
  strategic_theme?: string | null;
  target_audience?: string | null;
  primary_channel?: string | null;
  budget_context?: string | null;
  kpis?: CampaignKPI[];
  status: CampaignStatus;
  start_date?: string | null;
  end_date?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Métricas calculadas para la UI
  total_ideas?: number;
  total_contents?: number;
  total_generations?: number;
}

export interface CreateCampaignPayload {
  brand_id: string;
  name: string;
  slug?: string;
  description?: string;
  strategic_objective: string;
  strategic_theme?: string;
  target_audience?: string;
  primary_channel?: string;
  budget_context?: string;
  kpis?: CampaignKPI[];
  status?: CampaignStatus;
  start_date?: string;
  end_date?: string;
}
