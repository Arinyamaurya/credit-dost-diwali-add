import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Import full design system (tokens → animations → base → hero → cards → form)
import './index.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
