// frontend/src/context/SocketContext.jsx (या जहाँ भी यूज़ करते हों)
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getToken } from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  const ENABLE_SOCKET = (import.meta.env.VITE_ENABLE_SOCKET ?? 'true') !== 'false';
  const SOCKET_URL = useMemo(
    () => (import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000').replace(/\/+$/, ''),
    []
  );

  useEffect(() => {
    if (!ENABLE_SOCKET || !isAuthenticated) {
      socket?.close();
      setSocket(null);
      setConnected(false);
      return;
    }

    const token = getToken();

    const s = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: token ? { token: `Bearer ${token}` } : undefined,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (err) => console.warn('[socket] connect_error:', err?.message || err));

    setSocket(s);
    return () => { try { s.close(); } catch {} setConnected(false); setSocket(null); };
  }, [isAuthenticated, ENABLE_SOCKET, SOCKET_URL]);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
};
