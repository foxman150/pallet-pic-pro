/**
 * Image processing utilities for photo enhancement
 */

export interface ProcessingOptions {
  sharpen?: boolean;
  denoise?: boolean;
  enhance?: boolean;
}

/**
 * Apply sharpening filter using unsharp mask technique
 */
function applySharpen(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);
  
  // Sharpening kernel (unsharp mask)
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB channels
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const outIdx = (y * width + x) * 4 + c;
        output.data[outIdx] = Math.max(0, Math.min(255, sum));
      }
      // Copy alpha
      output.data[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }
  
  return output;
}

/**
 * Apply noise reduction using bilateral-like filter
 */
function applyDenoise(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);
  const radius = 2;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      
      // Average nearby pixels
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const nidx = (ny * width + nx) * 4;
            sumR += data[nidx];
            sumG += data[nidx + 1];
            sumB += data[nidx + 2];
            count++;
          }
        }
      }
      
      output.data[idx] = sumR / count;
      output.data[idx + 1] = sumG / count;
      output.data[idx + 2] = sumB / count;
      output.data[idx + 3] = data[idx + 3];
    }
  }
  
  return output;
}

/**
 * Apply enhancement (contrast, brightness, saturation)
 */
function applyEnhancement(imageData: ImageData): ImageData {
  const data = imageData.data;
  const output = new ImageData(imageData.width, imageData.height);
  
  const contrast = 1.15; // 15% increase
  const brightness = 1.05; // 5% increase
  const saturation = 1.1; // 10% increase
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Apply contrast and brightness
    r = ((r / 255 - 0.5) * contrast + 0.5) * 255 * brightness;
    g = ((g / 255 - 0.5) * contrast + 0.5) * 255 * brightness;
    b = ((b / 255 - 0.5) * contrast + 0.5) * 255 * brightness;
    
    // Apply saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * saturation;
    g = gray + (g - gray) * saturation;
    b = gray + (b - gray) * saturation;
    
    // Clamp values
    output.data[i] = Math.max(0, Math.min(255, r));
    output.data[i + 1] = Math.max(0, Math.min(255, g));
    output.data[i + 2] = Math.max(0, Math.min(255, b));
    output.data[i + 3] = data[i + 3];
  }
  
  return output;
}

/**
 * Process image with selected filters
 */
export async function processImage(
  imageDataUrl: string,
  options: ProcessingOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        console.log('📸 Processing image:', {
          width: canvas.width,
          height: canvas.height,
          filters: options
        });
        
        // Apply filters in order
        if (options.denoise) {
          console.log('🔇 Applying noise reduction...');
          imageData = applyDenoise(imageData);
        }
        
        if (options.sharpen) {
          console.log('✨ Applying sharpening...');
          imageData = applySharpen(imageData);
        }
        
        if (options.enhance) {
          console.log('🎨 Applying enhancement...');
          imageData = applyEnhancement(imageData);
        }
        
        // Put processed image back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to PNG for lossless quality
        const processedDataUrl = canvas.toDataURL('image/png');
        console.log('✅ Image processing complete');
        resolve(processedDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}
