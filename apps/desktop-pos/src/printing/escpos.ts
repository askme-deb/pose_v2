// Minimal ESC/POS receipt encoder for 58 mm (32 col) and 80 mm (48 col)
// thermal printers (Epson TM, TVS, Rugtek, Xprinter and other ESC/POS
// compatibles). Produces raw bytes; a transport (serial / network) sends them.

export interface ReceiptLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptData {
  storeName: string;
  headerLines?: string[];
  invoiceNumber: string;
  cashier: string;
  register: string;
  createdAt: string;
  customerName?: string;
  items: ReceiptLine[];
  subtotal: number;
  discount?: number;
  gst: number;
  total: number;
  method: string;
  tendered?: number;
  change?: number;
  offline?: boolean;
  footer?: string;
}

const ESC = 0x1b;
const GS = 0x1d;

const INIT = [ESC, 0x40];
const ALIGN_LEFT = [ESC, 0x61, 0];
const ALIGN_CENTER = [ESC, 0x61, 1];
const BOLD_ON = [ESC, 0x45, 1];
const BOLD_OFF = [ESC, 0x45, 0];
const DOUBLE_ON = [GS, 0x21, 0x11];
const DOUBLE_OFF = [GS, 0x21, 0x00];
const FEED_AND_CUT = [ESC, 0x64, 4, GS, 0x56, 0x42, 0x00];
// Pulse drawer pin 2 for 50 ms on / 500 ms off.
export const DRAWER_KICK = [ESC, 0x70, 0x00, 0x19, 0xfa];

/** Thermal printers' default code page is ASCII-only; map what we can. */
function ascii(text: string): string {
  return text
    .replace(/₹/g, 'Rs.')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '');
}

const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function columns(left: string, right: string, width: number): string {
  const l = ascii(left);
  const r = ascii(right);
  const space = width - r.length;
  return (l.length > space - 1 ? l.slice(0, Math.max(0, space - 1)) : l).padEnd(space) + r;
}

export function buildEscPosReceipt(data: ReceiptData, paperWidth: 58 | 80 = 80, openDrawer = false): Uint8Array {
  const width = paperWidth === 58 ? 32 : 48;
  const bytes: number[] = [];
  const raw = (cmd: number[]) => bytes.push(...cmd);
  const line = (text = '') => {
    for (const ch of ascii(text)) bytes.push(ch.charCodeAt(0));
    bytes.push(0x0a);
  };
  const rule = () => line('-'.repeat(width));

  raw(INIT);
  if (openDrawer) raw(DRAWER_KICK);

  raw(ALIGN_CENTER);
  raw(BOLD_ON);
  raw(DOUBLE_ON);
  line(data.storeName);
  raw(DOUBLE_OFF);
  raw(BOLD_OFF);
  for (const h of data.headerLines ?? []) line(h);
  if (data.offline) line('** OFFLINE - PENDING SYNC **');
  raw(BOLD_ON);
  line(data.invoiceNumber);
  raw(BOLD_OFF);
  line(`${data.register} | ${data.cashier}`);
  line(new Date(data.createdAt).toLocaleString('en-IN'));

  raw(ALIGN_LEFT);
  rule();
  for (const item of data.items) {
    line(item.name.slice(0, width));
    line(columns(`  ${item.quantity} x ${money(item.unitPrice)}`, money(item.lineTotal), width));
  }
  rule();
  line(columns('Subtotal', money(data.subtotal), width));
  if (data.discount) line(columns('Discount', `-${money(data.discount)}`, width));
  line(columns('GST', money(data.gst), width));
  raw(BOLD_ON);
  line(columns('TOTAL', `Rs. ${money(data.total)}`, width));
  raw(BOLD_OFF);
  line(columns('Paid by', data.method, width));
  if (data.tendered !== undefined) line(columns('Tendered', money(data.tendered), width));
  if (data.change !== undefined) line(columns('Change', money(data.change), width));
  if (data.customerName) line(columns('Customer', data.customerName, width));
  rule();

  raw(ALIGN_CENTER);
  line(data.footer ?? 'Thank you! Visit again.');
  raw(FEED_AND_CUT);
  return new Uint8Array(bytes);
}

export const drawerKickBytes = () => new Uint8Array([...INIT, ...DRAWER_KICK]);
