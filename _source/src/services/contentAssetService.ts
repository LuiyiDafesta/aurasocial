import { supabase } from '../lib/supabase';
import { 
  ContentAsset, 
  AssetScope, 
  AssetType, 
  UploadAssetParams, 
  AssetFilterParams 
} from '../types/contentAsset';
import { 
  uploadToB2, 
  getB2SignedUrl, 
  deleteFromB2, 
  B2_CONFIG 
} from '../lib/b2Storage';

import { extractVideoMetadata, optimizeImage } from '../lib/mediaOptimizer';

export const STORAGE_BUCKET = B2_CONFIG.bucketName || 'AuraSocial';
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'application/pdf',
];

/**
 * Sanitiza nombres de archivo eliminando acentos, espacios, path traversal y caracteres inseguros para S3.
 */
export function sanitizeFilename(filename: string): string {
  const nameWithoutPath = filename.split(/[\/\\]/).pop() || 'asset';
  const clean = nameWithoutPath
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover tildes y diacríticos
    .replace(/\s+/g, '_')            // Reemplazar espacios por guiones bajos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Solo alfanuméricos, puntos, guiones
    .replace(/_+/g, '_')             // Evitar guiones bajos consecutivos
    .substring(0, 90);
  return clean || 'asset_file';
}

/**
 * Construye el storage path canónico según el scope del asset, garantizando compatibilidad S3 y B2.
 */
export function buildStoragePath(
  workspaceId: string,
  brandId: string,
  scope: AssetScope,
  assetType: AssetType,
  filename: string,
  campaignId?: string | null,
  contentItemId?: string | null
): string {
  const cleanName = `${Date.now()}_${sanitizeFilename(filename)}`;
  let basePath = '';

  if (scope === 'brand') {
    basePath = `${workspaceId}/${brandId}/brand/${assetType}/${cleanName}`;
  } else if (scope === 'campaign') {
    if (!campaignId) throw new Error('campaignId es requerido para scope campaign');
    basePath = `${workspaceId}/${brandId}/campaigns/${campaignId}/${cleanName}`;
  } else if (scope === 'content') {
    if (!contentItemId) throw new Error('contentItemId es requerido para scope content');
    basePath = `${workspaceId}/${brandId}/contents/${contentItemId}/${cleanName}`;
  } else {
    throw new Error(`Scope desconocido: ${scope}`);
  }

  return basePath.replace(/\s+/g, '_');
}

/**
 * Genera una URL firmada temporal (1 hora TTL) para un archivo en Backblaze B2.
 */
export async function getSignedAssetUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
  if (!storagePath) return '';

  try {
    const signedUrl = await getB2SignedUrl(storagePath, expiresInSeconds);
    return signedUrl;
  } catch (error) {
    console.error(`Error al generar Signed URL de Backblaze B2 para ${storagePath}:`, error);
    return '';
  }
}

/**
 * Enriquece una lista de assets con URLs firmadas en paralelo.
 */
export async function enrichAssetsWithSignedUrls(assets: ContentAsset[]): Promise<ContentAsset[]> {
  if (!assets || assets.length === 0) return [];

  const promises = assets.map(async (asset) => {
    try {
      const signedUrl = await getSignedAssetUrl(asset.storage_path);
      return { ...asset, signed_url: signedUrl };
    } catch {
      return asset;
    }
  });

  return Promise.all(promises);
}

/**
 * Sube un archivo a Backblaze B2 S3 Storage y registra el asset en public.content_assets.
 */
