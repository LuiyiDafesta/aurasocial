export type AssetScope = 'brand' | 'campaign' | 'content';

export type AssetType = 
  | 'logo'
  | 'brand_book'
  | 'font'
  | 'palette'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'thumbnail'
  | 'b_roll'
  | 'raw_footage';

export interface ContentAsset {
  id: string;
  workspace_id: string;
  brand_id: string;
  campaign_id?: string | null;
  content_item_id?: string | null;
  asset_scope: AssetScope;
  asset_type: AssetType;
  name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  metadata?: Record<string, any> | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Propiedad auxiliar en frontend para URL firmada
  signed_url?: string;
  // Joined relation metadata
  campaigns?: { id: string; name: string } | null;
  content_items?: { id: string; title: string } | null;
}

export interface UploadAssetParams {
  file: File;
  workspaceId: string;
  brandId: string;
  scope: AssetScope;
  campaignId?: string | null;
  contentItemId?: string | null;
  assetType: AssetType;
  name?: string;
  metadata?: Record<string, any>;
  onProgress?: (percent: number) => void;
}

export type AssetSortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';

export interface AssetFilterParams {
  workspaceId?: string | null;
  brandId: string;
  campaignId?: string | null;
  contentItemId?: string | null;
  scope?: AssetScope | 'all';
  assetType?: AssetType | 'all';
  search?: string;
  sortBy?: AssetSortOption;
  page?: number;
  limit?: number;
}
