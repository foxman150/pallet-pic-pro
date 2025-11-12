import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('[pallet-app] Bootstrapping React app');
window.addEventListener('error', (e) => {
  console.error('[pallet-app] Global error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[pallet-app] Unhandled promise rejection:', e.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
