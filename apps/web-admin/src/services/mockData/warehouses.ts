export interface Warehouse {
  id: string;
  facilityName: string;
  facilityCode: string;
  totalRacks: number;
  address: string;
  manager: string;
}

export const warehouses: Warehouse[] = [
  { id: 'wh-central-mumbai', facilityName: 'Central Distribution Warehouse', facilityCode: 'WH-CENTRAL-01', totalRacks: 24, address: 'Plot 14, Industrial Zone 4, Bhiwandi, Mumbai 421302', manager: 'David Miller' },
  { id: 'wh-cold-pune', facilityName: 'Cold Storage Hub', facilityCode: 'WH-COLD-02', totalRacks: 16, address: 'Cold Chain Logistics Park, Chakan, Pune 410501', manager: 'Pooja Nair' },
  { id: 'wh-gourmet-thane', facilityName: 'Gourmet & Specialty Vault', facilityCode: 'WH-GOURMET-03', totalRacks: 8, address: 'Specialty Foods Depot, Wagle Estate, Thane 400604', manager: 'Vikram Roy' },
  { id: 'wh-north-delhi', facilityName: 'North Regional Hub', facilityCode: 'WH-NORTH-04', totalRacks: 20, address: 'Sector 18, Logistics Park, Gurugram, Haryana 122015', manager: 'Simran Kaur' },
];

export const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.facilityName }));
