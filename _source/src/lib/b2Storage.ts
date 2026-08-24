import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const B2_CONFIG = {
  endpoint: import.meta.env.VITE_B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com',
  region: import.meta.env.VITE_B2_REGION || 'us-west-004',
  bucketName: import.meta.env.VITE_B2_BUCKET_NAME || 'AuraSocial',
  keyId: import.meta.env.VITE_B2_KEY_ID || '00429a18a8ece8c000000000b',
  applicationKey: import.meta.env.VITE_B2_APPLICATION_KEY || 'K004Txy/pW8Z+i+3lNZZA1vobRMdTvc',
  apiGatewayUrl: import.meta.env.VITE_API_GATEWAY_URL || '',
  cdnBaseUrl: import.meta.env.VITE_B2_CDN_URL || 'https://cdnsocial.lsnethub.com',
};

export const b2Client = new S3Client({
  endpoint: B2_CONFIG.endpoint,
  region: B2_CONFIG.region,
  credentials: {
    accessKeyId: B2_CONFIG.keyId,
    secretAccessKey: B2_CONFIG.applicationKey,
  },
});

/**
 * Resuelve la URL optimizada de Cloudflare CDN (Bandwidth Alliance) para descarga/streaming
 * a $0 de costo de egress bandwidth desde Backblaze B2.
 */
export function getB2CdnUrl(storagePath: string): string {
  if (!storagePath) return '';
  const cleanPath = storagePath.replace(/^\/+/, '');
  const cdnHost = (B2_CONFIG.cdnBaseUrl || 'https://cdnsocial.lsnethub.com').replace(/\/+$/, '');
  return `${cdnHost}/${cleanPath}`;
}

/**
 * Sube un archivo mediante el Proxy PHP de AuraSocial (Server-to-Server B2).
 * Evita bloqueos de CORS y asegura compatibilidad con hosting compartido (Ferozo).
 */
export async function uploadToB2ViaProxy(
  fileData: Blob | File,
  storagePath: string,
  contentType: string
): Promise<{ storagePath: string; bucket: string; publicUrl?: string; fileId?: string }> {
  const cleanPath = storagePath.replace(/^\/+/, '');
  const formData = new FormData();
  const filename = (fileData as File).name || 'asset_file';
  formData.append('file', fileData, filename);
  formData.append('storagePath', cleanPath);
  formData.append('contentType', contentType);

  const endpoint = B2_CONFIG.apiGatewayUrl
    ? `${B2_CONFIG.apiGatewayUrl.replace(/\/$/, '')}/api/storage/upload`
    : '/api/storage/upload';

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message = errorJson.error || `Error del proxy de almacenamiento PHP (HTTP ${response.status})`;
    throw new Error(message);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Error al procesar la subida en el proxy de Backblaze B2');
  }

  return {
    storagePath: result.data?.storagePath || cleanPath,
    bucket: result.data?.bucket || B2_CONFIG.bucketName,
    publicUrl: getB2CdnUrl(cleanPath),
    fileId: result.data?.fileId,
  };
}

/**
 * Sube un archivo o blob directamente a Backblaze B2.
 * En navegador intenta primero el Proxy PHP para evitar CORS y fallbacks a S3 directo.
 */
export async function uploadToB2(
  fileData: Blob | Uint8Array | ArrayBuffer | string,
  storagePath: string,
  contentType: string
): Promise<{ storagePath: string; bucket: string; publicUrl?: string; fileId?: string }> {
  const cleanPath = storagePath.replace(/^\/+/, '');

  // 1. Si estamos en el navegador y el dato es Blob o File, utilizar el proxy PHP Server-to-Server
  if (typeof window !== 'undefined' && typeof Blob !== 'undefined' && fileData instanceof Blob) {
    try {
      return await uploadToB2ViaProxy(fileData, storagePath, contentType);
    } catch (proxyError: any) {
      console.warn('Proxy PHP falló o no disponible, intentando subida directa S3:', proxyError?.message);
    }
  }

  // 2. Fallback directo S3 Client (útil para Node.js, CLI scripts o entornos sin proxy)
  let body: any = fileData;
  if (typeof Blob !== 'undefined' && fileData instanceof Blob) {
    body = new Uint8Array(await fileData.arrayBuffer());
  }

  const command = new PutObjectCommand({
    Bucket: B2_CONFIG.bucketName,
    Key: cleanPath,
    Body: body,
    ContentType: contentType,
  });

  await b2Client.send(command);

  return {
    storagePath: cleanPath,
    bucket: B2_CONFIG.bucketName,
    publicUrl: getB2CdnUrl(cleanPath),
  };
}

/**
 * Genera una URL optimizada vía Cloudflare CDN para descarga y streaming sin costo de egress.
 */
export async function getB2SignedUrl(
  storagePath: string,
  _expiresInSeconds = 3600
): Promise<string> {
  if (!storagePath) return '';
  return getB2CdnUrl(storagePath);
}

/**
 * Elimina un objeto de Backblaze B2.
 */
export async function deleteFromB2(storagePath: string): Promise<void> {
  if (!storagePath) return;

  const cleanPath = storagePath.replace(/^\/+/, '');
  const command = new DeleteObjectCommand({
    Bucket: B2_CONFIG.bucketName,
    Key: cleanPath,
  });

  await b2Client.send(command);
}
