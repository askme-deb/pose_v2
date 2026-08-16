import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Search, ShoppingBag, FileText, Truck, Building2, Plus, X, CheckCircle2 } from 'lucide-react';
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

import { formatINR, formatDate } from '../../utils/format';
import { listProducts, LiveProduct } from '../../services/api/products';
import {
  listSuppliers,
  createSupplier,
  listPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  LiveSupplier,
  LivePurchaseOrder,
  PaymentStatus,
  OrderStatus,
} from '../../services/api/purchaseOrders';

const paymentBadgeColor: Record<PaymentStatus, 'blue' | 'purple' | 'red'> = {
  PAID: 'blue',
  PARTIAL: 'purple',
  UNPAID: 'red',
};

const paymentBadgeLabel: Record<PaymentStatus, string> = {
  PAID: 'Paid',
  PARTIAL: 'Partial',
  UNPAID: 'Unpaid',
};

const orderBadgeColor: Record<OrderStatus, 'emerald' | 'amber'> = {
  RECEIVED: 'emerald',
  PENDING: 'amber',
};

const orderBadgeLabel: Record<OrderStatus, string> = {
  RECEIVED: 'Received Goods',
  PENDING: 'Pending Delivery',
};

interface POLineItem {
  productId: string;
  qty: number;
  unitPrice: number;
}

interface LineItemsEditorProps {
  items: POLineItem[];
  products: LiveProduct[];
  onChange: (items: POLineItem[]) => void;
}

function lineTotal(items: POLineItem[]): number {
  return items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
}

