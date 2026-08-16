export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  totalOrders: number;
  outstandingAmount: number;
}

export const suppliers: Supplier[] = [
  { id: 'sup-amul-dairy', companyName: 'Amul Dairy Cooperative Ltd', contactPerson: 'Rajesh Sharma', phone: '+91 98201 12345', email: 'supply@amuldairy.com', gstin: '24AAACA1234F1Z9', totalOrders: 18, outstandingAmount: 42500 },
  { id: 'sup-britannia', companyName: 'Britannia Industries Ltd', contactPerson: 'Sanjay Verma', phone: '+91 98450 99887', email: 'procurement@britannia.co.in', gstin: '29AAACB9876D1Z1', totalOrders: 14, outstandingAmount: 18700 },
  { id: 'sup-nestle', companyName: 'Nestle India Distribution', contactPerson: 'Anita Desai', phone: '+91 98110 54321', email: 'orders@nestle.co.in', gstin: '07AAACN4321E1Z5', totalOrders: 22, outstandingAmount: 0 },
  { id: 'sup-mondelez', companyName: 'Mondelez India Foods Pvt Ltd', contactPerson: 'Karan Mehta', phone: '+91 98200 33210', email: 'trade@mondelezindia.com', gstin: '27AAACM5566K1Z8', totalOrders: 11, outstandingAmount: 9600 },
  { id: 'sup-cocacola', companyName: 'Hindustan Coca-Cola Beverages', contactPerson: 'Deepak Nair', phone: '+91 98330 77654', email: 'distribution@hccb.in', gstin: '33AAACH7890L1Z3', totalOrders: 26, outstandingAmount: 31200 },
  { id: 'sup-haldirams', companyName: "Haldiram's Snacks Foods Pvt Ltd", contactPerson: 'Pooja Agarwal', phone: '+91 98110 22456', email: 'supply@haldirams.com', gstin: '09AAACH3456M1Z6', totalOrders: 9, outstandingAmount: 5400 },
];

export const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.companyName }));
