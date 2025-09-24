
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePallet } from '@/contexts/PalletContext';
import { BoxesIcon, ArrowRightIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PalletCountSelectorProps {
  onContinue: () => void;
}

const PalletCountSelector: React.FC<PalletCountSelectorProps> = ({ onContinue }) => {
  const { totalPallets, setTotalPallets } = usePallet();
  const [count, setCount] = useState<string>(totalPallets > 0 ? totalPallets.toString() : '');
  const [error, setError] = useState<string>('');
  const isMobile = useIsMobile();

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
    <div className="flex flex-col items-center justify-center min-h-screen-safe p-4 pt-safe-top pb-safe-bottom">
      <div className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'} ${isMobile ? 'p-6' : 'p-8'} bg-white rounded-lg shadow-lg border border-pallet-secondary`}>
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="bg-pallet-secondary p-3 sm:p-4 rounded-full">
            <BoxesIcon className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-pallet-primary`} />
          </div>
        </div>
        
        <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-center mb-4 sm:mb-6 text-gray-800`}>
          Pallet Documentation
        </h1>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="palletCount" className={`${isMobile ? 'text-sm' : 'text-md'} font-medium`}>
              How many pallets do you need to document?
            </Label>
            <Input
              id="palletCount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={count}
              onChange={handleCountChange}
              placeholder="Enter number of pallets"
              className={`${isMobile ? 'text-base py-4' : 'text-lg py-6'} min-h-touch ${error ? 'border-red-500' : 'border-gray-300'}`}
              autoFocus={!isMobile} // Don't auto-focus on mobile to prevent keyboard pop-up
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
          
          <Button 
            onClick={handleContinue}
            disabled={!count.trim()}
            className={`w-full ${isMobile ? 'py-4 text-base' : 'py-6 text-lg'} min-h-touch bg-pallet-primary hover:bg-pallet-accent active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed`}
            size="lg"
          >
            Continue
            <ArrowRightIcon className={`ml-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
          </Button>

          {/* Mobile optimization hint */}
          {isMobile && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Tap the number field to enter pallet count
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PalletCountSelector;
