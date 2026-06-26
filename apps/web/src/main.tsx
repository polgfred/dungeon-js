import { createRoot } from 'react-dom/client';

import App from './ui/App.js';

import './styles/theme.css';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const docEl = document.documentElement;
try {
  await document.fonts.ready;
  docEl.classList.remove('fonts-loading');
  docEl.classList.add('fonts-loaded');
} catch {
  docEl.classList.remove('fonts-loading');
  docEl.classList.add('fonts-failed');
}

createRoot(rootElement).render(<App />);
