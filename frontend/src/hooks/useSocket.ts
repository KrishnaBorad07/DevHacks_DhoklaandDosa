// =============================================================================
// hooks/useSocket.ts – Singleton Socket.io-client hook
// =============================================================================
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Connect to backend; in dev, requests are proxied via vite.config.ts
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    // Create once — never recreate on disconnect (that would change the socket ID
    // and break server-side room membership lookup)
    socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

/** Returns a stable Socket.io socket instance shared across the app */
export function useSocket(): Socket {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    return () => {
      // Don't disconnect on unmount — we want a persistent connection
    };
  }, []);

  return socketRef.current;
}

export { getSocket };
