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
  Wallet,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import {
  Badge,
  BadgeColor,
  Button,
  Checkbox,
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
  listWalletTransactions,
  topUpWallet,
  redeemWallet,
  listMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  LiveCustomer,
  CustomerTier,
  WalletTransaction,
  MembershipPlan,
  MembershipPlanInput,
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

const walletTxLabel: Record<WalletTransaction['type'], string> = {
  TOP_UP: 'Top-up',
  REDEEM: 'Redeemed',
  REFUND: 'Refund',
  BIRTHDAY_BONUS: 'Birthday Bonus',
};

const walletTxColor: Record<WalletTransaction['type'], BadgeColor> = {
  TOP_UP: 'emerald',
  REDEEM: 'red',
  REFUND: 'blue',
  BIRTHDAY_BONUS: 'amber',
};

type CustomerFormState = {
  fullName: string;
  phone: string;
  email: string;
  tier: CustomerTier;
  loyaltyPoints: string;
  dateOfBirth: string;
  membershipPlanId: string;
};

const emptyForm: CustomerFormState = {
  fullName: '',
  phone: '',
  email: '',
  tier: 'STANDARD',
  loyaltyPoints: '100',
  dateOfBirth: '',
  membershipPlanId: '',
};

type PlanFormState = {
  name: string;
  tier: CustomerTier;
  annualFee: string;
  discountPercent: string;
  benefits: string;
  isActive: boolean;
};

const emptyPlanForm: PlanFormState = {
  name: '',
  tier: 'GOLD',
  annualFee: '999',
  discountPercent: '10',
  benefits: '',
  isActive: true,
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
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'directory' | 'tiers' | 'membership'>('directory');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | CustomerTier>('all');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);

  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusTargetId, setBonusTargetId] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState('500');
  const [bonusReason, setBonusReason] = useState(bonusReasons[0].value);

  const [walletOpen, setWalletOpen] = useState(false);
  const [walletTargetId, setWalletTargetId] = useState<string | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [walletTxLoading, setWalletTxLoading] = useState(false);
  const [walletMode, setWalletMode] = useState<'topup' | 'redeem'>('topup');
  const [walletAmount, setWalletAmount] = useState('500');
  const [walletNote, setWalletNote] = useState('');

  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
  const [planEditId, setPlanEditId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm);

  async function reload() {
    setLoading(true);
    try {
      const [customerRows, planRows] = await Promise.all([listCustomers(), listMembershipPlans()]);
      setCustomers(customerRows);
      setPlans(planRows);
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
      dateOfBirth: c.dateOfBirth ? c.dateOfBirth.slice(0, 10) : '',
      membershipPlanId: c.membershipPlanId ?? '',
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
      dateOfBirth: form.dateOfBirth || null,
      membershipPlanId: form.membershipPlanId || null,
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

  async function openWalletDrawer(c: LiveCustomer) {
    setWalletTargetId(c.id);
    setWalletMode('topup');
    setWalletAmount('500');
    setWalletNote('');
    setWalletOpen(true);
    setWalletTxLoading(true);
    try {
      setWalletTransactions(await listWalletTransactions(c.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load wallet history', 'danger');
    } finally {
      setWalletTxLoading(false);
    }
  }

  function closeWalletDrawer() {
    setWalletOpen(false);
  }

  async function submitWallet() {
    const amount = parseFloat(walletAmount);
    if (!walletTargetId || !amount || amount <= 0) {
      showToast('Enter a valid wallet amount', 'danger');
      return;
    }
    const target = customers.find((c) => c.id === walletTargetId);
    setSaving(true);
    try {
      if (walletMode === 'topup') {
        await topUpWallet(walletTargetId, amount, walletNote || undefined);
        showToast(`Added ${formatINR(amount)} to ${target?.fullName ?? 'customer'}'s wallet.`, 'success');
      } else {
        await redeemWallet(walletTargetId, amount, walletNote || undefined);
        showToast(`Redeemed ${formatINR(amount)} from ${target?.fullName ?? 'customer'}'s wallet.`, 'success');
      }
      const [customerRows, transactions] = await Promise.all([listCustomers(), listWalletTransactions(walletTargetId)]);
      setCustomers(customerRows);
      setWalletTransactions(transactions);
      setWalletAmount('500');
      setWalletNote('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Wallet transaction failed', 'danger');
    } finally {
      setSaving(false);
    }
  }

  function openCreatePlanDrawer() {
    setPlanEditId(null);
    setPlanForm(emptyPlanForm);
    setPlanDrawerOpen(true);
  }

  function openEditPlanDrawer(p: MembershipPlan) {
    setPlanEditId(p.id);
    setPlanForm({
      name: p.name,
      tier: p.tier,
      annualFee: String(p.annualFee),
      discountPercent: String(p.discountPercent),
      benefits: p.benefits,
      isActive: p.isActive,
    });
    setPlanDrawerOpen(true);
  }

  function closePlanDrawer() {
    setPlanDrawerOpen(false);
  }

  async function savePlan() {
    if (!planForm.name.trim()) {
      showToast('Plan name is required', 'danger');
      return;
    }
    const input: MembershipPlanInput = {
      name: planForm.name.trim(),
      tier: planForm.tier,
      annualFee: parseFloat(planForm.annualFee) || 0,
      discountPercent: parseFloat(planForm.discountPercent) || 0,
      benefits: planForm.benefits.trim() || undefined,
      isActive: planForm.isActive,
    };
    setSaving(true);
    try {
      if (planEditId) {
        await updateMembershipPlan(planEditId, input);
        showToast(`Updated membership plan "${planForm.name}"!`, 'success');
      } else {
        await createMembershipPlan(input);
        showToast(`Created membership plan "${planForm.name}"!`, 'success');
      }
      await reload();
      closePlanDrawer();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save membership plan', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlan(p: MembershipPlan) {
    try {
      await deleteMembershipPlan(p.id);
      setPlans((prev) => prev.filter((x) => x.id !== p.id));
      showToast(`Deleted membership plan "${p.name}".`, 'warning');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete membership plan', 'danger');
    }
  }

  function exportCSV() {
    downloadBlob(toCSV(filtered), `crm-customers-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    showToast('Exported customer CRM directory to CSV file.', 'success');
  }

  const bonusTarget = customers.find((c) => c.id === bonusTargetId);
  const walletTarget = customers.find((c) => c.id === walletTargetId);
  const totalWalletBalance = customers.reduce((s, c) => s + c.walletBalance, 0);

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
              <div className="text-[11px] text-slate-400 font-mono">{c.id.slice(0, 10)}</div>
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
          <div className="text-[11px] text-slate-400">{row.original.email}</div>
        </div>
      ),
    },
    {
      id: 'tier',
      header: 'Membership Tier',
      accessorFn: (c) => c.tier,
      cell: ({ row }) => (
        <div className="text-center space-y-1">
          <Badge color={tierBadgeColor[row.original.tier]} pill>
            {tierIcon[row.original.tier]} {tierLabel[row.original.tier]}
          </Badge>
          {row.original.membershipPlanName && (
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> {row.original.membershipPlanName} ({row.original.membershipDiscountPercent}% off)
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'wallet',
      header: 'Wallet Balance',
      accessorFn: (c) => c.walletBalance,
      cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-teal-600 dark:text-teal-400">
          {formatINR(row.original.walletBalance)}
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
            onClick={() => openWalletDrawer(row.original)}
            title="Manage Wallet"
            className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-600 hover:text-white text-teal-600 transition"
          >
            <Wallet className="w-3.5 h-3.5" />
          </button>
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
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400 border border-pink-500/20 uppercase tracking-wider flex items-center gap-1">
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
              { value: 'membership', label: `Membership Plans (${plans.length})` },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'directory' | 'tiers' | 'membership')}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Users} label="Total Registered Members" value={`${customers.length} Members`} delta="Enrolled Accounts" deltaTone="neutral" color="blue" />
        <KpiCard icon={Award} label="Loyalty Points Active" value={`${totalPoints.toLocaleString('en-IN')} Pts`} delta={`${formatINR(totalPoints)} Redeem Value`} deltaTone="neutral" color="purple" />
        <KpiCard icon={Crown} label="VIP & Gold Tier Members" value={`${vipGoldCount} Members`} delta="High Spenders (>₹20k)" deltaTone="neutral" color="amber" />
        <KpiCard icon={TrendingUp} label="Average Customer LTV" value={formatINR(avgLTV)} delta="Lifetime Billed Revenue" deltaTone="positive" color="emerald" />
        <KpiCard icon={Wallet} label="Wallet Balance Outstanding" value={formatINR(totalWalletBalance)} delta="Store Credit Liability" deltaTone="neutral" color="blue" />
      </div>

      {activeTab === 'directory' && (
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
      )}

      {activeTab === 'membership' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreatePlanDrawer}>
              <PlusCircle className="w-4 h-4" />
              + New Membership Plan
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.length === 0 && (
              <GlassCard className="lg:col-span-3 text-center py-10">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No membership plans yet. Create one to start offering server-enforced checkout discounts.
                </p>
              </GlassCard>
            )}
            {plans.map((p) => (
              <GlassCard key={p.id} className="hover:border-teal-500/50 transition duration-300 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">{p.name}</h4>
                    <Badge color={tierBadgeColor[p.tier]} pill>
                      {tierIcon[p.tier]} {tierLabel[p.tier]}
                    </Badge>
                  </div>
                  {!p.isActive && (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-500/10 text-slate-500 font-bold text-[11px] uppercase">Inactive</span>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Checkout Discount:</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{p.discountPercent}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Annual Fee:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatINR(p.annualFee)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Enrolled Customers:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{p.enrolledCount}</span>
                  </div>
                  {p.benefits && (
                    <div className="text-xs space-y-1">
                      <span className="text-slate-400 font-semibold block">Benefits:</span>
                      <p className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">{p.benefits}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => openEditPlanDrawer(p)}>
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => handleDeletePlan(p)}>
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    Delete
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tiers' && (
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
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date of Birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
          />
          <Select
            label="Paid Membership Plan"
            options={[{ value: '', label: 'No plan enrolled' }, ...plans.map((p) => ({ value: p.id, label: `${p.name} (${p.discountPercent}% off)` }))]}
            value={form.membershipPlanId}
            onChange={(e) => setForm((f) => ({ ...f, membershipPlanId: e.target.value }))}
          />
        </div>
        <p className="text-[12px] text-slate-400 leading-relaxed">
          Setting a date of birth enrolls this customer in the automated birthday wallet-credit job. A paid
          membership plan&apos;s discount is enforced server-side at checkout — it can never be undercut by a tampered
          request, only matched or beaten by a larger manual discount.
        </p>
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

      <Drawer
        open={walletOpen}
        onClose={closeWalletDrawer}
        title="Store Credit Wallet"
        subtitle="Top up or redeem store credit, and review the full ledger."
        footer={
          <>
            <Button variant="secondary" onClick={closeWalletDrawer}>
              Close
            </Button>
            <Button onClick={submitWallet} disabled={saving}>
              {saving ? 'Processing…' : walletMode === 'topup' ? 'Add to Wallet' : 'Redeem from Wallet'}
            </Button>
          </>
        }
      >
        <Input
          label="Customer"
          readOnly
          value={walletTarget ? `${walletTarget.fullName} — Current balance ${formatINR(walletTarget.walletBalance)}` : ''}
          className="font-bold !text-teal-600"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Transaction Type"
            options={[
              { value: 'topup', label: 'Top-up (add credit)' },
              { value: 'redeem', label: 'Redeem (use credit)' },
            ]}
            value={walletMode}
            onChange={(e) => setWalletMode(e.target.value as 'topup' | 'redeem')}
          />
          <Input
            label="Amount (₹)"
            required
            type="number"
            min={1}
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
          />
        </div>
        <Input
          label="Note (optional)"
          placeholder="e.g. Refund for damaged item"
          value={walletNote}
          onChange={(e) => setWalletNote(e.target.value)}
        />

        <div className="pt-2 space-y-2">
          <h5 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Transaction History
          </h5>
          {walletTxLoading ? (
            <p className="text-xs text-slate-400">Loading wallet history…</p>
          ) : walletTransactions.length === 0 ? (
            <p className="text-xs text-slate-400">No wallet activity yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {walletTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800"
                >
                  <div className="space-y-0.5">
                    <Badge color={walletTxColor[tx.type]} pill>
                      {walletTxLabel[tx.type]}
                    </Badge>
                    {tx.note && <div className="text-[11px] text-slate-400">{tx.note}</div>}
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono font-bold text-xs ${
                        tx.type === 'REDEEM' ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {tx.type === 'REDEEM' ? '-' : '+'}
                      {formatINR(tx.amount)}
                    </div>
                    <div className="text-[11px] text-slate-400">{formatDate(tx.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>

      <Drawer
        open={planDrawerOpen}
        onClose={closePlanDrawer}
        title={planEditId ? 'Edit Membership Plan' : 'Create Membership Plan'}
        subtitle="Configure a paid tier with a server-enforced checkout discount."
        footer={
          <>
            <Button variant="secondary" onClick={closePlanDrawer}>
              Cancel
            </Button>
            <Button onClick={savePlan} disabled={saving}>
              {saving ? 'Saving…' : 'Save Membership Plan'}
            </Button>
          </>
        }
      >
        <Input
          label="Plan Name"
          required
          placeholder="e.g. Gold Rewards"
          value={planForm.name}
          onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Maps to Tier"
            options={tierOptions}
            value={planForm.tier}
            onChange={(e) => setPlanForm((f) => ({ ...f, tier: e.target.value as CustomerTier }))}
          />
          <Input
            label="Discount at Checkout (%)"
            required
            type="number"
            min={0}
            max={100}
            value={planForm.discountPercent}
            onChange={(e) => setPlanForm((f) => ({ ...f, discountPercent: e.target.value }))}
          />
        </div>
        <Input
          label="Annual Fee (₹)"
          type="number"
          min={0}
          value={planForm.annualFee}
          onChange={(e) => setPlanForm((f) => ({ ...f, annualFee: e.target.value }))}
        />
        <Input
          label="Benefits Description"
          placeholder="e.g. 10% off every bill, birthday bonus"
          value={planForm.benefits}
          onChange={(e) => setPlanForm((f) => ({ ...f, benefits: e.target.value }))}
        />
        <Checkbox
          label="Plan is active"
          checked={planForm.isActive}
          onChange={(e) => setPlanForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
      </Drawer>
    </div>
  );
}
