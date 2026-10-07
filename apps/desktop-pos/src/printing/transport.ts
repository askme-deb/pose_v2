import { buildEscPosReceipt, drawerKickBytes, type ReceiptData } from './escpos';
import { usePrinterStore, type PrinterMode } from './printerStore';

/** Modes the desktop build can offer (raw TCP and OS printers via Electron). */
export const SUPPORTED_MODES: PrinterMode[] = ['browser', 'network', 'system'];

export async function pairSerialPrinter(): Promise<void> {
  throw new Error('Use a network or installed system printer on the desktop POS');
}

async function sendNetwork(bytes: Uint8Array) {
  const { host, port } = usePrinterStore.getState();
  if (!host) throw new Error('Set the printer IP address in Printer settings');
  await window.posHardware.sendRawToPrinter(host, port, bytes);
}

/**
 * Prints a receipt with the configured printer. Returns false when the
 * caller should fall back to the browser print dialog.
 */
export async function printReceipt(data: ReceiptData, isCashSale: boolean): Promise<boolean> {
  const s = usePrinterStore.getState();
  if (s.mode === 'network') {
    await sendNetwork(buildEscPosReceipt(data, s.paperWidth, isCashSale && s.openDrawerOnCash));
    return true;
  }
  if (s.mode === 'system') {
    // Prints the on-screen receipt (print CSS isolates it) without a dialog.
    await window.posHardware.printSystem(s.systemPrinter);
    return true;
  }
  return false;
}

export async function openCashDrawer(): Promise<void> {
  if (usePrinterStore.getState().mode !== 'network') throw new Error('Cash drawer needs a network ESC/POS printer');
  await sendNetwork(drawerKickBytes());
}

export function listSystemPrinters(): Promise<string[]> {
  return window.posHardware.listPrinters();
}