function LineItemsEditor({ items, products, onChange }: LineItemsEditorProps) {
  const productOptions = useMemo(() => products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })), [products]);
  const productsById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const updateItem = (idx: number, patch: Partial<POLineItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => onChange([...items, { productId: products[0]?.id ?? '', qty: 1, unitPrice: products[0]?.costPrice ?? 0 }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Order Line Items *</p>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <div className="col-span-6">
              <Select
                label={idx === 0 ? 'Product' : undefined}
                options={productOptions}
                value={item.productId}
                onChange={(e) =>
                  updateItem(idx, {
                    productId: e.target.value,
                    unitPrice: productsById[e.target.value]?.costPrice ?? item.unitPrice,
                  })
                }
              />
            </div>
            <div className="col-span-2">
              <Input
                label={idx === 0 ? 'Qty' : undefined}
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => updateItem(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div className="col-span-3">
              <Input
                label={idx === 0 ? 'Unit Price' : undefined}
                type="number"
                min={0}
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(idx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
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
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Running Total</span>
        <span className="text-sm font-black text-slate-900 dark:text-white">{formatINR(lineTotal(items))}</span>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<LivePurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<LiveSupplier[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');

  const [poDrawerOpen, setPoDrawerOpen] = useState(false);
  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false);

  const [poForm, setPoForm] = useState({
    supplierId: '',
    items: [{ productId: '', qty: 1, unitPrice: 0 }] as POLineItem[],
    expectedDeliveryDate: '',
    paymentStatus: 'UNPAID' as PaymentStatus,
    orderStatus: 'PENDING' as OrderStatus,
  });

  const [supplierForm, setSupplierForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
  });

  async function reload() {
    setLoading(true);
    try {
      const [ords, sups, prods] = await Promise.all([listPurchaseOrders(), listSuppliers(), listProducts()]);
      setOrders(ords);
      setSuppliers(sups);
      setProducts(prods);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load purchasing data from the server', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalProcurementValue = useMemo(() => orders.reduce((sum, o) => sum + o.totalAmount, 0), [orders]);
  const pendingDeliveries = useMemo(() => orders.filter((o) => o.orderStatus === 'PENDING').length, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter((po) => {
      const itemNames = po.items.map((i) => i.productName).join(' ');
      const matchesSearch =
        !q || po.poNumber.toLowerCase().includes(q) || po.supplierName.toLowerCase().includes(q) || itemNames.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || po.orderStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.companyName.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.gstin.toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  const markReceived = async (id: string, poNumber: string) => {
    try {
      await receivePurchaseOrder(id);
      await reload();
      showToast(`Marked goods received for ${poNumber} — stock updated!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not mark as received', 'danger');
    }
  };

  const openPoDrawer = () => {
    const firstProduct = products[0];
    setPoForm({
      supplierId: suppliers[0]?.id ?? '',
      items: [{ productId: firstProduct?.id ?? '', qty: 1, unitPrice: firstProduct?.costPrice ?? 0 }],
      expectedDeliveryDate: '',
      paymentStatus: 'UNPAID',
      orderStatus: 'PENDING',
    });
    setPoDrawerOpen(true);
  };

  const handleSavePO = async () => {
    if (!poForm.supplierId) {
      showToast('Select a supplier vendor to issue this PO.', 'danger');
      return;
    }
    if (poForm.items.some((i) => !i.productId || i.qty <= 0)) {
      showToast('Every line item needs a product and a valid quantity.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const order = await createPurchaseOrder({
        supplierId: poForm.supplierId,
        items: poForm.items,
        expectedDeliveryDate: poForm.expectedDeliveryDate || new Date().toISOString().slice(0, 10),
        paymentStatus: poForm.paymentStatus,
        orderStatus: poForm.orderStatus,
      });
      await reload();
      showToast(`Issued purchase order ${order.poNumber} to ${order.supplierName}!`, 'success');
      setPoDrawerOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not issue purchase order', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const openSupplierDrawer = () => {
    setSupplierForm({ companyName: '', contactPerson: '', phone: '', email: '', gstin: '' });
    setSupplierDrawerOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.companyName.trim()) {
      showToast('Company / vendor name is required.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const supplier = await createSupplier({
        name: supplierForm.companyName.trim(),
        contactPerson: supplierForm.contactPerson.trim() || undefined,
        phone: supplierForm.phone.trim() || undefined,
        email: supplierForm.email.trim() || undefined,
        gstin: supplierForm.gstin.trim() || undefined,
      });
      await reload();
      showToast(`Registered supplier vendor "${supplier.companyName}"!`, 'success');
      setSupplierDrawerOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not register supplier', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const orderColumns: ColumnDef<LivePurchaseOrder>[] = useMemo(
    () => [
      {
        header: 'PO Number & Date',
        accessorKey: 'poNumber',
        cell: ({ row }) => (
          <div>
            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">{row.original.poNumber}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDate(row.original.createdAt)}</div>
          </div>
        ),
      },
      {
        header: 'Supplier Vendor',
        accessorKey: 'supplierName',
        cell: ({ row }) => <span className="font-bold text-xs text-slate-900 dark:text-white">{row.original.supplierName}</span>,
      },
      {
        header: 'Items Summary',
        id: 'items',
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs block">
            {row.original.items.map((i) => `${i.productName} (x${i.qty})`).join(', ')}
          </span>
        ),
      },
      {
        header: 'Total Amount',
        accessorKey: 'totalAmount',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white block text-right">
            {formatINR(row.original.totalAmount)}
          </span>
        ),
      },
      {
        header: 'Expected Delivery',
        accessorKey: 'expectedDeliveryDate',
        cell: ({ row }) => <span className="font-mono text-slate-500 dark:text-slate-400">{formatDate(row.original.expectedDeliveryDate)}</span>,
      },
      {
        header: 'Payment Status',
        accessorKey: 'paymentStatus',
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge color={paymentBadgeColor[row.original.paymentStatus]} pill>
              {paymentBadgeLabel[row.original.paymentStatus]}
            </Badge>
          </div>
        ),
      },
      {
        header: 'Order Status',
        accessorKey: 'orderStatus',
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge color={orderBadgeColor[row.original.orderStatus]} pill dot={row.original.orderStatus === 'PENDING'}>
              {orderBadgeLabel[row.original.orderStatus]}
            </Badge>
          </div>
        ),
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) =>
          row.original.orderStatus === 'PENDING' ? (
            <div className="flex justify-center">
              <button
                onClick={() => markReceived(row.original.id, row.original.poNumber)}
                title="Mark Goods Received"
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

  const supplierColumns: ColumnDef<LiveSupplier>[] = useMemo(
    () => [
      {
        header: 'Supplier Company',
        accessorKey: 'companyName',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar name={row.original.companyName} size="sm" />
            <span className="font-black text-xs text-slate-900 dark:text-white">{row.original.companyName}</span>
          </div>
        ),
      },
      { header: 'Contact Representative', accessorKey: 'contactPerson' },
      {
        header: 'Phone & Email',
        id: 'contact',
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-slate-600 dark:text-slate-300">{row.original.phone}</div>
            <div className="text-[10px] text-slate-400">{row.original.email}</div>
          </div>
        ),
      },
      {
        header: 'GSTIN Number',
        accessorKey: 'gstin',
        cell: ({ row }) => <span className="font-mono text-slate-500 dark:text-slate-400">{row.original.gstin}</span>,
      },
      {
        header: 'Total Orders',
        accessorKey: 'totalOrders',
        cell: ({ row }) => <span className="font-bold text-blue-600 dark:text-blue-400">{row.original.totalOrders} Orders</span>,
      },
      {
        header: 'Outstanding Balance',
        accessorKey: 'outstandingAmount',
        cell: ({ row }) =>
          row.original.outstandingAmount > 0 ? (
            <span className="font-bold text-amber-600 dark:text-amber-400">{formatINR(row.original.outstandingAmount)}</span>
          ) : (
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Settled</span>
          ),
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
              Purchase Orders &amp; Suppliers
            </h1>
            <Badge color="blue" pill dot>
              {orders.length} Orders &bull; {pendingDeliveries} Pending Delivery
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage vendor purchase orders, track inward stock shipments, and supplier relationships. Marking a PO
            received restocks inventory immediately.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO ID, supplier, items..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-inner"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Order Statuses</option>
            <option value="RECEIVED">Received Goods</option>
            <option value="PENDING">Pending Delivery</option>
          </select>

          <PillTabs
            options={[
              { value: 'orders', label: `Purchase Orders (${orders.length})` },
              { value: 'suppliers', label: `Suppliers (${suppliers.length})` },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'orders' | 'suppliers')}
          />

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openSupplierDrawer}>
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Add Supplier</span>
            </Button>
            <Button variant="primary" onClick={openPoDrawer}>
              <Truck className="w-4 h-4" />
              <span>+ Create PO</span>
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingBag} label="Total Procurement Value" value={formatINR(totalProcurementValue)} delta="Year to Date Spending" deltaTone="neutral" color="blue" />
        <KpiCard icon={FileText} label="Purchase Orders" value={`${orders.length} Orders`} delta="Issued Purchase Orders" deltaTone="neutral" color="indigo" />
        <KpiCard icon={Truck} label="Pending Deliveries" value={`${pendingDeliveries} POs`} delta="Inward Shipments Expected" deltaTone="neutral" color="amber" />
        <KpiCard icon={Building2} label="Active Suppliers" value={`${suppliers.length} Vendors`} delta="Verified Supply Chain" deltaTone="positive" color="emerald" />
      </div>

      <GlassCard>
        {activeTab === 'orders' ? (
          <DataTable
            columns={orderColumns}
            data={filteredOrders}
            loading={loading}
            emptyTitle="No Purchase Orders Found"
            emptyDescription="No PO numbers or suppliers match your filter criteria."
          />
        ) : (
          <DataTable
            columns={supplierColumns}
            data={filteredSuppliers}
            loading={loading}
            emptyTitle="No Suppliers Found"
            emptyDescription="No supplier vendors match your search term."
          />
        )}
      </GlassCard>

      <Drawer
        open={poDrawerOpen}
        onClose={() => setPoDrawerOpen(false)}
        title="Create Purchase Order"
        subtitle="Issue purchase order to supplier vendor."
        width="lg"
        footer={
          <>
            <Button variant="primary" className="flex-1" onClick={handleSavePO} disabled={saving}>
              {saving ? 'Issuing…' : 'Issue Purchase Order'}
            </Button>
            <Button variant="ghost" onClick={() => setPoDrawerOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <Select
          label="Select Supplier Vendor"
          required
          options={suppliers.map((s) => ({ value: s.id, label: `${s.companyName} (${s.contactPerson})` }))}
          placeholder="Choose a supplier"
          value={poForm.supplierId}
          onChange={(e) => setPoForm((f) => ({ ...f, supplierId: e.target.value }))}
        />

        <LineItemsEditor items={poForm.items} products={products} onChange={(items) => setPoForm((f) => ({ ...f, items }))} />

        <Input
          label="Expected Delivery Date"
          type="date"
          value={poForm.expectedDeliveryDate}
          onChange={(e) => setPoForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Payment Status"
            options={[
              { value: 'PAID', label: 'Paid' },
              { value: 'PARTIAL', label: 'Partial' },
              { value: 'UNPAID', label: 'Unpaid' },
            ]}
            value={poForm.paymentStatus}
            onChange={(e) => setPoForm((f) => ({ ...f, paymentStatus: e.target.value as PaymentStatus }))}
          />
          <Select
            label="Order Status"
            options={[
              { value: 'PENDING', label: 'Pending Delivery' },
              { value: 'RECEIVED', label: 'Received' },
            ]}
            value={poForm.orderStatus}
            onChange={(e) => setPoForm((f) => ({ ...f, orderStatus: e.target.value as OrderStatus }))}
          />
        </div>
      </Drawer>

      <Drawer
        open={supplierDrawerOpen}
        onClose={() => setSupplierDrawerOpen(false)}
        title="Register Supplier Vendor"
        subtitle="Add supplier contact details, phone, and GSTIN."
        footer={
          <>
            <Button variant="primary" className="flex-1" onClick={handleSaveSupplier} disabled={saving}>
              {saving ? 'Saving…' : 'Save Supplier Vendor'}
            </Button>
            <Button variant="ghost" onClick={() => setSupplierDrawerOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <Input
          label="Company / Vendor Name"
          required
          placeholder="e.g. Amul Dairy India"
          value={supplierForm.companyName}
          onChange={(e) => setSupplierForm((f) => ({ ...f, companyName: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Contact Person"
            placeholder="e.g. Rajesh Sharma"
            value={supplierForm.contactPerson}
            onChange={(e) => setSupplierForm((f) => ({ ...f, contactPerson: e.target.value }))}
          />
          <Input
            label="Phone Number"
            placeholder="+91 98201 12345"
            value={supplierForm.phone}
            onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email Address"
            type="email"
            placeholder="vendor@domain.com"
            value={supplierForm.email}
            onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="GSTIN Number"
            placeholder="24AAACA1234F1Z9"
            value={supplierForm.gstin}
            onChange={(e) => setSupplierForm((f) => ({ ...f, gstin: e.target.value }))}
          />
        </div>
      </Drawer>
    </div>
  );
}
