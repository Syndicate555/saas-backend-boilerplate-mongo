import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../../core/config/env';
import { logger } from '../../core/config/logger';
import { verifyClerkToken } from '../auth/middleware';

let io: SocketIOServer;

export function setupSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      // FIX: Use bracket notation for 'token' property access
      const token = socket.handshake.auth?.['token'];
      if (!token) {
        return next(new Error('Authentication failed'));
      }
      const user = await verifyClerkToken(token);
      (socket as any).data = { user };
      return next();
    } catch (err) {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).data.user;
    logger.info(`User connected: ${user.id}`);
    socket.join(`user-${user.id}`);
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${user.id}`);
    });
  });
  return io;
}

export function getIo() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
