
import React, { useState, useEffect } from 'react';
import { usePallet } from '@/contexts/PalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Eye, Download, Calendar } from 'lucide-react';

const HistoryView: React.FC = () => {
  const { fetchHistorySessions, fetchSessionPhotos, supabase } = usePallet();
  const [sessions, setSessions] = useState<any[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionPhotos, setSessionPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (searchQuery === '') {
      setFilteredSessions(sessions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = sessions.filter(
        session => 
          session.customer_name.toLowerCase().includes(query) || 
          session.po_number.toLowerCase().includes(query)
      );
      setFilteredSessions(filtered);
    }
  }, [searchQuery, sessions]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await fetchHistorySessions();
      setSessions(data);
      setFilteredSessions(data);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const viewSessionPhotos = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setLoadingPhotos(true);
    
    try {
      const photos = await fetchSessionPhotos(sessionId);
      setSessionPhotos(photos);
    } catch (error) {
      console.error("Error loading session photos:", error);
      toast({
        title: "Error",
        description: "Failed to load photos for this session.",
        variant: "destructive"
      });
    } finally {
      setLoadingPhotos(false);
    }
  };

  const backToSessions = () => {
    setSelectedSessionId(null);
    setSessionPhotos([]);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  const downloadPhoto = async (photoUrl: string, palletIndex: number, sideIndex: number, customerName: string, poNumber: string) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const fileName = `${customerName.replace(/\s+/g, '_')}_${poNumber}_Pallet${palletIndex}_Side${sideIndex}.jpg`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Photo Downloaded",
        description: `${fileName} has been downloaded.`,
        duration: 3000
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download the photo. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getSessionById = (sessionId: string) => {
    return sessions.find(session => session.id === sessionId);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-lg text-gray-500">Loading history...</p>
      </div>
    );
  }

  if (selectedSessionId) {
    const session = getSessionById(selectedSessionId);
    
    return (
      <div className="container mx-auto px-4 py-8">
        <Button 
          onClick={backToSessions} 
          variant="outline" 
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to History
        </Button>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-2xl font-bold mb-2">{session?.customer_name}</h1>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600 mb-6">
            <div className="flex items-center">
              <span className="font-medium mr-2">PO Number:</span> 
              {session?.po_number}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">Pallets:</span> 
              {session?.total_pallets}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" /> 
              {formatDate(session?.created_at)}
            </div>
          </div>
          
          {loadingPhotos ? (
            <p className="text-center py-8 text-gray-500">Loading photos...</p>
          ) : sessionPhotos.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No photos found for this session.</p>
          ) : (
            <div className="space-y-8">
              {Array.from({ length: session?.total_pallets || 0 }, (_, i) => i + 1).map(palletIndex => {
                const palletPhotos = sessionPhotos.filter(photo => photo.pallet_index === palletIndex);
                if (palletPhotos.length === 0) return null;
                
                return (
                  <div key={palletIndex} className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Pallet {palletIndex}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {palletPhotos.sort((a, b) => a.side_index - b.side_index).map(photo => (
                        <Card key={photo.id} className="overflow-hidden">
                          <CardContent className="p-0 relative">
                            <img 
                              src={photo.photo_url} 
                              alt={`Pallet ${photo.pallet_index}, Side ${photo.side_index}`}
                              className="w-full aspect-square object-cover"
                            />
                            <div className="absolute top-0 left-0 right-0 bg-black/70 text-white p-2 text-sm">
                              Side {photo.side_index}
                            </div>
                            <Button 
                              size="sm"
                              className="absolute bottom-2 right-2 bg-white text-purple-700 hover:bg-gray-100"
                              onClick={() => downloadPhoto(
                                photo.photo_url, 
                                photo.pallet_index, 
                                photo.side_index, 
                                session?.customer_name, 
                                session?.po_number
                              )}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-bold mb-6">Photo History</h1>
        
        <div className="w-full max-w-md relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input 
            type="text"
            placeholder="Search by customer name or PO number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No history found.</p>
            <Link to="/">
              <Button className="mt-4 bg-pallet-primary hover:bg-pallet-accent">
                Return to Camera
              </Button>
            </Link>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="w-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{session.customer_name}</CardTitle>
                      <CardDescription>PO: {session.po_number}</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => viewSessionPhotos(session.id)}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Photos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-600">
                      <span className="font-medium">{session.total_pallets}</span> pallets
                    </div>
                    <div className="text-gray-500">
                      {formatDate(session.created_at)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
