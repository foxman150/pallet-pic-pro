
import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface PalletPhoto {
  palletIndex: number;
  sideIndex: number;
  photoUri: string;
}

interface PalletContextType {
  totalPallets: number;
  setTotalPallets: (count: number) => void;
  photos: PalletPhoto[];
  addPhoto: (palletIndex: number, sideIndex: number, photoUri: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  poNumber: string;
  setPoNumber: (po: string) => void;
  currentPallet: number;
  setCurrentPallet: (index: number) => void;
  currentSide: number;
  setCurrentSide: (side: number) => void;
  resetData: () => void;
  supabase: any;
  isUploading: boolean;
  uploadPhotosToSupabase: () => Promise<boolean>;
  fetchHistorySessions: () => Promise<any[]>;
  fetchSessionPhotos: (sessionId: string) => Promise<any[]>;
  deviceId: string;
}

const PalletContext = createContext<PalletContextType | undefined>(undefined);

// Generate a persistent device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('pallet_device_id');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('pallet_device_id', deviceId);
  }
  return deviceId;
};

export function PalletProvider({ children }: { children: React.ReactNode }) {
  const [totalPallets, setTotalPallets] = useState<number>(0);
  const [photos, setPhotos] = useState<PalletPhoto[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [currentPallet, setCurrentPallet] = useState<number>(1);
  const [currentSide, setCurrentSide] = useState<number>(1);
  const [supabase, setSupabase] = useState<any>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deviceId] = useState<string>(getDeviceId());

  // Initialize Supabase client
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const client = createClient(supabaseUrl, supabaseKey);
          setSupabase(client);
        }
      } catch (error) {
        console.error('Error initializing Supabase:', error);
      }
    };
    
    initSupabase();
  }, []);

  const addPhoto = (palletIndex: number, sideIndex: number, photoUri: string) => {
    // Remove any existing photo with same pallet and side
    const filteredPhotos = photos.filter(
      photo => !(photo.palletIndex === palletIndex && photo.sideIndex === sideIndex)
    );
    
    // Add the new photo
    setPhotos([
      ...filteredPhotos,
      { palletIndex, sideIndex, photoUri }
    ]);
  };

  const resetData = () => {
    setTotalPallets(0);
    setPhotos([]);
    setCustomerName('');
    setPoNumber('');
    setCurrentPallet(1);
    setCurrentSide(1);
  };
  
  // Upload photos to Supabase
  const uploadPhotosToSupabase = async (): Promise<boolean> => {
    if (!supabase || photos.length === 0 || !customerName || !poNumber) {
      return false;
    }
    
    setIsUploading(true);
    
    try {
      // 1. Create a new session
      const { data: sessionData, error: sessionError } = await supabase
        .from('pallet_sessions')
        .insert({
          customer_name: customerName,
          po_number: poNumber,
          total_pallets: totalPallets,
          device_id: deviceId
        })
        .select('id')
        .single();
      
      if (sessionError || !sessionData) {
        console.error('Error creating session:', sessionError);
        return false;
      }
      
      const sessionId = sessionData.id;
      
      // 2. Upload each photo to storage and create records
      for (const photo of photos) {
        const { palletIndex, sideIndex, photoUri } = photo;
        const fileName = `${sessionId}/${palletIndex}_${sideIndex}.jpg`;
        
        // Convert data URI to Blob
        const response = await fetch(photoUri);
        const blob = await response.blob();
        
        // Upload to storage bucket
        const { error: uploadError } = await supabase.storage
          .from('pallet_photos')
          .upload(fileName, blob, {
            contentType: 'image/jpeg'
          });
        
        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          continue;
        }
        
        // Get the public URL
        const { data: publicUrl } = supabase.storage
          .from('pallet_photos')
          .getPublicUrl(fileName);
        
        // Create photo record
        const { error: photoError } = await supabase
          .from('pallet_photos')
          .insert({
            session_id: sessionId,
            pallet_index: palletIndex,
            side_index: sideIndex,
            photo_url: publicUrl.publicUrl
          });
        
        if (photoError) {
          console.error('Error creating photo record:', photoError);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in upload process:', error);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch session history
  const fetchHistorySessions = async (): Promise<any[]> => {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('pallet_sessions')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching history:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in fetch process:', error);
      return [];
    }
  };

  // Fetch photos for a specific session
  const fetchSessionPhotos = async (sessionId: string): Promise<any[]> => {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('pallet_photos')
        .select('*')
        .eq('session_id', sessionId)
        .order('pallet_index', { ascending: true })
        .order('side_index', { ascending: true });
      
      if (error) {
        console.error('Error fetching session photos:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in fetch process:', error);
      return [];
    }
  };

  return (
    <PalletContext.Provider
      value={{
        totalPallets,
        setTotalPallets,
        photos,
        addPhoto,
        customerName,
        setCustomerName,
        poNumber,
        setPoNumber,
        currentPallet,
        setCurrentPallet,
        currentSide,
        setCurrentSide,
        resetData,
        supabase,
        isUploading,
        uploadPhotosToSupabase,
        fetchHistorySessions,
        fetchSessionPhotos,
        deviceId
      }}
    >
      {children}
    </PalletContext.Provider>
  );
}

export function usePallet() {
  const context = useContext(PalletContext);
  if (context === undefined) {
    throw new Error('usePallet must be used within a PalletProvider');
  }
  return context;
}
