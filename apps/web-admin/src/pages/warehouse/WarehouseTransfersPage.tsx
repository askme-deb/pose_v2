import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Badge, Button, DataTable, Drawer, GlassCard, Input, KpiCard, PillTabs, Select, useToast } from '@pospe/ui-library';

import { formatINR, formatDateTime } from '../../utils/format';
import { products, productOptions } from '../../services/mockData/products';
import { warehouses as seedWarehouses, type Warehouse } from '../../services/mockData/warehouses';
import {
  transfers as seedTransfers,
  transferValuation,
  type Transfer,
  type TransferItem,
  type TransferStatus,
} from '../../services/mockData/transfers';

const productsById = Object.fromEntries(products.map((p) => [p.id, p]));

const statusBadgeColor: Record<TransferStatus, 'emerald' | 'blue'> = {
  completed: 'emerald',
  'in-transit': 'blue',
};

const statusBadgeLabel: Record<TransferStatus, string> = {
  completed: 'Received',
  'in-transit': 'In Transit',
};

const emptyTransferItem = (): TransferItem => ({ productId: products[0].id, qty: 1 });

interface TransferLineItemsEditorProps {
  items: TransferItem[];
  onChange: (items: TransferItem[]) => void;
}

function TransferLineItemsEditor({ items, onChange }: TransferLineItemsEditorProps) {
  const updateItem = (idx: number, patch: Partial<TransferItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => onChange([...items, emptyTransferItem()]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Items &amp; SKU Selection *</p>
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
        <span className="text-sm font-black text-slate-900 dark:text-white">{formatINR(transferValuation(items))}</span>
      </div>
    </div>
  );
}

export default function WarehouseTransfersPage() {
  const { showToast } = useToast();

  const [transfers, setTransfers] = useState<Transfer[]>(seedTransfers);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(seedWarehouses);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TransferStatus>('all');
  const [activeTab, setActiveTab] = useState<'transfers' | 'warehouses'>('transfers');

  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false);
  const [warehouseDrawerOpen, setWarehouseDrawerOpen] = useState(false);

  const [transferForm, setTransferForm] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    items: [emptyTransferItem()],
    carrier: '',
  });

  const [warehouseForm, setWarehouseForm] = useState({
    facilityName: '',
    facilityCode: '',
    totalRacks: '',
    address: '',
    manager: '',
  });

  const warehousesById = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses]);

  const totalTransferredUnits = useMemo(
    () => transfers.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0), 0),
    [transfers],
  );
  const totalValuation = useMemo(() => transfers.reduce((sum, t) => sum + t.totalValuation, 0), [transfers]);
  const inTransitCount = useMemo(() => transfers.filter((t) => t.status === 'in-transit').length, [transfers]);

  const filteredTransfers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transfers.filter((t) => {
      const source = warehousesById[t.sourceWarehouseId]?.facilityName ?? '';
      const dest = warehousesById[t.destinationWarehouseId]?.facilityName ?? '';
      const itemNames = t.items.map((i) => productsById[i.productId]?.name ?? '').join(' ');
      const matchesSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        source.toLowerCase().includes(q) ||
        dest.toLowerCase().includes(q) ||
        itemNames.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transfers, search, statusFilter, warehousesById]);

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

  const markReceived = (id: string) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'completed' } : t)));
    showToast(`Marked shipment ${id} as received at destination!`, 'success');
  };

  const openTransferDrawer = () => {
    setTransferForm({
      sourceWarehouseId: warehouses[0]?.id ?? '',
      destinationWarehouseId: warehouses[1]?.id ?? warehouses[0]?.id ?? '',
      items: [emptyTransferItem()],
      carrier: '',
    });
    setTransferDrawerOpen(true);
  };

  const handleSaveTransfer = () => {
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
    const newId = `TRF-${7000 + Math.floor(Math.random() * 900)}`;
    const newTransfer: Transfer = {
      id: newId,
      sourceWarehouseId: transferForm.sourceWarehouseId,
      destinationWarehouseId: transferForm.destinationWarehouseId,
      items: transferForm.items,
      totalValuation: transferValuation(transferForm.items),
      carrier: transferForm.carrier.trim() || 'Apex Express Logistics',
      status: 'in-transit',
      createdAt: new Date().toISOString(),
    };
    setTransfers((prev) => [newTransfer, ...prev]);
    showToast(`Dispatched stock transfer ${newId} to ${warehousesById[transferForm.destinationWarehouseId]?.facilityName}!`, 'success');
    setTransferDrawerOpen(false);
  };

  const openWarehouseDrawer = () => {
    setWarehouseForm({ facilityName: '', facilityCode: '', totalRacks: '', address: '', manager: '' });
    setWarehouseDrawerOpen(true);
  };

  const handleSaveWarehouse = () => {
    if (!warehouseForm.facilityName.trim()) {
      showToast('Facility name is required.', 'danger');
      return;
    }
    const newWarehouse: Warehouse = {
      id: `wh-${Date.now()}`,
      facilityName: warehouseForm.facilityName.trim(),
      facilityCode: warehouseForm.facilityCode.trim() || `WH-${warehouseForm.facilityName.substring(0, 3).toUpperCase()}-0${warehouses.length + 1}`,
      totalRacks: Math.max(0, parseInt(warehouseForm.totalRacks, 10) || 12),
      address: warehouseForm.address.trim() || 'Logistics Zone',
      manager: warehouseForm.manager.trim() || 'Warehouse Manager',
    };
    setWarehouses((prev) => [newWarehouse, ...prev]);
    showToast(`Registered new warehouse facility "${newWarehouse.facilityName}"!`, 'success');
    setWarehouseDrawerOpen(false);
  };

  const transferColumns: ColumnDef<Transfer>[] = useMemo(
    () => [
      {
        header: 'Transfer Ref & Date',
        accessorKey: 'id',
        cell: ({ row }) => (
          <div>
            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">{row.original.id}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDateTime(row.original.createdAt)}</div>
          </div>
        ),
      },
      {
        header: 'Origin & Destination',
        id: 'route',
        cell: ({ row }) => (
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{warehousesById[row.original.sourceWarehouseId]?.facilityName ?? 'Unknown'}</span>
            <ArrowRight className="w-3 h-3 text-amber-500" />
            <span>{warehousesById[row.original.destinationWarehouseId]?.facilityName ?? 'Unknown'}</span>
          </div>
        ),
      },
      {
        header: 'Items Transferred',
        id: 'items',
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs block">
            {row.original.items.map((i) => `${productsById[i.productId]?.name ?? 'Item'} (x${i.qty})`).join(', ')}
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
            <Badge color={statusBadgeColor[row.original.status]} pill dot={row.original.status === 'in-transit'}>
              {statusBadgeLabel[row.original.status]}
            </Badge>
          </div>
        ),
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) =>
          row.original.status === 'in-transit' ? (
            <div className="flex justify-center">
              <button
                onClick={() => markReceived(row.original.id)}
                title="Mark Received"
                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null,
      },
    ],
    [warehousesById],
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
            <option value="in-transit">In Transit</option>
            <option value="completed">Completed</option>
          </select>

          <PillTabs
            options={[
              { value: 'transfers', label: `Stock Transfers (${transfers.length})` },
              { value: 'warehouses', label: `Warehouse Racks (${warehouses.length})` },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'transfers' | 'warehouses')}
          />

          <div className="flex items-center gap-2">
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
            emptyTitle="No Stock Transfers Found"
            emptyDescription="No transfer ref IDs or facilities match your search filter."
          />
        </GlassCard>
      ) : filteredWarehouses.length === 0 ? (
        <GlassCard padding="lg" className="text-center space-y-3">
          <WarehouseIcon className="w-12 h-12 text-slate-400 mx-auto" />
          <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">No Warehouse Facilities Found</h4>
          <p className="text-xs text-slate-400">No facility name matches your search query.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredWarehouses.map((wh) => (
            <GlassCard key={wh.id} className="flex flex-col justify-between space-y-4 hover:border-amber-500/50 transition duration-300 group">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{wh.facilityName}</h4>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold">
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Racks</span>
                  <div className="font-extrabold text-sm text-amber-600 dark:text-amber-400 mt-0.5">{wh.totalRacks} Racks</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Manager</span>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-1">{wh.manager}</div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
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
            >
              Dispatch Stock Transfer
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

        <TransferLineItemsEditor items={transferForm.items} onChange={(items) => setTransferForm((f) => ({ ...f, items }))} />

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
            >
              Save Warehouse
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
    </div>
  );
}
