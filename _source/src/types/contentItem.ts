import { SocialAccount } from './socialAccount';

export type ContentStatus = 'queued' | 'generating' | 'draft' | 'approved' | 'scheduled' | 'published' | 'rejected';

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | string;

export interface ContentBrandInfo {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface ContentIdeaInfo {
  id: string;
  title: string;
  pillar?: string | null;
}

export interface Scene {
  scene_number: number;
  duration_seconds: number;
  visual_direction: string;
  camera_direction?: string;
  on_screen_text: string;
  voiceover: string;
  transition?: string;
}

export interface InheritedIdeaContext {
  title: string;
  concept: string;
  pillar: string;
  hook?: string | null;
  cta?: string | null;
  original_format?: string | null;
  original_goal?: string | null;
}

export interface BrandContextSnapshot {
  brand_id: string;
  brand_name: string;
  industry?: string | null;
  target_audience?: string | null;
  voice_tone?: string | null;
  key_rules?: string[];
}

export interface ProductionBrief {
  target_platform: string;
  target_format: string;
  target_goal?: string;
  objective_mode?: 'inherited' | 'custom';
  duration_preference?: string;
  custom_instructions?: string;
  inherited_idea_context?: InheritedIdeaContext;
  brand_context_snapshot?: BrandContextSnapshot;
  [key: string]: any;
}

export interface ContentItem {
  id: string;
  request_id?: string | null;
  idea_id?: string | null;
  brand_id?: string | null;
  workspace_id?: string | null;
  generation_run_id?: string | null;
  campaign_id?: string | null;
  social_account_id?: string | null;
  provider_connection_id?: string | null;

  platform: SocialPlatform;
  content_type: string;

  title: string;
  hook?: string | null;
  script?: string | null;
  caption?: string | null;
  hashtags?: string[] | null;
  cta?: string | null;
  creative_direction?: string | null;
  media_requirements?: string[] | null;
  scenes?: Scene[] | null;
  production_brief?: ProductionBrief | null;

  status: ContentStatus;

  scheduled_at?: string | null;
  published_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;

  external_post_id?: string | null;
  external_post_url?: string | null;

  platform_metadata?: Record<string, any> | null;
  provider_metadata?: Record<string, any> | null;

  created_at: string;
  updated_at: string;

  // Joined relations from Supabase PostgREST
  social_accounts?: SocialAccount | null;
  brands?: ContentBrandInfo | null;
  content_ideas?: ContentIdeaInfo | null;
}

export interface ContentItemUpdateInput {
  title?: string;
  hook?: string | null;
  script?: string | null;
  caption?: string | null;
  hashtags?: string[] | null;
  cta?: string | null;
  creative_direction?: string | null;
  media_requirements?: string[] | null;
  scenes?: Scene[] | null;
  change_summary?: string | null;
}

export interface ContentFilterOptions {
  status?: ContentStatus | 'all';
  platform?: SocialPlatform | 'all';
  searchQuery?: string;
  campaignId?: string | null;
}