export async function uploadAsset({
  file,
  workspaceId,
  brandId,
  scope,
  campaignId,
  contentItemId,
  assetType,
  name,
  metadata = {},
}: UploadAssetParams): Promise<ContentAsset> {
  if (!file) throw new Error('Archivo no proporcionado');
  if (!workspaceId) throw new Error('workspaceId es requerido');
  if (!brandId) throw new Error('brandId es requerido');

  // 1. Validar tamaño
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`El archivo supera el límite de 500 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  }

  // 2. Validar MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Tipo de archivo no permitido (${file.type || 'desconocido'}). Formatos permitidos: PNG, JPG, WebP, GIF, MP4, MOV, MP3, WAV, PDF.`);
  }

  // 3. Validar consistencia de scope
  if (scope === 'brand' && (campaignId || contentItemId)) {
    throw new Error('Un asset con scope brand no debe tener campaign_id ni content_item_id');
  }
  if (scope === 'campaign' && (!campaignId || contentItemId)) {
    throw new Error('Un asset con scope campaign debe tener campaign_id y no content_item_id');
  }
  if (scope === 'content' && !contentItemId) {
    throw new Error('Un asset con scope content debe tener content_item_id');
  }

  // 3b. Extraer metadatos reales de video / imagen si no vienen proporcionados
  let finalFile = file;
  const enrichedMetadata: any = {
    ...metadata,
    original_filename: file.name,
    last_modified: file.lastModified,
  };

  if (file.type.startsWith('video/')) {
    try {
      const vidMeta = await extractVideoMetadata(file);
      enrichedMetadata.duration_seconds = vidMeta.duration;
      enrichedMetadata.width = vidMeta.width;
      enrichedMetadata.height = vidMeta.height;
    } catch (e) {
      console.warn('No se pudo extraer metadata del video:', e);
    }
  } else if (file.type.startsWith('image/')) {
    try {
      const imgRes = await optimizeImage(file);
      finalFile = imgRes.file;
      if (imgRes.width) enrichedMetadata.width = imgRes.width;
      if (imgRes.height) enrichedMetadata.height = imgRes.height;
      if (imgRes.savingsPercentage > 0) {
        enrichedMetadata.compression_savings_pct = imgRes.savingsPercentage;
      }
    } catch (e) {
      console.warn('No se pudo optimizar imagen:', e);
    }
  }

  // 4. Construir path seguro y canónico
  const storagePath = buildStoragePath(
    workspaceId,
    brandId,
    scope,
    assetType,
    finalFile.name,
    campaignId,
    contentItemId
  );

  // 5. Subir a Backblaze B2
  try {
    await uploadToB2(finalFile, storagePath, finalFile.type);
  } catch (storageError: any) {
    console.error('Error al subir archivo a Backblaze B2:', storageError);
    throw new Error(`Error de Almacenamiento Backblaze B2: ${storageError?.message || 'Fallo de subida'}`);
  }

  // 6. Obtener usuario autenticado
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id || null;

  // 7. Insertar registro en PostgreSQL
  const assetName = name?.trim() || file.name;
  const insertPayload = {
    workspace_id: workspaceId,
    brand_id: brandId,
    campaign_id: scope === 'campaign' ? campaignId : null,
    content_item_id: scope === 'content' ? contentItemId : null,
    asset_scope: scope,
    asset_type: assetType,
    name: assetName,
    storage_bucket: STORAGE_BUCKET,
    storage_path: storagePath,
    mime_type: finalFile.type,
    file_size_bytes: finalFile.size,
    metadata: enrichedMetadata,
    created_by: userId,
  };

  const { data: createdAsset, error: dbError } = await supabase
    .from('content_assets')
    .insert(insertPayload)
    .select('*')
    .single();

  if (dbError || !createdAsset) {
    console.error('Error al registrar asset en base de datos. Limpiando Backblaze B2...', dbError);
    // Cleanup archivo huérfano en Backblaze B2
    try {
      await deleteFromB2(storagePath);
    } catch (cleanupError) {
      console.warn('Error al limpiar archivo huérfano tras error DB:', cleanupError);
    }
    throw new Error(`Error al registrar asset en base de datos: ${dbError?.message || 'Error desconocido'}`);
  }

  // 8. Generar signed URL inicial
  const signedUrl = await getSignedAssetUrl(storagePath);

  return {
    ...createdAsset,
    signed_url: signedUrl,
  } as ContentAsset;
}

/**
 * Consulta y filtra assets de manera versátil (con búsqueda, paginación y ordenamiento).
 */
