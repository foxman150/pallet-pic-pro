
import React from 'react';
import { usePallet } from '@/contexts/PalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Home, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoGalleryProps {
  onRestart: () => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ onRestart }) => {
  const { photos, totalPallets, customerName, poNumber } = usePallet();
  const { toast } = useToast();

  // Group photos by pallet
  const photosByPallet = photos.reduce((acc: Record<number, any[]>, photo) => {
    const { palletIndex } = photo;
    if (!acc[palletIndex]) {
      acc[palletIndex] = [];
    }
    acc[palletIndex].push(photo);
    return acc;
  }, {});

  const handleDownload = (photo: any) => {
    const { palletIndex, sideIndex, photoUri } = photo;
    const fileName = `${customerName.replace(/\s+/g, '_')}_${poNumber}_Pallet${palletIndex}_Side${sideIndex}.jpg`;
    
    // Create an anchor element and set the href to the photo URI
    const link = document.createElement('a');
    link.href = photoUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Photo Saved",
      description: `${fileName} has been saved to your downloads folder.`,
      duration: 3000
    });
  };

  const downloadAllPhotos = () => {
    photos.forEach(photo => {
      setTimeout(() => {
        handleDownload(photo);
      }, 300); // Add small delay between downloads
    });
    
    toast({
      title: "All Photos Downloading",
      description: `${photos.length} photos will be saved to your downloads folder.`,
      duration: 5000
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-pallet-secondary p-3 rounded-full mb-4">
          <CheckCircle className="h-10 w-10 text-pallet-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Documentation Complete!</h1>
        <p className="text-gray-600 mb-4 text-center">
          All {photos.length} photos of {totalPallets} pallet(s) have been captured for {customerName} (PO: {poNumber})
        </p>
        <div className="flex gap-4">
          <Button 
            onClick={downloadAllPhotos}
            className="bg-pallet-primary hover:bg-pallet-accent"
          >
            <Download className="mr-2 h-5 w-5" />
            Download All Photos
          </Button>
          <Button 
            onClick={onRestart} 
            variant="outline"
            className="border-pallet-primary text-pallet-primary hover:bg-pallet-secondary"
          >
            <Home className="mr-2 h-5 w-5" />
            Start New Session
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {Array.from({ length: totalPallets }, (_, i) => i + 1).map((palletIndex) => (
          <div key={palletIndex} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Pallet {palletIndex} Photos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {photosByPallet[palletIndex]?.sort((a, b) => a.sideIndex - b.sideIndex).map((photo) => (
                <Card key={`${photo.palletIndex}-${photo.sideIndex}`} className="overflow-hidden">
                  <CardContent className="p-0 relative">
                    <img 
                      src={photo.photoUri} 
                      alt={`Pallet ${photo.palletIndex}, Side ${photo.sideIndex}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute top-0 left-0 right-0 bg-black/70 text-white p-2 text-sm">
                      Side {photo.sideIndex}
                    </div>
                    <Button 
                      size="sm"
                      className="absolute bottom-2 right-2 bg-white text-pallet-primary hover:bg-gray-100"
                      onClick={() => handleDownload(photo)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoGallery;
