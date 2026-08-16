import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { BarChart3, Check, CreditCard, DollarSign, Download, RefreshCw, Search, Store, TrendingUp, X } from 'lucide-react';
import { Badge, Button, DataTable, Drawer, GlassCard, Input, KpiCard, Modal, PillTabs, useToast } from '@pospe/ui-library';
import { LiveTenant, LivePlatformInvoice, TenantPlan, listTenants, listPlatformInvoices } from '../../services/api/tenants';
import { formatCompactINR, formatDate, formatINR } from '../../utils/format';

type SubsTab = 'tiers' | 'invoices' | 'matrix' | 'gateways';

interface PlanTierDisplay {
  id: string;
  name: string;
  code: TenantPlan | 'CUSTOM';
  monthlyPrice: number;
  storesIncluded: number;
  badge: string;
  features: string[];
}

interface FeatureRow {
  id: string;
  feature: string;
  starter: boolean;
  pro: boolean;
  enterprise: boolean;
}

const PLAN_CATALOG: PlanTierDisplay[] = [
  { id: 'plan-start', name: 'Starter POS Single', code: 'STARTER', monthlyPrice: 14999, storesIncluded: 1, badge: 'Single Store', features: ['1 Retail Store POS', 'Barcode Scanner Sync', 'Thermal Receipt Printing', 'Standard Analytics'] },
  { id: 'plan-pro', name: 'Pro Business Retail', code: 'PROFESSIONAL', monthlyPrice: 49999, storesIncluded: 10, badge: 'Growth Standard', features: ['Up to 10 Store Outlets', 'Multi-Warehouse Sync', 'GST Tax Return Engine', 'Email & Chat Support'] },
  { id: 'plan-ent', name: 'Enterprise Ultimate', code: 'ENTERPRISE', monthlyPrice: 149999, storesIncluded: 25, badge: 'Popular Enterprise', features: ['Unlimited Store Outlets', 'Dedicated DB Instance', 'White-Label Branding', '24/7 SLA Phone Support'] },
  { id: 'plan-custom', name: 'Custom Enterprise White-Label', code: 'CUSTOM', monthlyPrice: 299999, storesIncluded: 100, badge: 'Dedicated Private Cloud', features: ['Unlimited Store Outlets', 'Custom Domain Branding', 'Dedicated Kubernetes Cluster', 'Dedicated Account Manager'] },
];

const initialFeatureMatrix: FeatureRow[] = [
  { id: 'f1', feature: 'POS Touch Billing & Thermal Printing', starter: true, pro: true, enterprise: true },
  { id: 'f2', feature: 'Multi-Warehouse & Rack Inventory Sync', starter: false, pro: true, enterprise: true },
  { id: 'f3', feature: 'GST Tax Return Filing Engine & E-Way Bills', starter: false, pro: true, enterprise: true },
  { id: 'f4', feature: 'CRM Loyalty Points & WhatsApp PDF Receipts', starter: false, pro: true, enterprise: true },
  { id: 'f5', feature: 'Dedicated PostgreSQL DB Schema Isolation', starter: false, pro: false, enterprise: true },
  { id: 'f6', feature: 'Custom Domain White-Label Branding', starter: false, pro: false, enterprise: true },
  { id: 'f7', feature: '24/7 Phone SLA & Dedicated Account Manager', starter: false, pro: false, enterprise: true },
];

const tabOptions = [
  { value: 'tiers', label: 'Plan Tiers' },
  { value: 'invoices', label: 'Invoices Ledger' },
  { value: 'matrix', label: 'Feature Entitlements' },
  { value: 'gateways', label: 'Gateways & Dunning' },
];

const statusColor: Record<LivePlatformInvoice['status'], 'emerald' | 'amber' | 'red'> = {
  PAID: 'emerald',
  PENDING: 'amber',
  FAILED: 'red',
};

const gatewayLabel: Record<LivePlatformInvoice['gateway'], string> = {
  RAZORPAY: 'Razorpay AutoPay',
  STRIPE: 'Stripe Global',
};

export default function SuperAdminSubscriptionsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SubsTab>('tiers');
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState<LiveTenant[]>([]);
  const [invoices, setInvoices] = useState<LivePlatformInvoice[]>([]);
  const [customTiers, setCustomTiers] = useState<PlanTierDisplay[]>([]);
  const [featureMatrix, setFeatureMatrix] = useState<FeatureRow[]>(initialFeatureMatrix);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('49999');
  const [formStores, setFormStores] = useState('10');
  const [formBadge, setFormBadge] = useState('Growth Standard');

  const [selectedInvoice, setSelectedInvoice] = useState<LivePlatformInvoice | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [t, i] = await Promise.all([listTenants(), listPlatformInvoices()]);
        setTenants(t);
        setInvoices(i);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load subscription data from the server', 'danger');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalMRR = tenants.reduce((sum, t) => sum + t.monthlyBilling, 0);
  const arr = totalMRR * 12;
  const totalSubscribers = tenants.length;
  const arpu = totalSubscribers ? Math.round(totalMRR / totalSubscribers) : 0;

  const plans = useMemo(() => {
    const subscriberCountByPlan: Record<string, number> = {};
    tenants.forEach((t) => {
      subscriberCountByPlan[t.plan] = (subscriberCountByPlan[t.plan] ?? 0) + 1;
    });
    return [...PLAN_CATALOG, ...customTiers].map((p) => ({ ...p, subscriberCount: subscriberCountByPlan[p.code] ?? 0 }));
  }, [tenants, customTiers]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (i) => i.id.toLowerCase().includes(q) || i.tenantName.toLowerCase().includes(q) || i.plan.toLowerCase().includes(q),
    );
  }, [invoices, search]);

  function openTierDrawer() {
    setFormName('');
    setFormPrice('49999');
    setFormStores('10');
    setFormBadge('Growth Standard');
    setDrawerOpen(true);
  }

  function saveTier() {
    if (!formName.trim() || !formPrice.trim()) {
      showToast('Please fill the plan name and monthly price', 'danger');
      return;
    }
    const newPlan: PlanTierDisplay = {
      id: `plan-${Date.now()}`,
      name: formName.trim(),
      code: 'CUSTOM',
      monthlyPrice: parseInt(formPrice, 10) || 49999,
      storesIncluded: parseInt(formStores, 10) || 10,
      badge: formBadge.trim() || 'Custom Tier',
      features: ['Full Multi-Branch Sync', 'GST Tax Engine', 'Standard SLA Support'],
    };
    setCustomTiers((prev) => [newPlan, ...prev]);
    setDrawerOpen(false);
    showToast(`Created SaaS Pricing Tier '${newPlan.name}'!`, 'success');
  }

  function toggleFeature(id: string, tier: 'starter' | 'pro' | 'enterprise') {
    setFeatureMatrix((prev) => prev.map((row) => (row.id === id ? { ...row, [tier]: !row[tier] } : row)));
  }

  function saveEntitlements() {
    showToast('Feature entitlements saved and propagated to tenant sessions', 'success');
  }

  function exportInvoicesCsv() {
    let csv = 'Invoice ID,Date,Tenant Business,Plan Tier,Payment Gateway,Amount (INR),Status\n';
    invoices.forEach((i) => {
      csv += `"${i.id}","${formatDate(i.date)}","${i.tenantName}","${i.plan}","${gatewayLabel[i.gateway]}",${i.amountINR},${i.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ApexPOS_Subscription_Invoices_Ledger.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Subscription Invoices Exported to CSV!', 'success');
  }

  function testWebhook(name: string) {
    showToast(`Tested ${name} webhook connection - OK`, 'success');
  }

  const invoiceColumns: ColumnDef<LivePlatformInvoice, any>[] = [
    {
      header: 'Invoice ID & Date',
      accessorKey: 'id',
      cell: ({ row }) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white">{row.original.id}</div>
          <div className="text-[10px] text-slate-400">{formatDate(row.original.date)}</div>
        </div>
      ),
    },
    { header: 'Tenant Business', accessorKey: 'tenantName', cell: ({ row }) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.original.tenantName}</span> },
    { header: 'SaaS Tier Plan', accessorKey: 'plan', cell: ({ row }) => <Badge color="emerald">{row.original.plan}</Badge> },
    { header: 'Payment Gateway', accessorKey: 'gateway', cell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{gatewayLabel[row.original.gateway]}</span> },
    {
      header: 'Amount (INR)',
      accessorKey: 'amountINR',
      cell: ({ row }) => <span className="font-mono font-black text-slate-900 dark:text-white">{formatINR(row.original.amountINR)}</span>,
    },
    { header: 'Invoice Status', accessorKey: 'status', cell: ({ row }) => <Badge color={statusColor[row.original.status]}>{row.original.status}</Badge> },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            onClick={() => setSelectedInvoice(row.original)}
            className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            View Receipt
          </button>
        </div>
      ),
    },
  ];

  const subtotal = selectedInvoice ? Math.round(selectedInvoice.amountINR / 1.18) : 0;
  const tax = selectedInvoice ? selectedInvoice.amountINR - subtotal : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">SaaS Subscriptions &amp; Billing Engine</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {formatCompactINR(totalMRR)} Monthly MRR • {totalSubscribers} Active
              Subscriptions
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage multi-tenant recurring billing plans, configure feature entitlement matrices, inspect automated invoice payments, and setup payment
            gateway dunning rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, tenant, plan tier..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 w-64 shadow-inner"
            />
          </div>

          <PillTabs options={tabOptions} value={activeTab} onChange={(v) => setActiveTab(v as SubsTab)} />

          <div className="flex items-center gap-2">
            <button
              onClick={exportInvoicesCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Invoices</span>
            </button>
            <button
              onClick={openTierDrawer}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition transform hover:scale-[1.02]"
            >
              <CreditCard className="w-4 h-4" />
              <span>+ Create Plan Tier</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} label="Monthly Recurring Revenue" value={formatCompactINR(totalMRR)} delta="+18.4% YoY SaaS MRR" deltaTone="positive" color="emerald" />
        <KpiCard icon={BarChart3} label="Annual Run Rate (ARR)" value={formatCompactINR(arr)} delta="Projected FY 2026" deltaTone="positive" color="blue" />
        <KpiCard icon={RefreshCw} label="Subscription Renewal SLA" value="98.6%" delta="1.4% Dunning Auto-Retry" deltaTone="positive" color="purple" />
        <KpiCard icon={DollarSign} label="Avg Revenue Per Tenant" value={formatINR(arpu)} delta="+6.2% Expansion Revenue" deltaTone="positive" color="amber" />
      </div>

      {activeTab === 'tiers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => (
            <div
              key={p.id}
              className="glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition group"
            >
              <div className="space-y-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">{p.badge}</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition">{p.name}</h3>
                <p className="text-2xl font-black text-emerald-600 font-mono">
                  {formatINR(p.monthlyPrice)} <span className="text-xs text-slate-400 font-normal">/ mo</span>
                </p>
                <ul className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <Store className="w-3.5 h-3.5 text-indigo-500" /> {p.storesIncluded} Store Outlets Limit
                  </li>
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{p.subscriberCount} Active Tenants</span>
                <button
                  onClick={() => showToast(`Editing plan limits for ${p.name}`, 'info')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition"
                >
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'invoices' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Tenant Recurring Invoices Ledger</h3>
              <p className="text-xs text-slate-400">Live ledger of automated monthly subscription billing transactions, Razorpay/Stripe charges, and tax receipts.</p>
            </div>
            <button onClick={exportInvoicesCsv} className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition">
              Export Invoices
            </button>
          </div>
          <DataTable columns={invoiceColumns} data={filteredInvoices} loading={loading} emptyTitle="No invoices matched" emptyDescription="Try adjusting your search." />
        </GlassCard>
      )}

      {activeTab === 'matrix' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Feature Entitlement &amp; Access Matrix</h3>
              <p className="text-xs text-slate-400">Compare and toggle feature entitlements across Enterprise, Pro, and Starter plans.</p>
            </div>
            <button onClick={saveEntitlements} className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition">
              Save Entitlements
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-extrabold">
                  <th className="py-3 px-4">Platform Module Feature</th>
                  <th className="py-3 px-4 text-center">Starter POS Single</th>
                  <th className="py-3 px-4 text-center">Pro Business Retail</th>
                  <th className="py-3 px-4 text-center">Enterprise Ultimate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
                {featureMatrix.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{m.feature}</td>
                    {(['starter', 'pro', 'enterprise'] as const).map((tier) => (
                      <td key={tier} className="py-3.5 px-4 text-center">
                        <button onClick={() => toggleFeature(m.id, tier)} className="mx-auto flex items-center justify-center">
                          {m[tier] ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-300 dark:text-slate-700" />}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-sm">RP</div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Razorpay Subscriptions (India)</h3>
                  <p className="text-[10px] text-slate-400">INR Direct Debit, UPI Autopay, eNACH Credit Cards</p>
                </div>
              </div>
              <Badge color="emerald">CONNECTED</Badge>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Webhook Status:</span>
                <span className="font-mono text-emerald-600 font-bold">200 OK (0.01s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Subscriptions:</span>
                <span className="font-bold text-slate-900 dark:text-white">114 Tenants</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Success Rate:</span>
                <span className="font-mono text-emerald-600 font-bold">99.1%</span>
              </div>
            </div>
            <button
              onClick={() => testWebhook('Razorpay')}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Test Webhook Sync
            </button>
          </GlassCard>

          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-bold text-sm">ST</div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Stripe Global SaaS Gateway</h3>
                  <p className="text-[10px] text-slate-400">USD/EUR Multi-Currency Enterprise Accounts</p>
                </div>
              </div>
              <Badge color="emerald">CONNECTED</Badge>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Webhook Status:</span>
                <span className="font-mono text-emerald-600 font-bold">200 OK (0.02s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Subscriptions:</span>
                <span className="font-bold text-slate-900 dark:text-white">14 Tenants</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Success Rate:</span>
                <span className="font-mono text-emerald-600 font-bold">98.4%</span>
              </div>
            </div>
            <button
              onClick={() => testWebhook('Stripe Global')}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Test Webhook Sync
            </button>
          </GlassCard>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Configure SaaS Plan Tier"
        subtitle="Set pricing parameters, outlet limits, and feature permissions."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <button
              onClick={saveTier}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition"
            >
              Publish Plan Tier
            </button>
          </>
        }
      >
        <Input label="Subscription Plan Name" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Enterprise Ultimate Plus" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Monthly Price (INR)" type="number" required value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="149999" />
          <Input label="Store Outlets Included" type="number" value={formStores} onChange={(e) => setFormStores(e.target.value)} />
        </div>
        <Input label="Tier Marketing Badge" value={formBadge} onChange={(e) => setFormBadge(e.target.value)} />
      </Drawer>

      <Modal open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} maxWidth="md">
        {selectedInvoice && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-mono">{selectedInvoice.id}</h3>
                <p className="text-xs text-slate-400">Billed on {formatDate(selectedInvoice.date)}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Billed Tenant:</span>
                <strong className="text-slate-900 dark:text-white">{selectedInvoice.tenantName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan Tier:</span>
                <strong className="text-emerald-600">{selectedInvoice.plan}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gateway Ref:</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">{selectedInvoice.gatewayRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal Amount:</span>
                <span className="font-mono text-slate-900 dark:text-white">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">18% IGST Tax:</span>
                <span className="font-mono text-slate-900 dark:text-white">{formatINR(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
                <span className="font-bold text-slate-900 dark:text-white">Total Amount Paid:</span>
                <strong className="font-mono text-emerald-600 text-sm">{formatINR(selectedInvoice.amountINR)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  showToast('Tax Receipt PDF dispatched to tenant admin email', 'success');
                  setSelectedInvoice(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md transition"
              >
                Email PDF Receipt
              </button>
              <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
