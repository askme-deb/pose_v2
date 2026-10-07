import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * - browser: the OS print dialog (window.print) — works everywhere.
 * - serial:  raw ESC/POS over Web Serial (USB thermal printers; web POS).
 * - network: raw ESC/POS over TCP 9100 (LAN/Wi-Fi printers; desktop POS).
 * - system:  silent print to an installed OS printer (desktop POS).
 */
export type PrinterMode = 'browser' | 'serial' | 'network' | 'system';

interface PrinterSettings {
  mode: PrinterMode;
  host: string;
  port: number;
  systemPrinter: string;
  paperWidth: 58 | 80;
  openDrawerOnCash: boolean;
  autoPrint: boolean;
  update: (patch: Partial<Omit<PrinterSettings, 'update'>>) => void;
}

export const usePrinterStore = create<PrinterSettings>()(
  persist(
    (set) => ({
      mode: 'browser',
      host: '',
      port: 9100,
      systemPrinter: '',
      paperWidth: 80,
      openDrawerOnCash: true,
      autoPrint: false,
      update: (patch) => set(patch),
    }),
    { name: 'pospe-printer' },
  ),
);

/** What this terminal reports as paired hardware in its heartbeat. */
export function describePeripherals(): string[] {
  const s = usePrinterStore.getState();
  const list: string[] = [];
  if (s.mode === 'serial') list.push(`USB thermal printer (${s.paperWidth}mm)`);
  if (s.mode === 'network' && s.host) list.push(`Network printer ${s.host}:${s.port}`);
  if (s.mode === 'system' && s.systemPrinter) list.push(`Printer: ${s.systemPrinter}`);
  if (s.mode !== 'browser' && s.mode !== 'system' && s.openDrawerOnCash) list.push('Cash drawer');
  return list;
}
