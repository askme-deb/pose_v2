import { useMemo, useState } from 'react';
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
  Customer,
  CustomerTier,
  customers as initialCustomers,
  loyaltyTiers,
  tierOptions,
} from '../../services/mockData/customers';

const tierBadgeColor: Record<CustomerTier, BadgeColor> = {
  vip_diamond: 'purple',
  gold: 'amber',
  silver: 'blue',
  standard: 'slate',
};

const tierLabel: Record<CustomerTier, string> = {
  vip_diamond: 'VIP Diamond',
  gold: 'Gold Member',
  silver: 'Silver Member',
  standard: 'Standard Member',
};

const tierIcon: Record<CustomerTier, string> = {
  vip_diamond: '\u{1F48E}',
  gold: '\u{1F451}',
  silver: '\u{1F948}',
  standard: '',
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
  tier: 'standard',
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

function toCSV(rows: Customer[]): string {
  const header = ['Customer ID', 'Full Name', 'Phone', 'Email', 'Tier', 'Orders', 'Lifetime Spend', 'Loyalty Points', 'Last Visit', 'Joined'];
  const lines = rows.map((c) =>
    [c.id, c.fullName, c.phone, c.email, tierLabel[c.tier], c.ordersCount, c.lifetimeSpend, c.loyaltyPoints, c.lastVisit, c.joinedAt]
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
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
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
  const vipGoldCount = customers.filter((c) => c.tier === 'vip_diamond' || c.tier === 'gold').length;

  function openRegisterDrawer() {
    setEditId(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function openEditDrawer(c: Customer) {
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

  function saveCustomer() {
    if (!form.fullName.trim() || !form.phone.trim()) {
      showToast('Full name and phone are required', 'danger');
      return;
    }
    const points = parseInt(form.loyaltyPoints, 10) || 0;

    if (editId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editId
            ? { ...c, fullName: form.fullName, phone: form.phone, email: form.email || c.email, tier: form.tier, loyaltyPoints: points }
            : c,
        ),
      );
      showToast(`Updated customer account "${form.fullName}"!`, 'success');
    } else {
      const newId = `cust-${Math.floor(900 + Math.random() * 100)}`;
      const now = new Date().toISOString().slice(0, 10);
      const newCustomer: Customer = {
        id: newId,
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || 'customer@domain.com',
        tier: form.tier,
        loyaltyPoints: points,
        lifetimeSpend: 0,
        ordersCount: 0,
        lastVisit: now,
        joinedAt: now,
      };
      setCustomers((prev) => [newCustomer, ...prev]);
      showToast(`Registered new customer account "${form.fullName}" (${newId})!`, 'success');
    }
    closeDrawer();
  }

  function deleteCustomer(c: Customer) {
    setCustomers((prev) => prev.filter((x) => x.id !== c.id));
    showToast(`Deleted customer account "${c.fullName}".`, 'warning');
  }

  function openBonusDrawer(c: Customer) {
    setBonusTargetId(c.id);
    setBonusAmount('500');
    setBonusReason(bonusReasons[0].value);
    setBonusOpen(true);
  }

  function closeBonusDrawer() {
    setBonusOpen(false);
  }

  function saveBonusPoints() {
    const amount = parseInt(bonusAmount, 10) || 0;
    if (amount < 10) {
      showToast('Bonus points amount must be at least 10', 'danger');
      return;
    }
    const target = customers.find((c) => c.id === bonusTargetId);
    if (!target) return;
    setCustomers((prev) => prev.map((c) => (c.id === bonusTargetId ? { ...c, loyaltyPoints: c.loyaltyPoints + amount } : c)));
    showToast(`Credited ${amount} bonus points to ${target.fullName} (${bonusReason})!`, 'success');
    closeBonusDrawer();
  }

  function exportCSV() {
    downloadBlob(toCSV(filtered), `crm-customers-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    showToast('Exported customer CRM directory to CSV file.', 'success');
  }

  const bonusTarget = customers.find((c) => c.id === bonusTargetId);

  const columns: ColumnDef<Customer, any>[] = [
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
              <div className="text-[10px] text-slate-400 font-mono">{c.id}</div>
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
      cell: ({ row }) => <div className="font-mono text-slate-500">{formatDate(row.original.lastVisit)}</div>,
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
            onClick={() => deleteCustomer(row.original)}
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
            Manage customer relationships, track lifetime value (LTV), credit loyalty points, and configure tier benefits.
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
        title={editId ? `Edit Customer (${editId})` : 'Register New Customer'}
        subtitle="Add profile details, phone, and loyalty tier."
        footer={
          <>
            <Button variant="secondary" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button onClick={saveCustomer}>Save Customer Account</Button>
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
            <Button onClick={saveBonusPoints}>Credit Loyalty Points</Button>
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
