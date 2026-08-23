import { io, Socket } from 'socket.io-client';

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export const socket: Socket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true,
});