export async function searchAssets({
  brandId,
  campaignId,
  contentItemId,
  scope,
  assetType,
  search,
  sortBy = 'newest',
  page = 1,
  limit = 24,
}: AssetFilterParams): Promise<{ data: ContentAsset[]; total: number }> {
  if (!brandId) return { data: [], total: 0 };

  let query = supabase
    .from('content_assets')
    .select('*', { count: 'exact' })
    .eq('brand_id', brandId);

  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  if (contentItemId) {
    query = query.eq('content_item_id', contentItemId);
  }

  if (scope && scope !== 'all') {
    query = query.eq('asset_scope', scope);
  }

  if (assetType && assetType !== 'all') {
    query = query.eq('asset_type', assetType);
  }

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`name.ilike.%${term}%,storage_path.ilike.%${term}%`);
  }

  // Ordenamiento
  switch (sortBy) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'name_asc':
      query = query.order('name', { ascending: true });
      break;
    case 'name_desc':
      query = query.order('name', { ascending: false });
      break;
    case 'size_desc':
      query = query.order('file_size_bytes', { ascending: false });
      break;
    case 'size_asc':
      query = query.order('file_size_bytes', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error al consultar assets:', error);
    throw new Error(`Error al cargar assets: ${error.message}`);
  }

  const enriched = await enrichAssetsWithSignedUrls((data || []) as ContentAsset[]);

  return {
    data: enriched,
    total: count || 0,
  };
}

/**
 * Consulta los assets institucionales de la marca (asset_scope = 'brand').
 */
export async function getBrandAssets(
  brandId: string,
  options: Partial<AssetFilterParams> = {}
): Promise<{ data: ContentAsset[]; total: number }> {
  return searchAssets({
    ...options,
    brandId,
    scope: 'brand',
  });
}

/**
 * Consulta los assets de una campaña (campaign_id = campaignId).
 */
export async function getCampaignAssets(
  campaignId: string,
  brandId: string,
  options: Partial<AssetFilterParams> = {}
): Promise<{ data: ContentAsset[]; total: number }> {
  return searchAssets({
    ...options,
    brandId,
    campaignId,
    scope: 'campaign',
  });
}

/**
 * Consulta los assets vinculados a un contenido (content_item_id = contentItemId).
 */
export async function getContentAssets(
  contentItemId: string,
  brandId: string,
  options: Partial<AssetFilterParams> = {}
): Promise<{ data: ContentAsset[]; total: number }> {
  return searchAssets({
    ...options,
    brandId,
    contentItemId,
    scope: 'content',
  });
}

/**
 * Obtiene el detalle de un asset por su ID.
 */
export async function getAssetById(assetId: string): Promise<ContentAsset | null> {
  if (!assetId) return null;

  const { data, error } = await supabase
    .from('content_assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (error || !data) {
    console.error(`Error al obtener asset ${assetId}:`, error);
    return null;
  }

  const signedUrl = await getSignedAssetUrl(data.storage_path);

  return {
    ...data,
    signed_url: signedUrl,
  } as ContentAsset;
}

/**
 * Elimina un asset de Backblaze B2 y de la base de datos de manera coordinada.
 */
export async function deleteAsset(assetId: string): Promise<void> {
  if (!assetId) throw new Error('assetId es requerido');

  try {
    const res = await fetch('/api/assets/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: assetId }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Error al eliminar asset');
    }
  } catch (err: any) {
    // 1. Obtener registro para saber el storage_path
    const { data: asset, error: fetchError } = await supabase
      .from('content_assets')
      .select('id, storage_bucket, storage_path')
      .eq('id', assetId)
      .single();

    if (fetchError || !asset) {
      throw new Error('No se encontró el asset a eliminar');
    }

    // 2. Eliminar archivo físico de Backblaze B2 Storage
    try {
      if (asset.storage_path) {
        await deleteFromB2(asset.storage_path);
      }
    } catch (storageError) {
      console.warn(`Aviso: Error al eliminar archivo de Backblaze B2 (${asset.storage_path}):`, storageError);
    }

    // 3. Desvincular de tablas que puedan tener Foreign Keys
    await Promise.allSettled([
      supabase.from('render_jobs').update({ output_asset_id: null }).eq('output_asset_id', assetId),
      supabase.from('platform_adaptations').update({ asset_id: null }).eq('asset_id', assetId),
    ]);

    // 4. Eliminar fila de content_assets
    const { error: dbError } = await supabase
      .from('content_assets')
      .delete()
      .eq('id', assetId);

    if (dbError) {
      console.error('Error al eliminar fila de content_assets:', dbError);
      throw new Error(`Error al eliminar registro de asset: ${dbError.message}`);
    }
  }
}

