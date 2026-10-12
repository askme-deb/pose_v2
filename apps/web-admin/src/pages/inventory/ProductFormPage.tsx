import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GlassCard, useToast } from '@pospe/ui-library';
import { createProduct, getProduct, listProducts, updateProduct, uploadProductImage, type LiveProduct } from '../../services/api/products';
import { listCategories, type LiveCategory } from '../../services/api/taxonomy';
import ProductFormTabs, { type AddonRow, type OptionRow, type ProductFormState, type ProductFormTab } from './ProductFormTabs';

const gstOptions = [
  { value: '18', label: 'GST 18% (Standard)' },
  { value: '12', label: 'GST 12% (Processed)' },
  { value: '5', label: 'GST 5% (Essential)' },
  { value: '0', label: 'GST Exempt (0%)' },
];

const emptyForm: ProductFormState = {
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

/** Add / edit a product on its own page (/inventory/products/new and /inventory/products/:id/edit). */
export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const editingId = id ?? null;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [categories, setCategories] = useState<LiveCategory[]>([]);

  const [tab, setTab] = useState<ProductFormTab>('basic');
  const [invalidTabs, setInvalidTabs] = useState<ProductFormTab[]>([]);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [hasVariations, setHasVariations] = useState(false);
  const [variationName, setVariationName] = useState('');
  const [optionRows, setOptionRows] = useState<OptionRow[]>([]);
  const [addonRows, setAddonRows] = useState<AddonRow[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, cats, product] = await Promise.all([
          listProducts(),
          listCategories(),
          editingId ? getProduct(editingId).catch((err: unknown) => (/not found/i.test(String((err as Error)?.message)) ? null : Promise.reject(err))) : Promise.resolve(undefined),
        ]);
        if (cancelled) return;
        setProducts(list);
        setCategories(cats);
        if (editingId) {
          const p = product;
          if (!p) {
            setNotFound(true);
            return;
          }
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
          setHasVariations(p.options.length > 0);
          setVariationName(p.variationName);
          setOptionRows(
            p.options.map((o) => ({
              id: o.id,
              name: o.name,
              sku: o.sku,
              barcode: o.barcode,
              price: String(o.price),
              mrp: o.mrp ? String(o.mrp) : '',
              costPrice: o.costPrice ? String(o.costPrice) : '',
              stockQty: String(o.stockQty),
            })),
          );
          setAddonRows(p.addons.map((a) => ({ addonProductId: a.addonProductId, kind: a.kind, price: String(a.price) })));
        } else {
          setForm({ ...emptyForm, categoryId: cats[0]?.id ?? '' });
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Could not load the product form', 'danger');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  /** Returns the tabs that have a problem (and a message for the first one). */
  function validateForm(): { tabs: ProductFormTab[]; message?: string } {
    const tabs: ProductFormTab[] = [];
    let message: string | undefined;
    const fail = (t: ProductFormTab, msg: string) => {
      if (!tabs.includes(t)) tabs.push(t);
      message ??= msg;
    };
    if (!form.name.trim()) fail('basic', 'Enter a product name');
    if (!form.sku.trim()) fail('basic', 'Enter an SKU code');
    if (!form.categoryId) fail('basic', 'Choose a category');
    if (hasVariations) {
      if (optionRows.length === 0) fail('variation', 'Add at least one variation option');
      const seen = new Set<string>();
      optionRows.forEach((o, i) => {
        const name = o.name.trim();
        if (!name) fail('variation', `Option ${i + 1} needs a name`);
        else if (seen.has(name.toLowerCase())) fail('variation', `"${name}" is listed twice`);
        seen.add(name.toLowerCase());
        if (o.price === '' || !(Number(o.price) >= 0)) fail('variation', `Enter a price for ${name || `option ${i + 1}`}`);
      });
    } else {
      if (form.sellingPrice === '' || !(Number(form.sellingPrice) >= 0)) fail('basic', 'Enter a selling price');
      if (form.stockQty === '') fail('basic', 'Enter the initial stock quantity');
    }
    addonRows.forEach((a) => {
      if (!a.addonProductId) fail('addons', 'Choose a product for every addon');
    });
    return { tabs, message };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const check = validateForm();
    setInvalidTabs(check.tabs);
    if (check.tabs.length) {
      setTab(check.tabs[0]);
      showToast(check.message ?? 'Please complete the highlighted tabs', 'warning');
      return;
    }
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
      // Always sent, so turning variations off ([]) or editing addons is explicit.
      options: hasVariations
        ? optionRows.map((o) => ({
            ...(o.id ? { id: o.id } : {}),
            name: o.name.trim(),
            sku: o.sku.trim() || undefined,
            barcode: o.barcode.trim() || undefined,
            price: Number(o.price) || 0,
            mrp: Number(o.mrp) || 0,
            costPrice: Number(o.costPrice) || 0,
            stockQty: Math.max(0, Math.floor(Number(o.stockQty) || 0)),
          }))
        : [],
      ...(hasVariations ? { variationName: variationName.trim() || 'Variation' } : {}),
      addons: addonRows.map((a) => ({ addonProductId: a.addonProductId, kind: a.kind, price: a.kind === 'COMPLEMENTARY' ? 0 : Number(a.price) || 0 })),
    };

    try {
      const saved = editingId ? await updateProduct(editingId, input) : await createProduct(input);
      if (imageFile) {
        try {
          await uploadProductImage(saved.id, imageFile);
        } catch (err) {
          // The product itself is saved; only the photo failed.
          showToast(err instanceof Error ? `Product saved, but the photo upload failed: ${err.message}` : 'Product saved, but the photo upload failed', 'warning');
          navigate('/inventory/products');
          return;
        }
      }
      showToast('Product saved', 'success');
      navigate('/inventory/products');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save product', 'danger');
    } finally {
      setSaving(false);
    }
  }

  const title = editingId ? 'Edit Product SKU' : 'Add New Product SKU';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link to="/inventory/products" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Catalog
        </Link>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">{title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">Fill in product specs, variations, images and addons.</p>
      </div>

      {loading ? (
        <GlassCard>
          <p className="text-center text-xs text-slate-400 py-10">Loading…</p>
        </GlassCard>
      ) : notFound ? (
        <GlassCard>
          <div className="text-center py-10 space-y-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">This product no longer exists.</p>
            <Link to="/inventory/products" className="inline-block text-xs font-bold text-purple-600 hover:underline">
              Return to the catalog
            </Link>
          </div>
        </GlassCard>
      ) : (
        <form id="product-form" onSubmit={handleSave} noValidate>
          <GlassCard className="!p-6">
            <ProductFormTabs
              tab={tab}
              onTab={setTab}
              form={form}
              setForm={setForm}
              hasVariations={hasVariations}
              setHasVariations={setHasVariations}
              variationName={variationName}
              setVariationName={setVariationName}
              options={optionRows}
              setOptions={setOptionRows}
              addons={addonRows}
              setAddons={setAddonRows}
              imageFile={imageFile}
              setImageFile={setImageFile}
              categoryOptions={categoryOptions}
              gstOptions={gstOptions}
              allProducts={products}
              editingId={editingId}
              invalidTabs={invalidTabs}
            />
          </GlassCard>

          <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex items-center justify-end gap-3 px-1 py-3 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50/90 dark:via-slate-950/90 to-transparent">
            <Link
              to="/inventory/products"
              className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Product SKU'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
