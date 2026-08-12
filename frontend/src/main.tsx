import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/index';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppearanceProvider } from './contexts/AppearanceContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppearanceProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </AppearanceProvider>
  </React.StrictMode>
);
