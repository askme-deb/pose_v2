export interface FleetDevice {
  id: string;
  deviceName: string;
  serial: string;
  assignedBranch: string;
  register: string;
  os: 'android' | 'ios';
  osVersion: string;
  pairedPeripherals: string[];
  batteryPercent: number;
  status: 'online' | 'offline' | 'syncing';
  syncQueueCount: number;
}

export const fleetDevices: FleetDevice[] = [
  { id: 'DEV-901', deviceName: 'Mobile POS Terminal #1', serial: 'SN-APX-88102', assignedBranch: 'Downtown Flagship', register: 'Lane 04', os: 'ios', osVersion: '17.4', pairedPeripherals: ['Thermal Printer', 'Socket Scanner'], batteryPercent: 92, status: 'online', syncQueueCount: 0 },
  { id: 'DEV-902', deviceName: 'Stock Audit Scanner A', serial: 'SN-APX-77401', assignedBranch: 'Westside Megastore', register: 'Warehouse A', os: 'android', osVersion: '14', pairedPeripherals: ['Zebra Cam Scanner'], batteryPercent: 85, status: 'online', syncQueueCount: 0 },
  { id: 'DEV-903', deviceName: 'Delivery Handheld #4', serial: 'SN-APX-66290', assignedBranch: 'Airport Express', register: 'Van #02', os: 'android', osVersion: '13', pairedPeripherals: ['GPS Module', 'E-Signature Pad'], batteryPercent: 45, status: 'online', syncQueueCount: 2 },
  { id: 'DEV-904', deviceName: 'Loyalty Kiosk Pass', serial: 'SN-APX-55102', assignedBranch: 'Downtown Flagship', register: 'Customer Hub', os: 'ios', osVersion: '17.2', pairedPeripherals: ['NFC Reader', 'QR Camera'], batteryPercent: 100, status: 'online', syncQueueCount: 0 },
  { id: 'DEV-905', deviceName: 'Mobile POS Terminal #2', serial: 'SN-APX-99310', assignedBranch: 'Northside Mart', register: 'Lane 02', os: 'ios', osVersion: '17.4', pairedPeripherals: ['Bluetooth Printer'], batteryPercent: 78, status: 'online', syncQueueCount: 0 },
  { id: 'DEV-906', deviceName: 'Stock Audit Scanner B', serial: 'SN-APX-11209', assignedBranch: 'Central Warehouse', register: 'Rack B4', os: 'android', osVersion: '14', pairedPeripherals: ['Honeywell Barcode Gun'], batteryPercent: 64, status: 'syncing', syncQueueCount: 14 },
  { id: 'DEV-907', deviceName: 'Delivery Driver #12', serial: 'SN-APX-44910', assignedBranch: 'Southside Hub', register: 'Van #05', os: 'android', osVersion: '13', pairedPeripherals: ['Mobile Thermal Printer'], batteryPercent: 19, status: 'offline', syncQueueCount: 5 },
  { id: 'DEV-908', deviceName: 'Pop-up Kiosk POS', serial: 'SN-APX-33019', assignedBranch: 'Eastside Mall', register: 'Pop-up 01', os: 'android', osVersion: '14', pairedPeripherals: ['Cash Drawer', 'Receipt Printer'], batteryPercent: 100, status: 'online', syncQueueCount: 0 },
  { id: 'DEV-909', deviceName: 'Mobile POS Terminal #3', serial: 'SN-APX-20144', assignedBranch: 'Westside Megastore', register: 'Lane 07', os: 'ios', osVersion: '17.5', pairedPeripherals: ['Thermal Printer', 'NFC Reader'], batteryPercent: 56, status: 'online', syncQueueCount: 0 },
  { id: 'DEV-910', deviceName: 'Loyalty Kiosk Pass B', serial: 'SN-APX-60233', assignedBranch: 'Airport Express', register: 'Customer Hub', os: 'android', osVersion: '14', pairedPeripherals: ['NFC Reader'], batteryPercent: 8, status: 'offline', syncQueueCount: 3 },
];

export const fleetBranchOptions = Array.from(new Set(fleetDevices.map((d) => d.assignedBranch))).map((b) => ({
  value: b,
  label: b,
}));
