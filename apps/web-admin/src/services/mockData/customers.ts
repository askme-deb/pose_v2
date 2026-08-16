export type CustomerTier = 'standard' | 'silver' | 'gold' | 'vip_diamond';

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  tier: CustomerTier;
  loyaltyPoints: number;
  lifetimeSpend: number;
  ordersCount: number;
  lastVisit: string;
  joinedAt: string;
}

export const customers: Customer[] = [
  { id: 'cust-901', fullName: 'Aarav Mehta', phone: '+91 98201 99887', email: 'aarav.mehta@gmail.com', tier: 'vip_diamond', loyaltyPoints: 5240, lifetimeSpend: 52400, ordersCount: 31, lastVisit: '2026-08-12', joinedAt: '2023-11-04' },
  { id: 'cust-902', fullName: 'Kabir Khanna', phone: '+91 98112 33445', email: 'kabir.khanna@outlook.com', tier: 'vip_diamond', loyaltyPoints: 6150, lifetimeSpend: 61500, ordersCount: 38, lastVisit: '2026-08-14', joinedAt: '2023-05-19' },
  { id: 'cust-903', fullName: 'Sneha Iyer', phone: '+91 98450 77665', email: 'sneha.iyer@yahoo.in', tier: 'gold', loyaltyPoints: 2890, lifetimeSpend: 28900, ordersCount: 19, lastVisit: '2026-08-10', joinedAt: '2024-02-14' },
  { id: 'cust-904', fullName: 'Vikram Sethi', phone: '+91 98300 44556', email: 'vikram.sethi@techcorp.in', tier: 'gold', loyaltyPoints: 3420, lifetimeSpend: 34200, ordersCount: 22, lastVisit: '2026-08-11', joinedAt: '2023-09-27' },
  { id: 'cust-905', fullName: 'Arjun Nair', phone: '+91 98220 11223', email: 'arjun.nair@gmail.com', tier: 'gold', loyaltyPoints: 2470, lifetimeSpend: 24700, ordersCount: 16, lastVisit: '2026-08-08', joinedAt: '2024-06-02' },
  { id: 'cust-906', fullName: 'Priya Sharma', phone: '+91 98765 43210', email: 'priya.sharma@gmail.com', tier: 'silver', loyaltyPoints: 1860, lifetimeSpend: 18600, ordersCount: 12, lastVisit: '2026-08-05', joinedAt: '2024-08-21' },
  { id: 'cust-907', fullName: 'Meera Kapoor', phone: '+91 98901 22334', email: 'meera.kapoor@rediffmail.com', tier: 'silver', loyaltyPoints: 1540, lifetimeSpend: 15400, ordersCount: 10, lastVisit: '2026-07-29', joinedAt: '2024-10-09' },
  { id: 'cust-908', fullName: 'Rohit Malhotra', phone: '+91 99870 65432', email: 'rohit.malhotra@hotmail.com', tier: 'silver', loyaltyPoints: 1280, lifetimeSpend: 12800, ordersCount: 9, lastVisit: '2026-07-26', joinedAt: '2025-01-15' },
  { id: 'cust-909', fullName: 'Ananya Verma', phone: '+91 97654 32109', email: 'ananya.verma@gmail.com', tier: 'standard', loyaltyPoints: 520, lifetimeSpend: 5200, ordersCount: 4, lastVisit: '2026-07-18', joinedAt: '2025-12-03' },
  { id: 'cust-910', fullName: 'Divya Reddy', phone: '+91 96543 21098', email: 'divya.reddy@gmail.com', tier: 'standard', loyaltyPoints: 310, lifetimeSpend: 3100, ordersCount: 2, lastVisit: '2026-07-02', joinedAt: '2026-04-22' },
];

export interface LoyaltyTier {
  tier: CustomerTier;
  name: string;
  minSpend: number;
  pointsMultiplier: number;
  perks: string;
}

export const loyaltyTiers: LoyaltyTier[] = [
  { tier: 'vip_diamond', name: 'VIP Diamond', minSpend: 40000, pointsMultiplier: 2, perks: 'Free express shipping, double weekend points, dedicated account manager' },
  { tier: 'gold', name: 'Gold Member', minSpend: 20000, pointsMultiplier: 1.5, perks: 'Priority checkout desk, birthday surprise gift, exclusive event invites' },
  { tier: 'silver', name: 'Silver Member', minSpend: 10000, pointsMultiplier: 1.2, perks: '1.2x point multiplier on new product launches, free tote bags' },
  { tier: 'standard', name: 'Standard Member', minSpend: 0, pointsMultiplier: 1, perks: 'Earn 1 point for every ₹100 spent, thermal receipt rewards' },
];

export const tierOptions = loyaltyTiers.map((t) => ({ value: t.tier, label: t.name }));
