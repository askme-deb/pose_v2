import { useMemo, useState } from 'react';
import { Search, PlusCircle, Award, Tags, TrendingUp, Layers, Pencil, Globe } from 'lucide-react';
import { Badge, Checkbox, Drawer, GlassCard, Input, KpiCard, PillTabs, Select, Textarea, useToast } from '@pospe/ui-library';
import { categories as seedCategories, categoryOptions, Category } from '../../services/mockData/categories';
import { brands as seedBrands, Brand } from '../../services/mockData/brands';
import { products } from '../../services/mockData/products';
import { formatINR } from '../../utils/format';

type Tab = 'categories' | 'brands';

const gstOptions = [
  { value: '18', label: 'GST 18% (Standard)' },
  { value: '12', label: 'GST 12% (Processed)' },
  { value: '5', label: 'GST 5% (Essential)' },
  { value: '0', label: 'GST Exempt (0%)' },
];

function gstBadgeColor(rate: number): 'purple' | 'amber' | 'blue' | 'emerald' {
  if (rate >= 18) return 'purple';
  if (rate >= 12) return 'amber';
  if (rate >= 5) return 'blue';
  return 'emerald';
}

const emptyCategoryForm = { name: '', gstRate: '18', description: '', imageUrl: '' };
const emptyBrandForm = { name: '', countryOfOrigin: '', categoryIds: [] as string[] };