/**
 * Elimina múltiples assets en lote (Bulk Delete) en cascada:
 * 1. Elimina todos los archivos físicos en Backblaze B2 Storage.
 * 2. Desvincula dependencias y elimina todas las filas de la tabla content_assets en Supabase PostgreSQL.
 */
export async function deleteAssetsBulk(
  assetIds: string[]
): Promise<{ deletedCount: number; errors: string[] }> {
  if (!assetIds || assetIds.length === 0) {
    return { deletedCount: 0, errors: [] };
  }

  try {
    const res = await fetch('/api/assets/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: assetIds }),
    });
    const json = await res.json();
    if (json.success) {
      return { deletedCount: json.deletedCount || assetIds.length, errors: [] };
    }
    throw new Error(json.error || 'Error al eliminar assets');
  } catch (err: any) {
    // 1. Obtener registros para conocer los storage_paths
    const { data: assets, error: fetchError } = await supabase
      .from('content_assets')
      .select('id, storage_bucket, storage_path')
      .in('id', assetIds);

    if (fetchError || !assets) {
      console.error('Error al consultar assets para eliminación masiva:', fetchError);
      throw new Error(`Error al consultar assets: ${fetchError?.message || 'desconocido'}`);
    }

    const errors: string[] = [];

    // 2. Eliminar en paralelo los archivos físicos en Backblaze B2
    await Promise.allSettled(
      assets.map(async (asset) => {
        try {
          if (asset.storage_path) {
            await deleteFromB2(asset.storage_path);
          }
        } catch (b2Err: any) {
          console.warn(`Aviso: No se pudo eliminar de B2 (${asset.storage_path}):`, b2Err?.message);
          errors.push(`B2 (${asset.storage_path}): ${b2Err?.message}`);
        }
      })
    );

    // 3. Desvincular de tablas dependientes
    await Promise.allSettled([
      supabase.from('render_jobs').update({ output_asset_id: null }).in('output_asset_id', assetIds),
      supabase.from('platform_adaptations').update({ asset_id: null }).in('asset_id', assetIds),
    ]);

    // 4. Eliminar todas las filas en PostgreSQL
    const { error: dbError } = await supabase
      .from('content_assets')
      .delete()
      .in('id', assetIds);

    if (dbError) {
      console.error('Error al eliminar registros masivos en content_assets:', dbError);
      throw new Error(`Error al eliminar assets de base de datos: ${dbError.message}`);
    }

    return {
      deletedCount: assetIds.length,
      errors,
    };
  }
}

/**
 * Asocia lógicamente un asset existente a una pieza de contenido sin duplicar el archivo físico en Backblaze B2.
 */
export async function linkExistingAssetToContent(
  sourceAsset: ContentAsset,
  contentItemId: string
): Promise<ContentAsset> {
  if (!sourceAsset) throw new Error('Asset de origen es requerido');
  if (!contentItemId) throw new Error('contentItemId es requerido');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id || null;

  const insertPayload = {
    workspace_id: sourceAsset.workspace_id,
    brand_id: sourceAsset.brand_id,
    campaign_id: null,
    content_item_id: contentItemId,
    asset_scope: 'content' as AssetScope,
    asset_type: sourceAsset.asset_type,
    name: sourceAsset.name,
    storage_bucket: sourceAsset.storage_bucket,
    storage_path: sourceAsset.storage_path,
    mime_type: sourceAsset.mime_type,
    file_size_bytes: sourceAsset.file_size_bytes,
    width: sourceAsset.width || null,
    height: sourceAsset.height || null,
    duration_seconds: sourceAsset.duration_seconds || null,
    metadata: {
      ...sourceAsset.metadata,
      linked_from_asset_id: sourceAsset.id,
      linked_at: new Date().toISOString(),
    },
    created_by: userId,
  };

  const { data: created, error } = await supabase
    .from('content_assets')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.error('Error al vincular asset existente al contenido:', error);
    throw new Error(`Error al vincular asset: ${error.message}`);
  }

  const signedUrl = await getSignedAssetUrl(created.storage_path);
  return { ...created, signed_url: signedUrl } as ContentAsset;
}
