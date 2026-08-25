import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyToken } from '@pospe/permissions';

let io: SocketIOServer | null = null;

// One Socket.IO room per tenant. A terminal that successfully syncs — or any
// route elsewhere that wants to nudge other terminals to refresh — broadcasts
// into this room instead of every client polling the catalog on a timer.
export function initRealtime(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const user = token ? verifyToken(token) : null;
    if (!user) return next(new Error('Unauthorized'));
    socket.data.tenantId = user.tenantId;
    next();
  });

  io.on('connection', (socket) => {
    socket.join(`tenant:${socket.data.tenantId}`);
  });

  return io;
}

// Same shape apps/web-pos and apps/desktop-pos already cache locally
// (services/api/products.ts's LiveProduct) — carrying the real rows here
// means a receiving terminal can patch its cache directly instead of
// re-fetching the whole catalog just to learn what changed.
export interface SyncedProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  gstRate: number;
  sellingPrice: number;
  costPrice: number;
  stockQty: number;
  minThreshold: number;
  imageUrl: string;
}

export function broadcastInventoryChanged(
  tenantId: string,
  payload: { storeId: string; products: SyncedProduct[] },
) {
  io?.to(`tenant:${tenantId}`).emit('inventory:changed', payload);
}

export function connectedDeviceCount(tenantId: string): number {
  return io?.sockets.adapter.rooms.get(`tenant:${tenantId}`)?.size ?? 0;
}
