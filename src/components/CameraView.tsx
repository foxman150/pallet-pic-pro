
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CameraIcon, CheckIcon, RefreshCw, ZoomIn } from 'lucide-react';
import { usePallet } from '@/contexts/PalletContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile, useDeviceOrientation } from '@/hooks/use-mobile';

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
      
      // Mobile-optimized camera constraints
      const constraints = {
        video: {
          facingMode: 'environment',
          width: isMobile 
            ? { ideal: orientation === 'portrait' ? 720 : 1280, max: 1920 }
            : { ideal: 1280, max: 1920 },
          height: isMobile 
            ? { ideal: orientation === 'portrait' ? 1280 : 720, max: 1920 }
            : { ideal: 720, max: 1080 },
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

  const takePhoto = () => {
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
        
        // Convert canvas to data URL with mobile optimization
        const quality = isMobile ? 0.7 : 0.8; // Lower quality for mobile to save bandwidth
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        setPhotoUri(dataUrl);
        setPhotoTaken(true);
        
        // Stop camera stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }
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
    <div className="flex flex-col items-center justify-center w-full px-4 sm:px-6 pb-safe-bottom">
      {/* Header - Optimized for mobile */}
      <div className="text-center mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">
          Pallet {currentPallet} of {totalPallets} - Side {currentSide}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {isMobile ? "Tap to capture" : "Position camera to capture the full side of the pallet"}
        </p>
      </div>
      
      {/* Camera Container - Mobile optimized */}
      <div className="relative w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden border-2 sm:border-4 border-pallet-primary">
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
        
        {/* Mobile hint overlay */}
        {isMobile && !photoTaken && !isLoading && (
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-white text-xs bg-black/50 rounded px-2 py-1">
              {orientation === 'portrait' ? 'Rotate for wider view' : 'Ready to capture'}
            </p>
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls - Mobile optimized */}
      <div className="flex justify-center gap-3 sm:gap-4 mt-4 sm:mt-6 w-full max-w-md">
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

      {/* Touch hint for mobile */}
      {isMobile && !photoTaken && !isLoading && (
        <div className="mt-3 animate-bounce-subtle">
          <p className="text-xs text-muted-foreground">Tap the camera button to capture</p>
        </div>
      )}
    </div>
  );
};

export default CameraView;
