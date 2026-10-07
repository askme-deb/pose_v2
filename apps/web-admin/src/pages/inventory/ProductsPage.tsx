import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Search,
  Download,
  Plus,
  List,
  Grid as GridIcon,
  Box,
  IndianRupee,
  AlertTriangle,
  Slash,
  Pencil,
  Barcode as BarcodeIcon,
  Trash2,
  PackagePlus,
  X,
  PackageX,
} from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  Drawer,
  DataTable,
  GlassCard,
  Input,
  KpiCard,
  Select,
  useToast,
} from '@pospe/ui-library';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  stockStatus,
  LiveProduct,
} from '../../services/api/products';
import { listCategories, LiveCategory } from '../../services/api/taxonomy';
import { listBundleItems, setBundleItems, clearBundleItems, getDeadStockReport, DeadStockReport } from '../../services/api/inventoryExtras';
import { formatINR, formatDate } from '../../utils/format';
import { downloadCSV } from '../../utils/csv';

type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
type ViewMode = 'table' | 'grid';

const statusBadge: Record<ReturnType<typeof stockStatus>, { color: 'emerald' | 'amber' | 'red'; label: string }> = {
  'in-stock': { color: 'emerald', label: 'In Stock' },
  'low-stock': { color: 'amber', label: 'Low Stock' },
  'out-of-stock': { color: 'red', label: 'Out of Stock' },
};

const stockFilterOptions = [
  { value: 'all', label: 'All Stock Status' },
  { value: 'in-stock', label: 'In Stock' },
  { value: 'low-stock', label: 'Low Stock' },
  { value: 'out-of-stock', label: 'Out of Stock' },
];

const gstOptions = [
  { value: '18', label: 'GST 18% (Standard)' },
  { value: '12', label: 'GST 12% (Processed)' },
  { value: '5', label: 'GST 5% (Essential)' },
  { value: '0', label: 'GST Exempt (0%)' },
];

const emptyForm = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  gstRate: '18',
  sellingPrice: '',
  costPrice: '',
  stockQty: '',
  minThreshold: '',
  imageUrl: '',
  trackBatches: false,
  trackSerials: false,
};

type FormState = typeof emptyForm;

const barWidths = ['w-0.5', 'w-1', 'w-1.5', 'w-2'] as const;

/** Deterministic pseudo-barcode bar widths derived from the barcode's digits. */
function barcodeBars(code: string): string[] {
  const digits = code.replace(/\D/g, '').split('').map(Number);
  const source = digits.length ? digits : [1, 2, 3, 4, 5];
  return source.map((d) => barWidths[d % barWidths.length]);
}

