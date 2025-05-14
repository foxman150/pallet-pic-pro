
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePallet } from '@/contexts/PalletContext';
import { BoxesIcon, ArrowRightIcon } from 'lucide-react';

interface PalletCountSelectorProps {
  onContinue: () => void;
}

const PalletCountSelector: React.FC<PalletCountSelectorProps> = ({ onContinue }) => {
  const { totalPallets, setTotalPallets } = usePallet();
  const [count, setCount] = useState<string>(totalPallets > 0 ? totalPallets.toString() : '');
  const [error, setError] = useState<string>('');

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    if (/^\d*$/.test(value)) {
      setCount(value);
      setError('');
    }
  };

  const handleContinue = () => {
    const palletCount = parseInt(count);
    if (!count || isNaN(palletCount)) {
      setError('Please enter a valid number');
      return;
    }

    if (palletCount <= 0) {
      setError('Number of pallets must be greater than zero');
      return;
    }

    if (palletCount > 50) {
      setError('Maximum 50 pallets allowed per session');
      return;
    }

    setTotalPallets(palletCount);
    onContinue();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg border border-pallet-secondary">
        <div className="flex justify-center mb-6">
          <div className="bg-pallet-secondary p-4 rounded-full">
            <BoxesIcon className="h-12 w-12 text-pallet-primary" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Pallet Documentation
        </h1>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="palletCount" className="text-md">
              How many pallets do you need to document?
            </Label>
            <Input
              id="palletCount"
              type="text"
              inputMode="numeric"
              value={count}
              onChange={handleCountChange}
              placeholder="Enter number of pallets"
              className={`text-lg py-6 ${error ? 'border-red-500' : 'border-gray-300'}`}
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          
          <Button 
            onClick={handleContinue}
            className="w-full py-6 text-lg bg-pallet-primary hover:bg-pallet-accent"
            size="lg"
          >
            Continue
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PalletCountSelector;
