
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.b2693937385e4ebfb2bb4d7981b0fae9',
  appName: 'Pallet Documenter',
  webDir: 'dist',
  server: {
    url: "https://b2693937-385e-4ebf-b2bb-4d7981b0fae9.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  },
  android: {
    backgroundColor: "#F5F9FF"
  }
};

export default config;
