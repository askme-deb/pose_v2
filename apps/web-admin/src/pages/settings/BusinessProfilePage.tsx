import { useMemo, useRef, useState } from 'react';
import { Store, FileCheck, Printer, CloudLightning, Camera, Save, Eye, CreditCard, MessageSquare } from 'lucide-react';
import { Badge, Button, Checkbox, Drawer, GlassCard, Input, KpiCard, PillTabs, Select, Textarea, useToast } from '@pospe/ui-library';
import { formatINR } from '../../utils/format';
import {
  Branch,
  BranchType,
  branches as initialBranches,
  branchTypeOptions,
  businessProfile,
  financialYearStartOptions,
  paperWidthOptions,
  retailCategoryOptions,
  stateCodeOptions,
  taxSlabOptions,
} from '../../services/mockData/businessProfile';

type ProfileTab = 'general' | 'tax' | 'branches' | 'receipt' | 'api';

const tabOptions: { value: ProfileTab; label: string }[] = [
  { value: 'general', label: 'General Identity' },
  { value: 'tax', label: 'Tax & GST' },
  { value: 'branches', label: 'Branch Locations' },
  { value: 'receipt', label: 'Thermal Receipt' },
  { value: 'api', label: 'API & Cloud' },
];

type BranchFormState = {
  name: string;
  code: string;
  type: BranchType;
  manager: string;
  phone: string;
  address: string;
};

const emptyBranchForm: BranchFormState = {
  name: '',
  code: '',
  type: 'Flagship',
  manager: '',
  phone: '',
  address: '',
};

const sampleReceiptItems = [
  { label: 'Organic Almond Milk 1L (x2)', amount: 498 },
  { label: 'Extra Virgin Olive Oil (x1)', amount: 650 },
];

