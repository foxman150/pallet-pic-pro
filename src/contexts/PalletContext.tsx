
import React, { createContext, useContext, useState, ReactNode } from 'react';

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
}

const PalletContext = createContext<PalletContextType | undefined>(undefined);

export function PalletProvider({ children }: { children: ReactNode }) {
  const [totalPallets, setTotalPallets] = useState<number>(0);
  const [photos, setPhotos] = useState<PalletPhoto[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [currentPallet, setCurrentPallet] = useState<number>(1);
  const [currentSide, setCurrentSide] = useState<number>(1);

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
        resetData
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
