import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initSentry } from './monitoring/sentry';
import './index.css';

// Initialize Sentry client observability if configured
initSentry();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
