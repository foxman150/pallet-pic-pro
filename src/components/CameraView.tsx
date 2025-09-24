
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CameraIcon, CheckIcon, RefreshCw, ZoomIn } from 'lucide-react';
import { usePallet } from '@/contexts/PalletContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile, useDeviceOrientation } from '@/hooks/use-mobile';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface CameraViewProps {
  onPhotoTaken: (uri: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onPhotoTaken }) => {
  const [photoTaken, setPhotoTaken] = useState<boolean>(false);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
      
      // Use maximum native camera resolution - no constraints
      const constraints = {
        video: {
          facingMode: 'environment'
          // No width/height/aspectRatio constraints to allow native max resolution
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to load metadata before hiding loading
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
        };
      }
    } catch (err) {
      setIsLoading(false);
      console.error("Error accessing camera:", err);
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

  const takePhoto = async () => {
    // Hide keyboard before taking photo
    hideKeyboard();
    
    try {
      // Prefer native camera on Capacitor for true full-resolution stills
      const platform = Capacitor.getPlatform();
      if (platform !== 'web') {
        const photo = await Camera.getPhoto({
          source: CameraSource.Camera,
          resultType: CameraResultType.DataUrl,
          quality: 100,
          correctOrientation: true,
          saveToGallery: false,
        });
        if (photo?.dataUrl) {
          setPhotoUri(photo.dataUrl);
          setPhotoTaken(true);
          // Stop camera stream if active
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
          }
          return;
        }
      }

      // Browser: try ImageCapture API for higher-resolution still images
      const track = streamRef.current?.getVideoTracks?.()[0];
      // @ts-ignore - ImageCapture may not be in lib.dom in some TS configs
      const ImageCaptureCtor = (window as any).ImageCapture;
      if (track && ImageCaptureCtor) {
        try {
          const imageCapture = new ImageCaptureCtor(track);
          const blob: Blob = await imageCapture.takePhoto();
          const dataUrl = await blobToDataUrl(blob);
          setPhotoUri(dataUrl);
          setPhotoTaken(true);
          track.stop();
          return;
        } catch (e) {
          console.warn('ImageCapture failed, falling back to canvas.', e);
        }
      }

      // Fallback: capture from the video element into canvas
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to data URL at max quality
          const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
          setPhotoUri(dataUrl);
          setPhotoTaken(true);
          
          // Stop camera stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
        }
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      toast({
        title: 'Capture Error',
        description: 'Failed to capture a high-resolution photo. Please try again.',
        variant: 'destructive',
        duration: 6000,
      });
    }
  };

  const retakePhoto = () => {
    setPhotoTaken(false);
    setPhotoUri('');
    startCamera();
  };

  const confirmPhoto = () => {
    if (photoUri) {
      onPhotoTaken(photoUri);
      // Reset the state and automatically start the camera for the next photo
      setPhotoTaken(false);
      setPhotoUri('');
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
          <img 
            src={photoUri} 
            alt="Captured photo" 
            className="absolute inset-0 w-full h-full object-contain"
          />
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
