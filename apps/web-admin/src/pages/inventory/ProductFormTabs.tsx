import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Layers, Image as ImageIcon, Gift } from 'lucide-react';
import { Checkbox, Input, Select, useToast } from '@pospe/ui-library';
import { Link } from 'react-router-dom';
import type { AddonKind, LiveProduct } from '../../services/api/products';
import type { LiveHsnCode } from '../../services/api/hsnCodes';

export type ProductFormTab = 'basic' | 'variation' | 'images' | 'addons';

export interface ProductFormState {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  /** HSN / SAC code; the GST rate comes from it. */
  hsnCode: string;
  gstRate: string;
  sellingPrice: string;
  costPrice: string;
  stockQty: string;
  minThreshold: string;
  imageUrl: string;
  trackBatches: boolean;
  trackSerials: boolean;
}

/** One row of the Variation tab; numbers stay strings while being typed. */
export interface OptionRow {
  /** Present for an option that already exists, so it keeps its history. */
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  mrp: string;
  costPrice: string;
  stockQty: string;
}

export interface AddonRow {
  addonProductId: string;
  kind: AddonKind;
  price: string;
}

export const emptyOption = (): OptionRow => ({ name: '', sku: '', barcode: '', price: '', mrp: '', costPrice: '', stockQty: '' });

const TABS: { id: ProductFormTab; label: string }[] = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'variation', label: 'Variation' },
  { id: 'images', label: 'Product Images' },
  { id: 'addons', label: 'Addons & Complementary' },
];

const cell =
  'w-full min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40';

interface Props {
  tab: ProductFormTab;
  onTab: (tab: ProductFormTab) => void;
  form: ProductFormState;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  hasVariations: boolean;
  setHasVariations: (v: boolean) => void;
  variationName: string;
  setVariationName: (v: string) => void;
  options: OptionRow[];
  setOptions: React.Dispatch<React.SetStateAction<OptionRow[]>>;
  addons: AddonRow[];
  setAddons: React.Dispatch<React.SetStateAction<AddonRow[]>>;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  categoryOptions: { value: string; label: string }[];
  hsnCodes: LiveHsnCode[];
  allProducts: LiveProduct[];
  editingId: string | null;
  /** Tabs that currently have a validation problem (shown with a red dot). */
  invalidTabs: ProductFormTab[];
}

export default function ProductFormTabs(props: Props) {
  const { tab, onTab, setForm, hasVariations, options, addons, invalidTabs } = props;
  const patch = (p: Partial<ProductFormState>) => setForm((f) => ({ ...f, ...p }));

  return (
    <div>
      <div role="tablist" className="flex border-b border-slate-200 dark:border-slate-700 -mx-6 px-6 mb-5">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onTab(t.id)}
              className={
                'relative flex-1 px-2 py-2.5 text-xs sm:text-sm text-center -mb-px rounded-t-lg border transition ' +
                (active
                  ? 'border-slate-200 dark:border-slate-700 border-b-white dark:border-b-slate-900 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold'
                  : 'border-transparent text-blue-600 hover:text-blue-700')
              }
            >
              {t.label}
              {t.id === 'variation' && hasVariations && options.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">{options.length}</span>
              )}
              {t.id === 'addons' && addons.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">{addons.length}</span>
              )}
              {invalidTabs.includes(t.id) && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
            </button>
          );
        })}
      </div>

      {tab === 'basic' && <BasicTab {...props} patch={patch} />}
      {tab === 'variation' && <VariationTab {...props} />}
      {tab === 'images' && <ImagesTab {...props} patch={patch} />}
      {tab === 'addons' && <AddonsTab {...props} />}
    </div>
  );
}

