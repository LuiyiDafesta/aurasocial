/**
 * Media Slot Domain Models (Fase 9B.1 / 9B.2 / 9B.3)
 * 
 * Define la estructura para expresar los requerimientos multimedia por escena,
 * la trazabilidad del scoring/resolución y el control de anulación/selección manual.
 */

export type MediaSlotType =
  | 'image'
  | 'video'
  | 'audio'
  | 'logo'
  | 'background'
  | 'b_roll'
  | 'thumbnail';

export type MediaSlotStatus =
  | 'unresolved'
  | 'resolved'
  | 'needs_asset';

export type SourcePreference =
  | 'content'
  | 'campaign'
  | 'brand'
  | 'local';

export type ResolutionMethod =
  | 'automatic'
  | 'manual'
  | 'manual_upload';

export type MediaSlotFallbackType =
  | 'brand_background'
  | 'solid_background'
  | 'gradient'
  | 'text_card'
  | 'placeholder';

export interface MediaSlotPosition {
  x?: number;
  y?: number;
}

export interface MediaSlotCrop {
  mode?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export interface MediaSlotFallback {
  type: MediaSlotFallbackType;
  color?: string;
  gradient?: string;
  label?: string;
}

export interface CandidateAssetScore {
  asset_id: string;
  name: string;
  asset_type: string;
  asset_scope: SourcePreference;
  score: number;
  reason: string;
  storage_path?: string;
}

export interface MediaSlotResolution {
  resolved_at: string;
  source_scope: SourcePreference;
  score?: number;
  resolver_version?: string;
  candidate_count?: number;
  asset_name?: string;
  storage_path?: string;
  matched_criteria?: string[];
  method: ResolutionMethod;
  selected_by?: string | null;
  previous_asset_id?: string | null;
}

export interface MediaSlot {
  slot_id: string;
  scene_number: number;
  media_type: MediaSlotType;
  required: boolean;

  semantic_query?: string;
  duration_seconds?: number;

  fit_mode?: 'cover' | 'contain' | 'stretch';
  position?: MediaSlotPosition;
  crop?: MediaSlotCrop;

  source_preference: SourcePreference[];

  asset_id?: string | null;
  status: MediaSlotStatus;

  fallback?: MediaSlotFallback;

  resolution?: MediaSlotResolution | null;
  candidates?: CandidateAssetScore[];
}

export interface SceneWithMediaSlots {
  scene_number: number;
  duration_seconds: number;
  visual_direction: string;
  camera_direction?: string;
  on_screen_text: string;
  voiceover: string;
  transition?: string;
  media_slots: MediaSlot[];
}

export interface SceneReadiness {
  scene_number: number;
  isReady: boolean;
  totalRequired: number;
  resolvedRequired: number;
  missingRequired: number;
  status: 'ready' | 'missing_one' | 'missing_multiple';
}

export interface ContentMediaReadiness {
  isReady: boolean;
  totalScenes: number;
  readyScenes: number;
  totalRequiredSlots: number;
  resolvedRequiredSlots: number;
  missingRequiredSlots: number;
  status: 'ready_for_render' | 'requires_assets';
}
