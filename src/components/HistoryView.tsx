
import React from 'react';
import { usePallet } from '@/contexts/PalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateSecureFilename, secureError } from '@/lib/security';

interface HistoryViewProps {
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onBack }) => {
  const { localSessions, deleteLocalSession } = usePallet();
  const { toast } = useToast();

  // Format date for display
  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
  };

  // Handle download of a photo
  const handleDownload = (photo: any, customerName: string, poNumber: string, wrapStatus?: string) => {
    try {
      const { palletIndex, sideIndex, photoUri } = photo;
      const status = wrapStatus || 'unwrapped';
      const fileName = generateSecureFilename(customerName, poNumber, status, palletIndex, sideIndex);
      
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
    } catch (error) {
      secureError('Error downloading photo from history', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the photo. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  // Handle deleting a session
  const handleDelete = (sessionId: string) => {
    deleteLocalSession(sessionId);
    toast({
      title: "Session Deleted",
      description: "The session has been removed from your history.",
      duration: 3000
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Session History</h1>
        <Button 
          variant="outline" 
          onClick={onBack}
          className="border-pallet-primary text-pallet-primary hover:bg-pallet-secondary"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
      </div>

      {localSessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No session history found.</p>
          <p className="text-gray-400 text-sm mt-2">
            When you complete documenting pallets, they will appear here for one week.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {localSessions.map((session) => (
            <Card key={session.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{session.customerName}</h2>
                    <p className="text-sm text-gray-500">PO: {session.poNumber}</p>
                    <p className="text-sm text-gray-500">Status: {session.wrapStatus ? session.wrapStatus.charAt(0).toUpperCase() + session.wrapStatus.slice(1) : 'Unwrapped'}</p>
                    <p className="text-xs text-gray-400">{formatDate(session.timestamp)}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleDelete(session.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
                
                <p className="text-sm mb-3">
                  {session.totalPallets} pallet(s), {session.photos.length} photos
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {session.photos.slice(0, 4).map((photo, index) => (
                    <div key={`${photo.palletIndex}-${photo.sideIndex}`} className="relative aspect-square">
                      <img 
                        src={photo.photoUri} 
                        alt={`Pallet ${photo.palletIndex}, Side ${photo.sideIndex}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/50 rounded-md">
                        <Button 
                          size="sm"
                          variant="ghost"
                          className="text-white bg-transparent hover:bg-white/20"
                          onClick={() => handleDownload(photo, session.customerName, session.poNumber, session.wrapStatus)}
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="absolute top-1 left-1 bg-black/70 text-white px-1.5 py-0.5 text-xs rounded">
                        P{photo.palletIndex}S{photo.sideIndex}
                      </div>
                    </div>
                  ))}
                  {session.photos.length > 4 && (
                    <div className="flex items-center justify-center bg-gray-100 rounded-md aspect-square">
                      <span className="text-gray-500">+{session.photos.length - 4} more</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
