import { Scene } from './contentItem';

export type VersionType = 
  | 'historical_snapshot'
  | 'ai_draft'
  | 'human_edit'
  | 'platform_adaptation'
  | 'revision'
  | 'restored_from_version'
  | 'final';

export interface ContentVersion {
  id: string;
  content_item_id: string;
  workspace_id: string;
  brand_id: string;
  version_number: number;
  version_type: VersionType;
  title: string;
  hook?: string | null;
  script?: string | null;
  caption?: string | null;
  hashtags?: string[];
  cta?: string | null;
  creative_direction?: string | null;
  media_requirements?: string[];
  scenes?: Scene[];
  production_brief_snapshot?: Record<string, any>;
  platform?: string | null;
  content_type?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  external_post_url?: string | null;
  change_summary?: string | null;
  created_by?: string | null;
  created_at: string;
}
