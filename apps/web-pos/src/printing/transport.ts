import { buildEscPosReceipt, drawerKickBytes, type ReceiptData } from './escpos';
import { usePrinterStore, type PrinterMode } from './printerStore';

// Web Serial isn't in TypeScript's DOM lib yet; just what we use.
interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
}
interface SerialLike {
  requestPort(): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}
const serial = (): SerialLike | undefined => (navigator as Navigator & { serial?: SerialLike }).serial;

/** Modes this build can offer (the web POS has no raw TCP or OS printer access). */
export const SUPPORTED_MODES: PrinterMode[] = serial() ? ['browser', 'serial'] : ['browser'];

/** Asks the user to pick the USB printer once; Chrome remembers the grant. */
export async function pairSerialPrinter(): Promise<void> {
  const api = serial();
  if (!api) throw new Error('This browser does not support USB printers (use Chrome or Edge).');
  await api.requestPort();
}

async function writeSerial(bytes: Uint8Array) {
  const api = serial();
  if (!api) throw new Error('USB printing is not supported in this browser');
  const [port] = await api.getPorts();
  if (!port) throw new Error('No USB printer paired. Open Printer settings and pair one.');
  await port.open({ baudRate: 9600 });
  try {
    const writer = port.writable!.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
  } finally {
    await port.close();
  }
}

/**
 * Prints a receipt with the configured printer. Returns false when the
 * caller should fall back to the browser print dialog.
 */
export async function printReceipt(data: ReceiptData, isCashSale: boolean): Promise<boolean> {
  const s = usePrinterStore.getState();
  if (s.mode !== 'serial') return false;
  await writeSerial(buildEscPosReceipt(data, s.paperWidth, isCashSale && s.openDrawerOnCash));
  return true;
}

export async function openCashDrawer(): Promise<void> {
  if (usePrinterStore.getState().mode !== 'serial') throw new Error('Cash drawer needs a USB thermal printer');
  await writeSerial(drawerKickBytes());
}

export async function listSystemPrinters(): Promise<string[]> {
  return [];
}
