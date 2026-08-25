/**
 * Media Optimizer - Utilidad de optimización y compresión ligera en el cliente
 * AuraSocial
 */

export interface OptimizedMediaResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  savingsPercentage: number;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * Extrae resolución y duración real de un video en el navegador.
 */
export async function extractVideoMetadata(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: video.videoWidth || 1080,
        height: video.videoHeight || 1920,
        duration: video.duration ? parseFloat(video.duration.toFixed(2)) : 0,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 1080, height: 1920, duration: 0 });
    };
  });
}

/**
 * Optimiza y comprime una imagen en el cliente mediante Canvas API.
 * Reduce hasta un 85% de peso manteniendo nitidez ideal para redes sociales.
 */
export async function optimizeImage(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<OptimizedMediaResult> {
  const originalSize = file.size;

  // Si no es imagen estándar o es SVG/GIF animado, mantener intacto
  if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      savingsPercentage: 0,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Escalar si supera la dimensión máxima permitida para redes
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({
          file,
          originalSize,
          optimizedSize: originalSize,
          savingsPercentage: 0,
          width: img.width,
          height: img.height,
        });
        return;
      }

      // Dibujar con suavizado de alta calidad
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Usar WebP si el navegador lo soporta, o JPEG como fallback universal
      const targetMime = file.type === 'image/png' && quality >= 0.9 ? 'image/png' : 'image/webp';

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= originalSize) {
            // Si por alguna razón el blob resultante es más pesado, conservar original
            resolve({
              file,
              originalSize,
              optimizedSize: originalSize,
              savingsPercentage: 0,
              width,
              height,
            });
            return;
          }

          const cleanExt = targetMime === 'image/webp' ? 'webp' : 'jpg';
          const newName = file.name.replace(/\.[^/.]+$/, `.${cleanExt}`);
          const optimizedFile = new File([blob], newName, { type: targetMime, lastModified: Date.now() });

          const savings = Math.round(((originalSize - optimizedFile.size) / originalSize) * 100);

          resolve({
            file: optimizedFile,
            originalSize,
            optimizedSize: optimizedFile.size,
            savingsPercentage: Math.max(0, savings),
            width,
            height,
          });
        },
        targetMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file,
        originalSize,
        optimizedSize: originalSize,
        savingsPercentage: 0,
      });
    };
  });
}
