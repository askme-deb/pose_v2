import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Users,
  Award,
  Crown,
  TrendingUp,
  Search,
  Download,
  UserPlus,
  Gift,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  BadgeColor,
  Button,
  DataTable,
  Drawer,
  GlassCard,
  Input,
  KpiCard,
  PillTabs,
  Select,
  useToast,
} from '@pospe/ui-library';
import { formatINR, formatDate } from '../../utils/format';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  creditBonusPoints,
  LiveCustomer,
  CustomerTier,
} from '../../services/api/customers';

interface LoyaltyTier {
  tier: CustomerTier;
  name: string;
  minSpend: number;
  pointsMultiplier: number;
  perks: string;
}

const loyaltyTiers: LoyaltyTier[] = [
  { tier: 'VIP_DIAMOND', name: 'VIP Diamond', minSpend: 40000, pointsMultiplier: 2, perks: 'Free express shipping, double weekend points, dedicated account manager' },
  { tier: 'GOLD', name: 'Gold Member', minSpend: 20000, pointsMultiplier: 1.5, perks: 'Priority checkout desk, birthday surprise gift, exclusive event invites' },
  { tier: 'SILVER', name: 'Silver Member', minSpend: 10000, pointsMultiplier: 1.2, perks: '1.2x point multiplier on new product launches, free tote bags' },
  { tier: 'STANDARD', name: 'Standard Member', minSpend: 0, pointsMultiplier: 1, perks: 'Earn 1 point for every ₹100 spent, thermal receipt rewards' },
];

const tierOptions = loyaltyTiers.map((t) => ({ value: t.tier, label: t.name }));

const tierBadgeColor: Record<CustomerTier, BadgeColor> = {
  VIP_DIAMOND: 'purple',
  GOLD: 'amber',
  SILVER: 'blue',
  STANDARD: 'slate',
};

const tierLabel: Record<CustomerTier, string> = {
  VIP_DIAMOND: 'VIP Diamond',
  GOLD: 'Gold Member',
  SILVER: 'Silver Member',
  STANDARD: 'Standard Member',
};

const tierIcon: Record<CustomerTier, string> = {
  VIP_DIAMOND: '\u{1F48E}',
  GOLD: '\u{1F451}',
  SILVER: '\u{1F948}',
  STANDARD: '',
};

type CustomerFormState = {
  fullName: string;
  phone: string;
  email: string;
  tier: CustomerTier;
  loyaltyPoints: string;
};

const emptyForm: CustomerFormState = {
  fullName: '',
  phone: '',
  email: '',
  tier: 'STANDARD',
  loyaltyPoints: '100',
};

const bonusReasons = [
  { value: 'Birthday Celebration Bonus', label: 'Birthday Bonus' },
  { value: 'VIP Loyalty Reward', label: 'VIP Loyalty Reward' },
  { value: 'Customer Goodwill Credit', label: 'Goodwill Credit' },
];

function initialsOf(name: string) {
  return name.substring(0, 2).toUpperCase();
}

