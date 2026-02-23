import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '@/lib/config';

export function createAuthenticatedSocket(): Socket {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return io(SOCKET_CONFIG.URL, {
    ...SOCKET_CONFIG.OPTIONS,
    auth: token ? { token } : undefined
  });
}

