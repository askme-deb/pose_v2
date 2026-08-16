export type PaymentMethod = 'upi' | 'card' | 'cash';
export type InvoiceStatus = 'completed' | 'refunded';

export interface SalesInvoice {
  id: string;
  customerName: string;
  items: string;
  paymentMethod: PaymentMethod;
  gstAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  createdAt: string;
}

export const salesInvoices: SalesInvoice[] = [
  { id: 'INV-9821', customerName: 'Aarav Kapoor', items: 'Amul Gold Milk 1L (x2), Nescafe Classic Coffee 100g (x1)', paymentMethod: 'upi', gstAmount: 55.86, totalAmount: 421.0, status: 'completed', createdAt: '2026-08-16T09:12:00+05:30' },
  { id: 'INV-9822', customerName: 'Walk-in Customer', items: 'Coca-Cola 750ml Bottle (x6), Cadbury Dairy Milk Silk 60g (x3)', paymentMethod: 'cash', gstAmount: 67.22, totalAmount: 510.0, status: 'completed', createdAt: '2026-08-16T08:40:00+05:30' },
  { id: 'INV-9823', customerName: 'Meera Iyer', items: 'Britannia Brown Bread 400g (x2), Amul Fresh Paneer 200g (x1)', paymentMethod: 'card', gstAmount: 9.05, totalAmount: 200.0, status: 'completed', createdAt: '2026-08-15T19:05:00+05:30' },
  { id: 'INV-9824', customerName: 'Rohan Malhotra', items: "Haldiram's Aloo Bhujia 200g (x4), Nestle Munch 4-Pack (x2)", paymentMethod: 'upi', gstAmount: 61.53, totalAmount: 460.0, status: 'completed', createdAt: '2026-08-15T17:52:00+05:30' },
  { id: 'INV-9825', customerName: 'Walk-in Customer', items: 'Fresh Alphonso Mango 1kg (x2)', paymentMethod: 'cash', gstAmount: 0, totalAmount: 440.0, status: 'completed', createdAt: '2026-08-15T16:20:00+05:30' },
  { id: 'INV-9826', customerName: 'Simran Kaur', items: 'Coca-Cola Zero 300ml Can (x10)', paymentMethod: 'card', gstAmount: 68.64, totalAmount: 450.0, status: 'refunded', createdAt: '2026-08-15T12:10:00+05:30' },
  { id: 'INV-9827', customerName: 'Devansh Rao', items: 'Amul Gold Milk 1L (x3), Amul Processed Cheese 200g (x2)', paymentMethod: 'upi', gstAmount: 39.86, totalAmount: 454.0, status: 'completed', createdAt: '2026-08-14T20:33:00+05:30' },
  { id: 'INV-9828', customerName: 'Walk-in Customer', items: 'Britannia Good Day Cashew 200g (x5)', paymentMethod: 'cash', gstAmount: 10.71, totalAmount: 225.0, status: 'completed', createdAt: '2026-08-14T18:15:00+05:30' },
  { id: 'INV-9829', customerName: 'Ananya Bose', items: 'Cadbury Dairy Milk Silk 60g (x6), Nescafe Classic Coffee 100g (x1)', paymentMethod: 'card', gstAmount: 129.15, totalAmount: 825.0, status: 'completed', createdAt: '2026-08-14T14:02:00+05:30' },
  { id: 'INV-9830', customerName: 'Kabir Singh', items: 'Coca-Cola 750ml Bottle (x12)', paymentMethod: 'upi', gstAmount: 73.22, totalAmount: 480.0, status: 'completed', createdAt: '2026-08-14T11:47:00+05:30' },
  { id: 'INV-9831', customerName: 'Walk-in Customer', items: "Haldiram's Aloo Bhujia 200g (x2), Fresh Alphonso Mango 1kg (x1)", paymentMethod: 'cash', gstAmount: 13.93, totalAmount: 350.0, status: 'refunded', createdAt: '2026-08-13T19:58:00+05:30' },
  { id: 'INV-9832', customerName: 'Neha Kulkarni', items: 'Amul Fresh Paneer 200g (x3), Britannia Brown Bread 400g (x2)', paymentMethod: 'upi', gstAmount: 15.12, totalAmount: 380.0, status: 'completed', createdAt: '2026-08-13T10:24:00+05:30' },
];
