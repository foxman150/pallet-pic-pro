/**
 * AI Super-Resolution using UpscalerJS
 * Increases image resolution by 2-4x for better barcode/text readability
 */

// Dynamic import Upscaler only when needed to avoid heavy initial payload
// import Upscaler from 'upscaler';

let upscalerInstance: any | null = null;

// Maximum dimensions to prevent memory issues
const MAX_DIMENSION = 2048; // Reduced from unlimited to prevent OOM

async function getUpscaler(): Promise<any> {
  if (!upscalerInstance) {
    console.log('🤖 Initializing AI upscaler...');
    const { default: Upscaler } = await import('upscaler');
    upscalerInstance = new Upscaler({
      model: {
        path: 'https://cdn.jsdelivr.net/npm/@upscalerjs/default-model@latest/models/default/x2.json',
        scale: 2, // 2x upscaling
      },
    });
  }
  return upscalerInstance;
}

/**
 * Upscale an image using AI super-resolution
 * @param imageDataUrl - The image data URL to upscale
 * @param scale - Upscale factor (2 or 4)
 * @param onProgress - Optional progress callback (0-100)
 * @returns Upscaled image data URL
 */
export async function upscaleImage(
  imageDataUrl: string,
  scale: 2 | 4 = 2,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log(`🚀 Starting AI upscaling (${scale}x)...`);
  const startTime = performance.now();

  try {
    // Load image
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageDataUrl;
    });

    console.log(`📐 Original dimensions: ${img.width}x${img.height}`);
    
    // Resize if image is too large to prevent OOM
    let processedDataUrl = imageDataUrl;
    if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
      console.log('⚠️ Image too large, resizing before AI upscaling...');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      
      let newWidth = img.width;
      let newHeight = img.height;
      if (newWidth > newHeight) {
        newHeight = Math.round((newHeight * MAX_DIMENSION) / newWidth);
        newWidth = MAX_DIMENSION;
      } else {
        newWidth = Math.round((newWidth * MAX_DIMENSION) / newHeight);
        newHeight = MAX_DIMENSION;
      }
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      processedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      console.log(`📐 Resized to: ${newWidth}x${newHeight}`);
    }
    
    onProgress?.(10);

    const upscaler = await getUpscaler();
    onProgress?.(20);

    // If 4x is requested, upscale twice (2x then 2x)
    let result: string | HTMLCanvasElement = imageDataUrl;
    const iterations = scale === 4 ? 2 : 1;

    for (let i = 0; i < iterations; i++) {
      console.log(`🔄 Upscaling iteration ${i + 1}/${iterations}...`);
      const progressStart = 20 + (i * 40);
      const progressEnd = progressStart + 40;
      
      result = await upscaler.upscale(i === 0 ? processedDataUrl : result, {
        output: 'base64',
        patchSize: 32, // Smaller patches to reduce memory usage
        padding: 2,
        progress: (progress, slice) => {
          // Dispose of tensor slices to prevent memory leak
          if (slice && typeof slice.dispose === 'function') {
            slice.dispose();
          }
          const currentProgress = progressStart + (progress * (progressEnd - progressStart));
          onProgress?.(Math.round(currentProgress));
        },
      });
    }

    onProgress?.(100);

    // Get final dimensions
    const finalImg = new Image();
    await new Promise<void>((resolve) => {
      finalImg.onload = () => resolve();
      finalImg.src = result as string;
    });

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ AI upscaling complete in ${duration}s`);
    console.log(`📐 Final dimensions: ${finalImg.width}x${finalImg.height} (${scale}x)`);

    return result as string;
  } catch (error) {
    console.error('❌ AI upscaling failed:', error);
    throw error;
  }
}

/**
 * Check if AI upscaling is supported in the current browser
 */
export function isUpscalingSupported(): boolean {
  try {
    // Check for required APIs
    return !!(
      typeof OffscreenCanvas !== 'undefined' ||
      typeof HTMLCanvasElement !== 'undefined'
    );
  } catch {
    return false;
  }
}
