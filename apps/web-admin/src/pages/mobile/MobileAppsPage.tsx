import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Chart from 'react-apexcharts';
import {
  Battery,
  BatteryCharging,
  BarChart2,
  Bluetooth,
  Camera,
  ChevronRight,
  Download,
  DownloadCloud,
  Gift,
  Globe,
  LayoutGrid,
  Moon,
  PenTool,
  Printer,
  QrCode,
  Radio,
  RefreshCw,
  Scan,
  ScanLine,
  Search,
  Settings,
  Shield,
  Signal,
  Signal as SignalIcon,
  Sliders,
  Smartphone,
  Tablet as TabletIcon,
  TrendingUp,
  Truck,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  Badge,
  Button,
  Drawer,
  GlassCard,
  KpiCard,
  Select,
  Input,
  DataTable,
  useToast,
  cn,
} from '@pospe/ui-library';
import { fleetDevices as initialFleetDevices, fleetBranchOptions, type FleetDevice } from '../../services/mockData/fleetDevices';
import { formatINR } from '../../utils/format';
import { useThemeStore } from '../../store/useThemeStore';

type AppMode = 'pos' | 'stocktake' | 'logistics' | 'loyalty' | 'manager';
type PhoneModel = 'iphone' | 'android' | 'tablet';
type PhoneNav = 'home' | 'pos' | 'scan' | 'orders' | 'settings';

interface ModeDef {
  id: AppMode;
  label: string;
  desc: string;
  icon: typeof Zap;
  iconBg: string;
  activeBorder: string;
  hoverBorder: string;
}

const MODES: ModeDef[] = [
  { id: 'pos', label: 'Mobile Billing Terminal', desc: 'Touch Cart, Barcode Scan, Tap-to-Pay NFC', icon: Zap, iconBg: 'bg-sky-600', activeBorder: 'border-sky-500/30 bg-sky-500/10', hoverBorder: 'hover:border-sky-500/30' },
  { id: 'stocktake', label: 'Stock Audit Scanner', desc: 'Camera Viewfinder, Rack Count, Audits', icon: ScanLine, iconBg: 'bg-purple-600', activeBorder: 'border-purple-500/30 bg-purple-500/10', hoverBorder: 'hover:border-purple-500/30' },
  { id: 'logistics', label: 'Delivery Driver App', desc: 'Order Manifests, GPS Route, E-Signatures', icon: Truck, iconBg: 'bg-emerald-600', activeBorder: 'border-emerald-500/30 bg-emerald-500/10', hoverBorder: 'hover:border-emerald-500/30' },
  { id: 'loyalty', label: 'Customer Loyalty Pass', desc: 'Digital Pass QR, Points Wallet, Rewards', icon: Gift, iconBg: 'bg-pink-600', activeBorder: 'border-pink-500/30 bg-pink-500/10', hoverBorder: 'hover:border-pink-500/30' },
  { id: 'manager', label: 'Mobile Manager Insights', desc: 'Live Store Revenue, Target Tracker, Stats', icon: BarChart2, iconBg: 'bg-indigo-600', activeBorder: 'border-indigo-500/30 bg-indigo-500/10', hoverBorder: 'hover:border-indigo-500/30' },
];

const PHONE_NAV_ITEMS: { id: PhoneNav; label: string; icon: typeof Zap }[] = [
  { id: 'home', label: 'Home', icon: Smartphone },
  { id: 'pos', label: 'POS', icon: Zap },
  { id: 'scan', label: 'Scan', icon: Scan },
  { id: 'orders', label: 'Orders', icon: LayoutGrid },
  { id: 'settings', label: 'More', icon: Settings },
];

const PHONE_SHELL_CLASS: Record<PhoneModel, string> = {
  iphone: 'w-[375px] h-[740px] bg-slate-900 dark:bg-slate-950 rounded-[48px] p-3.5 shadow-2xl border-[6px] border-slate-800 relative flex flex-col justify-between overflow-hidden shadow-sky-500/10',
  android: 'w-[350px] h-[740px] bg-slate-900 dark:bg-slate-950 rounded-[32px] p-3 shadow-2xl border-[6px] border-slate-700 relative flex flex-col justify-between overflow-hidden shadow-purple-500/10',
  tablet: 'w-[420px] h-[680px] bg-slate-900 dark:bg-slate-950 rounded-[28px] p-4 shadow-2xl border-[6px] border-slate-800 relative flex flex-col justify-between overflow-hidden shadow-emerald-500/10',
};

