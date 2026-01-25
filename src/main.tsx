import { createRoot } from 'react-dom/client';

import "@mui/material-pigment-css/styles.css";

import App from './App.js';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(<App />);