export default function CategoriesBrandsPage() {
  const { showToast } = useToast();
  const [categoryList, setCategoryList] = useState<Category[]>(() => seedCategories.map((c) => ({ ...c })));
  const [brandList, setBrandList] = useState<Brand[]>(() => seedBrands.map((b) => ({ ...b, categoryIds: [...b.categoryIds] })));
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [search, setSearch] = useState('');

  const [catDrawerOpen, setCatDrawerOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);

  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState(emptyBrandForm);

  const categoryValuation = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + p.sellingPrice * p.stockQty);
    }
    return map;
  }, []);

  const topCategory = useMemo(() => {
    let best: { name: string; value: number } | null = null;
    for (const c of categoryList) {
      const value = categoryValuation.get(c.id) ?? 0;
      if (!best || value > best.value) best = { name: c.name, value };
    }
    return best;
  }, [categoryList, categoryValuation]);

  const avgSkusPerCategory = categoryList.length
    ? Math.round(categoryList.reduce((sum, c) => sum + c.skuCount, 0) / categoryList.length)
    : 0;

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categoryList.filter((c) => !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [categoryList, search]);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brandList.filter((b) => !q || b.name.toLowerCase().includes(q) || b.countryOfOrigin.toLowerCase().includes(q));
  }, [brandList, search]);

  function openAddCategory() {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setCatDrawerOpen(true);
  }

  function openEditCategory(c: Category) {
    setEditingCategoryId(c.id);
    setCategoryForm({ name: c.name, gstRate: String(c.gstRate), description: c.description, imageUrl: c.imageUrl });
    setCatDrawerOpen(true);
  }

  function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    const editing = editingCategoryId ? categoryList.find((c) => c.id === editingCategoryId) : undefined;
    const next: Category = {
      id: editing?.id ?? `cat-${Date.now()}`,
      name: categoryForm.name.trim(),
      gstRate: Number(categoryForm.gstRate) || 0,
      description: categoryForm.description.trim(),
      imageUrl: categoryForm.imageUrl.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
      skuCount: editing?.skuCount ?? 0,
    };
    setCategoryList((prev) => (editing ? prev.map((c) => (c.id === editing.id ? next : c)) : [next, ...prev]));
    setCatDrawerOpen(false);
    showToast('Category saved', 'success');
  }

  function openAddBrand() {
    setEditingBrandId(null);
    setBrandForm(emptyBrandForm);
    setBrandDrawerOpen(true);
  }

  function openEditBrand(b: Brand) {
    setEditingBrandId(b.id);
    setBrandForm({ name: b.name, countryOfOrigin: b.countryOfOrigin, categoryIds: [...b.categoryIds] });
    setBrandDrawerOpen(true);
  }

  function toggleBrandCategory(categoryId: string) {
    setBrandForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(categoryId)
        ? f.categoryIds.filter((id) => id !== categoryId)
        : [...f.categoryIds, categoryId],
    }));
  }

  function handleSaveBrand(e: React.FormEvent) {
    e.preventDefault();
    const editing = editingBrandId ? brandList.find((b) => b.id === editingBrandId) : undefined;
    const next: Brand = {
      id: editing?.id ?? `brand-${Date.now()}`,
      name: brandForm.name.trim(),
      countryOfOrigin: brandForm.countryOfOrigin.trim(),
      categoryIds: brandForm.categoryIds,
      skuCount: editing?.skuCount ?? 0,
    };
    setBrandList((prev) => (editing ? prev.map((b) => (b.id === editing.id ? next : b)) : [next, ...prev]));
    setBrandDrawerOpen(false);
    showToast('Brand saved', 'success');
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <GlassCard className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Categories & Brands Directory
            </h1>
            <Badge color="cyan" dot pill>
              {categoryList.length} Categories &bull; {brandList.length} Brands
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize product taxonomy, manage brand relationships, tax rates, and SKU mappings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category, brand name..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500 w-64 shadow-inner"
            />
          </div>

          <PillTabs
            options={[
              { value: 'categories', label: `Categories (${categoryList.length})` },
              { value: 'brands', label: `Brands (${brandList.length})` },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as Tab)}
          />

          {activeTab === 'categories' ? (
            <button
              onClick={openAddCategory}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-600" />
              <span>+ Add Category</span>
            </button>
          ) : (
            <button
              onClick={openAddBrand}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition transform hover:scale-[1.02]"
            >
              <Award className="w-4 h-4" />
              <span>+ Add Brand</span>
            </button>
          )}
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Tags} label="Total Categories" value={`${categoryList.length} Active`} delta="100% Tax Compliant" deltaTone="positive" color="cyan" />
        <KpiCard icon={Award} label="Registered Brands" value={`${brandList.length} Brands`} delta="Verified Vendors" deltaTone="positive" color="purple" />
        <KpiCard
          icon={TrendingUp}
          label="Top Sales Category"
          value={topCategory?.name ?? '—'}
          delta={topCategory ? `${formatINR(topCategory.value)} valuation` : undefined}
          deltaTone="positive"
          color="emerald"
        />
        <KpiCard icon={Layers} label="Avg SKUs / Category" value={`${avgSkusPerCategory} SKUs`} delta="Catalog depth" deltaTone="neutral" color="blue" />
      </div>

      {/* Directory panel */}
      <GlassCard>
        {activeTab === 'categories' ? (
          filteredCategories.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-10">No categories found. Try adjusting your search.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCategories.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden group hover:border-cyan-500/50 transition"
                >
                  <div className="h-24 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{c.name}</p>
                      <Badge color={gstBadgeColor(c.gstRate)} pill>
                        GST {c.gstRate}%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">{c.description}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">{c.skuCount} SKUs</span>
                      <button
                        onClick={() => openEditCategory(c)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-cyan-600 transition text-[10px] font-bold"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredBrands.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-10">No brands found. Try adjusting your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBrands.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 hover:border-cyan-500/50 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{b.name}</p>
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">{b.skuCount} SKUs</span>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Globe className="w-3 h-3" /> {b.countryOfOrigin}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {b.categoryIds.map((cid) => {
                    const cat = categoryOptions.find((o) => o.value === cid);
                    return cat ? (
                      <Badge key={cid} color="cyan">
                        {cat.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
                <button
                  onClick={() => openEditBrand(b)}
                  className="w-full mt-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-cyan-600 transition text-[10px] font-bold"
                >
                  <Pencil className="w-3 h-3" /> Edit Brand
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Add / Edit Category Drawer */}
      <Drawer
        open={catDrawerOpen}
        onClose={() => setCatDrawerOpen(false)}
        title={editingCategoryId ? 'Edit Category' : 'Add New Category'}
        subtitle="Configure taxonomy name, tax rates, and imagery."
        footer={
          <>
            <button
              type="button"
              onClick={() => setCatDrawerOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              form="category-form"
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-lg shadow-cyan-500/25"
            >
              Save Category
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name"
            required
            placeholder="e.g. Frozen Foods"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Default GST Tax Rate (%)"
            options={gstOptions}
            value={categoryForm.gstRate}
            onChange={(e) => setCategoryForm((f) => ({ ...f, gstRate: e.target.value }))}
          />
          <Textarea
            label="Description"
            rows={3}
            placeholder="Brief category summary..."
            value={categoryForm.description}
            onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Category Image URL"
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={categoryForm.imageUrl}
            onChange={(e) => setCategoryForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
        </form>
      </Drawer>

      {/* Add / Edit Brand Drawer */}
      <Drawer
        open={brandDrawerOpen}
        onClose={() => setBrandDrawerOpen(false)}
        title={editingBrandId ? 'Edit Brand' : 'Add New Brand'}
        subtitle="Register brand name, vendor origin, and category mapping."
        footer={
          <>
            <button
              type="button"
              onClick={() => setBrandDrawerOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              form="brand-form"
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-lg shadow-cyan-500/25"
            >
              Save Brand
            </button>
          </>
        }
      >
        <form id="brand-form" onSubmit={handleSaveBrand} className="space-y-4">
          <Input
            label="Brand Name"
            required
            placeholder="e.g. Amul Dairy"
            value={brandForm.name}
            onChange={(e) => setBrandForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Country of Origin"
            placeholder="e.g. India"
            value={brandForm.countryOfOrigin}
            onChange={(e) => setBrandForm((f) => ({ ...f, countryOfOrigin: e.target.value }))}
          />
          <div className="space-y-1.5">
            <p className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Assigned Categories</p>
            <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-3 max-h-48 overflow-y-auto">
              {categoryOptions.map((opt) => (
                <Checkbox
                  key={opt.value}
                  id={`brand-cat-${opt.value}`}
                  label={opt.label}
                  checked={brandForm.categoryIds.includes(opt.value)}
                  onChange={() => toggleBrandCategory(opt.value)}
                />
              ))}
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
