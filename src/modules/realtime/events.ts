import { getIo } from './server';

export function emitToRoom(room: string, event: string, data: any) {
  const io = getIo();
  io.to(room).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: any) {
  const io = getIo();
  io.to(`user-${userId}`).emit(event, data);
}
