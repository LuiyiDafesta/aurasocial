export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface BusinessProfile {
  value_proposition?: string;
  products_services?: string[];
  differentiators?: string[];
  pricing_context?: string;
}

export interface AudienceProfile {
  pains?: string[];
  desires?: string[];
  objections?: string[];
  buying_triggers?: string[];
  demographics?: string;
}

export interface VoiceProfile {
  personality?: string;
  words_to_use?: string[];
  words_to_avoid?: string[];
  rules?: string[];
  claims_prohibited?: string[];
}

export interface CompetitorProfile {
  competitors?: string[];
  positioning?: string;
}

export interface AssetsProfile {
  available_assets?: string[];
  has_ugc?: boolean;
  has_video_crew?: boolean;
  has_physical_location?: boolean;
}

export interface AiSettings {
  custom_instructions?: string;
  research_preferences?: string;
}

export interface Brand {
  id: string;
  workspace_id: string;
  name: string;
  industry?: string | null;
  subindustry?: string | null;
  country?: string | null;
  website_url?: string | null;
  description?: string | null;
  audience?: string | null;
  tone?: string | null;
  objectives?: string[] | null;
  rules?: string[] | null;
  content_pillars?: string[] | null;
  business_profile?: BusinessProfile | null;
  audience_profile?: AudienceProfile | null;
  voice_profile?: VoiceProfile | null;
  competitor_profile?: CompetitorProfile | null;
  assets_profile?: AssetsProfile | null;
  ai_settings?: AiSettings | null;
  is_active?: boolean;
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
