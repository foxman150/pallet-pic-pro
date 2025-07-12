import DOMPurify from 'dompurify';

// Input validation and sanitization
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim());
};

export const validateCustomerName = (name: string): { isValid: boolean; error?: string } => {
  const sanitized = sanitizeInput(name);
  if (!sanitized || sanitized.length === 0) {
    return { isValid: false, error: 'Customer name is required' };
  }
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Customer name must be less than 100 characters' };
  }
  if (!/^[a-zA-Z0-9\s\-_&.,]+$/.test(sanitized)) {
    return { isValid: false, error: 'Customer name contains invalid characters' };
  }
  return { isValid: true };
};

export const validatePoNumber = (po: string): { isValid: boolean; error?: string } => {
  const sanitized = sanitizeInput(po);
  if (!sanitized || sanitized.length === 0) {
    return { isValid: false, error: 'PO Number is required' };
  }
  if (sanitized.length > 50) {
    return { isValid: false, error: 'PO Number must be less than 50 characters' };
  }
  if (!/^[a-zA-Z0-9\-_]+$/.test(sanitized)) {
    return { isValid: false, error: 'PO Number contains invalid characters' };
  }
  return { isValid: true };
};

// Secure filename generation
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9\-_.]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 200);
};

export const generateSecureFilename = (customerName: string, poNumber: string, wrapStatus: string, palletIndex: number, sideIndex: number): string => {
  const sanitizedCustomer = sanitizeFilename(customerName);
  const sanitizedPo = sanitizeFilename(poNumber);
  const sanitizedWrap = sanitizeFilename(wrapStatus);
  const timestamp = Date.now();
  
  return `${sanitizedCustomer}_${sanitizedPo}_${sanitizedWrap}_Pallet${palletIndex}_Side${sideIndex}_${timestamp}.jpg`;
};

// Local storage encryption (simple implementation)
const ENCRYPTION_KEY = 'pallet_app_key_v1';

export const encryptData = (data: string): string => {
  // Simple XOR encryption for local storage
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
  }
  return btoa(encrypted);
};

export const decryptData = (encrypted: string): string => {
  try {
    const data = atob(encrypted);
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
    }
    return decrypted;
  } catch {
    return '';
  }
};

// Secure local storage operations
export const secureSetItem = (key: string, value: any): void => {
  try {
    const serialized = JSON.stringify(value);
    const encrypted = encryptData(serialized);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.warn('Failed to save data securely');
  }
};

export const secureGetItem = (key: string): any => {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    const decrypted = decryptData(encrypted);
    if (!decrypted) return null;
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.warn('Failed to retrieve data securely');
    return null;
  }
};

// File validation
export const validatePhotoFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large. Maximum 10MB allowed.' };
  }
  
  return { isValid: true };
};

// Error handling
export const secureError = (message: string, details?: any): void => {
  // Log securely without exposing sensitive information
  console.warn('Application Error:', message);
  // In production, send to secure logging service
};

export const getUserFriendlyError = (error: any): string => {
  // Return generic error messages to prevent information disclosure
  if (error?.message?.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (error?.message?.includes('permission') || error?.message?.includes('unauthorized')) {
    return 'Permission denied. Please check your access rights.';
  }
  return 'An unexpected error occurred. Please try again.';
};