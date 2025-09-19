import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getToken } from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Allow turning sockets off if backend isn't ready
  const ENABLE_SOCKET = (import.meta.env.VITE_ENABLE_SOCKET ?? 'true') !== 'false';

  // Prefer env, else fallback to 4000
  const SOCKET_URL = useMemo(() => {
    return import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
  }, []);

  useEffect(() => {
    if (!ENABLE_SOCKET || !isAuthenticated) {
      // clean up any existing socket
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = getToken();
    let s;
    try {
      s = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket'],
        auth: { token: token ? `Bearer ${token}` : undefined },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    } catch (e) {
      console.warn('Socket init failed:', e?.message || e);
      setSocket(null);
      setConnected(false);
      return;
    }

    s.on('connect', () => {
      setConnected(true);
      console.log('[socket] connected', s.id);
    });

    s.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[socket] disconnected:', reason);
    });

    s.on('connect_error', (err) => {
      // This will fire on 404 from server; we just warn and keep UI alive
      console.warn('[socket] connect_error:', err?.message || err);
    });

    setSocket(s);

    return () => {
      try { s?.close(); } catch {}
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
