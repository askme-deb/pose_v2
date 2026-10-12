import { useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Select } from '@pospe/ui-library';
import { formatINR } from '../../utils/format';
import type { LiveProduct } from '../../services/api/products';

export interface POLineItem {
  productId: string;
  /** Variation option (required when the product has variations). */
  optionId: string;
  qty: number;
  unitPrice: number;
}

interface Props {
  items: POLineItem[];
  products: LiveProduct[];
  onChange: (items: POLineItem[]) => void;
}

export const lineTotal = (items: POLineItem[]): number => items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

/** A new line for `product`: its first option when it has variations, at that option's (or the product's) cost. */
export function newLine(product?: LiveProduct): POLineItem {
  const option = product?.options[0];
  return { productId: product?.id ?? '', optionId: option?.id ?? '', qty: 1, unitPrice: option?.costPrice || product?.costPrice || 0 };
}

export default function LineItemsEditor({ items, products, onChange }: Props) {
  const productOptions = useMemo(() => products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })), [products]);
  const productsById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const updateItem = (idx: number, patch: Partial<POLineItem>) => onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Order Line Items *</p>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const product = productsById[item.productId];
          const hasOptions = (product?.options.length ?? 0) > 0;
          return (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className={hasOptions ? 'col-span-4' : 'col-span-6'}>
                <Select
                  label={idx === 0 ? 'Product' : undefined}
                  options={productOptions}
                  value={item.productId}
                  onChange={(e) => updateItem(idx, { ...newLine(productsById[e.target.value]), qty: item.qty })}
                />
              </div>
              {hasOptions && (
                <div className="col-span-2">
                  <Select
                    label={idx === 0 ? product?.variationName || 'Option' : undefined}
                    options={product!.options.map((o) => ({ value: o.id, label: o.name }))}
                    value={item.optionId}
                    onChange={(e) => {
                      const option = product!.options.find((o) => o.id === e.target.value);
                      updateItem(idx, { optionId: e.target.value, unitPrice: option?.costPrice || item.unitPrice });
                    }}
                  />
                </div>
              )}
              <div className="col-span-2">
                <Input label={idx === 0 ? 'Qty' : undefined} type="number" min={1} value={item.qty} onChange={(e) => updateItem(idx, { qty: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} />
              </div>
              <div className="col-span-3">
                <Input label={idx === 0 ? 'Unit Price' : undefined} type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
              <div className="col-span-1 flex justify-center pb-2">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-rose-600 hover:text-white transition"
                  aria-label="Remove line"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...items, newLine(products[0])])}>
        <Plus className="w-3.5 h-3.5" /> Add Line Item
      </Button>
      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Running Total</span>
        <span className="text-sm font-black text-slate-900 dark:text-white">{formatINR(lineTotal(items))}</span>
      </div>
    </div>
  );
}