const PHONE_MODEL_LABEL: Record<PhoneModel, string> = {
  iphone: 'iPhone 15 Pro',
  android: 'Android Terminal',
  tablet: 'Kiosk Tablet',
};

// Categorical bar palette (validated for CVD-safe adjacency in both themes)
const MODE_BAR_COLORS = ['#0284c7', '#16a34a', '#7c3aed', '#d97706'];
const PAYMENT_DONUT_LIGHT = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b'];
const PAYMENT_DONUT_DARK = ['#0284c7', '#4f46e5', '#059669', '#d97706'];

function batteryTone(percent: number) {
  if (percent < 30) return { text: 'text-rose-500', bar: 'bg-rose-500' };
  if (percent < 60) return { text: 'text-amber-500', bar: 'bg-amber-500' };
  return { text: 'text-emerald-500', bar: 'bg-emerald-500' };
}

const STATUS_BADGE: Record<FleetDevice['status'], { color: 'emerald' | 'purple' | 'slate'; label: string }> = {
  online: { color: 'emerald', label: 'Online' },
  syncing: { color: 'purple', label: 'Syncing' },
  offline: { color: 'slate', label: 'Offline' },
};

function PhoneAppBody({ mode, onToast }: { mode: AppMode; onToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void }) {
  if (mode === 'pos') {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              placeholder="Search item or scan barcode..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white outline-none"
            />
          </div>
          <button onClick={() => onToast('Simulating Mobile Barcode Camera Viewfinder Scan...', 'info')} className="p-1.5 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Gourmet Chocolate', price: 250 },
            { name: 'Almond Milk 1L', price: 180 },
            { name: 'Avocado Toast', price: 320 },
            { name: 'Cold Brew Coffee', price: 150 },
          ].map((item) => (
            <div
              key={item.name}
              onClick={() => onToast(`Added ${item.name} (₹${item.price}) to Mobile Cart!`, 'success')}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <div className="font-bold text-[11px] text-slate-900 dark:text-white truncate">{item.name}</div>
              <div className="text-[10px] text-sky-600 font-mono font-bold mt-0.5">{formatINR(item.price)}</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span>Mobile Cart (3 Items)</span>
            <span className="font-mono text-xs">{formatINR(750)}</span>
          </div>
          <button
            onClick={() => onToast('Tap-to-Pay NFC Contactless Payment Initiated on Mobile!', 'success')}
            className="w-full py-2 rounded-xl bg-white text-sky-700 font-bold text-[11px] shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>TAP TO PAY (NFC CONTACTLESS)</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'stocktake') {
    return (
      <div className="space-y-3 animate-fade-in text-xs">
        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 font-bold flex items-center justify-between">
          <span>Camera Barcode Scanner</span>
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        </div>

        <div className="w-full h-32 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden border-2 border-dashed border-purple-500">
          <ScanLine className="w-8 h-8 text-purple-400 animate-bounce" />
          <span className="text-[10px] text-slate-400 mt-1">Align barcode in rectangle</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="font-bold text-slate-900 dark:text-white">Scanned SKU: SKU-1082 (Almond Milk)</div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Rack Location:</span>
            <span className="font-mono font-bold text-purple-600">A-04-SHELF-2</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Recorded Count:</span>
            <span className="font-mono font-bold">42 Units</span>
          </div>
          <button
            onClick={() => onToast('Recorded stock audit count for SKU-1082!', 'success')}
            className="w-full py-2 rounded-xl bg-purple-600 text-white font-bold text-[11px]"
          >
            Confirm Stock Count
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'logistics') {
    return (
      <div className="space-y-3 animate-fade-in text-xs">
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold flex items-center justify-between">
          <span>Active Driver Dispatch Manifest</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px]">3 Deliveries Left</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex justify-between font-bold">
            <span className="text-slate-900 dark:text-white">Order #ORD-9021</span>
            <span className="text-emerald-600">En Route</span>
          </div>
          <div className="text-[11px] text-slate-500">Customer: Sophia Martinez (Downtown Flagship)</div>
          <div className="text-[10px] text-slate-400">124 Commercial Blvd, Suite 400</div>

          <button
            onClick={() => onToast('Opening mobile E-signature pad...', 'info')}
            className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>CAPTURE E-SIGNATURE</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'loyalty') {
    return (
      <div className="space-y-3 animate-fade-in text-xs">
        <div className="p-4 rounded-3xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white space-y-3 shadow-lg">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs uppercase">Apex Loyalty Pass</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold">VIP DIAMOND</span>
          </div>
          <div>
            <div className="text-[10px] opacity-80">Active Balance</div>
            <div className="text-2xl font-black font-mono">4,890 Pts</div>
          </div>
          <div className="pt-2 border-t border-white/20 flex justify-between text-[10px] opacity-90">
            <span>Dr. Aris Thorne</span>
            <span>ID: CUST-901</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Scan Pass at POS Register</span>
          <div className="w-36 h-12 mx-auto bg-slate-900 text-white rounded-xl flex items-center justify-center font-mono font-bold tracking-widest text-xs">
            |||| ||| ||||| |||
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in text-xs">
      <div className="p-4 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-700 text-white space-y-3 shadow-lg">
        <div className="flex justify-between items-center">
          <span className="font-bold text-xs uppercase tracking-wider">Manager Live Insights</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div>
          <div className="text-[10px] opacity-80">Today&apos;s Mobile Revenue</div>
          <div className="text-2xl font-black font-mono">{formatINR(142890)}</div>
        </div>
        <div className="pt-2 border-t border-white/20 flex justify-between text-[10px] opacity-90">
          <span>Target: ₹1.5L (95.2%)</span>
          <span>142 Bills</span>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex justify-between items-center font-bold">
          <span className="text-slate-900 dark:text-white">Store Telemetry</span>
          <span className="text-emerald-600">Peak Volume</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Mobile Billing Share</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">42.8%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full w-[42.8%]" />
          </div>
        </div>
        <button
          onClick={() => onToast('Refreshing Manager Mobile Telemetry Feed...', 'info')}
          className="w-full py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-[11px] mt-1"
        >
          Refresh Telemetry
        </button>
      </div>
    </div>
  );
}

export default function MobileAppsPage() {
  const { showToast } = useToast();
  const dark = useThemeStore((s) => s.dark);

  const [devices, setDevices] = useState<FleetDevice[]>(initialFleetDevices);
  const [appMode, setAppMode] = useState<AppMode>('pos');
  const [phoneModel, setPhoneModel] = useState<PhoneModel>('iphone');
  const [phoneDark, setPhoneDark] = useState(false);
  const [phoneNav, setPhoneNav] = useState<PhoneNav>('home');

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [osFilter, setOsFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedDevice, setSelectedDevice] = useState<FleetDevice | null>(null);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      const matchesQuery =
        !q || d.deviceName.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.serial.toLowerCase().includes(q);
      const matchesBranch = branchFilter === 'all' || d.assignedBranch === branchFilter;
      const matchesOs = osFilter === 'all' || d.os === osFilter;
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesQuery && matchesBranch && matchesOs && matchesStatus;
    });
  }, [devices, search, branchFilter, osFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => d.status === 'online').length;
    const syncing = devices.filter((d) => d.status === 'syncing').length;
    const offline = devices.filter((d) => d.status === 'offline').length;
    const pendingDevices = devices.filter((d) => d.syncQueueCount > 0).length;
    const pendingRecords = devices.reduce((sum, d) => sum + d.syncQueueCount, 0);
    const syncedPct = Math.round(((total - pendingDevices) / total) * 100);
    const avgBattery = Math.round(devices.reduce((sum, d) => sum + d.batteryPercent, 0) / total);
    const lowBattery = devices.filter((d) => d.batteryPercent < 20).length;
    const allPeripherals = devices.flatMap((d) => d.pairedPeripherals);
    const printerCount = allPeripherals.filter((p) => p.toLowerCase().includes('printer')).length;
    const otherHardwareCount = allPeripherals.length - printerCount;
    return { total, online, syncing, offline, pendingRecords, syncedPct, avgBattery, lowBattery, allPeripherals, printerCount, otherHardwareCount };
  }, [devices]);

  const branchSelectOptions = [{ value: 'all', label: 'All Store Branches' }, ...fleetBranchOptions];
  const osSelectOptions = [
    { value: 'all', label: 'All OS Builds' },
    { value: 'ios', label: 'iOS Build' },
    { value: 'android', label: 'Android Build' },
  ];
  const statusSelectOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'online', label: 'Online' },
    { value: 'syncing', label: 'Syncing Queue' },
    { value: 'offline', label: 'Offline' },
  ];

  function handlePing(device: FleetDevice, e?: React.MouseEvent) {
    e?.stopPropagation();
    showToast(`Ping sent to ${device.deviceName}! Response latency: 42ms. Telemetry active.`, 'success');
  }

  function handleSync(device: FleetDevice, e?: React.MouseEvent) {
    e?.stopPropagation();
    setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, syncQueueCount: 0, status: 'online' } : d)));
    showToast(`Force SQLite Sync triggered for ${device.id}. 0 Pending records remaining.`, 'info');
  }

  function handleOpenDetail(device: FleetDevice, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSelectedDevice(device);
  }

  function handleSwitchFrame(model: PhoneModel) {
    setPhoneModel(model);
    showToast(`Switched simulator device frame to ${PHONE_MODEL_LABEL[model]}.`, 'info');
  }

  const columns: ColumnDef<FleetDevice, any>[] = [
    {
      id: 'device',
      header: 'Device Name & Serial',
      accessorFn: (d) => d.deviceName,
      cell: ({ row }) => {
        const d = row.original;
        const Icon = d.os === 'ios' ? Smartphone : TabletIcon;
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{d.deviceName}</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal">({d.id})</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{d.serial}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'branch',
      header: 'Assigned Branch & Register',
      accessorFn: (d) => d.assignedBranch,
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-slate-700 dark:text-slate-200">{row.original.assignedBranch}</div>
          <div className="text-[10px] text-slate-400">{row.original.register}</div>
        </div>
      ),
    },
    {
      id: 'os',
      header: 'OS & Build Version',
      accessorFn: (d) => d.osVersion,
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {row.original.os === 'ios' ? 'iOS' : 'Android'} {row.original.osVersion}
        </span>
      ),
    },
    {
      id: 'peripherals',
      header: 'Paired Peripherals',
      accessorFn: (d) => d.pairedPeripherals.join(', '),
      cell: ({ row }) => (
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
          {row.original.pairedPeripherals.join(', ')}
        </div>
      ),
    },
    {
      id: 'battery',
      header: 'Battery Telemetry',
      accessorFn: (d) => d.batteryPercent,
      cell: ({ row }) => {
        const pct = row.original.batteryPercent;
        const tone = batteryTone(pct);
        return (
          <div className="space-y-1 w-20">
            <div className={cn('flex items-center gap-1.5 font-mono font-bold text-xs', tone.text)}>
              <Battery className="w-3.5 h-3.5" />
              <span>{pct}%</span>
              {pct === 100 && <span className="text-[9px] text-emerald-600 font-sans font-bold">⚡</span>}
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status & Sync Queue',
      accessorFn: (d) => d.status,
      cell: ({ row }) => {
        const d = row.original;
        const meta = STATUS_BADGE[d.status];
        return (
          <Badge color={meta.color} dot pill>
            {meta.label} ({d.syncQueueCount} queued)
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={(e) => handlePing(d, e)}
              title="Ping Device telemetry"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white transition"
            >
              <Radio className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleSync(d, e)}
              title="Force SQLite Queue Sync"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-500 hover:text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleOpenDetail(d, e)}
              title="View Full Specs & Hardware Diagnostics"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  const foreColor = dark ? '#94a3b8' : '#64748b';
  const gridColor = dark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)';
  const lineColor = dark ? '#38bdf8' : '#0284c7';

  const hourlyChartOptions = {
    chart: { type: 'area' as const, toolbar: { show: false }, foreColor, fontFamily: 'inherit' },
    stroke: { curve: 'smooth' as const, width: 3 },
    colors: [lineColor],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    markers: { size: 4, colors: [lineColor], strokeWidth: 0 },
    grid: { borderColor: gridColor, strokeDashArray: 3 },
    xaxis: { categories: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'], labels: { style: { colors: foreColor, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: foreColor, fontSize: '10px' } } },
    tooltip: { theme: dark ? 'dark' : 'light' },
    legend: { show: false },
  };
  const hourlyChartSeries = [{ name: 'Mobile Bills Handled', data: [12, 45, 88, 120, 145, 190, 160, 85] }];

  const paymentColors = dark ? PAYMENT_DONUT_DARK : PAYMENT_DONUT_LIGHT;
  const paymentChartOptions = {
    chart: { type: 'donut' as const, fontFamily: 'inherit' },
    labels: ['Tap-to-Pay NFC', 'Mobile UPI / QR', 'Card Swiper', 'Cash'],
    colors: paymentColors,
    legend: { position: 'bottom' as const, labels: { colors: foreColor }, fontSize: '11px', fontWeight: 700 },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: [dark ? '#0f172a' : '#ffffff'] },
    plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Total Bills', color: foreColor } } } } },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  const paymentChartSeries = [48, 32, 14, 6];

  const modesChartOptions = {
    chart: { type: 'bar' as const, toolbar: { show: false }, foreColor, fontFamily: 'inherit' },
    plotOptions: { bar: { distributed: true, borderRadius: 8, columnWidth: '45%' } },
    colors: MODE_BAR_COLORS,
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: gridColor, strokeDashArray: 3 },
    xaxis: { categories: ['Billing POS', 'Stock Audit', 'Driver Logistics', 'Loyalty Scanner'], labels: { style: { colors: foreColor, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: foreColor, fontSize: '10px' } } },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  const modesChartSeries = [{ name: 'Active Daily Sessions', data: [240, 180, 95, 310] }];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ApexPOS Mobile Ecosystem &amp; App Studio
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border border-sky-500/20 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" /> v4.2.0 Native Build • PWA Ready • {kpis.total} Registered Terminals
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage registered handheld terminals, monitor real-time sync telemetry, test touch workflows in live simulators, and analyze mobile
            sales performance across store branches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => setQrModalOpen(true)}>
            <QrCode className="w-4 h-4 text-sky-600" />
            <span>Scan App QR</span>
          </Button>
          <Button variant="primary" className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-sky-500/25" onClick={() => setPwaModalOpen(true)}>
            <DownloadCloud className="w-4 h-4" />
            <span>+ Install PWA App</span>
          </Button>
          <Button variant="ghost" onClick={() => showToast(`Initiated global ping to all ${kpis.total} mobile devices...`, 'info')}>
            <Radio className="w-4 h-4 text-purple-500" />
            <span>Fleet Ping</span>
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={Smartphone} label="Active Mobile POS" value={`${kpis.total} Terminals`} delta={`${kpis.online}/${kpis.total} Online`} deltaTone="positive" color="cyan" />
        <KpiCard icon={LayoutGrid} label="PWA App Installs" value="142 Installs" delta="65 iOS • 35 Android" deltaTone="neutral" color="indigo" />
        <KpiCard icon={TrendingUp} label="Mobile Sales Share" value="42.8%" delta={formatINR(375400)} deltaTone="positive" color="emerald" />
        <KpiCard icon={Wifi} label="SQLite Offline Sync" value={`${kpis.syncedPct}% Synced`} delta={`${kpis.pendingRecords} Pending`} deltaTone={kpis.pendingRecords > 0 ? 'negative' : 'positive'} color="purple" />
        <KpiCard icon={Printer} label="Paired Hardware" value={`${kpis.allPeripherals.length} Peripherals`} delta={`${kpis.printerCount} Printers • ${kpis.otherHardwareCount} Scanners`} deltaTone="neutral" color="amber" />
        <KpiCard icon={BatteryCharging} label="Fleet Battery Avg" value={`${kpis.avgBattery}% Charge`} delta={`${kpis.lowBattery} Low`} deltaTone={kpis.lowBattery > 0 ? 'negative' : 'positive'} color="red" />
      </div>

      {/* Simulator + Phone Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="space-y-4 shadow-lg">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-600" />
              <span>Mobile App Mode Simulator</span>
            </h3>
            <p className="text-xs text-slate-400">Select an application role to test interactive touch layouts in the live phone frame.</p>

            <div className="space-y-2">
              {MODES.map((mode) => {
                const Icon = mode.icon;
                const active = appMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setAppMode(mode.id)}
                    className={cn(
                      'w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between group',
                      active ? mode.activeBorder : cn('border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50', mode.hoverBorder),
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md', mode.iconBg)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{mode.label}</div>
                        <div className="text-[10px] text-slate-400">{mode.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className={cn('w-4 h-4', active ? 'text-sky-600' : 'text-slate-400')} />
                  </button>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Device Hardware &amp; Frame Switcher</h4>

            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['iphone', 'android', 'tablet'] as PhoneModel[]).map((model) => (
                <button
                  key={model}
                  onClick={() => handleSwitchFrame(model)}
                  className={cn(
                    'p-2.5 rounded-xl border font-semibold text-center transition',
                    phoneModel === model
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-500',
                  )}
                >
                  {PHONE_MODEL_LABEL[model]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <button
                onClick={() => setPhoneDark((v) => !v)}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 hover:border-sky-500 flex items-center justify-center gap-2"
              >
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Toggle Theme</span>
              </button>
              <button
                onClick={() => showToast('Simulating Mobile Barcode Camera Viewfinder Scan...', 'info')}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 hover:border-sky-500 flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4 text-sky-600" />
                <span>Camera Scan</span>
              </button>
              <button
                onClick={() => showToast('Tap-to-Pay NFC Contactless Signal Emulated!', 'success')}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 hover:border-emerald-500 flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4 text-emerald-600" />
                <span>NFC Tap-to-Pay</span>
              </button>
              <button
                onClick={() => showToast('Thermal receipt sent to paired printer!', 'success')}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 hover:border-purple-500 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-purple-600" />
                <span>Print Thermal Receipt</span>
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Phone Frame */}
        <div className="lg:col-span-7 flex justify-center py-4">
          <div className={PHONE_SHELL_CLASS[phoneModel]}>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-end px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
            </div>

            <div className={cn('w-full h-full', phoneDark && 'dark')}>
              <div
                id="phone-screen"
                className="w-full h-full bg-slate-50 dark:bg-slate-900 rounded-[36px] overflow-hidden flex flex-col justify-between pt-7 transition-colors duration-300"
              >
                <div className="px-5 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200 select-none">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <SignalIcon className="w-3 h-3" />
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <PhoneAppBody mode={appMode} onToast={showToast} />
                </div>

                <div className="px-4 py-2 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-around text-[10px] font-bold">
                  {PHONE_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = phoneNav === item.id;
                    if (item.id === 'scan') {
                      return (
                        <button key={item.id} onClick={() => setPhoneNav(item.id)} className="phone-nav-item flex flex-col items-center gap-0.5 text-slate-400 hover:text-sky-600">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 text-white flex items-center justify-center -mt-3 shadow-md">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span>{item.label}</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={item.id}
                        onClick={() => setPhoneNav(item.id)}
                        className={cn('phone-nav-item flex flex-col items-center gap-0.5', active ? 'text-sky-600' : 'text-slate-400 hover:text-sky-600')}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="py-1 flex justify-center">
                  <div className="w-28 h-1 rounded-full bg-slate-400 dark:bg-slate-600 opacity-60" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Devices Table */}
      <GlassCard className="space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Registered Mobile Fleet &amp; Telemetry Devices</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20">
                {filteredDevices.length} Devices
              </span>
            </div>
            <p className="text-xs text-slate-400">Monitor active iOS/Android terminals, battery percentage, peripheral hardware pairing, and SQLite offline queue status.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search serial, ID, name..."
                className="pl-8 w-48"
              />
            </div>
            <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} options={branchSelectOptions} />
            <Select value={osFilter} onChange={(e) => setOsFilter(e.target.value)} options={osSelectOptions} />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusSelectOptions} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredDevices}
          onRowClick={(d) => setSelectedDevice(d)}
          emptyTitle="No mobile devices match your criteria"
          emptyDescription="Try adjusting the search term or branch, OS, and status filters."
        />
      </GlassCard>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <GlassCard className="lg:col-span-7 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                <span>Peak Mobile Billing Hours &amp; Transaction Volume</span>
              </h3>
              <p className="text-xs text-slate-400">Hourly breakdown of mobile POS transactions across all handheld devices.</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20 uppercase whitespace-nowrap">
              Live Hourly Feed
            </span>
          </div>
          <div className="h-64 w-full">
            <Chart options={hourlyChartOptions as any} series={hourlyChartSeries} type="area" height="100%" />
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Bluetooth className="w-4 h-4 text-indigo-600" />
                <span>Mobile Payment Methods</span>
              </h3>
              <p className="text-xs text-slate-400">Tap-to-Pay NFC vs UPI QR vs Card vs Cash.</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 whitespace-nowrap">
              NFC Dominant
            </span>
          </div>
          <div className="h-64 w-full">
            <Chart options={paymentChartOptions as any} series={paymentChartSeries} type="donut" height="100%" />
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-12 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-600" />
                <span>App Mode Operational Throughput</span>
              </h3>
              <p className="text-xs text-slate-400">Active daily sessions and task executions split across POS, Stock Audit, Logistics, and Loyalty Scanner modes.</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 whitespace-nowrap">
              Daily Aggregated
            </span>
          </div>
          <div className="h-56 w-full">
            <Chart options={modesChartOptions as any} series={modesChartSeries} type="bar" height="100%" />
          </div>
        </GlassCard>
      </div>

      {/* Deployment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600" /> PWA Web App Telemetry
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">Active Service Worker</span>
          </div>
          <p className="text-xs text-slate-400">Progressive Web App caching enables zero-network offline billing and instant installation on iOS &amp; Android browsers.</p>
          <div className="space-y-1.5 text-xs pt-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Cache Storage:</span> <strong className="font-mono text-sky-600">4.8 MB Cached</strong>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Push Notifications:</span> <strong className="font-mono text-emerald-600">Enabled (VAPID)</strong>
            </div>
          </div>
          <button onClick={() => setPwaModalOpen(true)} className="w-full py-2 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 hover:bg-sky-700 transition">
            Launch PWA Installation Guide
          </button>
        </GlassCard>

        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-600" /> Native Build Downloads
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-bold">v4.2.0 Enterprise</span>
          </div>
          <p className="text-xs text-slate-400">Direct standalone APK packages for Android Zebra/Honeywell handhelds and MDM profiles for iOS TestFlight deployment.</p>
          <div className="space-y-1.5 text-xs pt-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Android APK:</span> <strong className="font-mono text-purple-600">v4.2.0-release.apk (24.8MB)</strong>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>iOS Enterprise Profile:</span> <strong className="font-mono text-indigo-600">Signed (MDM Ready)</strong>
            </div>
          </div>
          <button onClick={() => setQrModalOpen(true)} className="w-full py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-500/20 hover:bg-purple-700 transition">
            Get Download QR Code
          </button>
        </GlassCard>

        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Bluetooth className="w-4 h-4 text-emerald-600" /> Hardware SDK &amp; Pairings
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">WebBluetooth / USB</span>
          </div>
          <p className="text-xs text-slate-400">Pair ESC/POS thermal printers, Socket Mobile Bluetooth scanners, and NFC Tap-to-Pay hardware directly.</p>
          <div className="space-y-1.5 text-xs pt-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Thermal Printers:</span> <strong className="font-mono text-emerald-600">{kpis.printerCount} Connected</strong>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Other Peripherals:</span> <strong className="font-mono text-amber-600">{kpis.otherHardwareCount} Connected</strong>
            </div>
          </div>
          <button
            onClick={() => showToast('Initiating Bluetooth Peripheral Discovery...', 'info')}
            className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition"
          >
            Pair Bluetooth Peripheral
          </button>
        </GlassCard>
      </div>

      {/* Device Detail Offcanvas */}
      <Drawer
        open={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        title={selectedDevice?.deviceName ?? 'Device Details'}
        subtitle={selectedDevice ? `${selectedDevice.id} • ${selectedDevice.serial}` : undefined}
        width="md"
      >
        {selectedDevice && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Device Status</span>
              <Badge color={STATUS_BADGE[selectedDevice.status].color} pill>
                {STATUS_BADGE[selectedDevice.status].label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Store Branch</span>
                <div className="font-bold text-slate-900 dark:text-white">{selectedDevice.assignedBranch}</div>
                <div className="text-[10px] text-slate-500">{selectedDevice.register}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">OS &amp; Build</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {selectedDevice.os === 'ios' ? 'iOS' : 'Android'} {selectedDevice.osVersion}
                </div>
                <div className="text-[10px] text-sky-600 font-mono font-bold">v4.2.0 Build</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Battery Telemetry</span>
                <div className={cn('font-mono font-bold', batteryTone(selectedDevice.batteryPercent).text)}>{selectedDevice.batteryPercent}% Charged</div>
                <div className="text-[10px] text-slate-500">Health: Normal (98%)</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Sync Queue</span>
                <div className="font-bold text-slate-900 dark:text-white">{selectedDevice.syncQueueCount} Pending Records</div>
                <div className="text-[10px] text-slate-500">Status: {STATUS_BADGE[selectedDevice.status].label}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Paired Peripherals</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedDevice.pairedPeripherals.join(', ')}</div>
            </div>

            <div className="pt-2 flex gap-2">
              <button onClick={(e) => handlePing(selectedDevice, e)} className="flex-1 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700">
                Ping Telemetry
              </button>
              <button onClick={(e) => handleSync(selectedDevice, e)} className="flex-1 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700">
                Force Sync
              </button>
              <button
                onClick={() => showToast('Device lock signal issued for security verification.', 'warning')}
                className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                Remote Lock
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* PWA Install Offcanvas */}
      <Drawer
        open={pwaModalOpen}
        onClose={() => setPwaModalOpen(false)}
        title="Install ApexPOS PWA App"
        subtitle="Run the native POS client app on iOS, Android, or Desktop."
        width="md"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-sky-600" /> iOS Safari Instructions
              </h4>
              <p className="text-slate-500 dark:text-slate-400">
                Tap the Share icon in Safari&apos;s bottom bar, then select <strong className="text-sky-600">&quot;Add to Home Screen&quot;</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" /> Android Chrome Instructions
              </h4>
              <p className="text-slate-500 dark:text-slate-400">
                Tap the 3-dot menu in Chrome&apos;s top-right corner, then tap <strong className="text-emerald-600">&quot;Install app&quot;</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <QrCode className="w-full h-full text-slate-900 dark:text-white" />
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Scan to Install</span>
          </div>
        </div>

        <button
          onClick={() => {
            showToast('PWA App Installed to Home Screen Successfully!', 'success');
            setPwaModalOpen(false);
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold text-xs shadow-lg shadow-sky-500/25"
        >
          Launch One-Click PWA Installation
        </button>
      </Drawer>

      {/* QR Download Offcanvas */}
      <Drawer
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Scan Mobile App QR"
        subtitle="Scan with your smartphone camera to download the ApexPOS Mobile APK or launch the PWA instance instantly."
        width="sm"
      >
        <div className="w-48 h-48 mx-auto bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 flex items-center justify-center border border-slate-200 dark:border-slate-700">
          <QrCode className="w-36 h-36 text-slate-900 dark:text-white" />
        </div>
      </Drawer>
    </div>
  );
}
