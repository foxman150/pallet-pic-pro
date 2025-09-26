
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CameraIcon, CheckIcon, RefreshCw, Settings } from 'lucide-react';
import { usePallet } from '@/contexts/PalletContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile, useDeviceOrientation } from '@/hooks/use-mobile';

interface CameraViewProps {
  onPhotoTaken: (uri: string) => void;
}

type PhotoFormat = 'PNG' | 'BMP';

interface PhotoFormatInfo {
  label: string;
  description: string;
  extension: string;
}

const CameraView: React.FC<CameraViewProps> = ({ onPhotoTaken }) => {
  const [photoTaken, setPhotoTaken] = useState<boolean>(false);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [photoResolution, setPhotoResolution] = useState<string>('');
  const [captureMethod, setCaptureMethod] = useState<string>('');
  const [photoFormat, setPhotoFormat] = useState<string>('PNG');
  const [photoSize, setPhotoSize] = useState<number>(0);
  const [selectedFormat, setSelectedFormat] = useState<PhotoFormat>('PNG');
  const [showFormatSelector, setShowFormatSelector] = useState<boolean>(false);

  const formatOptions: Record<PhotoFormat, PhotoFormatInfo> = {
    PNG: {
      label: 'PNG (Lossless Compressed)',
      description: 'Best balance of quality and file size',
      extension: 'png'
    },
    BMP: {
      label: 'BMP (Uncompressed)',
      description: 'Maximum quality, largest file size',
      extension: 'bmp'
    }
  };
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { currentPallet, totalPallets, currentSide } = usePallet();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const orientation = useDeviceOrientation();

  const startCamera = async () => {
    try {
      setIsLoading(true);
      console.log('🎥 Starting camera with maximum quality settings...');
      
      // Request maximum native camera resolution and quality
      const constraints = {
        video: {
          facingMode: 'environment',
          // Request highest possible resolution and quality
          width: { ideal: 4096, min: 1280 },
          height: { ideal: 3072, min: 720 },
          frameRate: { ideal: 30, min: 15 },
          // Advanced video quality settings
          aspectRatio: { ideal: 4/3 },
          resizeMode: 'none', // Prevent resizing
          // Additional quality hints
          advanced: [{
            width: { min: 1920, ideal: 4096 },
            height: { min: 1080, ideal: 3072 },
            frameRate: { min: 15, ideal: 30 }
          }]
        }
      };

      console.log('📱 Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log actual stream settings
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      console.log('✅ Camera started with settings:', {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        facingMode: settings.facingMode,
        aspectRatio: settings.aspectRatio
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to load metadata before hiding loading
        videoRef.current.onloadedmetadata = () => {
          console.log('📺 Video metadata loaded:', {
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight,
            clientWidth: videoRef.current?.clientWidth,
            clientHeight: videoRef.current?.clientHeight
          });
          setIsLoading(false);
        };
      }
    } catch (err) {
      setIsLoading(false);
      console.error("❌ Error accessing camera:", err);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions and try again, or use a device with camera support.",
        variant: "destructive",
        duration: 6000
      });
    }
  };

  const hideKeyboard = () => {
    // Hide keyboard on mobile devices
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    // Additional method for iOS
    if (window.scrollTo) {
      window.scrollTo(0, 0);
    }
  };

  // Helper to convert Blob to Data URL for consistent handling
  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // Convert canvas to BMP (uncompressed) format
  const canvasToBMP = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    
    // BMP header (54 bytes) + pixel data
    const rowSize = Math.floor((24 * width + 31) / 32) * 4;
    const pixelArraySize = rowSize * height;
    const fileSize = 54 + pixelArraySize;
    
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const data = imageData.data;
    
    // BMP file header (14 bytes)
    view.setUint16(0, 0x4D42, false); // 'BM'
    view.setUint32(2, fileSize, true); // File size
    view.setUint32(6, 0, true); // Reserved
    view.setUint32(10, 54, true); // Pixel data offset
    
    // DIB header (40 bytes)
    view.setUint32(14, 40, true); // DIB header size
    view.setInt32(18, width, true); // Width
    view.setInt32(22, -height, true); // Height (negative for top-down)
    view.setUint16(26, 1, true); // Planes
    view.setUint16(28, 24, true); // Bits per pixel
    view.setUint32(30, 0, true); // Compression
    view.setUint32(34, pixelArraySize, true); // Image size
    view.setInt32(38, 2835, true); // X pixels per meter
    view.setInt32(42, 2835, true); // Y pixels per meter
    view.setUint32(46, 0, true); // Colors used
    view.setUint32(50, 0, true); // Important colors
    
    // Pixel data (BGR format, bottom-up)
    let offset = 54;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        view.setUint8(offset++, data[i + 2]); // Blue
        view.setUint8(offset++, data[i + 1]); // Green  
        view.setUint8(offset++, data[i]); // Red
      }
      // Pad to 4-byte boundary
      while (offset % 4 !== 0) {
        view.setUint8(offset++, 0);
      }
    }
    
    // Convert to base64 data URL
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:image/bmp;base64,' + btoa(binary);
  };

  const takePhoto = async () => {
    // Hide keyboard before taking photo
    hideKeyboard();
    
    try {
      console.log('📸 Starting photo capture process...');
      
      // Use MediaStream Image Capture API for highest quality photos
      const track = streamRef.current?.getVideoTracks?.[0];
      
      if (track && 'ImageCapture' in window) {
        try {
          console.log('🎯 Using ImageCapture API for maximum quality');
          const imageCapture = new (window as any).ImageCapture(track);
          
          // Get the photo capabilities and log them
          const capabilities = await imageCapture.getPhotoCapabilities();
          console.log('📊 Camera capabilities:', {
            imageWidth: capabilities.imageWidth,
            imageHeight: capabilities.imageHeight,
            redEyeReduction: capabilities.redEyeReduction,
            flashMode: capabilities.flashMode,
            focusMode: capabilities.focusMode,
            iso: capabilities.iso,
            whiteBalanceMode: capabilities.whiteBalanceMode,
            exposureMode: capabilities.exposureMode,
            colorTemperature: capabilities.colorTemperature,
            brightness: capabilities.brightness,
            contrast: capabilities.contrast,
            saturation: capabilities.saturation,
            sharpness: capabilities.sharpness
          });
          
          // Optimize photo settings for maximum quality
          const settings: any = {};
          
          // Use maximum resolution if available
          if (capabilities.imageWidth?.max && capabilities.imageHeight?.max) {
            settings.imageWidth = capabilities.imageWidth.max;
            settings.imageHeight = capabilities.imageHeight.max;
            console.log(`🔧 Setting max resolution: ${settings.imageWidth}x${settings.imageHeight}`);
          }
          
          // Optimize photo settings for quality
          if (capabilities.focusMode && capabilities.focusMode.includes && capabilities.focusMode.includes('continuous')) {
            settings.focusMode = 'continuous';
            console.log('🎯 Setting focus mode: continuous');
          }
          
          if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes && capabilities.whiteBalanceMode.includes('auto')) {
            settings.whiteBalanceMode = 'auto';
            console.log('⚪ Setting white balance: auto');
          }
          
          if (capabilities.exposureMode && capabilities.exposureMode.includes && capabilities.exposureMode.includes('continuous')) {
            settings.exposureMode = 'continuous';
            console.log('🌅 Setting exposure mode: continuous');
          }
          
          // Use lowest ISO if available for best quality
          if (capabilities.iso?.min) {
            settings.iso = capabilities.iso.min;
            console.log(`📷 Setting ISO: ${settings.iso}`);
          }
          
          // Maximize image quality settings
          if (capabilities.contrast?.max) {
            settings.contrast = capabilities.contrast.max;
          }
          if (capabilities.saturation?.max) {
            settings.saturation = capabilities.saturation.max;
          }
          if (capabilities.sharpness?.max) {
            settings.sharpness = capabilities.sharpness.max;
          }
          
          console.log('⚙️ Final capture settings:', settings);
          
          // Take photo with optimized settings
          const blob: Blob = await imageCapture.takePhoto(settings);
          console.log(`✅ Photo captured! Size: ${(blob.size / 1024 / 1024).toFixed(2)}MB, Type: ${blob.type}`);
          
          // Convert to selected lossless format
          let finalDataUrl: string;
          let format: string;
          let size: number;
          
          // Always convert to canvas for format control
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);
              
              try {
                if (selectedFormat === 'BMP') {
                  finalDataUrl = canvasToBMP(canvas);
                  format = 'BMP (Uncompressed)';
                  size = Math.round(finalDataUrl.length * 0.75);
                  console.log(`🎨 Converted to BMP: ${(size / 1024 / 1024).toFixed(2)}MB (uncompressed)`);
                } else {
                  finalDataUrl = canvas.toDataURL('image/png');
                  format = 'PNG (Lossless)';
                  size = Math.round(finalDataUrl.length * 0.75);
                  console.log(`🎨 Converted to PNG: ${(size / 1024 / 1024).toFixed(2)}MB (lossless)`);
                }
                
                // Warn about large file sizes
                if (size > 20 * 1024 * 1024) {
                  toast({
                    title: "Large File Warning",
                    description: `Photo is ${(size / 1024 / 1024).toFixed(1)}MB. Consider using PNG format for smaller file size.`,
                  });
                }
                
                resolve(null);
              } catch (e) {
                reject(e);
              }
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
          });
          
          // Extract and display photo information
          const testImg = new Image();
          testImg.onload = () => {
            const resolution = `${testImg.width}x${testImg.height}`;
            
            setPhotoResolution(resolution);
            setCaptureMethod('ImageCapture API');
            setPhotoFormat(format);
            setPhotoSize(size);
            
            console.log(`📊 Final photo info: ${resolution}, ${(size/1024/1024).toFixed(2)}MB, ${format}, ImageCapture API`);
          };
          testImg.src = finalDataUrl;
          
          setPhotoUri(finalDataUrl);
          setPhotoTaken(true);
          track.stop();
          return;
        } catch (e) {
          console.error('❌ ImageCapture API failed:', e);
          setCaptureMethod('Canvas Fallback (ImageCapture failed)');
        }
      } else {
        console.log('⚠️ ImageCapture API not available, using canvas fallback');
        setCaptureMethod('Canvas Fallback (API unavailable)');
      }

      // Fallback: capture from the video element into canvas
      if (videoRef.current && canvasRef.current) {
        console.log('🎨 Using canvas capture fallback');
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Use video's natural resolution for maximum quality
        const width = video.videoWidth || video.clientWidth;
        const height = video.videoHeight || video.clientHeight;
        
        console.log(`📐 Canvas capture dimensions: ${width}x${height}`);
        
        // Set canvas dimensions to match video's natural resolution
        canvas.width = width;
        canvas.height = height;
        
        // Draw video frame to canvas with high quality
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Use selected lossless format
          let dataUrl: string;
          let format: string;
          let size: number;
          
          try {
            if (selectedFormat === 'BMP') {
              dataUrl = canvasToBMP(canvas);
              format = 'BMP (Uncompressed)';
              size = Math.round(dataUrl.length * 0.75);
              console.log(`🎨 Canvas to BMP: ${(size / 1024 / 1024).toFixed(2)}MB (uncompressed)`);
            } else {
              dataUrl = canvas.toDataURL('image/png');
              format = 'PNG (Lossless)';
              size = Math.round(dataUrl.length * 0.75);
              console.log(`🎨 Canvas to PNG: ${(size / 1024 / 1024).toFixed(2)}MB (lossless)`);
            }
            
            // Warn about large file sizes
            if (size > 20 * 1024 * 1024) {
              toast({
                title: "Large File Warning", 
                description: `Photo is ${(size / 1024 / 1024).toFixed(1)}MB. Consider using PNG format for smaller file size.`,
              });
            }
          } catch (e) {
            console.error('❌ Error converting to selected format:', e);
            // Emergency fallback to PNG
            dataUrl = canvas.toDataURL('image/png');
            format = 'PNG (Fallback)';
            size = Math.round(dataUrl.length * 0.75);
            toast({
              title: "Format Error",
              description: "Failed to use selected format, using PNG instead.",
              variant: "destructive",
            });
          }
          
          console.log(`✅ Canvas capture complete: ${width}x${height}, ${(size/1024/1024).toFixed(2)}MB, ${format}`);
          
          setPhotoUri(dataUrl);
          setPhotoTaken(true);
          setPhotoResolution(`${width}x${height}`);
          setPhotoFormat(format);
          setPhotoSize(size);
          
          // Stop camera stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
        }
      }
    } catch (err) {
      console.error('❌ Critical error during photo capture:', err);
      toast({
        title: 'Capture Error',
        description: `Failed to capture photo: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
        duration: 6000,
      });
    }
  };

  const retakePhoto = () => {
    setPhotoTaken(false);
    setPhotoUri('');
    setPhotoResolution('');
    setCaptureMethod('');
    setPhotoFormat('PNG');
    setPhotoSize(0);
    startCamera();
  };

  const confirmPhoto = () => {
    if (photoUri) {
      onPhotoTaken(photoUri);
      // Reset the state and automatically start the camera for the next photo
      setPhotoTaken(false);
      setPhotoUri('');
      setPhotoResolution('');
      setCaptureMethod('');
      setPhotoFormat('PNG');
      setPhotoSize(0);
      // We'll start the camera in useEffect that watches photoTaken
    }
  };

  // Initial camera start
  useEffect(() => {
    startCamera();
    
    return () => {
      // Cleanup: stop camera when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Auto-start camera when photo is confirmed and we reset photoTaken to false
  useEffect(() => {
    if (!photoTaken && photoUri === '') {
      startCamera();
    }
  }, [photoTaken, photoUri]);

  return (
    <div className="flex flex-col h-screen w-full px-2 sm:px-4 py-2 overflow-hidden">
      {/* Header - Compact */}
      <div className="text-center mb-2 flex-shrink-0">
        <h2 className="text-base sm:text-lg font-semibold">
          Pallet {currentPallet} of {totalPallets} - Side {currentSide}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isMobile ? "Tap to capture" : "Position camera to capture the full side of the pallet"}
        </p>
        
        {/* Format Selector */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFormatSelector(!showFormatSelector)}
            className="h-8 px-2 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            {formatOptions[selectedFormat].label}
          </Button>
        </div>
        
        {showFormatSelector && (
          <div className="mt-2 bg-background/95 backdrop-blur rounded-lg p-3 border">
            <div className="text-xs font-semibold mb-2">Photo Format:</div>
            <Select value={selectedFormat} onValueChange={(value: PhotoFormat) => setSelectedFormat(value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(formatOptions) as PhotoFormat[]).map((format) => (
                  <SelectItem key={format} value={format}>
                    <div className="text-left">
                      <div className="font-medium">{formatOptions[format].label}</div>
                      <div className="text-xs text-muted-foreground">{formatOptions[format].description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground mt-2">
              {selectedFormat === 'BMP' ? 
                '⚠️ BMP files are very large but have zero compression' : 
                '✅ PNG provides lossless compression with smaller file sizes'
              }
            </div>
          </div>
        )}
      </div>
      
      {/* Camera Container - Flexible height to fill available space */}
      <div className="relative flex-1 w-full mx-auto max-w-3xl bg-black rounded-lg overflow-hidden border-2 sm:border-4 border-pallet-primary min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-white text-center">
              <div className="animate-pulse-light mb-2">
                <CameraIcon className="h-8 w-8 mx-auto" />
              </div>
              <p className="text-sm">Loading camera...</p>
            </div>
          </div>
        )}
        
        {!photoTaken ? (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <img 
              src={photoUri} 
              alt="Captured photo" 
              className="absolute inset-0 w-full h-full object-contain"
            />
            {/* Photo Quality Information Overlay */}
            {photoResolution && (
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs rounded px-2 py-1 space-y-1">
                <div className="font-semibold">📸 Photo Info:</div>
                <div>Resolution: {photoResolution}</div>
                <div>Format: {photoFormat}</div>
                <div>Size: {(photoSize / 1024 / 1024).toFixed(2)}MB</div>
                <div>Method: {captureMethod}</div>
              </div>
            )}
          </>
        )}
        
        {/* Enhanced mobile hint overlay with landscape guidance */}
        {isMobile && !photoTaken && !isLoading && (
          <div className="absolute bottom-2 left-2 right-2 text-center">
            <p className="text-white text-xs bg-black/50 rounded px-2 py-1">
              {orientation === 'portrait' 
                ? 'Rotate to landscape for optimal capture' 
                : 'Perfect! Ready to capture in landscape'
              }
            </p>
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls - Fixed at bottom */}
      <div className="flex justify-center gap-3 sm:gap-4 mt-2 flex-shrink-0">
        {!photoTaken ? (
          <Button 
            onClick={takePhoto} 
            disabled={isLoading}
            className="bg-pallet-primary hover:bg-pallet-accent text-white rounded-full min-h-touch min-w-touch flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{ width: '80px', height: '80px' }}
          >
            <CameraIcon className={`${isMobile ? 'h-10 w-10' : 'h-8 w-8'}`} />
          </Button>
        ) : (
          <>
            <Button 
              onClick={retakePhoto} 
              variant="outline"
              className="bg-white text-pallet-primary border-pallet-primary hover:bg-pallet-secondary min-h-touch px-4 sm:px-6 active:scale-95 transition-transform"
            >
              <RefreshCw className="mr-1 sm:mr-2 h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-sm sm:text-base">Retake</span>
            </Button>
            <Button 
              onClick={confirmPhoto} 
              className="bg-pallet-primary hover:bg-pallet-accent min-h-touch px-4 sm:px-6 active:scale-95 transition-transform"
            >
              <CheckIcon className="mr-1 sm:mr-2 h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-sm sm:text-base">Confirm</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraView;
