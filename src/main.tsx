import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Auto-register service worker for offline capability & PWA installability across all browsers
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('TBD PWA Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('PWA Service Worker registration non-fatal notice:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