function toCSV(rows: LiveCustomer[]): string {
  const header = ['Customer ID', 'Full Name', 'Phone', 'Email', 'Tier', 'Orders', 'Lifetime Spend', 'Loyalty Points', 'Last Visit', 'Joined'];
  const lines = rows.map((c) =>
    [c.id, c.fullName, c.phone, c.email, tierLabel[c.tier], c.ordersCount, c.lifetimeSpend, c.loyaltyPoints, c.lastVisit ?? 'Never', c.joinedAt]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CustomersPage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<LiveCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'directory' | 'tiers'>('directory');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | CustomerTier>('all');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);

  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusTargetId, setBonusTargetId] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState('500');
  const [bonusReason, setBonusReason] = useState(bonusReasons[0].value);

  async function reload() {
    setLoading(true);
    try {
      setCustomers(await listCustomers());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load customers from the server', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter((c) => {
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);
      const matchesTier = tierFilter === 'all' || c.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [customers, search, tierFilter]);

  const totalPoints = customers.reduce((s, c) => s + c.loyaltyPoints, 0);
  const totalLTV = customers.reduce((s, c) => s + c.lifetimeSpend, 0);
  const avgLTV = customers.length ? totalLTV / customers.length : 0;
  const vipGoldCount = customers.filter((c) => c.tier === 'VIP_DIAMOND' || c.tier === 'GOLD').length;

  function openRegisterDrawer() {
    setEditId(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function openEditDrawer(c: LiveCustomer) {
    setEditId(c.id);
    setForm({
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      tier: c.tier,
      loyaltyPoints: String(c.loyaltyPoints),
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  async function saveCustomer() {
    if (!form.fullName.trim() || !form.phone.trim()) {
      showToast('Full name and phone are required', 'danger');
      return;
    }
    setSaving(true);
    const input = {
      name: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      tier: form.tier,
      loyaltyPoints: parseInt(form.loyaltyPoints, 10) || 0,
    };
    try {
      if (editId) {
        await updateCustomer(editId, input);
        showToast(`Updated customer account "${form.fullName}"!`, 'success');
      } else {
        await createCustomer(input);
        showToast(`Registered new customer account "${form.fullName}"!`, 'success');
      }
      await reload();
      closeDrawer();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save customer', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustomer(c: LiveCustomer) {
    try {
      await deleteCustomer(c.id);
      setCustomers((prev) => prev.filter((x) => x.id !== c.id));
      showToast(`Deleted customer account "${c.fullName}".`, 'warning');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete customer', 'danger');
    }
  }

  function openBonusDrawer(c: LiveCustomer) {
    setBonusTargetId(c.id);
    setBonusAmount('500');
    setBonusReason(bonusReasons[0].value);
    setBonusOpen(true);
  }

  function closeBonusDrawer() {
    setBonusOpen(false);
  }

  async function saveBonusPoints() {
    const amount = parseInt(bonusAmount, 10) || 0;
    if (amount < 10) {
      showToast('Bonus points amount must be at least 10', 'danger');
      return;
    }
    const target = customers.find((c) => c.id === bonusTargetId);
    if (!target || !bonusTargetId) return;
    setSaving(true);
    try {
      await creditBonusPoints(bonusTargetId, amount, bonusReason);
      await reload();
      showToast(`Credited ${amount} bonus points to ${target.fullName} (${bonusReason})!`, 'success');
      closeBonusDrawer();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not credit bonus points', 'danger');
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    downloadBlob(toCSV(filtered), `crm-customers-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    showToast('Exported customer CRM directory to CSV file.', 'success');
  }

  const bonusTarget = customers.find((c) => c.id === bonusTargetId);

  const columns: ColumnDef<LiveCustomer, any>[] = [
    {
      id: 'customer',
      header: 'Customer Account',
      accessorFn: (c) => c.fullName,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white font-extrabold flex items-center justify-center text-xs shadow-md shrink-0">
              {initialsOf(c.fullName)}
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">{c.fullName}</div>
              <div className="text-[10px] text-slate-400 font-mono">{c.id.slice(0, 10)}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'contact',
      header: 'Contact Phone & Email',
      accessorFn: (c) => c.phone,
      cell: ({ row }) => (
        <div>
          <div className="font-mono text-slate-700 dark:text-slate-200 font-semibold">{row.original.phone}</div>
          <div className="text-[10px] text-slate-400">{row.original.email}</div>
        </div>
      ),
    },
    {
      id: 'tier',
      header: 'Membership Tier',
      accessorFn: (c) => c.tier,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge color={tierBadgeColor[row.original.tier]} pill>
            {tierIcon[row.original.tier]} {tierLabel[row.original.tier]}
          </Badge>
        </div>
      ),
    },
    {
      id: 'orders',
      header: 'Orders Placed',
      accessorFn: (c) => c.ordersCount,
      cell: ({ row }) => (
        <div className="text-center font-bold text-pink-600 font-mono">{row.original.ordersCount} orders</div>
      ),
    },
    {
      id: 'ltv',
      header: 'Lifetime Spend (LTV)',
      accessorFn: (c) => c.lifetimeSpend,
      cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-slate-900 dark:text-white">{formatINR(row.original.lifetimeSpend)}</div>
      ),
    },
    {
      id: 'points',
      header: 'Loyalty Points',
      accessorFn: (c) => c.loyaltyPoints,
      cell: ({ row }) => (
        <div className="text-right font-mono font-black text-purple-600 dark:text-purple-400">
          {row.original.loyaltyPoints.toLocaleString('en-IN')} pts
        </div>
      ),
    },
    {
      id: 'lastVisit',
      header: 'Last Visit',
      accessorFn: (c) => c.lastVisit,
      cell: ({ row }) => (
        <div className="font-mono text-slate-500">{row.original.lastVisit ? formatDate(row.original.lastVisit) : 'No orders yet'}</div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => openBonusDrawer(row.original)}
            title="Credit Bonus Points"
            className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-600 hover:text-white text-purple-600 transition"
          >
            <Gift className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openEditDrawer(row.original)}
            title="Edit Customer"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-pink-600 hover:text-white text-slate-600 dark:text-slate-300 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteCustomer(row.original)}
            title="Delete Customer"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Customer CRM & Loyalty Rewards Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400 border border-pink-500/20 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" /> {customers.length} Members &bull;{' '}
              {totalPoints.toLocaleString('en-IN')} Loyalty Points Total
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage customer relationships, track lifetime value (LTV), credit loyalty points, and configure tier
            benefits. Lifetime spend and orders are computed live from the sales ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, phone, email..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-pink-500 w-64 shadow-inner"
            />
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as 'all' | CustomerTier)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
          >
            <option value="all">All Loyalty Tiers</option>
            {tierOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <PillTabs
            options={[
              { value: 'directory', label: `Customer Directory (${customers.length})` },
              { value: 'tiers', label: `Loyalty Tiers (${loyaltyTiers.length})` },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'directory' | 'tiers')}
          />

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5 text-pink-600" />
              Export CSV
            </Button>
            <Button onClick={openRegisterDrawer}>
              <UserPlus className="w-4 h-4" />
              + Register Customer
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total Registered Members" value={`${customers.length} Members`} delta="Enrolled Accounts" deltaTone="neutral" color="blue" />
        <KpiCard icon={Award} label="Loyalty Points Active" value={`${totalPoints.toLocaleString('en-IN')} Pts`} delta={`${formatINR(totalPoints)} Redeem Value`} deltaTone="neutral" color="purple" />
        <KpiCard icon={Crown} label="VIP & Gold Tier Members" value={`${vipGoldCount} Members`} delta="High Spenders (>₹20k)" deltaTone="neutral" color="amber" />
        <KpiCard icon={TrendingUp} label="Average Customer LTV" value={formatINR(avgLTV)} delta="Lifetime Billed Revenue" deltaTone="positive" color="emerald" />
      </div>

      {activeTab === 'directory' ? (
        <GlassCard padding="sm" className="!p-0 overflow-hidden">
          <div className="p-4">
            <DataTable
              columns={columns}
              data={filtered}
              loading={loading}
              emptyTitle="No Customers Found"
              emptyDescription="No customer names or phone numbers match your search filter."
            />
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loyaltyTiers.map((t) => {
            const activeCount = customers.filter((c) => c.tier === t.tier).length;
            return (
              <GlassCard key={t.tier} className="hover:border-pink-500/50 transition duration-300 group flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">{t.name}</h4>
                    <p className="text-xs text-pink-600 dark:text-pink-400 font-bold">{t.pointsMultiplier}x Points Multiplier</p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-pink-500/10 text-pink-600 font-bold text-xs border border-pink-500/20">
                    {activeCount} Active
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Min Spend Required:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatINR(t.minSpend)}</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <span className="text-slate-400 font-semibold block">Exclusive Perks:</span>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">{t.perks}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => showToast(`Updated tier perks for ${t.name}!`, 'info')}>
                    Configure Tier Perks
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editId ? 'Edit Customer' : 'Register New Customer'}
        subtitle="Add profile details, phone, and loyalty tier."
        footer={
          <>
            <Button variant="secondary" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button onClick={saveCustomer} disabled={saving}>
              {saving ? 'Saving…' : 'Save Customer Account'}
            </Button>
          </>
        }
      >
        <Input
          label="Customer Full Name"
          required
          placeholder="e.g. Aarav Mehta"
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone Number"
            required
            placeholder="+91 98201 99887"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="customer@domain.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Membership Tier"
            options={tierOptions}
            value={form.tier}
            onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value as CustomerTier }))}
          />
          <Input
            label="Initial Loyalty Points"
            type="number"
            value={form.loyaltyPoints}
            onChange={(e) => setForm((f) => ({ ...f, loyaltyPoints: e.target.value }))}
          />
        </div>
      </Drawer>

      <Drawer
        open={bonusOpen}
        onClose={closeBonusDrawer}
        title="Credit Bonus Loyalty Points"
        subtitle="Add reward points for customer campaigns or compensation."
        footer={
          <>
            <Button variant="secondary" onClick={closeBonusDrawer}>
              Cancel
            </Button>
            <Button onClick={saveBonusPoints} disabled={saving}>
              {saving ? 'Crediting…' : 'Credit Loyalty Points'}
            </Button>
          </>
        }
      >
        <Input label="Target Customer" readOnly value={bonusTarget ? `${bonusTarget.fullName} (${bonusTarget.loyaltyPoints} Pts Current)` : ''} className="font-bold !text-pink-600" />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Bonus Points Amount"
            required
            type="number"
            min={10}
            value={bonusAmount}
            onChange={(e) => setBonusAmount(e.target.value)}
          />
          <Select label="Campaign Reason" options={bonusReasons} value={bonusReason} onChange={(e) => setBonusReason(e.target.value)} />
        </div>
      </Drawer>
    </div>
  );
}
