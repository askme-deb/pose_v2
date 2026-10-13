import { prisma } from './prisma';

// Expo's push service fans out to FCM/APNs for the mobile app's Expo push
// tokens. EXPO_ACCESS_TOKEN is only needed if "enhanced push security" is on
// for the Expo project.
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

export interface PushMessage {
  title: string;
  body: string;
  /** Read by the app to pick the screen a tap opens (e.g. { type: 'low-stock' }). */
  data?: Record<string, string>;
}

export interface PushAudience {
  tenantId: string;
  /** Which parts of the app should get it: owner, manager, cashier. */
  appIds: string[];
  storeId?: string | null;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/**
 * Sends to every registered device in the audience. Never throws: a push
 * failure must not make a queued job retry (and re-send its email).
 */
export async function sendPush(audience: PushAudience, message: PushMessage): Promise<number> {
  try {
    const rows = await prisma.pushToken.findMany({
      where: {
        tenantId: audience.tenantId,
        appId: { in: audience.appIds },
        ...(audience.storeId ? { OR: [{ storeId: audience.storeId }, { storeId: null }] } : {}),
      },
      select: { token: true },
    });
    const tokens = rows.map((r) => r.token);
    let sent = 0;
    for (let i = 0; i < tokens.length; i += BATCH) {
      const chunk = tokens.slice(i, i + BATCH);
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(chunk.map((to) => ({ to, title: message.title, body: message.body, data: message.data ?? {}, sound: 'default', priority: 'high' }))),
      });
      if (!response.ok) {
        console.warn(`[notification-service] Expo push responded ${response.status}`);
        continue;
      }
      const { data } = (await response.json()) as { data?: ExpoTicket[] };
      // Uninstalled app / revoked permission: stop sending to that token.
      const dead = (data ?? []).flatMap((ticket, idx) => (ticket.details?.error === 'DeviceNotRegistered' ? [chunk[idx]] : []));
      if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
      sent += (data ?? []).filter((t) => t.status === 'ok').length;
    }
    return sent;
  } catch (err) {
    console.warn('[notification-service] push failed:', (err as Error).message);
    return 0;
  }
}
