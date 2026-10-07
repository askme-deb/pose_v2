import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Search,
  Boxes,
  DollarSign,
  Truck,
  Warehouse as WarehouseIcon,
  Plus,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowRightLeft,
  MapPin,
  LayoutGrid,
  AlertOctagon,
} from 'lucide-react';
import { Badge, Button, DataTable, Drawer, GlassCard, Input, KpiCard, PillTabs, Select, useToast } from '@pospe/ui-library';

import { formatINR, formatDateTime } from '../../utils/format';
import { listProducts, LiveProduct } from '../../services/api/products';
import {
  listWarehouses,
  createWarehouse,
  listTransfers,
  createTransfer,
  completeTransfer,
  listRacks,
  createRack,
  deleteRack,
  assignToRack,
  listDamageReports,
  createDamageReport,
  LiveWarehouse,
  LiveTransfer,
  TransferStatus,
  Rack,
  DamageReport,
} from '../../services/api/warehouseTransfers';

const statusBadgeColor: Record<TransferStatus, 'emerald' | 'blue'> = {
  COMPLETED: 'emerald',
  IN_TRANSIT: 'blue',
};

const statusBadgeLabel: Record<TransferStatus, string> = {
  COMPLETED: 'Received',
  IN_TRANSIT: 'In Transit',
};

interface TransferLineItem {
  productId: string;
  qty: number;
}

interface TransferLineItemsEditorProps {
  items: TransferLineItem[];
  products: LiveProduct[];
  onChange: (items: TransferLineItem[]) => void;
}

function transferValuation(items: TransferLineItem[], costById: Map<string, number>): number {
  return items.reduce((sum, i) => sum + i.qty * (costById.get(i.productId) ?? 0), 0);
}

