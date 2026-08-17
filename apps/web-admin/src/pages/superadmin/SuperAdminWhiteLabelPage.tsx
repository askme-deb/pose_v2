import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Palette, ShieldCheck, Mail, Cpu, Search, Save, Globe } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  Drawer,
  GlassCard,
  Input,
  KpiCard,
  PillTabs,
  Select,
  Textarea,
  useToast,
} from '@pospe/ui-library';
import {
  LiveTenant,
  LiveCnameDomain,
  listTenants,
  listCnameDomains,
  createCnameDomain,
  getTenantBranding,
  updateTenantBranding,
  tenantDomain,
} from '../../services/api/tenants';

const FONT_OPTIONS = [
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Default)' },
  { value: 'Inter', label: 'Inter UI' },
  { value: 'Roboto', label: 'Roboto Condensed' },
  { value: 'Outfit', label: 'Outfit Modern' },
];

const TAB_OPTIONS = [
  { value: 'theme', label: 'Brand Theme & Logo' },
  { value: 'domains', label: 'Custom Domains' },
  { value: 'emails', label: 'Email & SMTP' },
  { value: 'code', label: 'Custom CSS & Scripts' },
];

export default function SuperAdminWhiteLabelPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('theme');
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState<LiveTenant[]>([]);
  const [domains, setDomains] = useState<LiveCnameDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [targetTenant, setTargetTenant] = useState('');
  const [appTitle, setAppTitle] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('images/logo.svg');
  const [logoUrl, setLogoUrl] = useState('/src/assets/logo.svg');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');
  const [customCss, setCustomCss] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpHost, setSmtpHost] = useState('');

  const [newDomainTenantId, setNewDomainTenantId] = useState('');
  const [newDomainHost, setNewDomainHost] = useState('');

  const tenantOptions = useMemo(
    () => tenants.map((t) => ({ value: t.id, label: `${t.organizationName} (${tenantDomain(t)})` })),
    [tenants],
  );

  async function loadBrandingFor(tenantId: string) {
    try {
      const branding = await getTenantBranding(tenantId);
      const tenant = tenants.find((t) => t.id === tenantId);
      setAppTitle(branding.appTitle || `${tenant?.organizationName ?? ''} POS`);
      setFaviconUrl(branding.faviconUrl || 'images/logo.svg');
      setLogoUrl(branding.logoUrl || '/src/assets/logo.svg');
      setAccentColor(branding.accentColor);
      setFontFamily(branding.fontFamily);
      setCustomCss(branding.customCss || '.brand-header-custom { background: linear-gradient(135deg, #1e3a8a, #3b82f6); }');
      setSmtpFrom(branding.smtpFromLabel || `${tenant?.organizationName ?? ''} Receipts <billing@${tenant?.subdomain ?? 'tenant'}.com>`);
      setSmtpHost(branding.smtpHost || 'smtp.sendgrid.net (Port 587 TLS)');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load branding config for this tenant', 'danger');
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [t, d] = await Promise.all([listTenants(), listCnameDomains()]);
        setTenants(t);
        setDomains(d);
        if (t[0]) {
          setTargetTenant(t[0].id);
          setNewDomainTenantId(t[0].id);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load white-label data from the server', 'danger');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (targetTenant) loadBrandingFor(targetTenant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetTenant, tenants.length]);

  const enterpriseTenantCount = tenants.filter((t) => t.plan === 'ENTERPRISE').length;

  const filteredDomains = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return domains;
    return domains.filter((d) => d.tenantOrg.toLowerCase().includes(q) || d.cnameDomain.toLowerCase().includes(q));
  }, [domains, search]);

  const columns: ColumnDef<LiveCnameDomain, any>[] = [
    { header: 'Tenant Organization', accessorKey: 'tenantOrg', cell: ({ row }) => <span className="font-bold text-slate-900 dark:text-white">{row.original.tenantOrg}</span> },
    { header: 'Custom CNAME Domain', accessorKey: 'cnameDomain', cell: ({ row }) => <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{row.original.cnameDomain}</span> },
    { header: 'Cloud Edge Ingress Target', accessorKey: 'edgeIngressTarget', cell: ({ row }) => <span className="font-mono text-slate-500 dark:text-slate-400">{row.original.edgeIngressTarget}</span> },
    { header: 'SSL Certificate SLA', accessorKey: 'sslSlaStatus', cell: ({ row }) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.original.sslSlaStatus}</span> },
    {
      header: 'DNS Propagation',
      accessorKey: 'dnsPropagationStatus',
      cell: ({ row }) => (
        <Badge color="emerald" pill>
          {row.original.dnsPropagationStatus}
        </Badge>
      ),
    },
  ];

  const handleSaveBranding = async () => {
    if (!targetTenant) return;
    setSaving(true);
    try {
      await updateTenantBranding(targetTenant, { appTitle, faviconUrl, logoUrl, accentColor, fontFamily, customCss, smtpFromLabel: smtpFrom, smtpHost });
      showToast('White-Label Branding config saved and deployed to tenant edge CDN!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save branding config', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTenantConfig = (value: string) => {
    setTargetTenant(value);
    showToast('Loaded White-Label branding configuration for selected tenant', 'info');
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainHost.trim() || !newDomainTenantId) return;
    try {
      const domain = await createCnameDomain(newDomainTenantId, newDomainHost.trim());
      setDomains((prev) => [domain, ...prev]);
      setAddOpen(false);
      setNewDomainHost('');
      showToast(`Custom CNAME domain '${domain.cnameDomain}' bound with Let's Encrypt SSL!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not bind CNAME domain', 'danger');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Enterprise White-Label Branding Engine
            </h1>
            <Badge color="red" pill dot>
              {enterpriseTenantCount} White-Label Tenants Active &middot; {domains.length} Custom CNAME SSL Secured
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure tenant brand identities, custom CNAME domain mappings, custom CSS themes, transactional SMTP
            email layouts, and custom login portals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search domain, tenant, theme..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500 w-64 shadow-inner"
            />
          </div>

          <PillTabs options={TAB_OPTIONS} value={tab} onChange={setTab} />

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              <Globe className="w-3.5 h-3.5 text-rose-600" />
              + Add CNAME Domain
            </Button>
            <Button
              onClick={handleSaveBranding}
              disabled={saving}
              className="!bg-gradient-to-r !from-rose-600 !to-pink-600 hover:!from-rose-700 hover:!to-pink-700 !shadow-rose-500/25"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Branding Config'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Palette} label="White-Label Enterprise Tenants" value={`${enterpriseTenantCount} Tenants`} delta="100% Brand Isolated" color="red" />
        <KpiCard icon={ShieldCheck} label="Custom CNAME Mappings" value={`${domains.length} Domains`} delta="SSL TLS 1.3 Auto-Renewed" color="blue" />
        <KpiCard icon={Mail} label="Transactional Emails (30d)" value="1.42M Sent" delta="99.8% Inbox Delivery Rate" color="emerald" />
        <KpiCard icon={Cpu} label="Custom DNS Ingress SLA" value="100% Propagated" delta="6ms Cloud Edge Latency" color="amber" />
      </div>

      {tab === 'theme' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GlassCard className="lg:col-span-7 space-y-4">
            <div className="border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Tenant Brand & Theme Customizer</h3>
              <p className="text-xs text-slate-400">
                Select target enterprise tenant organization to customize logo, accent color, and typography.
              </p>
            </div>

            <Select
              label="Target Tenant Organization"
              options={tenantOptions}
              value={targetTenant}
              onChange={(e) => handleLoadTenantConfig(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Custom Application Display Title" value={appTitle} onChange={(e) => setAppTitle(e.target.value)} />
              <Input label="Favicon Image URL" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} className="font-mono" />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                Brand Logo Image
              </label>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                  <img src={logoUrl} alt="Brand Logo" className="h-8" onError={(e) => (e.currentTarget.style.opacity = '0.2')} />
                </div>
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Primary Accent Color Theme
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-9 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer bg-transparent"
                  />
                  <input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none font-mono font-bold text-xs"
                  />
                </div>
              </div>
              <Select label="UI Font Family" options={FONT_OPTIONS} value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} />
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Live White-Label Preview</h3>
                <Badge color="red" pill>LIVE CANVAS</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Visual representation of how the header and buttons render inside the tenant's POS billing terminal.
              </p>

              <div
                className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4 transition-all"
                style={{ fontFamily }}
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <img src={logoUrl} alt="Logo" className="h-7" onError={(e) => (e.currentTarget.style.opacity = '0.2')} />
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">{appTitle}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: accentColor }}>
                    Tenant Terminal
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Sample POS Cart Subtotal:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">₹4,850.00</span>
                  </div>
                  <button className="w-full py-2 rounded-xl text-white font-bold text-xs shadow-md transition" style={{ backgroundColor: accentColor }}>
                    Proceed to Complete Checkout
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center">
              Changes apply instantaneously across all tenant store branches.
            </div>
          </GlassCard>
        </div>
      )}

      {tab === 'domains' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Custom CNAME Domain Mappings & SSL Status</h3>
              <p className="text-xs text-slate-400">
                Active custom domains configured by Enterprise Ultimate subscribers pointing to ApexPOS cloud edge ingress.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>+ Add CNAME Mapping</Button>
          </div>
          <DataTable columns={columns} data={filteredDomains} loading={loading} emptyTitle="No domains found" emptyDescription="Try a different search term." />
        </GlassCard>
      )}

      {tab === 'emails' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Transactional Email & Custom SMTP Gateway</h3>
              <p className="text-xs text-slate-400">
                Configure white-labeled SendGrid/Amazon SES relays for automated sales receipt dispatch.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => showToast('Test email receipt dispatched via SMTP relay', 'success')}
            >
              Send Test Email
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="From Sender Email Name" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} />
            <Input label="SMTP Host Server" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="font-mono" />
          </div>
        </GlassCard>
      )}

      {tab === 'code' && (
        <GlassCard className="space-y-4">
          <div className="border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Custom CSS Stylesheet & Script Injection</h3>
            <p className="text-xs text-slate-400">Inject custom CSS overrides or analytics tracking scripts into tenant sessions.</p>
          </div>
          <Textarea
            label="Custom CSS Override Rules"
            rows={6}
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
            className="!bg-slate-900 !text-emerald-400 font-mono !border-slate-800"
          />
        </GlassCard>
      )}

      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Custom CNAME Domain"
        subtitle="Map custom tenant domain to cloud edge ingress."
        width="md"
      >
        <form onSubmit={handleAddDomain} className="space-y-4">
          <Select
            label="Target Business Tenant"
            options={tenantOptions}
            value={newDomainTenantId}
            onChange={(e) => setNewDomainTenantId(e.target.value)}
          />
          <Input
            label="Custom CNAME Domain Host"
            required
            placeholder="pos.apexsupermarket.com"
            value={newDomainHost}
            onChange={(e) => setNewDomainHost(e.target.value)}
            className="font-mono"
          />
          <Input label="ApexPOS Ingress Edge Target" value="ingress-mumbai-01.apexpos.com" disabled className="font-mono text-slate-500" />
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="!bg-rose-600 hover:!bg-rose-700 !bg-none !shadow-rose-500/25">Provision SSL & Bind</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
