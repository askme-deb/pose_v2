export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  storesIncluded: number;
  badge: string;
  subscriberCount: number;
  features: string[];
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'plan-start',
    name: 'Starter POS Single',
    monthlyPrice: 14999,
    storesIncluded: 1,
    badge: 'Single Store',
    subscriberCount: 26,
    features: ['1 Retail Store POS', 'Barcode Scanner Sync', 'Thermal Receipt Printing', 'Standard Analytics'],
  },
  {
    id: 'plan-pro',
    name: 'Pro Business Retail',
    monthlyPrice: 49999,
    storesIncluded: 10,
    badge: 'Growth Standard',
    subscriberCount: 64,
    features: ['Up to 10 Store Outlets', 'Multi-Warehouse Sync', 'GST Tax Return Engine', 'Email & Chat Support'],
  },
  {
    id: 'plan-ent',
    name: 'Enterprise Ultimate',
    monthlyPrice: 149999,
    storesIncluded: 25,
    badge: 'Popular Enterprise',
    subscriberCount: 38,
    features: ['Unlimited Store Outlets', 'Dedicated DB Instance', 'White-Label Branding', '24/7 SLA Phone Support'],
  },
  {
    id: 'plan-custom',
    name: 'Custom Enterprise White-Label',
    monthlyPrice: 299999,
    storesIncluded: 100,
    badge: 'Dedicated Private Cloud',
    subscriberCount: 4,
    features: ['Unlimited Store Outlets', 'Custom Domain Branding', 'Dedicated Kubernetes Cluster', 'Dedicated Account Manager'],
  },
];

export const subscriptionPlanOptions = subscriptionPlans.map((p) => ({ value: p.id, label: `${p.name} (₹${p.monthlyPrice.toLocaleString('en-IN')}/mo)` }));
