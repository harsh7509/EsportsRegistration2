// frontend/src/context/SocketProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getToken } from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Toggle sockets via env if needed
  const ENABLE_SOCKET = (import.meta.env.VITE_ENABLE_SOCKET ?? 'true') !== 'false';

  // Use your Render backend in prod; localhost in dev
  const SOCKET_URL = useMemo(() => {
    return (
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.DEV
        ? 'http://localhost:4000'
        : 'https://esportsregistration2.onrender.com')
    );
  }, []);

  useEffect(() => {
    // Close if disabled or user is logged out
    if (!ENABLE_SOCKET || !isAuthenticated) {
      if (socket) {
        try { socket.close(); } catch {}
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = getToken();

    // Always connect directly to backend domain (Vercel won't tunnel WS)
    const s = io(SOCKET_URL, {
      path: '/socket.io',
      // Allow polling fallback to get through cold starts / proxies
      transports: ['websocket', 'polling'],
      auth: token ? { token: `Bearer ${token}` } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000, // handshake timeout
      withCredentials: false, // set true only if server uses cookies cross-site
    });

    s.on('connect', () => {
      setConnected(true);
      console.log('[socket] connected:', s.id);
    });

    s.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[socket] disconnected:', reason);
    });

    s.on('connect_error', (err) => {
      console.warn('[socket] connect_error:', err?.message || err);
    });

    setSocket(s);

    return () => {
      try { s.close(); } catch {}
      setConnected(false);
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, ENABLE_SOCKET, SOCKET_URL]);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
};
