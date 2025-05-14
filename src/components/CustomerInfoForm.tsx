
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePallet } from '@/contexts/PalletContext';
import { UserIcon, ClipboardIcon, ArrowRightIcon } from 'lucide-react';

interface CustomerInfoFormProps {
  onContinue: () => void;
}

const CustomerInfoForm: React.FC<CustomerInfoFormProps> = ({ onContinue }) => {
  const { customerName, setCustomerName, poNumber, setPoNumber } = usePallet();
  const [errors, setErrors] = useState({ name: '', poNumber: '' });

  const validate = (): boolean => {
    let valid = true;
    const newErrors = { name: '', poNumber: '' };

    if (!customerName.trim()) {
      newErrors.name = 'Customer name is required';
      valid = false;
    }

    if (!poNumber.trim()) {
      newErrors.poNumber = 'PO Number is required';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleContinue = () => {
    if (validate()) {
      onContinue();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg border border-pallet-secondary">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Customer Information
        </h1>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="customerName" className="text-md flex items-center">
              <UserIcon className="h-4 w-4 mr-2" />
              Customer Name
            </Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              className={`text-lg py-5 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              autoFocus
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="poNumber" className="text-md flex items-center">
              <ClipboardIcon className="h-4 w-4 mr-2" />
              PO Number
            </Label>
            <Input
              id="poNumber"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Enter PO number"
              className={`text-lg py-5 ${errors.poNumber ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.poNumber && <p className="text-sm text-red-500">{errors.poNumber}</p>}
          </div>
          
          <Button 
            onClick={handleContinue}
            className="w-full py-6 text-lg bg-pallet-primary hover:bg-pallet-accent"
            size="lg"
          >
            Continue to Photos
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoForm;
