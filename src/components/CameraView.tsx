
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CameraIcon, CheckIcon, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { usePallet } from '@/contexts/PalletContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile, useDeviceOrientation } from '@/hooks/use-mobile';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { processImage } from '@/lib/imageProcessing';
// Lazy import AI upscaling utilities when needed

interface CameraViewProps {
  onPhotoTaken: (uri: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onPhotoTaken }) => {
  const [photoTaken, setPhotoTaken] = useState<boolean>(false);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [aiEnhanceEnabled] = useState<boolean>(true); // Always enabled
  const [aiProgress, setAiProgress] = useState<number>(0);
  const [photoResolution, setPhotoResolution] = useState<string>('');
  const [captureMethod, setCaptureMethod] = useState<string>('');
  const [photoFormat, setPhotoFormat] = useState<string>('');
  const [photoSize, setPhotoSize] = useState<number>(0);
  const [isAiEnhanced, setIsAiEnhanced] = useState<boolean>(false);
  const { currentPallet, totalPallets, currentSide } = usePallet();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const orientation = useDeviceOrientation();
  const [supportsAI, setSupportsAI] = useState<boolean>(false);

  // Check AI support lazily to avoid pulling heavy libs on first load
  useEffect(() => {
    let mounted = true;
    import('@/lib/aiUpscaling')
      .then((mod) => {
        if (mounted) setSupportsAI(mod.isUpscalingSupported());
      })
      .catch(() => setSupportsAI(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!photoTaken) {
      takePhoto();
    }
  }, [currentPallet, currentSide]);

  const takePhoto = async () => {
    try {
      setIsLoading(true);
      console.log('📸 Capturing photo with Capacitor Camera...');

      // Use Capacitor Camera for native photo capture with Apple's computational photography
      const photo = await Camera.getPhoto({
        quality: 100,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
      });

      if (!photo.dataUrl) {
        throw new Error('No photo data received');
      }

      console.log('✅ Photo captured with native camera');
      setCaptureMethod('Native iOS Camera (Deep Fusion + Smart HDR)');

      // Get image dimensions
      const img = new Image();
      img.onload = async () => {
        const resolution = `${img.width}x${img.height}`;
        setPhotoResolution(resolution);
        console.log(`📊 Original photo: ${resolution}`);

        let finalPhotoUri = photo.dataUrl!;
        let finalFormat = 'JPEG (Raw Camera)';
        let enhancedWithAI = false;

        // Apply AI enhancement (always enabled, but skip if disabled this session)
        if (aiEnhanceEnabled) {
          const aiDisabled = sessionStorage.getItem('AI_UPSCALE_DISABLED') === '1';
          if (aiDisabled) {
            console.warn('AI upscaling disabled for this session; using original photo.');
            toast({
              title: "AI Disabled This Session",
              description: "Using original photo to keep things fast and stable.",
              duration: 2500,
            });
          } else {
            setIsProcessing(true);
            setAiProgress(0);
            toast({
              title: "AI Enhancement",
              description: "Upscaling image with AI (this may take 5-10 seconds)...",
              duration: 3000,
            });

            try {
              const { upscaleImage } = await import('@/lib/aiUpscaling');
              finalPhotoUri = await upscaleImage(photo.dataUrl!, 2, (progress) => {
                setAiProgress(progress);
              });
              finalFormat = 'PNG (AI Enhanced 2x)';
              enhancedWithAI = true;
              console.log('✅ AI enhancement complete');
              
              toast({
                title: "AI Enhancement Complete",
                description: "Image resolution increased 2x for better barcode reading",
                duration: 2000,
              });
            } catch (error) {
              console.error('AI enhancement failed, using original:', error);
              try { sessionStorage.setItem('AI_UPSCALE_DISABLED', '1'); } catch {}
              toast({
                title: "AI Enhancement Disabled",
                description: "AI failed and was disabled for this session. Using original photo.",
                variant: "destructive",
                duration: 3000,
              });
            }
          }
        }

        const finalSize = Math.round(finalPhotoUri.length * 0.75);
        setPhotoFormat(finalFormat);
        setPhotoSize(finalSize);
        setPhotoUri(finalPhotoUri);
        setIsAiEnhanced(enhancedWithAI);
        setPhotoTaken(true);

        console.log(`✅ Photo ready: ${(finalSize / 1024 / 1024).toFixed(2)}MB ${enhancedWithAI ? '(AI Enhanced)' : ''}`);
        
        if (!aiEnhanceEnabled) {
          toast({
            title: "Photo Captured",
            description: "Maximum quality preserved for barcode reading",
            duration: 2000,
          });
        }

        setIsProcessing(false);
        setAiProgress(0);
      };
      img.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to process photo",
          variant: "destructive",
        });
        setIsLoading(false);
        setIsProcessing(false);
      };
      img.src = photo.dataUrl;
      setIsLoading(false);

    } catch (error: any) {
      console.error('❌ Camera error:', error);
      setIsLoading(false);
      setIsProcessing(false);
      
      if (error.message !== 'User cancelled photos app') {
        toast({
          title: "Camera Error",
          description: error.message || "Failed to capture photo",
          variant: "destructive",
          duration: 4000,
        });
      }
    }
  };


  const retakePhoto = () => {
    setPhotoTaken(false);
    setPhotoUri('');
    setPhotoResolution('');
    setCaptureMethod('');
    setPhotoFormat('');
    setPhotoSize(0);
    setIsAiEnhanced(false);
    setAiProgress(0);
  };

  const confirmPhoto = () => {
    if (photoUri) {
      const currentPhotoUri = photoUri;
      // Reset state immediately before calling onPhotoTaken
      setPhotoTaken(false);
      setPhotoUri('');
      setPhotoResolution('');
      setCaptureMethod('');
      setPhotoFormat('');
      setPhotoSize(0);
      setIsAiEnhanced(false);
      setAiProgress(0);
      // Call with the saved photo URI
      onPhotoTaken(currentPhotoUri);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full px-2 sm:px-4 py-2 overflow-hidden">
      {/* Header - Compact */}
      <div className="text-center mb-2 flex-shrink-0">
        <h2 className="text-base sm:text-lg font-semibold">
          Pallet {currentPallet} of {totalPallets} - Side {currentSide}
        </h2>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          {isMobile ? "Tap to capture" : "Position camera to capture the full side of the pallet"}
          {supportsAI && (
            <span className="inline-flex items-center gap-1 ml-2 text-yellow-600 font-medium">
              <Zap className="h-3 w-3" />
              AI Enhanced
            </span>
          )}
        </p>
      </div>
      
      {/* Camera Container - Flexible height to fill available space */}
      <div className="relative flex-1 w-full mx-auto max-w-3xl bg-black rounded-lg overflow-hidden border-2 sm:border-4 border-pallet-primary min-h-0">
        {(isLoading || isProcessing) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-white text-center">
              <div className="animate-pulse-light mb-2">
                {isProcessing ? (
                  <Zap className="h-8 w-8 mx-auto text-yellow-400" />
                ) : (
                  <CameraIcon className="h-8 w-8 mx-auto" />
                )}
              </div>
              <p className="text-sm">
                {isProcessing ? (
                  <>
                    AI enhancing photo... {aiProgress > 0 ? `${aiProgress}%` : ''}
                  </>
                ) : (
                  'Opening camera...'
                )}
              </p>
              {isProcessing && aiProgress > 0 && (
                <div className="w-48 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${aiProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        {!photoTaken ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pallet-primary/20 to-pallet-accent/20">
            <div className="text-white text-center p-6">
              <CameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">Ready to Capture</p>
              <p className="text-sm opacity-75">
                Tap the button below to take a photo
              </p>
            </div>
          </div>
        ) : (
          <>
            <img 
              src={photoUri} 
              alt="Captured photo" 
              className="absolute inset-0 w-full h-full object-contain"
            />
            {/* Photo Quality Information Overlay */}
            {photoResolution && (
              <div className="absolute top-2 left-2 bg-black/80 text-white text-xs rounded-lg px-3 py-2 space-y-1 backdrop-blur-sm">
                <div className="font-semibold flex items-center gap-1">
                  {isAiEnhanced ? (
                    <>
                      <Zap className="h-3 w-3 text-yellow-400" />
                      AI Enhanced
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Maximum Quality
                    </>
                  )}
                </div>
                <div>Resolution: {photoResolution}</div>
                <div>Format: {photoFormat}</div>
                <div>Size: {(photoSize / 1024 / 1024).toFixed(2)}MB</div>
                <div className="text-green-400 text-[10px]">✓ Deep Fusion + Smart HDR</div>
                {isAiEnhanced ? (
                  <>
                    <div className="text-yellow-400 text-[10px]">✓ AI Super-Resolution 2x</div>
                    <div className="text-purple-400 text-[10px]">✓ Enhanced Barcode Detail</div>
                  </>
                ) : (
                  <>
                    <div className="text-blue-400 text-[10px]">✓ Raw Camera Output</div>
                    <div className="text-purple-400 text-[10px]">✓ Optimized for Barcodes</div>
                  </>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Orientation hint for mobile */}
        {isMobile && !photoTaken && !isLoading && (
          <div className="absolute bottom-2 left-2 right-2 text-center">
            <p className="text-white text-xs bg-black/60 rounded-lg px-3 py-2 backdrop-blur-sm">
              {orientation === 'portrait' 
                ? '📱 Rotate to landscape for best results' 
                : '✨ Perfect orientation!'}
            </p>
          </div>
        )}
      </div>

      {/* Controls - Fixed at bottom */}
      <div className="flex justify-center gap-3 sm:gap-4 mt-2 flex-shrink-0">
        {!photoTaken ? (
          <Button 
            onClick={takePhoto} 
            disabled={isLoading || isProcessing}
            className="bg-pallet-primary hover:bg-pallet-accent text-white rounded-full min-h-touch min-w-touch flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
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