export default function ProductsPage() {
  const { showToast } = useToast();
  const [productList, setProductList] = useState<LiveProduct[]>([]);
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  // Photo picked in the drawer; uploaded to object storage after save.
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [barcodeProduct, setBarcodeProduct] = useState<LiveProduct | null>(null);

  const [bundleProduct, setBundleProduct] = useState<LiveProduct | null>(null);
  const [bundleComposition, setBundleComposition] = useState<{ componentProductId: string; quantity: number }[]>([]);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleSaving, setBundleSaving] = useState(false);

  const [deadStockOpen, setDeadStockOpen] = useState(false);
  const [deadStockDays, setDeadStockDays] = useState('90');
  const [deadStockReport, setDeadStockReport] = useState<DeadStockReport | null>(null);
  const [deadStockLoading, setDeadStockLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [products, cats] = await Promise.all([listProducts(), listCategories()]);
      setProductList(products);
      setCategories(cats);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load inventory from the server', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);
  const categoryFilterOptions = useMemo(() => [{ value: 'all', label: 'All Categories' }, ...categoryOptions], [categoryOptions]);

  const totalSkus = productList.length;
  const inventoryValuation = productList.reduce((sum, p) => sum + p.sellingPrice * p.stockQty, 0);
  const lowStockCount = productList.filter((p) => stockStatus(p) === 'low-stock').length;
  const outOfStockCount = productList.filter((p) => stockStatus(p) === 'out-of-stock').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productList.filter((p) => {
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
      const matchesStock = stockFilter === 'all' || stockStatus(p) === stockFilter;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [productList, search, categoryFilter, stockFilter]);

  function openAddDrawer() {
    setEditingId(null);
    setImageFile(null);
    setForm({ ...emptyForm, categoryId: categoryOptions[0]?.value ?? '' });
    setDrawerOpen(true);
  }

  function openEditDrawer(p: LiveProduct) {
    setEditingId(p.id);
    setImageFile(null);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      categoryId: p.categoryId,
      gstRate: String(p.gstRate),
      sellingPrice: String(p.sellingPrice),
      costPrice: String(p.costPrice),
      stockQty: String(p.stockQty),
      minThreshold: String(p.minThreshold),
      imageUrl: p.imageUrl,
      trackBatches: p.trackBatches,
      trackSerials: p.trackSerials,
    });
    setDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const input = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || undefined,
      categoryId: form.categoryId || undefined,
      gstRate: Number(form.gstRate) || 0,
      price: Number(form.sellingPrice) || 0,
      costPrice: Number(form.costPrice) || 0,
      stockQty: Number(form.stockQty) || 0,
      minThreshold: Number(form.minThreshold) || 0,
      imageUrl: form.imageUrl.trim() || undefined,
      trackBatches: form.trackBatches,
      trackSerials: form.trackSerials,
    };

    try {
      const saved = editingId ? await updateProduct(editingId, input) : await createProduct(input);
      if (imageFile) await uploadProductImage(saved.id, imageFile);
      await reload();
      setDrawerOpen(false);
      showToast('Product saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save product', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: LiveProduct) {
    try {
      await deleteProduct(p.id);
      setProductList((prev) => prev.filter((x) => x.id !== p.id));
      showToast(`${p.name} removed from catalog`, 'warning');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete product', 'danger');
    }
  }

  async function openBundleDrawer(p: LiveProduct) {
    setBundleProduct(p);
    setBundleLoading(true);
    try {
      const items = await listBundleItems(p.id);
      setBundleComposition(
        items.length ? items.map((i) => ({ componentProductId: i.componentProductId, quantity: i.quantity })) : [{ componentProductId: '', quantity: 1 }],
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load bundle composition', 'danger');
    } finally {
      setBundleLoading(false);
    }
  }

  async function handleSaveBundle(e: React.FormEvent) {
    e.preventDefault();
    if (!bundleProduct) return;
    const items = bundleComposition.filter((i) => i.componentProductId && i.quantity > 0);
    if (items.length === 0) {
      showToast('Add at least one component to this bundle.', 'danger');
      return;
    }
    setBundleSaving(true);
    try {
      await setBundleItems(bundleProduct.id, items);
      await reload();
      setBundleProduct(null);
      showToast(`${bundleProduct.name} is now a bundle`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save bundle composition', 'danger');
    } finally {
      setBundleSaving(false);
    }
  }

  async function handleClearBundle() {
    if (!bundleProduct) return;
    setBundleSaving(true);
    try {
      await clearBundleItems(bundleProduct.id);
      await reload();
      setBundleProduct(null);
      showToast(`${bundleProduct.name} is no longer a bundle`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not clear bundle composition', 'danger');
    } finally {
      setBundleSaving(false);
    }
  }

  async function loadDeadStock(days: string) {
    setDeadStockLoading(true);
    try {
      setDeadStockReport(await getDeadStockReport(Number(days) || 90));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load dead stock report', 'danger');
    } finally {
      setDeadStockLoading(false);
    }
  }

  function openDeadStockDrawer() {
    setDeadStockOpen(true);
    loadDeadStock(deadStockDays);
  }

  function handleExportCSV() {
    downloadCSV(
      'inventory-products.csv',
      ['Name', 'SKU', 'Barcode', 'Category', 'GST Rate', 'Selling Price', 'Cost Price', 'Stock Qty', 'Min Threshold', 'Status'],
      filtered.map((p) => [
        p.name,
        p.sku,
        p.barcode,
        p.categoryName,
        `${p.gstRate}%`,
        p.sellingPrice,
        p.costPrice,
        p.stockQty,
        p.minThreshold,
        statusBadge[stockStatus(p)].label,
      ]),
    );
    showToast('Inventory exported to CSV', 'success');
  }

  const columns: ColumnDef<LiveProduct, any>[] = [
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <img src={row.original.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-800" />
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100">{row.original.name}</span>
            <div className="flex items-center gap-1 mt-0.5">
              {row.original.isBundle && <Badge color="blue" pill>Bundle</Badge>}
              {row.original.trackBatches && <Badge color="cyan" pill>Batches</Badge>}
              {row.original.trackSerials && <Badge color="purple" pill>Serials</Badge>}
            </div>
          </div>
        </div>
      ),
    },
    { header: 'SKU', accessorKey: 'sku', cell: ({ getValue }) => <span className="font-mono text-slate-500 dark:text-slate-400">{getValue() as string}</span> },
    { header: 'Category', accessorKey: 'categoryName' },
    {
      header: 'Price',
      accessorKey: 'sellingPrice',
      cell: ({ getValue }) => <span className="font-bold text-slate-800 dark:text-slate-100">{formatINR(getValue() as number)}</span>,
    },
    { header: 'Stock', accessorKey: 'stockQty' },
    {
      header: 'Status',
      id: 'status',
      cell: ({ row }) => {
        const s = statusBadge[stockStatus(row.original)];
        return (
          <Badge color={s.color} dot pill>
            {s.label}
          </Badge>
        );
      },
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEditDrawer(row.original)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-purple-600 transition"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setBarcodeProduct(row.original)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-purple-600 transition"
          >
            <BarcodeIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openBundleDrawer(row.original)}
            title="Bundle composition"
            className={`p-1.5 rounded-lg transition ${row.original.isBundle ? 'bg-indigo-500/10 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600'}`}
          >
            <PackagePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-600 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <GlassCard className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Enterprise Inventory & SKU Catalog
            </h1>
            <Badge color="purple" dot pill>
              {totalSkus} Active SKUs
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Master product catalog, stock valuation, price margin control, and barcode label generator. Live data
            from the inventory service.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, SKU, barcode..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500 w-64 shadow-inner"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            {categoryFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            {stockFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={
                'p-1.5 rounded-xl font-bold transition ' +
                (viewMode === 'table' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-purple-600')
              }
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={
                'p-1.5 rounded-xl font-bold transition ' +
                (viewMode === 'grid' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-purple-600')
              }
            >
              <GridIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openDeadStockDrawer}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-500 transition shadow-sm"
          >
            <PackageX className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Dead Stock</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-purple-500 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={openAddDrawer}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition transform hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Box} label="Total Active SKUs" value={`${totalSkus} SKUs`} delta={`${categories.length} Categories`} deltaTone="neutral" color="purple" />
        <KpiCard icon={IndianRupee} label="Inventory Valuation" value={formatINR(inventoryValuation)} delta="Based on selling price" deltaTone="positive" color="emerald" />
        <KpiCard icon={AlertTriangle} label="Low Stock Warning" value={`${lowStockCount} SKUs`} delta="Below min threshold" deltaTone="negative" color="amber" />
        <KpiCard icon={Slash} label="Out of Stock Alert" value={`${outOfStockCount} SKUs`} delta="Needs immediate PO" deltaTone="negative" color="red" />
      </div>

      {/* Products view */}
      <GlassCard>
        {viewMode === 'table' ? (
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            emptyTitle="No products found"
            emptyDescription="Try adjusting your search or filters."
            pageSize={8}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {!loading && filtered.length === 0 && (
              <p className="col-span-full text-center text-xs text-slate-400 py-10">No products found. Try adjusting your search or filters.</p>
            )}
            {filtered.map((p) => {
              const s = statusBadge[stockStatus(p)];
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden group hover:border-purple-500/50 transition"
                >
                  <div className="h-28 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 min-h-[2rem]">{p.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{p.sku}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{formatINR(p.sellingPrice)}</span>
                      <Badge color={s.color} pill>
                        {s.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 pt-2">
                      <button
                        onClick={() => openEditDrawer(p)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:text-purple-600 transition flex items-center justify-center gap-1"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => setBarcodeProduct(p)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:text-purple-600 transition flex items-center justify-center gap-1"
                      >
                        <BarcodeIcon className="w-3 h-3" /> Label
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Add / Edit Product Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'Edit Product SKU' : 'Add New Product SKU'}
        subtitle="Fill in product specs, barcode, tax, and pricing information."
        footer={
          <>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              form="product-form"
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Product SKU'}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSave} className="space-y-4">
          <Input
            label="Product Name"
            required
            placeholder="e.g. Organic Whole Milk 1L"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU Code"
              required
              placeholder="e.g. SKU-8829"
              className="font-mono"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
            <Input
              label="Barcode (EAN-13)"
              placeholder="e.g. 8901234567890"
              className="font-mono"
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              required
              options={categoryOptions}
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            />
            <Select
              label="GST Tax Rate (%)"
              options={gstOptions}
              value={form.gstRate}
              onChange={(e) => setForm((f) => ({ ...f, gstRate: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Selling Price (₹)"
              required
              type="number"
              step="0.01"
              placeholder="249.00"
              className="font-mono"
              value={form.sellingPrice}
              onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
            />
            <Input
              label="Cost Price (₹)"
              type="number"
              step="0.01"
              placeholder="180.00"
              className="font-mono"
              value={form.costPrice}
              onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial Stock Qty"
              required
              type="number"
              placeholder="45"
              className="font-mono"
              value={form.stockQty}
              onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
            />
            <Input
              label="Min Threshold Alert"
              type="number"
              placeholder="15"
              className="font-mono"
              value={form.minThreshold}
              onChange={(e) => setForm((f) => ({ ...f, minThreshold: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Product Photo</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file && file.size > 5 * 1024 * 1024) {
                  showToast('Image must be 5 MB or smaller', 'warning');
                  e.target.value = '';
                  return;
                }
                setImageFile(file);
              }}
              className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-bold"
            />
            <p className="text-[11px] text-slate-400">JPEG, PNG or WebP up to 5 MB. Or paste an image URL below.</p>
          </div>
          <Input
            label="Product Image URL (optional)"
            type="url"
            placeholder="https://..."
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
          <div className="flex items-center gap-6 pt-1">
            <Checkbox
              label="Track batches / expiry"
              checked={form.trackBatches}
              onChange={(e) => setForm((f) => ({ ...f, trackBatches: e.target.checked }))}
            />
            <Checkbox
              label="Track serial numbers"
              checked={form.trackSerials}
              onChange={(e) => setForm((f) => ({ ...f, trackSerials: e.target.checked }))}
            />
          </div>
        </form>
      </Drawer>

      {/* Barcode Label Generator Offcanvas */}
      <Drawer
        open={!!barcodeProduct}
        onClose={() => setBarcodeProduct(null)}
        title={barcodeProduct?.name ?? 'Barcode Label'}
        subtitle={barcodeProduct?.sku}
        width="sm"
        footer={
          <>
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition"
            >
              Print Label
            </button>
            <button
              onClick={() => setBarcodeProduct(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Close
            </button>
          </>
        }
      >
        {barcodeProduct && (
          <div className="text-center space-y-3">
            <div className="mx-auto flex items-end justify-center gap-[1.5px] h-16 bg-white p-3 rounded-xl border border-slate-200">
              {barcodeBars(barcodeProduct.barcode).map((w, i) => (
                <span key={i} className={`h-full bg-slate-900 ${w}`} />
              ))}
            </div>
            <p className="text-xs font-mono tracking-[0.3em] text-slate-700 dark:text-slate-300">{barcodeProduct.barcode}</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{formatINR(barcodeProduct.sellingPrice)}</p>
          </div>
        )}
      </Drawer>

      {/* Bundle composition drawer */}
      <Drawer
        open={!!bundleProduct}
        onClose={() => setBundleProduct(null)}
        title={`Bundle Composition — ${bundleProduct?.name ?? ''}`}
        subtitle="Selling this product decrements each component's own stock instead of its own."
        width="lg"
        footer={
          <>
            {bundleProduct?.isBundle && (
              <button
                type="button"
                onClick={handleClearBundle}
                disabled={bundleSaving}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-600 font-bold text-xs hover:bg-rose-600 hover:text-white transition disabled:opacity-50"
              >
                Clear Bundle
              </button>
            )}
            <button type="button" onClick={() => setBundleProduct(null)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
              Cancel
            </button>
            <button form="bundle-form" type="submit" disabled={bundleSaving || bundleLoading} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 disabled:opacity-50">
              {bundleSaving ? 'Saving…' : 'Save Composition'}
            </button>
          </>
        }
      >
        {bundleLoading && <p className="text-xs text-slate-400">Loading…</p>}
        {!bundleLoading && bundleProduct && (
          <form id="bundle-form" onSubmit={handleSaveBundle} className="space-y-2">
            {bundleComposition.map((row, idx) => {
              const componentOptions = productList
                .filter((p) => p.id !== bundleProduct.id && !p.isBundle)
                .map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="col-span-8">
                    <Select
                      label={idx === 0 ? 'Component Product' : undefined}
                      options={componentOptions}
                      placeholder="Select a component"
                      value={row.componentProductId}
                      onChange={(e) => setBundleComposition((rows) => rows.map((r, i) => (i === idx ? { ...r, componentProductId: e.target.value } : r)))}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      label={idx === 0 ? 'Qty' : undefined}
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => setBundleComposition((rows) => rows.map((r, i) => (i === idx ? { ...r, quantity: Math.max(1, Number(e.target.value) || 1) } : r)))}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center pb-2">
                    <button
                      type="button"
                      onClick={() => setBundleComposition((rows) => rows.filter((_, i) => i !== idx))}
                      disabled={bundleComposition.length === 1}
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-rose-600 hover:text-white transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="ghost" size="sm" onClick={() => setBundleComposition((rows) => [...rows, { componentProductId: '', quantity: 1 }])}>
              <Plus className="w-3.5 h-3.5" /> Add Component
            </Button>
          </form>
        )}
      </Drawer>

      {/* Dead stock report drawer */}
      <Drawer
        open={deadStockOpen}
        onClose={() => setDeadStockOpen(false)}
        title="Dead Stock Report"
        subtitle="Products with no paid sales in the window, sorted by capital tied up."
        width="lg"
        footer={
          <button type="button" onClick={() => setDeadStockOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
            Close
          </button>
        }
      >
        <div className="space-y-4">
          <Select
            label="Window"
            options={[
              { value: '30', label: 'Last 30 days' },
              { value: '60', label: 'Last 60 days' },
              { value: '90', label: 'Last 90 days' },
              { value: '180', label: 'Last 180 days' },
            ]}
            value={deadStockDays}
            onChange={(e) => {
              setDeadStockDays(e.target.value);
              loadDeadStock(e.target.value);
            }}
          />

          {deadStockLoading && <p className="text-xs text-slate-400">Loading…</p>}

          {!deadStockLoading && deadStockReport && (
            <>
              <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{deadStockReport.count} SKU{deadStockReport.count === 1 ? '' : 's'} with no sales</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{formatINR(deadStockReport.totalCapitalTiedUp)}</span>
              </div>

              {deadStockReport.products.length === 0 && <p className="text-xs text-slate-400">Nothing dead in this window — everything with stock has sold recently.</p>}

              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {deadStockReport.products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{p.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{p.sku} &bull; {p.categoryName} &bull; {p.stockQty} in stock</p>
                      <p className="text-[11px] text-slate-400">{p.lastSoldAt ? `Last sold ${formatDate(p.lastSoldAt)}` : 'Never sold'}</p>
                    </div>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{formatINR(p.capitalTiedUp)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Drawer>
    </div>
  );
}
