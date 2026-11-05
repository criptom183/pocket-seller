import { createRoot } from 'react-dom/client';
import './hooks/usePWAInstall';
import App from './App.tsx';
import './index.css';

const mountEl = document.getElementById('pwa-install-root') || document.getElementById('root');
if (mountEl) {
  createRoot(mountEl).render(<App />);
}
