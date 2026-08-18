import Razorpay from 'razorpay';

let client: Razorpay | null = null;
let attempted = false;

/**
 * Returns null (not a thrown error) when RAZORPAY_KEY_ID/SECRET aren't set —
 * every caller must handle "gateway not configured" as a real, expected
 * outcome rather than a crash. Blank in this environment; a deployment with
 * real credentials just works.
 */
export function getRazorpayClient(): Razorpay | null {
  if (client || attempted) return client;
  attempted = true;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;

  client = new Razorpay({ key_id, key_secret });
  return client;
}

export { default as RazorpaySdk } from 'razorpay';
