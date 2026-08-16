import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Activity,
  Building2,
  Download,
  RefreshCw,
  Search,
  Server,
  TrendingUp,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  GlassCard,
  Input,
  KpiCard,
  PillTabs,
  Select,
  DataTable,
  useToast,
} from '@pospe/ui-library';
import {
  Tenant,
  TenantPlan,
  planLabels,
  planMonthlyPrice,
  statusLabels,
  tenantDomain,
  tenants as initialTenants,
} from '../../services/mockData/tenants';
import { subscriptionPlans } from '../../services/mockData/subscriptionPlans';
import { formatCompactINR, formatINR } from '../../utils/format';

type SaTab = 'overview' | 'tenants' | 'clusters' | 'plans';

interface ClusterNode {
  id: string;
  name: string;
  cpu: string;
  ram: string;
  latency: string;
  status: 'Healthy' | 'Degraded';
  activeConnections: number;
}

const clusters: ClusterNode[] = [
  { id: 'node-01', name: 'Asia South Mumbai Primary (AWS ap-south-1)', cpu: '42%', ram: '68%', latency: '8ms', status: 'Healthy', activeConnections: 14200 },
  { id: 'node-02', name: 'US East N. Virginia (AWS us-east-1)', cpu: '24%', ram: '41%', latency: '45ms', status: 'Healthy', activeConnections: 8900 },
  { id: 'node-03', name: 'EU Central Frankfurt (AWS eu-central-1)', cpu: '18%', ram: '32%', latency: '62ms', status: 'Healthy', activeConnections: 4500 },
  { id: 'node-04', name: 'Asia Southeast Singapore (AWS ap-southeast-1)', cpu: '31%', ram: '54%', latency: '22ms', status: 'Healthy', activeConnections: 6100 },
];

interface AuditEntry {
  id: number;
  time: string;
  event: string;
  detail: string;
}

const initialAuditFeed: AuditEntry[] = [
  { id: 1, time: '4 mins ago', event: 'NEW_TENANT_PROVISIONED', detail: 'Organic Pantry Co initialized on Starter POS Trial' },
  { id: 2, time: '22 mins ago', event: 'BILLING_SUCCESS', detail: 'Collected ₹149,999.00 subscription payment from Metro Hypermarket' },
  { id: 3, time: '1 hour ago', event: 'CLUSTER_SCALE_UP', detail: 'Auto-scaled Asia South Primary Cluster 01 (+2 Pods)' },
  { id: 4, time: '3 hours ago', event: 'PLAN_UPGRADE', detail: 'QuickBite Restaurant upgraded from Starter to Pro Business' },
];

const liveFeedTemplates: { event: string; detail: string }[] = [
  { event: 'API_HEALTHCHECK', detail: 'All 4 cloud cluster nodes responded within SLA window' },
  { event: 'BACKUP_SNAPSHOT', detail: 'Automated nightly DB snapshot completed for tenant fleet' },
  { event: 'WEBHOOK_DELIVERED', detail: 'Razorpay subscription webhook delivered in 0.01s' },
  { event: 'SESSION_LOGIN', detail: 'Tenant admin authenticated via SSO from Mumbai edge node' },
  { event: 'STORAGE_SCAN', detail: 'Cloud storage quota scan completed across all tenant pods' },
];

const tabOptions = [
  { value: 'overview', label: 'Platform Overview' },
  { value: 'tenants', label: 'Tenant Directory' },
  { value: 'clusters', label: 'Cloud Health' },
  { value: 'plans', label: 'SaaS Plans' },
];

const planColor: Record<TenantPlan, 'purple' | 'blue' | 'emerald'> = {
  enterprise: 'purple',
  professional: 'blue',
  starter: 'emerald',
};

const statusColor: Record<Tenant['status'], 'emerald' | 'amber' | 'red' | 'slate'> = {
  active: 'emerald',
  trialing: 'amber',
  past_due: 'amber',
  suspended: 'red',
};

