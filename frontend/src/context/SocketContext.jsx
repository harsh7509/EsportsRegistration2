// src/context/SocketProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getToken } from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Allow disabling via env if backend not ready
  const ENABLE_SOCKET = (import.meta.env.VITE_ENABLE_SOCKET ?? 'true') !== 'false';

  // Prefer env; dev fallback only
  const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!ENABLE_SOCKET || !isAuthenticated || !SOCKET_URL) {
      if (socket) {
        try { socket.close(); } catch {}
      }
      setSocket(null);
      setConnected(false);
      return;
    }

    const token = getToken();

    const s = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // allow fallback for cold starts/proxies
      auth: token ? { token: `Bearer ${token}` } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000, // handshake timeout
      withCredentials: false, // set true only if server uses cookie auth cross-site
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
