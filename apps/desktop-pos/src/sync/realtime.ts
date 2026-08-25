import { io, type Socket } from 'socket.io-client';
import { usePosSessionStore } from '../store/usePosSessionStore';
import { upsertProducts } from '../offline/posDB';
import type { LiveProduct } from '../services/api/products';

// Connects directly to synchronization-service's own port rather than
// through api-gateway's HTTP proxy — a dedicated realtime endpoint, not
// something http-proxy-middleware needs to know how to upgrade.
const SYNC_WS_URL = (import.meta.env.VITE_SYNC_WS_URL as string | undefined) ?? 'http://localhost:4010';

// Any open screen (PosTouchPage) that keeps its own product state listens for
// this instead of the realtime layer needing to know about React at all.
export const PRODUCTS_UPDATED_EVENT = 'pospe:products-updated';

let socket: Socket | null = null;

// Any terminal's synced sale can change what's actually left in stock. The
// server broadcasts the real, already-updated product rows — not just their
// ids — so this patches the local cache directly with no refetch of any
// kind: genuinely incremental, not "poll on push."
export function startRealtimeSync(): () => void {
  const token = usePosSessionStore.getState().token;
  if (!token) return () => {};

  socket = io(SYNC_WS_URL, { auth: { token }, transports: ['websocket', 'polling'] });

  socket.on('inventory:changed', (payload: { storeId: string; products: LiveProduct[] }) => {
    if (!payload.products?.length) return;
    upsertProducts(payload.products)
      .then(() => {
        window.dispatchEvent(new CustomEvent<LiveProduct[]>(PRODUCTS_UPDATED_EVENT, { detail: payload.products }));
      })
      .catch(() => {
        // Best-effort — the cache just stays one sale behind until the next event.
      });
  });

  return () => {
    socket?.disconnect();
    socket = null;
  };
}