export default function BusinessProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(businessProfile);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('general');
  const [branchList, setBranchList] = useState<Branch[]>(initialBranches);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [branchDrawerOpen, setBranchDrawerOpen] = useState(false);
  const [branchEditId, setBranchEditId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState<BranchFormState>(emptyBranchForm);

  const totalPrinters = branchList.reduce((s, b) => s + b.printers, 0);
  const primaryBranch = branchList.find((b) => b.isPrimary) ?? branchList[0];

  function setField<K extends keyof typeof profile>(key: K, value: (typeof profile)[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setLogoPreview(evt.target?.result as string);
      showToast('Brand Logo updated!', 'success');
    };
    reader.readAsDataURL(file);
  }

  function openBranchDrawer(branch?: Branch) {
    if (branch) {
      setBranchEditId(branch.id);
      setBranchForm({
        name: branch.name,
        code: branch.code,
        type: branch.type,
        manager: branch.manager,
        phone: branch.phone,
        address: branch.address,
      });
    } else {
      setBranchEditId(null);
      setBranchForm(emptyBranchForm);
    }
    setBranchDrawerOpen(true);
  }

  function closeBranchDrawer() {
    setBranchDrawerOpen(false);
  }

  function saveBranch() {
    if (!branchForm.name.trim() || !branchForm.code.trim() || !branchForm.manager.trim() || !branchForm.phone.trim()) {
      showToast('Branch name, code, manager, and phone are required', 'danger');
      return;
    }
    if (branchEditId) {
      setBranchList((prev) => prev.map((b) => (b.id === branchEditId ? { ...b, ...branchForm } : b)));
      showToast(`Branch Store '${branchForm.name}' updated!`, 'success');
    } else {
      setBranchList((prev) => [
        ...prev,
        { id: `br-${Date.now()}`, ...branchForm, isPrimary: false, printers: 1 },
      ]);
      showToast(`New Branch Store '${branchForm.name}' registered!`, 'success');
    }
    closeBranchDrawer();
  }

  function copyRazorpayKey() {
    navigator.clipboard.writeText(profile.razorpayKeyId);
    showToast('API Key copied to clipboard!', 'info');
  }

  function testWhatsApp() {
    showToast('WhatsApp Test Message Sent!', 'success');
  }

  function saveAllSettings() {
    showToast('Company Profile Settings & GST Rules Saved Successfully!', 'success');
  }

  function goToReceiptPreview() {
    setActiveTab('receipt');
    showToast('Viewing Thermal Receipt Customizer & Preview', 'info');
  }

  const receiptSubtotal = sampleReceiptItems.reduce((s, i) => s + i.amount, 0);
  const receiptTax = useMemo(() => Math.round(((receiptSubtotal * profile.defaultTaxSlab) / 100) * 100) / 100, [receiptSubtotal, profile.defaultTaxSlab]);
  const receiptTotal = Math.round((receiptSubtotal + receiptTax) * 100) / 100;
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=apexpos@icici%26pn=ApexSupermarket%26am=${receiptTotal}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Business Profile & Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> GST Verified &bull; {profile.registeredName}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage legal business entity credentials, GSTIN tax rules, multi-branch store directories, thermal receipt templates, and cloud
            API integrations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PillTabs options={tabOptions} value={activeTab} onChange={(v) => setActiveTab(v as ProfileTab)} className="overflow-x-auto" />
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={goToReceiptPreview}>
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              Receipt Preview
            </Button>
            <Button onClick={saveAllSettings}>
              <Save className="w-4 h-4" />
              Save Profile Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Store} label="Configured Store Branches" value={`${branchList.length} Outlets`} delta={`${primaryBranch?.name ?? '—'} (Primary)`} deltaTone="neutral" color="blue" />
        <KpiCard icon={FileCheck} label="GSTIN Registration" value={profile.gstin.slice(0, 11)} delta="Active GSTR-1 Verified" deltaTone="positive" color="emerald" />
        <KpiCard icon={Printer} label="Thermal POS Printers" value={`${totalPrinters} Terminals`} delta={`${profile.receiptPaperWidth} ESC/POS Online`} deltaTone="neutral" color="purple" />
        <KpiCard icon={CloudLightning} label="Cloud Integrations" value="2 Connected" delta="Razorpay, WhatsApp API" deltaTone="neutral" color="amber" />
      </div>

      {activeTab === 'general' && (
        <GlassCard className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">General Business Identity & Branding</h3>
              <p className="text-xs text-slate-400">Primary legal entity information displayed across customer invoices and public receipts.</p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 font-bold text-[10px]">Supermarket & Hypermarket Retail</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full lg:w-64">
              <div className="relative w-28 h-28 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 shadow-inner flex items-center justify-center group">
                {logoPreview ? (
                  <img src={logoPreview} alt="Brand logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Store className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                )}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <div className="text-center">
                <Button type="button" size="sm" variant="ghost" onClick={() => logoInputRef.current?.click()}>
                  Upload Brand Logo
                </Button>
                <p className="text-[10px] text-slate-400 mt-1">PNG, SVG or JPG (Max 2MB)</p>
              </div>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Registered Business Name" required value={profile.registeredName} onChange={(e) => setField('registeredName', e.target.value)} />
                <Input label="Display Brand Tagline" value={profile.tagline} onChange={(e) => setField('tagline', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="Retail Vertical Category" options={retailCategoryOptions} value={profile.retailCategory} onChange={(e) => setField('retailCategory', e.target.value)} />
                <Input label="Company Incorporation No." className="font-mono" value={profile.cin} onChange={(e) => setField('cin', e.target.value)} />
                <Input label="Year Established" type="number" value={profile.yearEstablished} onChange={(e) => setField('yearEstablished', parseInt(e.target.value, 10) || profile.yearEstablished)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Corporate Support Email" type="email" required value={profile.supportEmail} onChange={(e) => setField('supportEmail', e.target.value)} />
                <Input label="Helpline Phone Number" required value={profile.helplinePhone} onChange={(e) => setField('helplinePhone', e.target.value)} />
              </div>
              <Textarea label="Headquarters Address" rows={3} value={profile.hqAddress} onChange={(e) => setField('hqAddress', e.target.value)} />
            </div>
          </div>
        </GlassCard>
      )}

      {activeTab === 'tax' && (
        <GlassCard className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Taxation, GSTIN & Invoice Numbering Rules</h3>
              <p className="text-xs text-slate-400">Set statutory tax numbers, automatic invoice serial prefixing, HSN codes, and currency formatting.</p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">India GST Compliant (CGST + SGST / IGST)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="15-Digit GSTIN Number" required className="font-mono font-bold" value={profile.gstin} onChange={(e) => setField('gstin', e.target.value)} />
            <Input label="PAN Account Number" required className="font-mono font-bold" value={profile.pan} onChange={(e) => setField('pan', e.target.value)} />
            <Select label="State GST Registration Code" options={stateCodeOptions} value={profile.stateCode} onChange={(e) => setField('stateCode', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Default POS Tax Rate Slab" options={taxSlabOptions} value={String(profile.defaultTaxSlab)} onChange={(e) => setField('defaultTaxSlab', parseInt(e.target.value, 10))} />
            <Input label="Invoice Number Prefix Format" className="font-mono" value={profile.invoicePrefix} onChange={(e) => setField('invoicePrefix', e.target.value)} />
            <Input label="Next Auto-Increment Invoice No." type="number" className="font-mono" value={profile.nextInvoiceNumber} onChange={(e) => setField('nextInvoiceNumber', parseInt(e.target.value, 10) || profile.nextInvoiceNumber)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Billing Currency Symbol" required className="font-mono font-bold" value={profile.currencySymbol} onChange={(e) => setField('currencySymbol', e.target.value)} />
            <Select label="Financial Year Start" options={financialYearStartOptions} value={profile.financialYearStart} onChange={(e) => setField('financialYearStart', e.target.value)} />
            <Input label="E-Way Bill Generation Threshold (₹)" type="number" className="font-mono" value={profile.ewayBillThreshold} onChange={(e) => setField('ewayBillThreshold', parseInt(e.target.value, 10) || profile.ewayBillThreshold)} />
          </div>
        </GlassCard>
      )}

      {activeTab === 'branches' && (
        <GlassCard className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Multi-Branch Outlets & Warehouse Locations</h3>
              <p className="text-xs text-slate-400">Manage physical stores, linked thermal printers, branch managers, and inventory routing.</p>
            </div>
            <Button size="sm" onClick={() => openBranchDrawer()}>
              + Register Store Branch
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {branchList.map((b) => (
              <div key={b.id} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-blue-500/50 transition">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{b.name}</h4>
                        {b.isPrimary && <Badge color="blue">Primary HQ</Badge>}
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">
                        {b.code} &bull; {branchTypeOptions.find((t) => t.value === b.type)?.label ?? b.type}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {b.printers} Printers Linked
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{b.address}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400">Manager:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{b.manager}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone:</span> <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{b.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online & Syncing
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => openBranchDrawer(b)}>
                    Edit Branch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {activeTab === 'receipt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GlassCard className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Thermal POS Receipt Template Customizer</h3>
                <p className="text-xs text-slate-400">Configure receipt headers, footers, terms, and printer width specs.</p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 font-bold text-[10px]">{profile.receiptPaperWidth} ESC/POS Thermal</span>
            </div>

            <Input label="Receipt Header Title (Store Name)" required className="font-mono font-bold" value={profile.receiptHeader} onChange={(e) => setField('receiptHeader', e.target.value)} />
            <Input label="Receipt Sub-Header (Tagline / Address)" className="font-mono" value={profile.receiptSubHeader} onChange={(e) => setField('receiptSubHeader', e.target.value)} />
            <Input label="Receipt Footer Gratitude Message" className="font-mono" value={profile.receiptFooter} onChange={(e) => setField('receiptFooter', e.target.value)} />
            <Textarea label="Return Policy Terms & Conditions" rows={3} className="font-mono" value={profile.receiptReturnPolicy} onChange={(e) => setField('receiptReturnPolicy', e.target.value)} />

            <div className="grid grid-cols-2 gap-4">
              <Select label="Thermal Paper Roll Width" options={paperWidthOptions} value={profile.receiptPaperWidth} onChange={(e) => setField('receiptPaperWidth', e.target.value as '80mm' | '58mm')} />
              <div className="flex items-end pb-2.5">
                <Checkbox label="Print Dynamic UPI QR Code on Receipt" checked={profile.receiptShowUpiQr} onChange={(e) => setField('receiptShowUpiQr', e.target.checked)} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" /> Live Receipt Preview
              </span>
              <Button size="sm" variant="ghost" onClick={() => showToast('Sending test print job to thermal printer...', 'info')}>
                Test Print
              </Button>
            </div>

            <div className="bg-amber-50/70 dark:bg-slate-950 p-5 rounded-2xl border border-amber-200/70 dark:border-slate-800 font-mono text-xs shadow-inner space-y-2 text-slate-900 dark:text-slate-100 text-center">
              <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase">{profile.receiptHeader}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{profile.receiptSubHeader}</p>
              <p className="text-[10px] text-slate-400">GSTIN: {profile.gstin}</p>
              <div className="border-b border-dashed border-slate-400 dark:border-slate-700 my-2" />

              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Date: {new Date().toLocaleString('en-IN')}</span>
                <span>
                  Inv: #{profile.invoicePrefix}
                  {profile.nextInvoiceNumber}
                </span>
              </div>
              <div className="border-b border-dashed border-slate-400 dark:border-slate-700 my-2" />

              <div className="space-y-1 text-left text-[11px]">
                {sampleReceiptItems.map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span>{item.label}</span>
                    <span>{formatINR(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="border-b border-dashed border-slate-400 dark:border-slate-700 my-2" />

              <div className="space-y-1 text-right text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatINR(receiptSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({profile.defaultTaxSlab}%):</span>
                  <span>{formatINR(receiptTax)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white">
                  <span>GRAND TOTAL:</span>
                  <span>{formatINR(receiptTotal)}</span>
                </div>
              </div>
              <div className="border-b border-dashed border-slate-400 dark:border-slate-700 my-2" />

              {profile.receiptShowUpiQr && (
                <>
                  <div className="py-2">
                    <img src={qrDataUrl} alt="UPI QR" className="w-24 h-24 mx-auto rounded bg-white p-1 border border-slate-300" />
                    <p className="text-[9px] text-slate-400 mt-1">Scan UPI QR to Pay & Verify</p>
                  </div>
                  <div className="border-b border-dashed border-slate-400 dark:border-slate-700 my-2" />
                </>
              )}

              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{profile.receiptFooter}</p>
              <p className="text-[9px] text-slate-400 mt-1">{profile.receiptReturnPolicy}</p>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'api' && (
        <GlassCard className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">API Credentials & Cloud Integrations</h3>
              <p className="text-xs text-slate-400">Manage payment gateway webhooks, WhatsApp receipt APIs, and automated backup schedules.</p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">2 Services Connected</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Razorpay POS Gateway</h4>
                    <p className="text-[10px] text-slate-400">Card EDC & UPI QR Payments</p>
                  </div>
                </div>
                <Badge color="emerald">Connected</Badge>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px] uppercase tracking-wide">Razorpay Key ID</label>
                <div className="flex gap-2">
                  <input type="password" readOnly value={profile.razorpayKeyId} className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs outline-none" />
                  <Button size="sm" variant="secondary" onClick={copyRazorpayKey}>
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">WhatsApp Business API</h4>
                    <p className="text-[10px] text-slate-400">Automated PDF Receipt Dispatch</p>
                  </div>
                </div>
                <Badge color="emerald">Connected</Badge>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px] uppercase tracking-wide">WhatsApp Business Phone ID</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={profile.whatsappPhoneId} className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs outline-none" />
                  <Button size="sm" variant="secondary" onClick={testWhatsApp}>
                    Test
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      <Drawer
        open={branchDrawerOpen}
        onClose={closeBranchDrawer}
        title={branchEditId ? `Edit Store Branch: ${branchForm.name}` : 'Register New Store Branch'}
        subtitle="Add store location, branch manager, phone, and GST code."
        footer={
          <>
            <Button variant="secondary" onClick={closeBranchDrawer}>
              Cancel
            </Button>
            <Button onClick={saveBranch}>Save Store Branch</Button>
          </>
        }
      >
        <Input label="Branch Store Name" required placeholder="e.g. Bandra Kurla Complex Express" value={branchForm.name} onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Branch Code" required className="font-mono" placeholder="e.g. BR-BKC-05" value={branchForm.code} onChange={(e) => setBranchForm((f) => ({ ...f, code: e.target.value }))} />
          <Select label="Branch Type" options={branchTypeOptions} value={branchForm.type} onChange={(e) => setBranchForm((f) => ({ ...f, type: e.target.value as BranchType }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Store Manager Name" required placeholder="e.g. Sarah Jenkins" value={branchForm.manager} onChange={(e) => setBranchForm((f) => ({ ...f, manager: e.target.value }))} />
          <Input label="Branch Contact Phone" required placeholder="+91 98201 44556" value={branchForm.phone} onChange={(e) => setBranchForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <Textarea label="Full Branch Physical Address" required rows={3} placeholder="Enter street address, city, pincode..." value={branchForm.address} onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))} />
      </Drawer>
    </div>
  );
}
