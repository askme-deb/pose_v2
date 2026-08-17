import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Building, Building2, CreditCard, Database, Download, ExternalLink, Power, Search, Store } from 'lucide-react';
import {
  Avatar,
  Badge,
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
import {
  LiveTenant,
  LivePlatformAuditLog,
  TenantPlan,
  TenantRegion,
  TenantStatus,
  listTenants,
  createTenant,
  updateTenant,
  toggleTenantStatus,
  listPlatformAuditLogs,
  tenantDomain,
} from '../../services/api/tenants';
import { formatCompactINR, formatDateTime, formatINR } from '../../utils/format';

type TcTab = 'cards' | 'table' | 'db' | 'logs';
type DbStrategy = 'dedicated' | 'shared';

const tabOptions = [
  { value: 'cards', label: 'Tenant Cards' },
  { value: 'table', label: 'Table View' },
  { value: 'db', label: 'Database Isolation' },
  { value: 'logs', label: 'Audit Stream' },
];

const planLabels: Record<TenantPlan, string> = {
  ENTERPRISE: 'Enterprise Ultimate',
  PROFESSIONAL: 'Pro Business Retail',
  STARTER: 'Starter POS Single',
};

const planMonthlyPrice: Record<TenantPlan, number> = {
  STARTER: 14999,
  PROFESSIONAL: 49999,
  ENTERPRISE: 149999,
};

const statusLabels: Record<TenantStatus, string> = {
  ACTIVE: 'Active',
  TRIAL: 'Trialing',
  PAST_DUE: 'Past Due',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
};

const regionLabels: Record<TenantRegion, string> = {
  MUMBAI: 'ap-south-1 (Mumbai)',
  VIRGINIA: 'us-east-1 (Virginia)',
  FRANKFURT: 'eu-central-1 (Frankfurt)',
};

const planColor: Record<TenantPlan, 'purple' | 'blue' | 'emerald'> = {
  ENTERPRISE: 'purple',
  PROFESSIONAL: 'blue',
  STARTER: 'emerald',
};

const statusColor: Record<TenantStatus, 'emerald' | 'amber' | 'red'> = {
  ACTIVE: 'emerald',
  TRIAL: 'amber',
  PAST_DUE: 'amber',
  SUSPENDED: 'red',
  CANCELLED: 'red',
};

function formatStorage(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(2)} TB`;
  return `${gb} GB`;
}

export default function SuperAdminTenantsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TcTab>('cards');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | TenantPlan>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TenantStatus>('all');
  const [tenantList, setTenantList] = useState<LiveTenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<LivePlatformAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailsTenant, setDetailsTenant] = useState<LiveTenant | null>(null);

  const [formOrgName, setFormOrgName] = useState('');
  const [formSubdomain, setFormSubdomain] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerEmail, setFormOwnerEmail] = useState('');
  const [formPlan, setFormPlan] = useState<TenantPlan>('ENTERPRISE');
  const [formStoresLimit, setFormStoresLimit] = useState('15');
  const [formStorageLimit, setFormStorageLimit] = useState('500');
  const [formRegion, setFormRegion] = useState<TenantRegion>('MUMBAI');
  const [formDbStrategy, setFormDbStrategy] = useState<DbStrategy>('dedicated');

  async function reload() {
    setLoading(true);
    try {
      const [tenants, logs] = await Promise.all([listTenants(), listPlatformAuditLogs()]);
      setTenantList(tenants);
      setAuditLogs(logs);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load tenant directory from the server', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalTenants = tenantList.length;
  const totalOutlets = tenantList.reduce((sum, t) => sum + t.storesUsed, 0);
  const totalStorageGB = tenantList.reduce((sum, t) => sum + t.storageUsedGB, 0);
  const totalMRR = tenantList.reduce((sum, t) => sum + t.monthlyBilling, 0);

  const filteredTenants = useMemo(() => {
    let list = tenantList;
    if (planFilter !== 'all') list = list.filter((t) => t.plan === planFilter);
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.organizationName.toLowerCase().includes(q) ||
          tenantDomain(t).toLowerCase().includes(q) ||
          t.ownerName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tenantList, planFilter, statusFilter, search]);

  function resetForm() {
    setFormOrgName('');
    setFormSubdomain('');
    setFormOwnerName('');
    setFormOwnerEmail('');
    setFormPlan('ENTERPRISE');
    setFormStoresLimit('15');
    setFormStorageLimit('500');
    setFormRegion('MUMBAI');
    setFormDbStrategy('dedicated');
  }

  function openCreateDrawer() {
    setEditId(null);
    resetForm();
    setDrawerOpen(true);
  }

  function openEditDrawer(t: LiveTenant) {
    setEditId(t.id);
    setFormOrgName(t.organizationName);
    setFormSubdomain(t.subdomain);
    setFormOwnerName(t.ownerName);
    setFormOwnerEmail(t.ownerEmail);
    setFormPlan(t.plan);
    setFormStoresLimit(String(t.storesLimit));
    setFormStorageLimit(String(t.storageLimitGB));
    setFormRegion(t.region);
    setFormDbStrategy(t.dbInstancePod.startsWith('pg-shared') ? 'shared' : 'dedicated');
    setDrawerOpen(true);
  }

  async function saveTenant() {
    if (!formOrgName.trim() || !formSubdomain.trim() || !formOwnerName.trim() || !formOwnerEmail.trim()) {
      showToast('Please fill all required tenant fields', 'danger');
      return;
    }
    const input = {
      organizationName: formOrgName.trim(),
      subdomain: formSubdomain.trim().toLowerCase(),
      ownerName: formOwnerName.trim(),
      ownerEmail: formOwnerEmail.trim(),
      plan: formPlan,
      storesLimit: parseInt(formStoresLimit, 10) || 10,
      storageLimitGB: parseInt(formStorageLimit, 10) || 250,
      region: formRegion,
      dbStrategy: formDbStrategy,
    };

    setSaving(true);
    try {
      if (editId) {
        await updateTenant(editId, input);
        showToast(`Updated tenant record '${input.organizationName}'`, 'success');
      } else {
        await createTenant(input);
        showToast(`Provisioned Enterprise Tenant '${input.organizationName}'!`, 'success');
      }
      await reload();
      setDrawerOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save tenant', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(t: LiveTenant) {
    try {
      const updated = await toggleTenantStatus(t.id);
      setTenantList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      showToast(`Tenant '${t.organizationName}' status set to ${statusLabels[updated.status]}`, 'warning');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update tenant status', 'danger');
    }
  }

  function exportCsv() {
    let csv = 'Organization Name,Subdomain,SaaS Plan,Stores Used,Stores Limit,Monthly Billing (INR),Storage Used GB,DB Instance,Status\n';
    tenantList.forEach((t) => {
      csv += `"${t.organizationName}","${tenantDomain(t)}","${planLabels[t.plan]}",${t.storesUsed},${t.storesLimit},${t.monthlyBilling},${t.storageUsedGB},"${t.dbInstancePod}",${statusLabels[t.status]}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ApexPOS_MultiTenant_Directory.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Multi-Tenant Directory Exported to CSV!', 'success');
  }

  function impersonate() {
    showToast('Impersonation is disabled in this demo environment.', 'info');
  }

  const columns: ColumnDef<LiveTenant, any>[] = [
    {
      header: 'Organization & Domain',
      accessorKey: 'organizationName',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.original.organizationName} size="sm" />
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{row.original.organizationName}</h4>
            <p className="text-[10px] text-slate-400 font-mono">{tenantDomain(row.original)}</p>
          </div>
        </div>
      ),
    },
    { header: 'Plan', accessorKey: 'plan', cell: ({ row }) => <Badge color={planColor[row.original.plan]}>{planLabels[row.original.plan]}</Badge> },
    {
      header: 'Outlets Used/Max',
      id: 'outlets',
      cell: ({ row }) => (
        <span className="font-bold text-slate-800 dark:text-slate-200">
          {row.original.storesUsed} / {row.original.storesLimit}
        </span>
      ),
    },
    {
      header: 'Monthly Billing',
      accessorKey: 'monthlyBilling',
      cell: ({ row }) => <span className="font-mono font-black text-slate-900 dark:text-white">{formatINR(row.original.monthlyBilling)}</span>,
    },
    {
      header: 'Storage Usage',
      accessorKey: 'storageUsedGB',
      cell: ({ row }) => <span className="text-purple-600 font-bold">{formatStorage(row.original.storageUsedGB)}</span>,
    },
    { header: 'Status', accessorKey: 'status', cell: ({ row }) => <Badge color={statusColor[row.original.status]}>{statusLabels[row.original.status]}</Badge> },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => setDetailsTenant(row.original)}
            className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Manage
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
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Multi-Tenant Enterprise Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> {totalTenants} Tenants Onboarded • {totalOutlets} Store Outlets
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Provision SaaS business organizations, configure database schema isolation, monitor cloud storage quotas, and manage subscription billing
            parameters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenant name, domain, owner..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 w-64 shadow-inner"
            />
          </div>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as 'all' | TenantPlan)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All SaaS Plans</option>
            <option value="ENTERPRISE">Enterprise Ultimate</option>
            <option value="PROFESSIONAL">Pro Business Retail</option>
            <option value="STARTER">Starter POS Single</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | TenantStatus)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trialing</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <PillTabs options={tabOptions} value={activeTab} onChange={(v) => setActiveTab(v as TcTab)} />

          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={openCreateDrawer}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition transform hover:scale-[1.02]"
            >
              <Building2 className="w-4 h-4" />
              <span>+ Provision SaaS Tenant</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building} label="Total Active Tenants" value={`${totalTenants} Tenants`} delta="6 Onboarded This Month" deltaTone="positive" color="indigo" />
        <KpiCard icon={Store} label="Total Outlets Served" value={`${totalOutlets} Branches`} delta={`Avg ${(totalOutlets / (totalTenants || 1)).toFixed(1)} Outlets / Tenant`} deltaTone="positive" color="blue" />
        <KpiCard icon={Database} label="Allocated Cloud Storage" value={formatStorage(totalStorageGB)} delta="38% Quota Utilization" deltaTone="positive" color="purple" />
        <KpiCard icon={CreditCard} label="Monthly SaaS Revenue" value={formatCompactINR(totalMRR)} delta="98.6% Auto-Billed" deltaTone="positive" color="emerald" />
      </div>

      {activeTab === 'cards' && (
        <div className="space-y-4">
          {!loading && filteredTenants.length === 0 ? (
            <GlassCard className="py-12 text-center text-slate-400">
              <p className="font-bold text-xs">No SaaS tenants matched your search filter criteria</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTenants.map((t) => {
                const pctStorage = Math.round((t.storageUsedGB / t.storageLimitGB) * 100);
                return (
                  <div
                    key={t.id}
                    className="glass-card p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition group space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar name={t.organizationName} size="md" />
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition">{t.organizationName}</h3>
                            <p className="text-[10px] font-mono text-slate-400">{tenantDomain(t)}</p>
                          </div>
                        </div>
                        <Badge color={statusColor[t.status]}>{statusLabels[t.status]}</Badge>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Plan:</span>
                          <strong className="text-indigo-600">{planLabels[t.plan]}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Stores:</span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {t.storesUsed} / {t.storesLimit} Branches
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Monthly Bill:</span>
                          <strong className="font-mono text-slate-900 dark:text-white">{formatINR(t.monthlyBilling)}/mo</strong>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>Storage Quota</span>
                          <span>
                            {t.storageUsedGB} GB / {t.storageLimitGB} GB ({pctStorage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-purple-600" style={{ width: `${pctStorage}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">{t.ownerName}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetailsTenant(t)}
                          className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 shadow-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t)}
                          title="Toggle Status"
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'table' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Tenant Directory &amp; Instance Table</h3>
              <p className="text-xs text-slate-400">Granular breakdown of tenant domains, subscription billing, store limits, and instance status.</p>
            </div>
            <button onClick={openCreateDrawer} className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 transition">
              + Register Tenant
            </button>
          </div>
          <DataTable columns={columns} data={filteredTenants} loading={loading} emptyTitle="No tenants matched" emptyDescription="Try adjusting your filters." />
        </GlassCard>
      )}

      {activeTab === 'db' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Database Isolation &amp; Cloud Replica Telemetry</h3>
              <p className="text-xs text-slate-400">Isolated database pod mapping, automated backup schedules, and storage quota limits.</p>
            </div>
            <button
              onClick={() => showToast(`Database snapshots verified for all ${totalTenants} tenant pods`, 'success')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Snapshot Backup
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-extrabold">
                  <th className="py-3 px-4">Tenant Organization</th>
                  <th className="py-3 px-4">Isolated DB Instance Pod</th>
                  <th className="py-3 px-4">Region / Data Center</th>
                  <th className="py-3 px-4">Storage Used</th>
                  <th className="py-3 px-4">Last Automated Backup</th>
                  <th className="py-3 px-4 text-right">DB Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
                {tenantList.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.organizationName}</td>
                    <td className="py-3 px-4 font-mono text-indigo-600 font-bold">{t.dbInstancePod}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{regionLabels[t.region]}</td>
                    <td className="py-3 px-4 font-mono font-bold text-purple-600">{formatStorage(t.storageUsedGB)}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">Today at 03:00 AM</td>
                    <td className="py-3 px-4 text-right">
                      <Badge color="emerald">Optimal (100%)</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {activeTab === 'logs' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Tenant Administrative Event Audit Stream</h3>
              <p className="text-xs text-slate-400">Log ledger of tenant creation, plan upgrades, admin logins, and storage alerts.</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="space-y-3">
            {auditLogs.map((l) => (
              <div key={l.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{l.tenantName}</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-mono text-[9px] font-bold">{l.eventType}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">{l.details}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(l.timestamp)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? 'Edit SaaS Tenant Record' : 'Provision SaaS Enterprise Tenant'}
        subtitle="Set organization identity, domain binding, store outlet limits, and DB isolation."
        width="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <button
              onClick={saveTenant}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Tenant Record'}
            </button>
          </>
        }
      >
        <Input label="Organization Business Name" required value={formOrgName} onChange={(e) => setFormOrgName(e.target.value)} placeholder="e.g. Zenith Retail Group" />
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Tenant Subdomain <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <input
              type="text"
              required
              value={formSubdomain}
              onChange={(e) => setFormSubdomain(e.target.value)}
              placeholder="zenith"
              className="w-full px-3 py-2 bg-transparent outline-none font-mono font-bold text-xs text-slate-900 dark:text-slate-100"
            />
            <span className="px-3 text-slate-400 font-mono text-[11px] border-l border-slate-300 dark:border-slate-700">.apexpos.com</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Owner Admin Full Name" required value={formOwnerName} onChange={(e) => setFormOwnerName(e.target.value)} placeholder="e.g. Vikramaditya Rao" />
          <Input label="Owner Contact Email" type="email" required value={formOwnerEmail} onChange={(e) => setFormOwnerEmail(e.target.value)} placeholder="owner@zenith.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="SaaS Subscription Plan"
            value={formPlan}
            onChange={(e) => setFormPlan(e.target.value as TenantPlan)}
            options={[
              { value: 'ENTERPRISE', label: `Enterprise Ultimate (${formatINR(planMonthlyPrice.ENTERPRISE)}/mo)` },
              { value: 'PROFESSIONAL', label: `Pro Business Retail (${formatINR(planMonthlyPrice.PROFESSIONAL)}/mo)` },
              { value: 'STARTER', label: `Starter POS Single (${formatINR(planMonthlyPrice.STARTER)}/mo)` },
            ]}
          />
          <Input label="Max Outlets Capacity" type="number" value={formStoresLimit} onChange={(e) => setFormStoresLimit(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Storage Quota Limit (GB)" type="number" value={formStorageLimit} onChange={(e) => setFormStorageLimit(e.target.value)} />
          <Select
            label="Cloud Region Data Center"
            value={formRegion}
            onChange={(e) => setFormRegion(e.target.value as TenantRegion)}
            options={[
              { value: 'MUMBAI', label: 'ap-south-1 (Mumbai Primary)' },
              { value: 'VIRGINIA', label: 'us-east-1 (N. Virginia)' },
              { value: 'FRANKFURT', label: 'eu-central-1 (Frankfurt)' },
            ]}
          />
        </div>
        <Select
          label="Database Schema Isolation Strategy"
          value={formDbStrategy}
          onChange={(e) => setFormDbStrategy(e.target.value as DbStrategy)}
          options={[
            { value: 'dedicated', label: 'Dedicated PostgreSQL Container Pod (High Security)' },
            { value: 'shared', label: 'Shared Multi-Tenant Schema (Standard)' },
          ]}
        />
      </Drawer>

      <Drawer
        open={!!detailsTenant}
        onClose={() => setDetailsTenant(null)}
        title={detailsTenant?.organizationName ?? 'Tenant Details'}
        subtitle={detailsTenant ? tenantDomain(detailsTenant) : undefined}
        width="lg"
        footer={
          detailsTenant && (
            <>
              <button
                onClick={impersonate}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Impersonate Admin Login
              </button>
              <button
                onClick={() => {
                  openEditDrawer(detailsTenant);
                  setDetailsTenant(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Edit
              </button>
              <button onClick={() => setDetailsTenant(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                Close
              </button>
            </>
          )
        }
      >
        {detailsTenant && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <Avatar name={detailsTenant.organizationName} size="lg" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Organization</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{detailsTenant.organizationName}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Subscription Plan:</span>
                  <strong className="block text-indigo-600">{planLabels[detailsTenant.plan]}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Monthly Revenue:</span>
                  <strong className="block text-slate-900 dark:text-white font-mono">{formatINR(detailsTenant.monthlyBilling)}/mo</strong>
                </div>
                <div>
                  <span className="text-slate-400">Stores Used:</span>
                  <strong className="block text-slate-800 dark:text-slate-200">
                    {detailsTenant.storesUsed} / {detailsTenant.storesLimit} Stores
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Storage Usage:</span>
                  <strong className="block text-purple-600">
                    {detailsTenant.storageUsedGB} GB / {detailsTenant.storageLimitGB} GB
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">Cloud Infrastructure Health</h4>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Database Pod:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{detailsTenant.dbInstancePod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cloud Region:</span>
                    <span className="text-slate-800 dark:text-slate-200">{regionLabels[detailsTenant.region]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Owner Admin:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {detailsTenant.ownerName} ({detailsTenant.ownerEmail})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tenant Since:</span>
                    <span className="text-slate-800 dark:text-slate-200">{formatDateTime(detailsTenant.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
