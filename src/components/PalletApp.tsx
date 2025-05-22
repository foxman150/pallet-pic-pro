
import React, { useState } from 'react';
import PalletCountSelector from './PalletCountSelector';
import CustomerInfoForm from './CustomerInfoForm';
import CameraView from './CameraView';
import PhotoGallery from './PhotoGallery';
import HistoryView from './HistoryView';
import { usePallet } from '@/contexts/PalletContext';
import { ArrowLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';

enum AppStage {
  COUNT_SELECTION,
  CUSTOMER_INFO,
  PHOTO_CAPTURE,
  GALLERY,
  HISTORY
}

const PalletApp: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.COUNT_SELECTION);
  const { 
    totalPallets, 
    currentPallet, 
    setCurrentPallet, 
    currentSide, 
    setCurrentSide, 
    addPhoto,
    resetData
  } = usePallet();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we should show the history view
  React.useEffect(() => {
    if (location.pathname === '/history') {
      setStage(AppStage.HISTORY);
    }
  }, [location.pathname]);

  const handlePhotoTaken = (photoUri: string) => {
    // Save the photo
    addPhoto(currentPallet, currentSide, photoUri);
    
    // Move to next side or next pallet
    if (currentSide < 4) {
      // Go to next side of current pallet
      setCurrentSide(currentSide + 1);
    } else {
      // This pallet is complete
      if (currentPallet < totalPallets) {
        // Move to the next pallet
        setCurrentPallet(currentPallet + 1);
        setCurrentSide(1);
      } else {
        // All pallets complete, show gallery
        setStage(AppStage.GALLERY);
      }
    }
  };

  const handleBack = () => {
    if (stage === AppStage.CUSTOMER_INFO) {
      setStage(AppStage.COUNT_SELECTION);
    } else if (stage === AppStage.PHOTO_CAPTURE) {
      // If we're at the first side of the first pallet, go to customer info
      if (currentPallet === 1 && currentSide === 1) {
        setStage(AppStage.CUSTOMER_INFO);
      } else if (currentSide === 1) {
        // If we're at the first side of any other pallet, go to the previous pallet's last side
        setCurrentPallet(currentPallet - 1);
        setCurrentSide(4);
      } else {
        // Otherwise, just go back one side
        setCurrentSide(currentSide - 1);
      }
    } else if (stage === AppStage.HISTORY) {
      // Go back to home from history
      navigate('/');
      setStage(AppStage.COUNT_SELECTION);
    }
  };

  const handleRestart = () => {
    resetData();
    setStage(AppStage.COUNT_SELECTION);
    navigate('/');
  };

  const goToHistory = () => {
    navigate('/history');
    setStage(AppStage.HISTORY);
  };

  const renderStage = () => {
    switch(stage) {
      case AppStage.COUNT_SELECTION:
        return <PalletCountSelector onContinue={() => setStage(AppStage.CUSTOMER_INFO)} />;
      case AppStage.CUSTOMER_INFO:
        return <CustomerInfoForm onContinue={() => setStage(AppStage.PHOTO_CAPTURE)} />;
      case AppStage.PHOTO_CAPTURE:
        return <CameraView onPhotoTaken={handlePhotoTaken} />;
      case AppStage.GALLERY:
        return <PhotoGallery onRestart={handleRestart} />;
      case AppStage.HISTORY:
        return <HistoryView />;
      default:
        return <PalletCountSelector onContinue={() => setStage(AppStage.CUSTOMER_INFO)} />;
    }
  };

  // Determine if we should show the back button
  const showBackButton = stage === AppStage.CUSTOMER_INFO || 
                        (stage === AppStage.PHOTO_CAPTURE && 
                        !(currentPallet === 1 && currentSide === 1)) ||
                        stage === AppStage.HISTORY;

  // Determine if we should show the history button
  const showHistoryButton = stage === AppStage.COUNT_SELECTION;

  return (
    <div className="min-h-screen p-4 relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-pallet-primary">Pallet Documenter</h1>
        </div>
        
        <div className="flex space-x-2">
          {showHistoryButton && (
            <Button 
              variant="outline" 
              onClick={goToHistory}
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <History className="mr-2 h-5 w-5" />
              History
            </Button>
          )}
          
          {showBackButton && (
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="border-pallet-primary text-pallet-primary hover:bg-pallet-secondary"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center w-full">
        {renderStage()}
      </div>
    </div>
  );
};

export default PalletApp;
