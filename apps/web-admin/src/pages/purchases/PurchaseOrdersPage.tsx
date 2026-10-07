import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Search, ShoppingBag, FileText, Truck, Building2, Plus, X, CheckCircle2, PackageCheck, Undo2, Wallet } from 'lucide-react';
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

import { formatINR, formatDate, formatDateTime } from '../../utils/format';
import { listProducts, LiveProduct } from '../../services/api/products';
import {
  listSuppliers,
  createSupplier,
  listPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  listGrns,
  createGrn,
  listPurchaseReturns,
  createPurchaseReturn,
  getSupplierLedger,
  recordSupplierPayment,
  LiveSupplier,
  LivePurchaseOrder,
  LiveGrn,
  LivePurchaseReturn,
  SupplierLedger,
  PaymentStatus,
  OrderStatus,
  SupplierPaymentMethod,
  ReceiveGoodsInput,
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

const orderBadgeColor: Record<OrderStatus, 'emerald' | 'amber' | 'blue'> = {
  RECEIVED: 'emerald',
  PARTIALLY_RECEIVED: 'blue',
  PENDING: 'amber',
};

const orderBadgeLabel: Record<OrderStatus, string> = {
  RECEIVED: 'Received Goods',
  PARTIALLY_RECEIVED: 'Partially Received',
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
      <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Order Line Items *</p>
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
  const [grns, setGrns] = useState<LiveGrn[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<LivePurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers' | 'grns' | 'returns'>('orders');

  const [poDrawerOpen, setPoDrawerOpen] = useState(false);
  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false);
  const [receiveDrawerOrder, setReceiveDrawerOrder] = useState<LivePurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [receiveBatches, setReceiveBatches] = useState<Record<string, { batchNumber: string; expiryDate: string }>>({});
  const [receiveSerialsText, setReceiveSerialsText] = useState<Record<string, string>>({});
  const [returnDrawerOrder, setReturnDrawerOrder] = useState<LivePurchaseOrder | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [ledgerSupplier, setLedgerSupplier] = useState<LiveSupplier | null>(null);
  const [ledger, setLedger] = useState<SupplierLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'BANK_TRANSFER' as SupplierPaymentMethod, reference: '' });

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
      const [ords, sups, prods, grnRows, returnRows] = await Promise.all([
        listPurchaseOrders(), listSuppliers(), listProducts(), listGrns(), listPurchaseReturns(),
      ]);
      setOrders(ords);
      setSuppliers(sups);
      setProducts(prods);
      setGrns(grnRows);
      setPurchaseReturns(returnRows);
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

  const quickReceiveAll = async (id: string, poNumber: string) => {
    try {
      await receivePurchaseOrder(id);
      await reload();
      showToast(`Received all outstanding stock for ${poNumber}!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not mark as received', 'danger');
    }
  };

  function openReceiveDrawer(order: LivePurchaseOrder) {
    const remaining: Record<string, number> = {};
    for (const item of order.items) remaining[item.productId] = item.qty - item.receivedQty;
    setReceiveQtys(remaining);
    setReceiveBatches({});
    setReceiveSerialsText({});
    setReceiveDrawerOrder(order);
  }

  async function handleReceiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiveDrawerOrder) return;

    const items: ReceiveGoodsInput['items'] = [];
    for (const i of receiveDrawerOrder.items) {
      const receivedQty = receiveQtys[i.productId] ?? 0;
      if (receivedQty <= 0) continue;

      const product = products.find((p) => p.id === i.productId);
      const batchForm = receiveBatches[i.productId];
      const batch = product?.trackBatches && batchForm?.batchNumber
        ? { batchNumber: batchForm.batchNumber, expiryDate: batchForm.expiryDate || undefined }
        : undefined;

      const serialsRaw = receiveSerialsText[i.productId] ?? '';
      const serialNumbers = product?.trackSerials
        ? serialsRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
        : undefined;
      if (product?.trackSerials && serialNumbers && serialNumbers.length !== receivedQty) {
        showToast(`${product.name}: enter exactly ${receivedQty} serial number(s), got ${serialNumbers.length}.`, 'danger');
        return;
      }

      items.push({ productId: i.productId, receivedQty, batch, serialNumbers });
    }
    if (items.length === 0) {
      showToast('Enter a received quantity for at least one line item.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const grn = await createGrn({ purchaseOrderId: receiveDrawerOrder.id, items, receivedBy: 'Warehouse Staff' });
      await reload();
      setReceiveDrawerOrder(null);
      showToast(`Recorded ${grn.grnNumber} — stock updated`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not record goods receipt', 'danger');
    } finally {
      setSaving(false);
    }
  }

  function openReturnDrawer(order: LivePurchaseOrder) {
    setReturnQtys({});
    setReturnReason('');
    setReturnDrawerOrder(order);
  }

  async function handleReturnSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!returnDrawerOrder) return;
    const items = returnDrawerOrder.items
      .map((i) => ({ productId: i.productId, quantity: returnQtys[i.productId] ?? 0 }))
      .filter((i) => i.quantity > 0);
    if (items.length === 0) {
      showToast('Enter a return quantity for at least one line item.', 'danger');
      return;
    }
    if (!returnReason.trim()) {
      showToast('A reason is required for a purchase return.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const ret = await createPurchaseReturn({ purchaseOrderId: returnDrawerOrder.id, items, reason: returnReason.trim() });
      await reload();
      setReturnDrawerOrder(null);
      showToast(`Recorded ${ret.returnNumber} — stock updated`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not record purchase return', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function openLedgerDrawer(supplier: LiveSupplier) {
    setLedgerSupplier(supplier);
    setPaymentForm({ amount: '', method: 'BANK_TRANSFER', reference: '' });
    setLedgerLoading(true);
    try {
      setLedger(await getSupplierLedger(supplier.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load vendor ledger', 'danger');
    } finally {
      setLedgerLoading(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!ledgerSupplier) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      showToast('Enter a valid payment amount.', 'danger');
      return;
    }
    setSaving(true);
    try {
      await recordSupplierPayment(ledgerSupplier.id, { amount, method: paymentForm.method, reference: paymentForm.reference || undefined });
      await reload();
      setLedger(await getSupplierLedger(ledgerSupplier.id));
      setPaymentForm({ amount: '', method: 'BANK_TRANSFER', reference: '' });
      showToast('Payment recorded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not record payment', 'danger');
    } finally {
      setSaving(false);
    }
  }

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
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{formatDate(row.original.createdAt)}</div>
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
        cell: ({ row }) => {
          const po = row.original;
          const hasReceivedAny = po.items.some((i) => i.receivedQty > 0);
          return (
            <div className="flex items-center justify-center gap-1.5">
              {po.orderStatus !== 'RECEIVED' && (
                <>
                  <button
                    onClick={() => quickReceiveAll(po.id, po.poNumber)}
                    title="Quick Receive All Remaining"
                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openReceiveDrawer(po)}
                    title="Receive Partial Shipment (GRN)"
                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 transition"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {hasReceivedAny && (
                <button
                  onClick={() => openReturnDrawer(po)}
                  title="Return Goods to Supplier"
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 transition"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        },
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
            <div className="text-[11px] text-slate-400">{row.original.email}</div>
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
      {
        header: 'Ledger',
        id: 'ledger',
        cell: ({ row }) => (
          <button
            onClick={() => openLedgerDrawer(row.original)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-600 text-[11px] font-bold transition"
          >
            <Wallet className="w-3 h-3" /> View Ledger
          </button>
        ),
      },
    ],
    [],
  );

  const grnColumns: ColumnDef<LiveGrn>[] = useMemo(
    () => [
      { header: 'GRN Number', accessorKey: 'grnNumber', cell: ({ row }) => <span className="font-mono font-bold text-xs">{row.original.grnNumber}</span> },
      { header: 'Against PO', accessorKey: 'poNumber', cell: ({ row }) => <span className="font-mono text-xs text-slate-500">{row.original.poNumber}</span> },
      { header: 'Supplier', accessorKey: 'supplierName' },
      { header: 'Items Received', id: 'items', cell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{row.original.items.map((i) => `${i.receivedQty}× ${i.productName}`).join(', ')}</span> },
      { header: 'Received By', accessorKey: 'receivedBy' },
      { header: 'Date', accessorKey: 'createdAt', cell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{formatDateTime(row.original.createdAt)}</span> },
    ],
    [],
  );

  const returnColumns: ColumnDef<LivePurchaseReturn>[] = useMemo(
    () => [
      { header: 'Return Number', accessorKey: 'returnNumber', cell: ({ row }) => <span className="font-mono font-bold text-xs">{row.original.returnNumber}</span> },
      { header: 'Against PO', accessorKey: 'poNumber', cell: ({ row }) => <span className="font-mono text-xs text-slate-500">{row.original.poNumber}</span> },
      { header: 'Supplier', accessorKey: 'supplierName' },
      { header: 'Items Returned', id: 'items', cell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{row.original.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}</span> },
      { header: 'Reason', accessorKey: 'reason' },
      { header: 'Value', accessorKey: 'totalValue', cell: ({ row }) => <span className="font-bold text-rose-600 dark:text-rose-400">-{formatINR(row.original.totalValue)}</span> },
      { header: 'Status', accessorKey: 'status', cell: ({ row }) => <Badge color={row.original.status === 'ISSUED' ? 'emerald' : 'slate'} dot pill>{row.original.status}</Badge> },
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
              { value: 'grns', label: `Goods Received (${grns.length})` },
              { value: 'returns', label: `Returns (${purchaseReturns.length})` },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'orders' | 'suppliers' | 'grns' | 'returns')}
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
        {activeTab === 'orders' && (
          <DataTable
            columns={orderColumns}
            data={filteredOrders}
            loading={loading}
            emptyTitle="No Purchase Orders Found"
            emptyDescription="No PO numbers or suppliers match your filter criteria."
          />
        )}
        {activeTab === 'suppliers' && (
          <DataTable
            columns={supplierColumns}
            data={filteredSuppliers}
            loading={loading}
            emptyTitle="No Suppliers Found"
            emptyDescription="No supplier vendors match your search term."
          />
        )}
        {activeTab === 'grns' && (
          <DataTable
            columns={grnColumns}
            data={grns}
            loading={loading}
            emptyTitle="No Goods Received Notes Yet"
            emptyDescription="Receiving a shipment against a PO creates a GRN here."
          />
        )}
        {activeTab === 'returns' && (
          <DataTable
            columns={returnColumns}
            data={purchaseReturns}
            loading={loading}
            emptyTitle="No Purchase Returns Yet"
            emptyDescription="Returning received goods to a supplier creates a record here."
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

      {/* Receive goods (GRN) drawer */}
      <Drawer
        open={!!receiveDrawerOrder}
        onClose={() => setReceiveDrawerOrder(null)}
        title={`Receive Goods — ${receiveDrawerOrder?.poNumber ?? ''}`}
        subtitle="Defaults to everything still outstanding — edit to record a partial shipment."
        width="lg"
        footer={
          <>
            <button type="button" onClick={() => setReceiveDrawerOrder(null)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">Cancel</button>
            <button form="receive-form" type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-50">
              {saving ? 'Recording…' : 'Record Receipt'}
            </button>
          </>
        }
      >
        {receiveDrawerOrder && (
          <form id="receive-form" onSubmit={handleReceiveSubmit} className="space-y-2">
            {receiveDrawerOrder.items.map((item) => {
              const remaining = item.qty - item.receivedQty;
              const product = products.find((p) => p.id === item.productId);
              const qtyNow = receiveQtys[item.productId] ?? 0;
              return (
                <div key={item.productId} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.productName}</p>
                      <p className="text-[11px] text-slate-400">{item.receivedQty} of {item.qty} received &bull; {remaining} outstanding</p>
                    </div>
                    <div className="col-span-5">
                      <Input
                        label="Receiving Now"
                        type="number"
                        min={0}
                        max={remaining}
                        value={qtyNow}
                        onChange={(e) => setReceiveQtys((q) => ({ ...q, [item.productId]: Math.max(0, Math.min(remaining, Number(e.target.value) || 0)) }))}
                      />
                    </div>
                  </div>

                  {product?.trackBatches && qtyNow > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <Input
                        label="Batch / Lot Number"
                        placeholder="e.g. LOT-2026-08-A"
                        value={receiveBatches[item.productId]?.batchNumber ?? ''}
                        onChange={(e) => setReceiveBatches((b) => ({ ...b, [item.productId]: { batchNumber: e.target.value, expiryDate: b[item.productId]?.expiryDate ?? '' } }))}
                      />
                      <Input
                        label="Expiry Date"
                        type="date"
                        value={receiveBatches[item.productId]?.expiryDate ?? ''}
                        onChange={(e) => setReceiveBatches((b) => ({ ...b, [item.productId]: { batchNumber: b[item.productId]?.batchNumber ?? '', expiryDate: e.target.value } }))}
                      />
                    </div>
                  )}

                  {product?.trackSerials && qtyNow > 0 && (
                    <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Serial Numbers ({(receiveSerialsText[item.productId] ?? '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length} / {qtyNow})
                      </label>
                      <textarea
                        rows={2}
                        placeholder="One serial per line or comma-separated"
                        value={receiveSerialsText[item.productId] ?? ''}
                        onChange={(e) => setReceiveSerialsText((s) => ({ ...s, [item.productId]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </form>
        )}
      </Drawer>

      {/* Return goods to supplier drawer */}
      <Drawer
        open={!!returnDrawerOrder}
        onClose={() => setReturnDrawerOrder(null)}
        title={`Return Goods — ${returnDrawerOrder?.poNumber ?? ''}`}
        subtitle="Can only return what was actually received on this order."
        width="lg"
        footer={
          <>
            <button type="button" onClick={() => setReturnDrawerOrder(null)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">Cancel</button>
            <button form="return-form" type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-500/25 disabled:opacity-50">
              {saving ? 'Recording…' : 'Record Return'}
            </button>
          </>
        }
      >
        {returnDrawerOrder && (
          <form id="return-form" onSubmit={handleReturnSubmit} className="space-y-4">
            <div className="space-y-2">
              {returnDrawerOrder.items.filter((i) => i.receivedQty > 0).map((item) => (
                <div key={item.productId} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="col-span-7">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.productName}</p>
                    <p className="text-[11px] text-slate-400">{item.receivedQty} received</p>
                  </div>
                  <div className="col-span-5">
                    <Input
                      label="Returning"
                      type="number"
                      min={0}
                      max={item.receivedQty}
                      value={returnQtys[item.productId] ?? 0}
                      onChange={(e) => setReturnQtys((q) => ({ ...q, [item.productId]: Math.max(0, Math.min(item.receivedQty, Number(e.target.value) || 0)) }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Input label="Reason" required placeholder="e.g. Arrived damaged" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
          </form>
        )}
      </Drawer>

      {/* Vendor ledger drawer */}
      <Drawer
        open={!!ledgerSupplier}
        onClose={() => { setLedgerSupplier(null); setLedger(null); }}
        title={`Vendor Ledger — ${ledgerSupplier?.companyName ?? ''}`}
        subtitle="Every purchase order, payment, and return that moved this supplier's balance."
        width="lg"
        footer={
          <button type="button" onClick={() => { setLedgerSupplier(null); setLedger(null); }} className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
            Close
          </button>
        }
      >
        <div className="space-y-5">
          <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Current Balance Owed</span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{formatINR(ledger?.currentBalance ?? 0)}</span>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {ledgerLoading && <p className="text-xs text-slate-400">Loading ledger…</p>}
            {!ledgerLoading && ledger?.entries.length === 0 && <p className="text-xs text-slate-400">No transactions yet.</p>}
            {ledger?.entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{e.label}</p>
                  <p className="text-[11px] text-slate-400">{e.type === 'PURCHASE_ORDER' ? 'Purchase Order' : e.type === 'PAYMENT' ? 'Payment Made' : 'Purchase Return'} &bull; {formatDateTime(e.date)}</p>
                </div>
                <span className={`font-bold ${e.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  {e.amount < 0 ? '-' : '+'}{formatINR(Math.abs(e.amount))}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleRecordPayment} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Record a Payment</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Amount" type="number" min={1} step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} />
              <Select
                label="Method"
                options={[
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'CASH', label: 'Cash' },
                ]}
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value as SupplierPaymentMethod }))}
              />
            </div>
            <Input label="Reference (optional)" placeholder="Transaction / cheque no." value={paymentForm.reference} onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))} />
            <Button type="submit" variant="primary" className="w-full" disabled={saving}>
              {saving ? 'Recording…' : 'Record Payment'}
            </Button>
          </form>
        </div>
      </Drawer>
    </div>
  );
}