function TransferLineItemsEditor({ items, products, onChange }: TransferLineItemsEditorProps) {
  const productOptions = useMemo(() => products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })), [products]);
  const costById = useMemo(() => new Map(products.map((p) => [p.id, p.costPrice])), [products]);

  const updateItem = (idx: number, patch: Partial<TransferLineItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => onChange([...items, { productId: products[0]?.id ?? '', qty: 1 }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Items &amp; SKU Selection *</p>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <div className="col-span-8">
              <Select
                label={idx === 0 ? 'Product' : undefined}
                options={productOptions}
                value={item.productId}
                onChange={(e) => updateItem(idx, { productId: e.target.value })}
              />
            </div>
            <div className="col-span-3">
              <Input
                label={idx === 0 ? 'Qty' : undefined}
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => updateItem(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div className="col-span-1 flex justify-center pb-2">
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-rose-600 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={addItem}>
        <Plus className="w-3.5 h-3.5" /> Add Line Item
      </Button>
      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Estimated Valuation</span>
        <span className="text-sm font-black text-slate-900 dark:text-white">{formatINR(transferValuation(items, costById))}</span>
      </div>
    </div>
  );
}

export default function WarehouseTransfersPage() {
  const { showToast } = useToast();

  const [transfers, setTransfers] = useState<LiveTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<LiveWarehouse[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TransferStatus>('all');
  const [activeTab, setActiveTab] = useState<'transfers' | 'warehouses' | 'damage'>('transfers');

  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false);
  const [warehouseDrawerOpen, setWarehouseDrawerOpen] = useState(false);

  const [rackWarehouse, setRackWarehouse] = useState<LiveWarehouse | null>(null);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [racksLoading, setRacksLoading] = useState(false);
  const [newRackCode, setNewRackCode] = useState('');
  const [newRackCapacity, setNewRackCapacity] = useState('');
  const [assignForm, setAssignForm] = useState<{ rackId: string; productId: string; quantity: string }>({ rackId: '', productId: '', quantity: '' });

  const [damageDrawerOpen, setDamageDrawerOpen] = useState(false);
  const [damageForm, setDamageForm] = useState({ warehouseId: '', rackId: '', productId: '', quantity: '', reason: '', reportedBy: '' });

  const [transferForm, setTransferForm] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    items: [{ productId: '', qty: 1 }] as TransferLineItem[],
    carrier: '',
  });

  const [warehouseForm, setWarehouseForm] = useState({
    facilityName: '',
    facilityCode: '',
    totalRacks: '',
    address: '',
    manager: '',
  });

  async function reload() {
    setLoading(true);
    try {
      const [trs, whs, prods, dmg] = await Promise.all([listTransfers(), listWarehouses(), listProducts(), listDamageReports()]);
      setTransfers(trs);
      setWarehouses(whs);
      setProducts(prods);
      setDamageReports(dmg);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load warehouse data from the server', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalTransferredUnits = useMemo(
    () => transfers.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0), 0),
    [transfers],
  );
  const totalValuation = useMemo(() => transfers.reduce((sum, t) => sum + t.totalValuation, 0), [transfers]);
  const inTransitCount = useMemo(() => transfers.filter((t) => t.status === 'IN_TRANSIT').length, [transfers]);

  const filteredTransfers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transfers.filter((t) => {
      const itemNames = t.items.map((i) => i.productName).join(' ');
      const matchesSearch =
        !q ||
        t.transferNumber.toLowerCase().includes(q) ||
        t.sourceWarehouseName.toLowerCase().includes(q) ||
        t.destinationWarehouseName.toLowerCase().includes(q) ||
        itemNames.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transfers, search, statusFilter]);

  const filteredWarehouses = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return warehouses;
    return warehouses.filter(
      (w) =>
        w.facilityName.toLowerCase().includes(q) ||
        w.facilityCode.toLowerCase().includes(q) ||
        w.address.toLowerCase().includes(q) ||
        w.manager.toLowerCase().includes(q),
    );
  }, [warehouses, search]);

  const markReceived = async (id: string, transferNumber: string) => {
    try {
      await completeTransfer(id);
      await reload();
      showToast(`Marked shipment ${transferNumber} as received at destination!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not mark transfer as received', 'danger');
    }
  };

  const openTransferDrawer = () => {
    const firstProduct = products[0];
    setTransferForm({
      sourceWarehouseId: warehouses[0]?.id ?? '',
      destinationWarehouseId: warehouses[1]?.id ?? warehouses[0]?.id ?? '',
      items: [{ productId: firstProduct?.id ?? '', qty: 1 }],
      carrier: '',
    });
    setTransferDrawerOpen(true);
  };

  const handleSaveTransfer = async () => {
    if (!transferForm.sourceWarehouseId || !transferForm.destinationWarehouseId) {
      showToast('Select both a source and a destination facility.', 'danger');
      return;
    }
    if (transferForm.sourceWarehouseId === transferForm.destinationWarehouseId) {
      showToast('Source and destination must be different facilities.', 'danger');
      return;
    }
    if (transferForm.items.some((i) => !i.productId || i.qty <= 0)) {
      showToast('Every line item needs a product and a valid quantity.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const transfer = await createTransfer({
        sourceWarehouseId: transferForm.sourceWarehouseId,
        destinationWarehouseId: transferForm.destinationWarehouseId,
        items: transferForm.items,
        carrier: transferForm.carrier.trim() || undefined,
      });
      await reload();
      showToast(`Dispatched stock transfer ${transfer.transferNumber} to ${transfer.destinationWarehouseName}!`, 'success');
      setTransferDrawerOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not dispatch transfer', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const openWarehouseDrawer = () => {
    setWarehouseForm({ facilityName: '', facilityCode: '', totalRacks: '', address: '', manager: '' });
    setWarehouseDrawerOpen(true);
  };

  const handleSaveWarehouse = async () => {
    if (!warehouseForm.facilityName.trim()) {
      showToast('Facility name is required.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const warehouse = await createWarehouse({
        name: warehouseForm.facilityName.trim(),
        code: warehouseForm.facilityCode.trim() || undefined,
        totalRacks: warehouseForm.totalRacks ? Math.max(0, parseInt(warehouseForm.totalRacks, 10) || 0) : undefined,
        address: warehouseForm.address.trim() || undefined,
        manager: warehouseForm.manager.trim() || undefined,
      });
      await reload();
      showToast(`Registered new warehouse facility "${warehouse.facilityName}"!`, 'success');
      setWarehouseDrawerOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not register warehouse', 'danger');
    } finally {
      setSaving(false);
    }
  };

  async function openRackDrawer(wh: LiveWarehouse) {
    setRackWarehouse(wh);
    setNewRackCode('');
    setNewRackCapacity('');
    setAssignForm({ rackId: '', productId: products[0]?.id ?? '', quantity: '' });
    setRacksLoading(true);
    try {
      setRacks(await listRacks(wh.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load racks', 'danger');
    } finally {
      setRacksLoading(false);
    }
  }

  async function handleCreateRack(e: React.FormEvent) {
    e.preventDefault();
    if (!rackWarehouse || !newRackCode.trim()) return;
    setSaving(true);
    try {
      await createRack(rackWarehouse.id, newRackCode.trim(), newRackCapacity ? Number(newRackCapacity) : undefined);
      setRacks(await listRacks(rackWarehouse.id));
      setNewRackCode('');
      setNewRackCapacity('');
      showToast('Rack created', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create rack', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRack(rackId: string) {
    if (!rackWarehouse) return;
    try {
      await deleteRack(rackId);
      setRacks(await listRacks(rackWarehouse.id));
      showToast('Rack removed', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete rack', 'danger');
    }
  }

  async function handleAssignToRack(e: React.FormEvent) {
    e.preventDefault();
    if (!rackWarehouse || !assignForm.rackId || !assignForm.productId) return;
    const quantity = Number(assignForm.quantity);
    if (!quantity || quantity < 0) {
      showToast('Enter a valid quantity to assign.', 'danger');
      return;
    }
    setSaving(true);
    try {
      await assignToRack(assignForm.rackId, assignForm.productId, quantity);
      setRacks(await listRacks(rackWarehouse.id));
      setAssignForm((f) => ({ ...f, quantity: '' }));
      showToast('Stock assigned to rack', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not assign stock to rack', 'danger');
    } finally {
      setSaving(false);
    }
  }

  function openDamageDrawer() {
    setDamageForm({ warehouseId: warehouses[0]?.id ?? '', rackId: '', productId: products[0]?.id ?? '', quantity: '', reason: '', reportedBy: '' });
    setDamageDrawerOpen(true);
  }

  async function handleReportDamage(e: React.FormEvent) {
    e.preventDefault();
    const quantity = Number(damageForm.quantity);
    if (!damageForm.warehouseId || !damageForm.productId || !quantity || quantity <= 0 || !damageForm.reason.trim() || !damageForm.reportedBy.trim()) {
      showToast('Fill in warehouse, product, quantity, reason, and reporter.', 'danger');
      return;
    }
    setSaving(true);
    try {
      await createDamageReport({
        warehouseId: damageForm.warehouseId,
        rackId: damageForm.rackId || undefined,
        productId: damageForm.productId,
        quantity,
        reason: damageForm.reason.trim(),
        reportedBy: damageForm.reportedBy.trim(),
      });
      await reload();
      setDamageDrawerOpen(false);
      showToast('Damage write-off recorded — stock updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not record damage write-off', 'danger');
    } finally {
      setSaving(false);
    }
  }

  const damageColumns: ColumnDef<DamageReport>[] = useMemo(
    () => [
      { header: 'Product', accessorKey: 'productName', cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100">{row.original.productName}</p>
          <p className="text-[11px] font-mono text-slate-400">{row.original.productSku}</p>
        </div>
      ) },
      { header: 'Warehouse', accessorKey: 'warehouseName' },
      { header: 'Rack', accessorKey: 'rackCode', cell: ({ row }) => <span className="font-mono text-xs">{row.original.rackCode ?? '—'}</span> },
      { header: 'Qty', accessorKey: 'quantity' },
      { header: 'Reason', accessorKey: 'reason' },
      { header: 'Value Impact', accessorKey: 'valueImpact', cell: ({ row }) => <span className="font-bold text-rose-600 dark:text-rose-400">-{formatINR(row.original.valueImpact)}</span> },
      { header: 'Reported By', accessorKey: 'reportedBy' },
      { header: 'Date', accessorKey: 'createdAt', cell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{formatDateTime(row.original.createdAt)}</span> },
    ],
    [],
  );

  const transferColumns: ColumnDef<LiveTransfer>[] = useMemo(
    () => [
      {
        header: 'Transfer Ref & Date',
        accessorKey: 'transferNumber',
        cell: ({ row }) => (
          <div>
            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">{row.original.transferNumber}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{formatDateTime(row.original.createdAt)}</div>
          </div>
        ),
      },
      {
        header: 'Origin & Destination',
        id: 'route',
        cell: ({ row }) => (
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{row.original.sourceWarehouseName}</span>
            <ArrowRight className="w-3 h-3 text-amber-500" />
            <span>{row.original.destinationWarehouseName}</span>
          </div>
        ),
      },
      {
        header: 'Items Transferred',
        id: 'items',
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs block">
            {row.original.items.map((i) => `${i.productName} (x${i.qty})`).join(', ')}
          </span>
        ),
      },
      {
        header: 'Unit Qty',
        id: 'units',
        cell: ({ row }) => (
          <span className="font-bold text-amber-600 dark:text-amber-400 font-mono block text-center">
            {row.original.items.reduce((s, i) => s + i.qty, 0)} units
          </span>
        ),
      },
      {
        header: 'Transfer Valuation',
        accessorKey: 'totalValuation',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white block text-right">{formatINR(row.original.totalValuation)}</span>
        ),
      },
      {
        header: 'Transport Carrier',
        accessorKey: 'carrier',
        cell: ({ row }) => <span className="text-slate-500 dark:text-slate-400 font-semibold">{row.original.carrier}</span>,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge color={statusBadgeColor[row.original.status]} pill dot={row.original.status === 'IN_TRANSIT'}>
              {statusBadgeLabel[row.original.status]}
            </Badge>
          </div>
        ),
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) =>
          row.original.status === 'IN_TRANSIT' ? (
            <div className="flex justify-center">
              <button
                onClick={() => markReceived(row.original.id, row.original.transferNumber)}
                title="Mark Received"
                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <GlassCard className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Warehouse Stock Transfers &amp; Rack Logistics
            </h1>
            <Badge color="amber" pill dot>
              {transfers.length} Transfers &bull; {inTransitCount} In Transit
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Coordinate inter-branch stock transfers, track carrier shipments, and manage warehouse rack utilization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search TRF ID, origin, destination..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 w-64 shadow-inner"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | TransferStatus)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Transfer Statuses</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <PillTabs
            options={[
              { value: 'transfers', label: `Stock Transfers (${transfers.length})` },
              { value: 'warehouses', label: `Warehouse Racks (${warehouses.length})` },
              { value: 'damage', label: `Damage Log (${damageReports.length})` },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'transfers' | 'warehouses' | 'damage')}
          />

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openDamageDrawer} disabled={!warehouses.length}>
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              <span>Report Damage</span>
            </Button>
            <Button variant="secondary" onClick={openWarehouseDrawer}>
              <WarehouseIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Add Warehouse</span>
            </Button>
            <Button
              variant="primary"
              onClick={openTransferDrawer}
              className="!from-amber-600 !to-orange-600 hover:!from-amber-700 hover:!to-orange-700 !shadow-amber-500/25"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>+ Initiate Transfer</span>
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Boxes} label="Total Transferred Units" value={`${totalTransferredUnits} Units`} delta="Inter-facility movement" deltaTone="neutral" color="amber" />
        <KpiCard icon={DollarSign} label="Transfer Valuation" value={formatINR(totalValuation)} delta="Asset Movements" deltaTone="neutral" color="amber" />
        <KpiCard icon={Truck} label="In Transit Shipments" value={`${inTransitCount} Shipments`} delta="Active Road Freight" deltaTone="neutral" color="blue" />
        <KpiCard icon={WarehouseIcon} label="Active Warehouses" value={`${warehouses.length} Facilities`} delta="Logistics Network" deltaTone="positive" color="emerald" />
      </div>

      {activeTab === 'transfers' ? (
        <GlassCard>
          <DataTable
            columns={transferColumns}
            data={filteredTransfers}
            loading={loading}
            emptyTitle="No Stock Transfers Found"
            emptyDescription="No transfer ref IDs or facilities match your search filter."
          />
        </GlassCard>
      ) : activeTab === 'warehouses' && filteredWarehouses.length === 0 ? (
        <GlassCard padding="lg" className="text-center space-y-3">
          <WarehouseIcon className="w-12 h-12 text-slate-400 mx-auto" />
          <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">No Warehouse Facilities Found</h4>
          <p className="text-xs text-slate-400">No facility name matches your search query.</p>
        </GlassCard>
      ) : activeTab === 'warehouses' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredWarehouses.map((wh) => (
            <GlassCard key={wh.id} className="flex flex-col justify-between space-y-4 hover:border-amber-500/50 transition duration-300 group">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{wh.facilityName}</h4>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold">
                      {wh.facilityCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{wh.address}</span>
                  </div>
                </div>
                <Badge color="emerald" pill>
                  Active
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Total Racks</span>
                  <div className="font-extrabold text-sm text-amber-600 dark:text-amber-400 mt-0.5">{wh.totalRacks} Racks</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Manager</span>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-1">{wh.manager}</div>
                </div>
              </div>

              <button
                onClick={() => openRackDrawer(wh)}
                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-600 hover:text-white transition"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Manage Racks
              </button>
            </GlassCard>
          ))}
        </div>
      ) : null}

      {activeTab === 'damage' && (
        <GlassCard>
          <DataTable
            columns={damageColumns}
            data={damageReports}
            loading={loading}
            emptyTitle="No Damage Write-offs Yet"
            emptyDescription="Reporting damaged stock at a warehouse creates a record here."
          />
        </GlassCard>
      )}

      <Drawer
        open={transferDrawerOpen}
        onClose={() => setTransferDrawerOpen(false)}
        title="Initiate Stock Transfer"
        subtitle="Transfer inventory items between warehouse facilities."
        width="lg"
        footer={
          <>
            <Button
              variant="primary"
              className="flex-1 !from-amber-600 !to-orange-600 hover:!from-amber-700 hover:!to-orange-700"
              onClick={handleSaveTransfer}
              disabled={saving}
            >
              {saving ? 'Dispatching…' : 'Dispatch Stock Transfer'}
            </Button>
            <Button variant="ghost" onClick={() => setTransferDrawerOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Source Origin"
            required
            options={warehouses.map((w) => ({ value: w.id, label: w.facilityName }))}
            value={transferForm.sourceWarehouseId}
            onChange={(e) => setTransferForm((f) => ({ ...f, sourceWarehouseId: e.target.value }))}
          />
          <Select
            label="Destination"
            required
            options={warehouses.map((w) => ({ value: w.id, label: w.facilityName }))}
            value={transferForm.destinationWarehouseId}
            onChange={(e) => setTransferForm((f) => ({ ...f, destinationWarehouseId: e.target.value }))}
          />
        </div>

        <TransferLineItemsEditor items={transferForm.items} products={products} onChange={(items) => setTransferForm((f) => ({ ...f, items }))} />

        <Input
          label="Transport Carrier & Driver"
          placeholder="e.g. Apex Fleet Truck #4 (Driver Manoj)"
          value={transferForm.carrier}
          onChange={(e) => setTransferForm((f) => ({ ...f, carrier: e.target.value }))}
        />
      </Drawer>

      <Drawer
        open={warehouseDrawerOpen}
        onClose={() => setWarehouseDrawerOpen(false)}
        title="Register Warehouse Facility"
        subtitle="Add warehouse location, storage racks, and facility code."
        footer={
          <>
            <Button
              variant="primary"
              className="flex-1 !from-amber-600 !to-orange-600 hover:!from-amber-700 hover:!to-orange-700"
              onClick={handleSaveWarehouse}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Warehouse'}
            </Button>
            <Button variant="ghost" onClick={() => setWarehouseDrawerOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <Input
          label="Facility Name"
          required
          placeholder="e.g. North Hub Warehouse"
          value={warehouseForm.facilityName}
          onChange={(e) => setWarehouseForm((f) => ({ ...f, facilityName: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Facility Code"
            placeholder="WH-NORTH-04"
            value={warehouseForm.facilityCode}
            onChange={(e) => setWarehouseForm((f) => ({ ...f, facilityCode: e.target.value }))}
          />
          <Input
            label="Total Racks Count"
            type="number"
            min={0}
            placeholder="12"
            value={warehouseForm.totalRacks}
            onChange={(e) => setWarehouseForm((f) => ({ ...f, totalRacks: e.target.value }))}
          />
        </div>
        <Input
          label="Location Address"
          placeholder="e.g. Logistics Park, Sector 18"
          value={warehouseForm.address}
          onChange={(e) => setWarehouseForm((f) => ({ ...f, address: e.target.value }))}
        />
        <Input
          label="Facility Manager"
          placeholder="e.g. David Miller"
          value={warehouseForm.manager}
          onChange={(e) => setWarehouseForm((f) => ({ ...f, manager: e.target.value }))}
        />
      </Drawer>

      {/* Rack management drawer */}
      <Drawer
        open={!!rackWarehouse}
        onClose={() => setRackWarehouse(null)}
        title={`Racks — ${rackWarehouse?.facilityName ?? ''}`}
        subtitle="Where each SKU physically sits — assignments are capped at what's actually in stock."
        width="lg"
        footer={
          <button type="button" onClick={() => setRackWarehouse(null)} className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
            Close
          </button>
        }
      >
        <div className="space-y-5">
          <form onSubmit={handleCreateRack} className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="New Rack Code" placeholder="e.g. A-01" value={newRackCode} onChange={(e) => setNewRackCode(e.target.value)} />
            </div>
            <div className="w-28">
              <Input label="Capacity" type="number" min={1} placeholder="Optional" value={newRackCapacity} onChange={(e) => setNewRackCapacity(e.target.value)} />
            </div>
            <Button type="submit" variant="secondary" disabled={saving || !newRackCode.trim()}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </form>

          {racksLoading && <p className="text-xs text-slate-400">Loading racks…</p>}
          {!racksLoading && racks.length === 0 && <p className="text-xs text-slate-400">No racks yet — add one above.</p>}

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {racks.map((rack) => (
              <div key={rack.id} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Rack {rack.code} {rack.capacity ? <span className="text-slate-400 font-normal">&middot; capacity {rack.capacity}</span> : null}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {rack.items.length === 0 ? 'Empty' : rack.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRack(rack.id)}
                    disabled={rack.items.some((i) => i.quantity > 0)}
                    title={rack.items.some((i) => i.quantity > 0) ? 'Clear stock before deleting' : 'Delete rack'}
                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-rose-600 hover:text-white transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {racks.length > 0 && (
            <form onSubmit={handleAssignToRack} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Assign Stock to a Rack</p>
              <Select
                label="Rack"
                options={racks.map((r) => ({ value: r.id, label: `Rack ${r.code}` }))}
                value={assignForm.rackId}
                onChange={(e) => setAssignForm((f) => ({ ...f, rackId: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Product"
                  options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                  value={assignForm.productId}
                  onChange={(e) => setAssignForm((f) => ({ ...f, productId: e.target.value }))}
                />
                <Input
                  label="Quantity"
                  type="number"
                  min={0}
                  value={assignForm.quantity}
                  onChange={(e) => setAssignForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <Button type="submit" variant="primary" className="w-full" disabled={saving || !assignForm.rackId}>
                {saving ? 'Assigning…' : 'Assign to Rack'}
              </Button>
            </form>
          )}
        </div>
      </Drawer>

      {/* Report damage drawer */}
      <Drawer
        open={damageDrawerOpen}
        onClose={() => setDamageDrawerOpen(false)}
        title="Report Damaged Goods"
        subtitle="Writes the quantity off sellable stock immediately — appears in the general stock adjustment log too."
        footer={
          <>
            <button type="button" onClick={() => setDamageDrawerOpen(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">Cancel</button>
            <button form="damage-form" type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-500/25 disabled:opacity-50">
              {saving ? 'Recording…' : 'Record Write-off'}
            </button>
          </>
        }
      >
        <form id="damage-form" onSubmit={handleReportDamage} className="space-y-4">
          <Select
            label="Warehouse"
            required
            options={warehouses.map((w) => ({ value: w.id, label: w.facilityName }))}
            value={damageForm.warehouseId}
            onChange={(e) => setDamageForm((f) => ({ ...f, warehouseId: e.target.value, rackId: '' }))}
          />
          <Select
            label="Product"
            required
            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
            value={damageForm.productId}
            onChange={(e) => setDamageForm((f) => ({ ...f, productId: e.target.value }))}
          />
          <Input
            label="Quantity"
            required
            type="number"
            min={1}
            value={damageForm.quantity}
            onChange={(e) => setDamageForm((f) => ({ ...f, quantity: e.target.value }))}
          />
          <Input
            label="Reason"
            required
            placeholder="e.g. Water damage during monsoon storage"
            value={damageForm.reason}
            onChange={(e) => setDamageForm((f) => ({ ...f, reason: e.target.value }))}
          />
          <Input
            label="Reported By"
            required
            placeholder="Your name"
            value={damageForm.reportedBy}
            onChange={(e) => setDamageForm((f) => ({ ...f, reportedBy: e.target.value }))}
          />
        </form>
      </Drawer>
    </div>
  );
}