function BasicTab({ form, patch, categoryOptions, hsnCodes, hasVariations, options }: Props & { patch: (p: Partial<ProductFormState>) => void }) {
  // Active codes, plus the product's current one even if it has since been deactivated.
  const hsnOptions = hsnCodes
    .filter((h) => h.isActive || h.code === form.hsnCode)
    .map((h) => ({ value: h.code, label: `${h.code} · ${h.description} (GST ${h.gstRate}%)` }));
  const chosenHsn = hsnCodes.find((h) => h.code === form.hsnCode);
  const totalStock = options.reduce((s, o) => s + (Number(o.stockQty) || 0), 0);
  const fromPrice = options.length ? Math.min(...options.map((o) => Number(o.price) || 0)) : 0;
  return (
    <div className="space-y-4">
      <Input label="Product Name" required placeholder="e.g. Veg Thali" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="SKU Code" required placeholder="e.g. SKU-8829" className="font-mono" value={form.sku} onChange={(e) => patch({ sku: e.target.value })} />
        <Input label="Barcode (EAN-13)" placeholder="e.g. 8901234567890" className="font-mono" value={form.barcode} onChange={(e) => patch({ barcode: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Category" required options={categoryOptions} value={form.categoryId} onChange={(e) => patch({ categoryId: e.target.value })} />
        <Select
          label="HSN / SAC Code"
          required
          placeholder="Search HSN code…"
          options={hsnOptions}
          value={form.hsnCode}
          onChange={(e) => {
            const hsn = hsnCodes.find((h) => h.code === e.target.value);
            patch({ hsnCode: e.target.value, gstRate: hsn ? String(hsn.gstRate) : form.gstRate });
          }}
        />
      </div>

      <p className="text-[11px] -mt-1 text-slate-500 dark:text-slate-400">
        {chosenHsn ? (
          <>
            GST rate: <b className="text-slate-800 dark:text-slate-100">{chosenHsn.gstRate}%</b> (from HSN {chosenHsn.code}). Change it under{' '}
          </>
        ) : form.hsnCode ? null : hsnCodes.length === 0 ? (
          <>No HSN codes yet. Add them under </>
        ) : (
          <>Choose an HSN code: the GST rate is taken from it. Manage codes under </>
        )}
        <Link to="/inventory/hsn-codes" className="font-bold text-blue-600 hover:underline">
          HSN &amp; GST
        </Link>
        .
      </p>

      {hasVariations ? (
        <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/20 p-3 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-bold text-purple-700 dark:text-purple-300 mb-1">Price and stock are set per variation</p>
          <p>
            {options.length
              ? `From ₹${fromPrice.toFixed(2)} · ${totalStock} units across ${options.length} option${options.length === 1 ? '' : 's'}.`
              : 'Add at least one option in the Variation tab.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Selling Price (₹)" required type="number" step="0.01" placeholder="249.00" className="font-mono" value={form.sellingPrice} onChange={(e) => patch({ sellingPrice: e.target.value })} />
            <Input label="Cost Price (₹)" type="number" step="0.01" placeholder="180.00" className="font-mono" value={form.costPrice} onChange={(e) => patch({ costPrice: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Initial Stock Qty" required type="number" placeholder="45" className="font-mono" value={form.stockQty} onChange={(e) => patch({ stockQty: e.target.value })} />
            <Input label="Min Threshold Alert" type="number" placeholder="15" className="font-mono" value={form.minThreshold} onChange={(e) => patch({ minThreshold: e.target.value })} />
          </div>
        </>
      )}
      {hasVariations && (
        <Input label="Min Threshold Alert (total units)" type="number" placeholder="15" className="font-mono" value={form.minThreshold} onChange={(e) => patch({ minThreshold: e.target.value })} />
      )}

      <div className="flex items-center gap-6 pt-1">
        <Checkbox label="Track batches / expiry" checked={form.trackBatches} onChange={(e) => patch({ trackBatches: e.target.checked })} />
        <Checkbox label="Track serial numbers" checked={form.trackSerials} onChange={(e) => patch({ trackSerials: e.target.checked })} />
      </div>
    </div>
  );
}

function VariationTab({ hasVariations, setHasVariations, variationName, setVariationName, options, setOptions }: Props) {
  const setRow = (i: number, p: Partial<OptionRow>) => setOptions((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
        <Layers className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <Checkbox
            label="This product has variations (e.g. Half / Full, Small / Large)"
            checked={hasVariations}
            onChange={(e) => {
              setHasVariations(e.target.checked);
              if (e.target.checked && options.length === 0) setOptions([emptyOption()]);
            }}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Each option is sold separately with its own price, SKU, barcode and stock. Turning this off keeps the product as a single item.
          </p>
        </div>
      </div>

      {hasVariations && (
        <>
          <Input label="Variation name" placeholder="e.g. Size" value={variationName} onChange={(e) => setVariationName(e.target.value)} />

          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-left border-separate border-spacing-y-1.5 min-w-[640px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="font-bold pl-1">Option</th>
                  <th className="font-bold">SKU</th>
                  <th className="font-bold">Barcode</th>
                  <th className="font-bold w-20">Price ₹</th>
                  <th className="font-bold w-20">MRP ₹</th>
                  <th className="font-bold w-20">Cost ₹</th>
                  <th className="font-bold w-16">Stock</th>
                  <th className="w-7" />
                </tr>
              </thead>
              <tbody>
                {options.map((o, i) => (
                  <tr key={o.id ?? `new-${i}`}>
                    <td className="pr-1.5"><input className={cell} placeholder="Full" value={o.name} onChange={(e) => setRow(i, { name: e.target.value })} aria-label="Option name" /></td>
                    <td className="pr-1.5"><input className={`${cell} font-mono`} value={o.sku} onChange={(e) => setRow(i, { sku: e.target.value })} aria-label="Option SKU" /></td>
                    <td className="pr-1.5"><input className={`${cell} font-mono`} value={o.barcode} onChange={(e) => setRow(i, { barcode: e.target.value })} aria-label="Option barcode" /></td>
                    <td className="pr-1.5"><input className={`${cell} font-mono`} type="number" step="0.01" min="0" value={o.price} onChange={(e) => setRow(i, { price: e.target.value })} aria-label="Option price" /></td>
                    <td className="pr-1.5"><input className={`${cell} font-mono`} type="number" step="0.01" min="0" value={o.mrp} onChange={(e) => setRow(i, { mrp: e.target.value })} aria-label="Option MRP" /></td>
                    <td className="pr-1.5"><input className={`${cell} font-mono`} type="number" step="0.01" min="0" value={o.costPrice} onChange={(e) => setRow(i, { costPrice: e.target.value })} aria-label="Option cost" /></td>
                    <td className="pr-1.5"><input className={`${cell} font-mono`} type="number" min="0" step="1" value={o.stockQty} onChange={(e) => setRow(i, { stockQty: e.target.value })} aria-label="Option stock" /></td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setOptions((rows) => rows.filter((_, idx) => idx !== i))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        aria-label={`Remove option ${o.name || i + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => setOptions((rows) => [...rows, emptyOption()])}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-purple-400 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/30"
          >
            <Plus className="w-3.5 h-3.5" /> Add option
          </button>
        </>
      )}
    </div>
  );
}

function ImagesTab({ form, patch, imageFile, setImageFile }: Props & { patch: (p: Partial<ProductFormState>) => void }) {
  const { showToast } = useToast();
  const preview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : form.imageUrl.trim() || ''), [imageFile, form.imageUrl]);
  useEffect(() => () => {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [preview]);

  return (
    <div className="space-y-4">
      <div className="h-44 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden">
        {preview && !broken ? (
          <img src={preview} alt="Product preview" className="h-full w-full object-contain" onError={() => setBroken(true)} />
        ) : (
          <div className="text-center text-slate-400">
            <ImageIcon className="w-8 h-8 mx-auto mb-1" />
            <p className="text-xs">{broken ? 'This image could not be loaded' : 'No image yet'}</p>
          </div>
        )}
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
      <Input label="Product Image URL (optional)" type="url" placeholder="https://..." value={form.imageUrl} onChange={(e) => patch({ imageUrl: e.target.value })} />
    </div>
  );
}

function AddonsTab({ addons, setAddons, allProducts, editingId }: Props) {
  const setRow = (i: number, p: Partial<AddonRow>) => setAddons((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const taken = new Set(addons.map((a) => a.addonProductId));
  const choices = (current: string) =>
    allProducts.filter((p) => p.id !== editingId && !p.isBundle && (p.id === current || !taken.has(p.id))).map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));
  const available = allProducts.some((p) => p.id !== editingId && !p.isBundle && !taken.has(p.id));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
        <Gift className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          <b className="text-slate-700 dark:text-slate-200">Addons</b> are optional extras sold on top at their own price (a drink with a thali).{' '}
          <b className="text-slate-700 dark:text-slate-200">Complementary</b> items come free with this product.
        </p>
      </div>

      {addons.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No addons or complementary items yet.</p>}

      <div className="space-y-2">
        {addons.map((a, i) => (
          <div key={`${a.addonProductId}-${i}`} className="grid grid-cols-[1fr_9.5rem_5.5rem_auto] gap-2 items-end">
            <Select label={i === 0 ? 'Product' : undefined} options={choices(a.addonProductId)} value={a.addonProductId} onChange={(e) => setRow(i, { addonProductId: e.target.value })} />
            <Select
              label={i === 0 ? 'Type' : undefined}
              options={[
                { value: 'ADDON', label: 'Addon (paid)' },
                { value: 'COMPLEMENTARY', label: 'Complementary' },
              ]}
              value={a.kind}
              onChange={(e) => setRow(i, { kind: e.target.value as AddonKind, price: e.target.value === 'COMPLEMENTARY' ? '0' : a.price })}
            />
            <Input
              label={i === 0 ? 'Price ₹' : undefined}
              type="number"
              step="0.01"
              min="0"
              className="font-mono"
              disabled={a.kind === 'COMPLEMENTARY'}
              value={a.kind === 'COMPLEMENTARY' ? '0' : a.price}
              onChange={(e) => setRow(i, { price: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setAddons((rows) => rows.filter((_, idx) => idx !== i))}
              className="p-2 mb-0.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label="Remove addon"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!available}
        onClick={() => {
          const next = allProducts.find((p) => p.id !== editingId && !p.isBundle && !taken.has(p.id));
          if (next) setAddons((rows) => [...rows, { addonProductId: next.id, kind: 'ADDON', price: String(next.sellingPrice) }]);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-purple-400 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-40"
      >
        <Plus className="w-3.5 h-3.5" /> Add addon / complementary item
      </button>
    </div>
  );
}
