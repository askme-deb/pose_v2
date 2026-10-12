import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Search, ShoppingBag, FileText, Truck, Building2, CheckCircle2, PackageCheck, Undo2, Wallet } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  GlassCard,
  KpiCard,
  PillTabs,
  useToast,
} from '@pospe/ui-library';

import { formatINR, formatDate, formatDateTime } from '../../utils/format';
import {
  listSuppliers,
  listPurchaseOrders,
  receivePurchaseOrder,
  listGrns,
  listPurchaseReturns,
  LiveSupplier,
  LivePurchaseOrder,
  LiveGrn,
  LivePurchaseReturn,
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

export default function PurchaseOrdersPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState<LivePurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<LiveSupplier[]>([]);
  const [grns, setGrns] = useState<LiveGrn[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<LivePurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  type Tab = 'orders' | 'suppliers' | 'grns' | 'returns';
  const initialTab = searchParams.get('tab');
  // Pages like "New supplier" send you back to the tab you came from (?tab=suppliers).
  const [activeTab, setActiveTab] = useState<Tab>(initialTab === 'suppliers' || initialTab === 'grns' || initialTab === 'returns' ? initialTab : 'orders');

  async function reload() {
    setLoading(true);
    try {
      const [ords, sups, grnRows, returnRows] = await Promise.all([listPurchaseOrders(), listSuppliers(), listGrns(), listPurchaseReturns()]);
      setOrders(ords);
      setSuppliers(sups);
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

  // Receiving, returning, issuing orders and the vendor ledger each have their own page.
  const openReceiveDrawer = (order: LivePurchaseOrder) => navigate(`/purchases/orders/${order.id}/receive`);
  const openReturnDrawer = (order: LivePurchaseOrder) => navigate(`/purchases/orders/${order.id}/return`);
  const openLedgerDrawer = (supplier: LiveSupplier) => navigate(`/purchases/suppliers/${supplier.id}/ledger`);
  const openPoDrawer = () => navigate('/purchases/orders/new');
  const openSupplierDrawer = () => navigate('/purchases/suppliers/new');

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
    </div>
  );
}
