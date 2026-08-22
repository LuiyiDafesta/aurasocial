import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const B2_CONFIG = {
  endpoint: import.meta.env.VITE_B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com',
  region: import.meta.env.VITE_B2_REGION || 'us-west-004',
  bucketName: import.meta.env.VITE_B2_BUCKET_NAME || 'AuraSocial',
  keyId: import.meta.env.VITE_B2_KEY_ID || '00429a18a8ece8c000000000b',
  applicationKey: import.meta.env.VITE_B2_APPLICATION_KEY || 'K004Txy/pW8Z+i+3lNZZA1vobRMdTvc',
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
 * Sube un archivo o blob directamente a Backblaze B2.
 */
export async function uploadToB2(
  fileData: Blob | Uint8Array | ArrayBuffer | string,
  storagePath: string,
  contentType: string
): Promise<{ storagePath: string; bucket: string }> {
  // Convertir a Uint8Array si es Blob/File en navegador
  let body: any = fileData;
  if (typeof Blob !== 'undefined' && fileData instanceof Blob) {
    body = new Uint8Array(await fileData.arrayBuffer());
  }

  const command = new PutObjectCommand({
    Bucket: B2_CONFIG.bucketName,
    Key: storagePath,
    Body: body,
    ContentType: contentType,
  });

  await b2Client.send(command);

  return {
    storagePath,
    bucket: B2_CONFIG.bucketName,
  };
}

/**
 * Genera una URL firmada de lectura para un objeto en Backblaze B2.
 */
export async function getB2SignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!storagePath) return '';

  const command = new GetObjectCommand({
    Bucket: B2_CONFIG.bucketName,
    Key: storagePath,
  });

  return getSignedUrl(b2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Elimina un objeto de Backblaze B2.
 */
export async function deleteFromB2(storagePath: string): Promise<void> {
  if (!storagePath) return;

  const command = new DeleteObjectCommand({
    Bucket: B2_CONFIG.bucketName,
    Key: storagePath,
  });

  await b2Client.send(command);
}
