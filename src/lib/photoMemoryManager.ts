/**
 * Photo Memory Manager
 * Handles efficient storage and cleanup of photo data to prevent memory crashes
 */

interface PhotoReference {
  dataUrl: string;
  compressed?: string;
  lastAccessed: number;
}

class PhotoMemoryManager {
  private photos: Map<string, PhotoReference> = new Map();
  private maxPhotos = 20; // Maximum photos to keep in memory
  private compressionQuality = 0.8; // Quality for compression

  /**
   * Store a photo with automatic memory management
   */
  storePhoto(key: string, dataUrl: string): void {
    // Clean up old photos if we're at capacity
    if (this.photos.size >= this.maxPhotos) {
      this.cleanupOldPhotos();
    }

    this.photos.set(key, {
      dataUrl,
      lastAccessed: Date.now()
    });
  }

  /**
   * Get a photo by key
   */
  getPhoto(key: string): string | undefined {
    const photo = this.photos.get(key);
    if (photo) {
      photo.lastAccessed = Date.now();
      return photo.dataUrl;
    }
    return undefined;
  }

  /**
   * Remove a specific photo from memory
   */
  removePhoto(key: string): void {
    this.photos.delete(key);
  }

  /**
   * Clean up old photos based on last access time
   */
  private cleanupOldPhotos(): void {
    const entries = Array.from(this.photos.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 25% of photos
    const removeCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      this.photos.delete(entries[i][0]);
    }
    
    console.log(`🧹 Cleaned up ${removeCount} old photos from memory`);
  }

  /**
   * Compress a data URL to reduce memory footprint
   */
  async compressDataUrl(dataUrl: string, maxWidth: number = 2048): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Resize if necessary
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Use PNG for lossless but optimize size
        const compressed = canvas.toDataURL('image/png');
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  /**
   * Clear all photos from memory
   */
  clearAll(): void {
    this.photos.clear();
    console.log('🧹 Cleared all photos from memory');
  }

  /**
   * Get memory usage statistics
   */
  getStats(): { count: number; estimatedMB: number } {
    let totalSize = 0;
    this.photos.forEach(photo => {
      totalSize += photo.dataUrl.length;
    });
    
    return {
      count: this.photos.size,
      estimatedMB: Math.round((totalSize * 0.75) / (1024 * 1024) * 10) / 10
    };
  }

  /**
   * Force garbage collection hint (if available)
   */
  forceCleanup(): void {
    this.cleanupOldPhotos();
    
    // Try to hint garbage collection
    if (global.gc) {
      global.gc();
    }
  }
}

// Singleton instance
export const photoMemoryManager = new PhotoMemoryManager();
