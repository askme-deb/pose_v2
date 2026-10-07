import { describePeripherals } from '../printing/printerStore';

export interface DeviceTelemetry {
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  batteryPercent?: number;
  peripherals: string[];
}

interface NavigatorExtras {
  userAgentData?: { platform?: string };
  getBattery?: () => Promise<{ level: number; charging: boolean; chargingTime: number }>;
}

function platformName(): string {
  const nav = navigator as Navigator & NavigatorExtras;
  const raw = (nav.userAgentData?.platform || navigator.platform || '').toLowerCase();
  if (raw.includes('android')) return 'android';
  if (/iphone|ipad|ios/.test(raw)) return 'ios';
  if (raw.includes('win')) return 'windows';
  if (raw.includes('mac')) return 'macos';
  if (raw.includes('linux')) return 'linux';
  return 'web';
}

// Chromium reports a full, charging battery on machines that have none.
const isMainsOnly = (b: { level: number; charging: boolean; chargingTime: number }) => b.level === 1 && b.charging && b.chargingTime === 0;

/** Best-effort device details for the back-office terminal fleet view. */
export async function collectTelemetry(): Promise<DeviceTelemetry> {
  const nav = navigator as Navigator & NavigatorExtras;
  let batteryPercent: number | undefined;
  try {
    const battery = await nav.getBattery?.();
    if (battery && !isMainsOnly(battery)) batteryPercent = Math.round(battery.level * 100);
  } catch {
    // Battery API unavailable (Firefox/Safari) — leave unreported.
  }
  return {
    platform: platformName(),
    appVersion: import.meta.env.VITE_APP_VERSION ?? 'web',
    batteryPercent,
    peripherals: describePeripherals(),
  };
}