export default function SuperAdminDashboardPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SaTab>('overview');
  const [search, setSearch] = useState('');
  const [tenantList, setTenantList] = useState<Tenant[]>(initialTenants);
  const [auditFeed, setAuditFeed] = useState<AuditEntry[]>(initialAuditFeed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [formOrgName, setFormOrgName] = useState('');
  const [formSubdomain, setFormSubdomain] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerEmail, setFormOwnerEmail] = useState('');
  const [formPlan, setFormPlan] = useState<TenantPlan>('enterprise');
  const [formStoresLimit, setFormStoresLimit] = useState('10');

  // Live scrolling SaaS platform log feed
  useEffect(() => {
    const interval = setInterval(() => {
      const tpl = liveFeedTemplates[Math.floor(Math.random() * liveFeedTemplates.length)];
      setAuditFeed((prev) => [{ id: Date.now(), time: 'Just now', event: tpl.event, detail: tpl.detail }, ...prev].slice(0, 12));
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const activeTenantsCount = tenantList.filter((t) => t.status === 'active').length;
  const totalStores = tenantList.reduce((sum, t) => sum + t.storesUsed, 0);
  const totalMRR = tenantList.reduce((sum, t) => sum + t.monthlyBilling, 0);
  const arpu = tenantList.length ? Math.round(totalMRR / tenantList.length) : 0;

  const mrrByTier = useMemo(() => {
    const tiers: TenantPlan[] = ['enterprise', 'professional', 'starter'];
    return tiers.map((plan) => {
      const mrr = tenantList.filter((t) => t.plan === plan).reduce((sum, t) => sum + t.monthlyBilling, 0);
      const pct = totalMRR ? Math.round((mrr / totalMRR) * 100) : 0;
      return { plan, mrr, pct };
    });
  }, [tenantList, totalMRR]);

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenantList;
    return tenantList.filter(
      (t) =>
        t.organizationName.toLowerCase().includes(q) ||
        tenantDomain(t).toLowerCase().includes(q) ||
        planLabels[t.plan].toLowerCase().includes(q),
    );
  }, [tenantList, search]);

  const tierBarClass: Record<TenantPlan, string> = {
    enterprise: 'bg-gradient-to-r from-purple-600 to-indigo-600',
    professional: 'bg-gradient-to-r from-blue-600 to-cyan-500',
    starter: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  };
  const tierTextClass: Record<TenantPlan, string> = {
    enterprise: 'text-purple-600',
    professional: 'text-blue-600',
    starter: 'text-emerald-600',
  };

  function toggleTenantStatus(id: string) {
    setTenantList((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextStatus = t.status === 'active' ? 'suspended' : 'active';
        showToast(`Tenant '${t.organizationName}' status set to ${statusLabels[nextStatus]}`, 'warning');
        return { ...t, status: nextStatus };
      }),
    );
  }

  function runDiagnostics() {
    showToast('Running diagnostic health check across 4 AWS cloud clusters...', 'info');
    setTimeout(() => showToast('All cloud cluster nodes responding with 100% SLA!', 'success'), 1200);
  }

  function exportSaasCsv() {
    let csv = 'Tenant Name,Subdomain,Subscription Plan,Store Count,Monthly Billing (INR),Status\n';
    tenantList.forEach((t) => {
      csv += `"${t.organizationName}","${tenantDomain(t)}","${planLabels[t.plan]}",${t.storesUsed},${t.monthlyBilling},${statusLabels[t.status]}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ApexPOS_SaaS_Tenants_Report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Super Admin SaaS Report Exported!', 'success');
  }

  function openDrawer() {
    setFormOrgName('');
    setFormSubdomain('');
    setFormOwnerName('');
    setFormOwnerEmail('');
    setFormPlan('enterprise');
    setFormStoresLimit('10');
    setDrawerOpen(true);
  }

  function saveTenant() {
    if (!formOrgName.trim() || !formSubdomain.trim() || !formOwnerName.trim() || !formOwnerEmail.trim()) {
      showToast('Please fill all required tenant fields', 'danger');
      return;
    }
    const newTenant: Tenant = {
      id: `ten-${Date.now()}`,
      organizationName: formOrgName.trim(),
      subdomain: formSubdomain.trim().toLowerCase(),
      plan: formPlan,
      storesUsed: 1,
      storesLimit: parseInt(formStoresLimit, 10) || 10,
      monthlyBilling: planMonthlyPrice[formPlan],
      status: 'active',
      storageUsedGB: 5,
      storageLimitGB: 250,
      dbInstancePod: `pg-pod-${formSubdomain.trim().toLowerCase()}-01`,
      region: 'mumbai',
      ownerName: formOwnerName.trim(),
      ownerEmail: formOwnerEmail.trim(),
      createdAt: new Date().toISOString(),
    };
    setTenantList((prev) => [newTenant, ...prev]);
    setAuditFeed((prev) => [
      { id: Date.now(), time: 'Just now', event: 'NEW_TENANT_PROVISIONED', detail: `Provisioned tenant ${newTenant.organizationName} (${tenantDomain(newTenant)})` },
      ...prev,
    ]);
    setDrawerOpen(false);
    showToast(`Provisioned new SaaS Tenant '${newTenant.organizationName}'!`, 'success');
  }

  const columns: ColumnDef<Tenant, any>[] = [
    {
      header: 'Tenant Name & Subdomain',
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
    {
      header: 'Plan',
      accessorKey: 'plan',
      cell: ({ row }) => <Badge color={planColor[row.original.plan]}>{planLabels[row.original.plan]}</Badge>,
    },
    {
      header: 'Outlets',
      accessorKey: 'storesUsed',
      cell: ({ row }) => <span className="font-bold text-slate-700 dark:text-slate-300">{row.original.storesUsed} Stores</span>,
    },
    {
      header: 'Monthly Billing',
      accessorKey: 'monthlyBilling',
      cell: ({ row }) => <span className="font-mono font-black text-slate-900 dark:text-white">{formatINR(row.original.monthlyBilling)}/mo</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => <Badge color={statusColor[row.original.status]}>{statusLabels[row.original.status]}</Badge>,
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => toggleTenantStatus(row.original.id)}>
            Manage
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Super Admin SaaS Command Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> 99.98% System Uptime • {activeTenantsCount} Active Tenants
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Platform-wide multi-tenant analytics, cloud cluster infrastructure monitoring, SaaS subscription revenue telemetry, and enterprise tenant
            provisioning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenant, domain, plan..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500 w-64 shadow-inner"
            />
          </div>

          <PillTabs options={tabOptions} value={activeTab} onChange={(v) => setActiveTab(v as SaTab)} />

          <div className="flex items-center gap-2">
            <button
              onClick={exportSaasCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-purple-500 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Export SaaS Report</span>
            </button>
            <button
              onClick={openDrawer}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition transform hover:scale-[1.02]"
            >
              <Building2 className="w-4 h-4" />
              <span>+ Provision Tenant</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} label="Monthly Recurring Revenue" value={formatCompactINR(totalMRR)} delta="+18.4% YoY SaaS MRR" deltaTone="positive" color="purple" />
        <KpiCard icon={Building2} label="Active Business Tenants" value={`${activeTenantsCount} Tenants`} delta={`Across ${totalStores} Store Outlets`} deltaTone="positive" color="blue" />
        <KpiCard icon={Activity} label="Platform API Throughput (24h)" value="14.2M Req" delta="12ms Avg Latency" deltaTone="positive" color="emerald" />
        <KpiCard icon={Server} label="SaaS System Health SLA" value="99.98%" delta="All 4 Clusters Healthy" deltaTone="positive" color="amber" />
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GlassCard className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Monthly SaaS Revenue &amp; Tenant Scaling</h3>
                <p className="text-xs text-slate-400">Combined MRR growth across Enterprise, Pro, and Starter tiers.</p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 font-bold text-[10px]">H2 Financial Year</span>
            </div>

            <div className="space-y-4 pt-2">
              {mrrByTier.map(({ plan, mrr, pct }) => (
                <div key={plan} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">
                      {planLabels[plan]} ({formatCompactINR(mrr)} MRR)
                    </span>
                    <span className={tierTextClass[plan]}>{pct}% of Total MRR</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full ${tierBarClass[plan]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Avg ARPU / Tenant</span>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">{formatINR(arpu)} / mo</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Customer Churn Rate</span>
                <p className="font-extrabold text-sm text-emerald-600 mt-0.5">0.42% (Industry Top)</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Net Revenue Retention</span>
                <p className="font-extrabold text-sm text-purple-600 mt-0.5">124% NRR</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Live SaaS Platform Log Feed</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto text-xs pr-1">
              {auditFeed.map((f) => (
                <div key={f.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-purple-600 font-bold">{f.event}</span>
                    <span className="text-[9px] text-slate-400">{f.time}</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{f.detail}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'tenants' && (
        <GlassCard className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Multi-Tenant Business Directory</h3>
              <p className="text-xs text-slate-400">View and manage all active subscriber business tenants, store branch counts, and subscription plans.</p>
            </div>
            <button onClick={openDrawer} className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md hover:bg-purple-700 transition">
              + Register New Tenant
            </button>
          </div>
          <DataTable columns={columns} data={filteredTenants} emptyTitle="No tenants matched" emptyDescription="Try adjusting your search." />
        </GlassCard>
      )}

      {activeTab === 'clusters' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Global Cloud Infrastructure &amp; Server Nodes</h3>
              <p className="text-xs text-slate-400">Real-time load CPU, memory utilization, Redis cache hit rates, and database cluster health.</p>
            </div>
            <button onClick={runDiagnostics} className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Run Diagnostics
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {clusters.map((c) => (
              <div key={c.id} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                    </div>
                    <Badge color="emerald">{c.status}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">CPU LOAD</span>
                      <span className="font-mono font-extrabold text-purple-600 text-sm">{c.cpu}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">RAM USAGE</span>
                      <span className="font-mono font-extrabold text-blue-600 text-sm">{c.ram}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">LATENCY</span>
                      <span className="font-mono font-extrabold text-emerald-600 text-sm">{c.latency}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Active Sockets: <strong className="text-slate-900 dark:text-white font-mono">{c.activeConnections.toLocaleString('en-IN')}</strong>
                  </span>
                  <button
                    onClick={() => showToast(`Cluster ${c.name} health verified`, 'success')}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-[10px] font-bold"
                  >
                    Ping Node
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {activeTab === 'plans' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">ApexPOS SaaS Pricing Tiers &amp; Feature Matrix</h3>
              <p className="text-xs text-slate-400">Configure tenant feature entitlements, store limits, and monthly recurring price tiers.</p>
            </div>
            <button
              onClick={() => showToast('SaaS Tier Editor Modal opened', 'info')}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md"
            >
              + Add New Plan Tier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptionPlans
              .filter((p) => p.id !== 'plan-custom')
              .map((p) => (
                <div
                  key={p.id}
                  className="glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition"
                >
                  <div className="space-y-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600 border border-purple-500/20">{p.badge}</span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{p.name}</h3>
                    <p className="text-2xl font-black text-purple-600 font-mono">{formatINR(p.monthlyPrice)} / mo</p>
                    <ul className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">{p.subscriberCount} Active Subscribers</span>
                    <button
                      onClick={() => showToast(`Editing plan limits for ${p.name}`, 'info')}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-sm"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </GlassCard>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Provision New SaaS Tenant"
        subtitle="Register business organization, assign domain, and initialize cloud database instance."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <button
              onClick={saveTenant}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition"
            >
              Provision Instance
            </button>
          </>
        }
      >
        <Input label="Organization Business Name" required value={formOrgName} onChange={(e) => setFormOrgName(e.target.value)} placeholder="e.g. Zenith Supermarkets India" />
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Subdomain Name <span className="text-red-500">*</span>
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
          <Input label="Admin Owner Full Name" required value={formOwnerName} onChange={(e) => setFormOwnerName(e.target.value)} placeholder="e.g. Rahul Sharma" />
          <Input label="Owner Email Address" type="email" required value={formOwnerEmail} onChange={(e) => setFormOwnerEmail(e.target.value)} placeholder="rahul@zenith.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Subscription Plan"
            value={formPlan}
            onChange={(e) => setFormPlan(e.target.value as TenantPlan)}
            options={[
              { value: 'enterprise', label: `Enterprise Ultimate (${formatINR(planMonthlyPrice.enterprise)}/mo)` },
              { value: 'professional', label: `Pro Business Retail (${formatINR(planMonthlyPrice.professional)}/mo)` },
              { value: 'starter', label: `Starter POS Single (${formatINR(planMonthlyPrice.starter)}/mo)` },
            ]}
          />
          <Input label="Store Outlets Limit" type="number" value={formStoresLimit} onChange={(e) => setFormStoresLimit(e.target.value)} />
        </div>
      </Drawer>
    </div>
  );
}
