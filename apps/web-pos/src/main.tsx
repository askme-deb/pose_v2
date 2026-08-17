import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/globals.css';

// vite-plugin-pwa already builds a service worker on every build — it was
// just never registered, so the offline app shell was never actually
// cacheable. This is what makes it real.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
