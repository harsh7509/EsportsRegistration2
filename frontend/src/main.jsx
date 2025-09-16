import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './styles/index.css';

// Use Vite env; fall back so providers don't crash if env is missing.
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
if (!import.meta.env.VITE_API_URL) {
  console.warn('[Vite] VITE_API_URL not set. Using default:', API);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* If any provider/child throws, you'll see a readable error instead of a white screen */}
      <ErrorBoundary>
        <AuthProvider apiBase={API}>
          <ErrorBoundary>
            <SocketProvider apiBase={API}>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </SocketProvider>
          </ErrorBoundary>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
