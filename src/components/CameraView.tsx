
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CameraIcon, CheckIcon, RefreshCw } from 'lucide-react';
import { usePallet } from '@/contexts/PalletContext';
import { useToast } from '@/hooks/use-toast';

interface CameraViewProps {
  onPhotoTaken: (uri: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onPhotoTaken }) => {
  const [photoTaken, setPhotoTaken] = useState<boolean>(false);
  const [photoUri, setPhotoUri] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { currentPallet, totalPallets, currentSide } = usePallet();
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
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
        
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
    }
  };

  React.useEffect(() => {
    startCamera();
    
    return () => {
      // Cleanup: stop camera when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">
          Pallet {currentPallet} of {totalPallets} - Side {currentSide}
        </h2>
        <p className="text-sm text-muted-foreground">
          Position camera to capture the full side of the pallet
        </p>
      </div>
      
      <div className="relative w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden border-4 border-pallet-primary">
        {!photoTaken ? (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img 
            src={photoUri} 
            alt="Captured photo" 
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex justify-center gap-4 mt-6">
        {!photoTaken ? (
          <Button 
            onClick={takePhoto} 
            size="lg"
            className="bg-pallet-primary hover:bg-pallet-accent text-white rounded-full w-16 h-16 flex items-center justify-center"
          >
            <CameraIcon className="h-8 w-8" />
          </Button>
        ) : (
          <>
            <Button 
              onClick={retakePhoto} 
              variant="outline"
              size="lg" 
              className="bg-white text-pallet-primary border-pallet-primary hover:bg-pallet-secondary"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Retake
            </Button>
            <Button 
              onClick={confirmPhoto} 
              size="lg" 
              className="bg-pallet-primary hover:bg-pallet-accent"
            >
              <CheckIcon className="mr-2 h-5 w-5" />
              Confirm
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraView;
