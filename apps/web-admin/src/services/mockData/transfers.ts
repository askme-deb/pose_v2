import { products } from './products';

export interface TransferItem {
  productId: string;
  qty: number;
}

export type TransferStatus = 'in-transit' | 'completed';

export interface Transfer {
  id: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: TransferItem[];
  totalValuation: number;
  carrier: string;
  status: TransferStatus;
  createdAt: string;
}

const costById: Record<string, number> = Object.fromEntries(products.map((p) => [p.id, p.costPrice]));

export const transferValuation = (items: TransferItem[]): number =>
  items.reduce((sum, i) => sum + i.qty * (costById[i.productId] ?? 0), 0);

const rawTransfers: Array<Omit<Transfer, 'totalValuation'>> = [
  {
    id: 'TRF-6011',
    sourceWarehouseId: 'wh-central-mumbai',
    destinationWarehouseId: 'wh-cold-pune',
    items: [
      { productId: 'prd-001', qty: 150 },
      { productId: 'prd-008', qty: 80 },
    ],
    carrier: 'Apex Fleet Truck #4 (Driver Manoj Kumar)',
    status: 'completed',
    createdAt: '2026-08-10T16:30:00+05:30',
  },
  {
    id: 'TRF-6012',
    sourceWarehouseId: 'wh-cold-pune',
    destinationWarehouseId: 'wh-gourmet-thane',
    items: [{ productId: 'prd-003', qty: 200 }],
    carrier: 'Refrigerated Logistics Unit #2',
    status: 'in-transit',
    createdAt: '2026-08-14T09:15:00+05:30',
  },
  {
    id: 'TRF-6013',
    sourceWarehouseId: 'wh-central-mumbai',
    destinationWarehouseId: 'wh-north-delhi',
    items: [
      { productId: 'prd-006', qty: 400 },
      { productId: 'prd-012', qty: 150 },
    ],
    carrier: 'Apex Fleet Truck #1',
    status: 'completed',
    createdAt: '2026-08-08T11:45:00+05:30',
  },
  {
    id: 'TRF-6014',
    sourceWarehouseId: 'wh-gourmet-thane',
    destinationWarehouseId: 'wh-central-mumbai',
    items: [
      { productId: 'prd-007', qty: 120 },
      { productId: 'prd-011', qty: 60 },
    ],
    carrier: 'Secured Transit Logistics',
    status: 'in-transit',
    createdAt: '2026-08-15T08:50:00+05:30',
  },
  {
    id: 'TRF-6015',
    sourceWarehouseId: 'wh-north-delhi',
    destinationWarehouseId: 'wh-cold-pune',
    items: [{ productId: 'prd-002', qty: 100 }],
    carrier: 'Cargo Express Van #3',
    status: 'completed',
    createdAt: '2026-08-07T14:20:00+05:30',
  },
  {
    id: 'TRF-6016',
    sourceWarehouseId: 'wh-central-mumbai',
    destinationWarehouseId: 'wh-gourmet-thane',
    items: [
      { productId: 'prd-009', qty: 250 },
      { productId: 'prd-004', qty: 90 },
    ],
    carrier: 'Apex Fleet Truck #2',
    status: 'completed',
    createdAt: '2026-08-05T10:00:00+05:30',
  },
  {
    id: 'TRF-6017',
    sourceWarehouseId: 'wh-cold-pune',
    destinationWarehouseId: 'wh-north-delhi',
    items: [
      { productId: 'prd-005', qty: 300 },
      { productId: 'prd-010', qty: 150 },
    ],
    carrier: 'Northbound Freight Carrier',
    status: 'in-transit',
    createdAt: '2026-08-16T07:40:00+05:30',
  },
  {
    id: 'TRF-6018',
    sourceWarehouseId: 'wh-north-delhi',
    destinationWarehouseId: 'wh-central-mumbai',
    items: [{ productId: 'prd-001', qty: 180 }],
    carrier: 'Apex Fleet Truck #3',
    status: 'completed',
    createdAt: '2026-08-06T13:10:00+05:30',
  },
];

export const transfers: Transfer[] = rawTransfers.map((t) => ({ ...t, totalValuation: transferValuation(t.items) }));
