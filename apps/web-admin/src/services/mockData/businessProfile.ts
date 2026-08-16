export interface BusinessProfile {
  registeredName: string;
  tagline: string;
  logoUrl: string;
  retailCategory: string;
  cin: string;
  yearEstablished: number;
  supportEmail: string;
  helplinePhone: string;
  hqAddress: string;
  gstin: string;
  pan: string;
  stateCode: string;
  defaultTaxSlab: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  currencySymbol: string;
  financialYearStart: string;
  ewayBillThreshold: number;
  receiptHeader: string;
  receiptSubHeader: string;
  receiptFooter: string;
  receiptReturnPolicy: string;
  receiptPaperWidth: '80mm' | '58mm';
  receiptShowUpiQr: boolean;
  razorpayKeyId: string;
  whatsappPhoneId: string;
}

export const businessProfile: BusinessProfile = {
  registeredName: 'Apex Supermarket Chain Pvt Ltd',
  tagline: 'Fresh Organic Produce & Daily Essentials',
  logoUrl: '',
  retailCategory: 'supermarket',
  cin: 'U52100MH2021PTC368920',
  yearEstablished: 2021,
  supportEmail: 'support@apexsupermarket.com',
  helplinePhone: '+91 (022) 4988-7700',
  hqAddress: 'Apex Tower, 4th Floor, Commercial Zone 9, BKC, Bandra East, Mumbai - 400051, Maharashtra, India',
  gstin: '27AAAAA0000A1Z5',
  pan: 'AAAAA0000A',
  stateCode: '27',
  defaultTaxSlab: 18,
  invoicePrefix: 'INV-2026-',
  nextInvoiceNumber: 9822,
  currencySymbol: '₹',
  financialYearStart: 'April',
  ewayBillThreshold: 50000,
  receiptHeader: 'APEX SUPERMARKET',
  receiptSubHeader: 'Downtown Flagship Branch • Call: 022-49887700',
  receiptFooter: 'Thank you for shopping at Apex Supermarket! Visit again soon.',
  receiptReturnPolicy: 'Returns accepted within 7 days with original invoice receipt. Perishables non-returnable.',
  receiptPaperWidth: '80mm',
  receiptShowUpiQr: true,
  razorpayKeyId: 'rzp_live_98820199481729',
  whatsappPhoneId: '+91 98201 99887',
};

export type BranchType = 'Flagship' | 'Express' | 'Central Warehouse';

export interface Branch {
  id: string;
  name: string;
  code: string;
  type: BranchType;
  manager: string;
  phone: string;
  address: string;
  isPrimary?: boolean;
  printers: number;
}

export const branches: Branch[] = [
  { id: 'br-101', name: 'Downtown Flagship', code: 'BR-DT-01', type: 'Flagship', manager: 'Sarah Jenkins', phone: '+91 (022) 4988-7701', address: 'Plot 12, Main MG Road, Fort, Mumbai - 400001', isPrimary: true, printers: 3 },
  { id: 'br-102', name: 'Suburban Outlet', code: 'BR-SUB-02', type: 'Flagship', manager: 'Marcus Vance', phone: '+91 (022) 4988-7702', address: 'Shop 4-7, Hyper City Mall, Andheri West, Mumbai - 400053', isPrimary: false, printers: 2 },
  { id: 'br-103', name: 'Airport Express Kiosk', code: 'BR-AIR-03', type: 'Express', manager: 'Priya Sharma', phone: '+91 (022) 4988-7703', address: 'Terminal 2 Departure Hall, Chhatrapati Shivaji Airport, Mumbai - 400099', isPrimary: false, printers: 1 },
  { id: 'br-104', name: 'Central Warehouse A', code: 'WH-CEN-01', type: 'Central Warehouse', manager: 'Elena Rostova', phone: '+91 (022) 4988-7704', address: 'Bhiwandi Logistics Hub, Gate 4, Thane - 421302', isPrimary: false, printers: 1 },
];

export const branchTypeOptions: { value: BranchType; label: string }[] = [
  { value: 'Flagship', label: 'Flagship Retail Store' },
  { value: 'Express', label: 'Express Kiosk / Mini Outlet' },
  { value: 'Central Warehouse', label: 'Central Warehouse Hub' },
];

export const retailCategoryOptions = [
  { value: 'supermarket', label: 'Supermarket / Grocery Chain' },
  { value: 'apparel', label: 'Apparel & Fashion Boutique' },
  { value: 'restaurant', label: 'Restaurant & QSR Food Chain' },
  { value: 'pharmacy', label: 'Pharmacy & Healthcare' },
  { value: 'electronics', label: 'Electronics & Appliances' },
];

export const stateCodeOptions = [
  { value: '27', label: '27 - Maharashtra' },
  { value: '07', label: '07 - Delhi NCR' },
  { value: '29', label: '29 - Karnataka' },
  { value: '33', label: '33 - Tamil Nadu' },
  { value: '09', label: '09 - Uttar Pradesh' },
];

export const taxSlabOptions = [
  { value: '18', label: '18% GST (Standard Retail)' },
  { value: '12', label: '12% GST (Processed Foods)' },
  { value: '5', label: '5% GST (Essential Commodities)' },
  { value: '0', label: '0% GST (Exempted Fresh Goods)' },
];

export const financialYearStartOptions = [
  { value: 'April', label: 'April (1st April - 31st March)' },
  { value: 'January', label: 'January (1st Jan - 31st Dec)' },
];

export const paperWidthOptions = [
  { value: '80mm', label: '80mm (Standard Desktop POS)' },
  { value: '58mm', label: '58mm (Handheld Mobile Bluetooth)' },
];
