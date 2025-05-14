
import React, { useState } from 'react';
import { PalletProvider } from '@/contexts/PalletContext';
import PalletApp from '@/components/PalletApp';

const Index = () => {
  return (
    <div className="min-h-screen bg-pallet-light">
      <PalletProvider>
        <PalletApp />
      </PalletProvider>
    </div>
  );
};

export default Index;
