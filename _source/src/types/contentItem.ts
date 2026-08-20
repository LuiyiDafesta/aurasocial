import { SocialAccount } from './socialAccount';

export type ContentStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'rejected';

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | string;

export interface ContentBrandInfo {
  id: string;
  name: string;
}

export interface ContentItem {
  id: string;
  idea_id?: string | null;
  brand_id?: string | null;
  workspace_id?: string | null;
  social_account_id?: string | null;
  provider_connection_id?: string | null;

  platform: SocialPlatform;
  content_type: string;

  title: string;
  hook?: string | null;
  script?: string | null;
  caption?: string | null;
  hashtags?: string[] | string | null;
  cta?: string | null;
  creative_direction?: string | null;
  media_requirements?: string[] | string | Record<string, any> | null;

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
}

export interface ContentItemUpdateInput {
  title?: string;
  hook?: string | null;
  script?: string | null;
  caption?: string | null;
  hashtags?: string[] | string | null;
  cta?: string | null;
  creative_direction?: string | null;
}

export interface ContentFilterOptions {
  status?: ContentStatus | 'all';
  platform?: SocialPlatform | 'all';
  searchQuery?: string;
}
