export interface TenantInvoice {
  id: string;
  date: string;
  tenantName: string;
  plan: string;
  gateway: 'razorpay' | 'stripe';
  gatewayRef: string;
  amountINR: number;
  status: 'paid' | 'pending' | 'failed';
}

export const tenantInvoices: TenantInvoice[] = [
  { id: 'INV-SAAS-2026-891', date: '2026-08-01T09:00:00Z', tenantName: 'Apex Supermarket Chain', plan: 'Enterprise Ultimate', gateway: 'razorpay', gatewayRef: 'pay_Rz91f8bL20', amountINR: 149999, status: 'paid' },
  { id: 'INV-SAAS-2026-892', date: '2026-08-01T09:00:00Z', tenantName: 'Metro Hypermarket Ltd', plan: 'Enterprise Ultimate', gateway: 'razorpay', gatewayRef: 'pay_Rz92f9cL21', amountINR: 249999, status: 'paid' },
  { id: 'INV-SAAS-2026-893', date: '2026-08-02T09:00:00Z', tenantName: 'QuickBite Restaurant Group', plan: 'Pro Business Retail', gateway: 'stripe', gatewayRef: 'ch_3M000aX991', amountINR: 49999, status: 'paid' },
  { id: 'INV-SAAS-2026-894', date: '2026-08-03T09:00:00Z', tenantName: 'Zenith Pharma Labs', plan: 'Enterprise Ultimate', gateway: 'razorpay', gatewayRef: 'pay_Rz94f1dL23', amountINR: 149999, status: 'paid' },
  { id: 'INV-SAAS-2026-895', date: '2026-08-04T09:00:00Z', tenantName: 'Luxe Fashion Retail', plan: 'Pro Business Retail', gateway: 'razorpay', gatewayRef: 'pay_Rz95f2eL24', amountINR: 49999, status: 'paid' },
  { id: 'INV-SAAS-2026-896', date: '2026-08-05T09:00:00Z', tenantName: 'Organic Pantry Co', plan: 'Starter POS Single', gateway: 'razorpay', gatewayRef: 'pay_Rz96f3fL25', amountINR: 14999, status: 'pending' },
  { id: 'INV-SAAS-2026-897', date: '2026-08-06T09:00:00Z', tenantName: 'Sundar Departmental Stores', plan: 'Starter POS Single', gateway: 'razorpay', gatewayRef: 'pay_Rz97f4gL26', amountINR: 14999, status: 'failed' },
  { id: 'INV-SAAS-2026-898', date: '2026-08-07T09:00:00Z', tenantName: 'Bharat Electronics Retail', plan: 'Pro Business Retail', gateway: 'stripe', gatewayRef: 'ch_3M001bY882', amountINR: 49999, status: 'failed' },
  { id: 'INV-SAAS-2026-899', date: '2026-08-08T09:00:00Z', tenantName: 'Coastal Seafood Mart', plan: 'Starter POS Single', gateway: 'razorpay', gatewayRef: 'pay_Rz99f6iL28', amountINR: 14999, status: 'paid' },
  { id: 'INV-SAAS-2026-900', date: '2026-08-09T09:00:00Z', tenantName: 'Highland Coffee Roasters', plan: 'Pro Business Retail', gateway: 'razorpay', gatewayRef: 'pay_Rz9A0f7jL29', amountINR: 49999, status: 'paid' },
];
