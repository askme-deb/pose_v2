import { describePeripherals } from '../printing/printerStore';

export interface DeviceTelemetry {
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  batteryPercent?: number;
  peripherals: string[];
}

const PLATFORM_NAMES: Record<string, string> = { win32: 'windows', darwin: 'macos', linux: 'linux' };

// Chromium reports a full, charging battery on machines that have none.
const isMainsOnly = (b: { level: number; charging: boolean; chargingTime: number }) => b.level === 1 && b.charging && b.chargingTime === 0;

/** Device details for the back-office terminal fleet view (via Electron). */
export async function collectTelemetry(): Promise<DeviceTelemetry> {
  let info: { platform: string; osVersion: string; appVersion: string } | null = null;
  try {
    info = await window.posHardware.deviceInfo();
  } catch {
    // Older shell without the hardware bridge — report what we can.
  }
  let batteryPercent: number | undefined;
  try {
    const battery = await (navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; chargingTime: number }> }).getBattery?.();
    if (battery && !isMainsOnly(battery)) batteryPercent = Math.round(battery.level * 100);
  } catch {
    // No battery (desktop PC) — leave unreported.
  }
  return {
    platform: info ? (PLATFORM_NAMES[info.platform] ?? info.platform) : 'desktop',
    osVersion: info?.osVersion,
    appVersion: info?.appVersion,
    batteryPercent,
    peripherals: describePeripherals(),
  };
}
