import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Checkbox, GlassCard, Input, useToast } from '@pospe/ui-library';
import { createHsnCode, getHsnCode, updateHsnCode, type LiveHsnCode } from '../../services/api/hsnCodes';
import { apiErrorMessage } from '../auth/session';
import PageShell, { cancelButtonClass, primaryButtonClass } from '../purchases/PageShell';

// Quick picks for the usual GST slabs; any other rate can still be typed.
const COMMON_RATES = [0, 5, 12, 18, 28];

/** Add / edit an HSN or SAC code and its GST rate (/inventory/hsn-codes/new, /:id/edit). */
export default function HsnCodeFormPage() {
  const { id } = useParams<{ id: string }>();
  const editingId = id ?? null;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(Boolean(editingId));
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<LiveHsnCode | null>(null);
  const [form, setForm] = useState({ code: '', description: '', gstRate: '', isActive: true });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await getHsnCode(editingId);
        if (cancelled) return;
        setExisting(row);
        setForm({ code: row.code, description: row.description, gstRate: String(row.gstRate), isActive: row.isActive });
      } catch (err) {
        if (cancelled) return;
        if (/not found/i.test(String((err as Error)?.message))) setMissing(true);
        else showToast(apiErrorMessage(err, 'Could not load the HSN code'), 'danger');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const rate = Number(form.gstRate);
  const rateChanged = existing && form.gstRate !== '' && rate !== existing.gstRate;
  const codeChanged = existing && form.code.trim() !== existing.code;
  const affected = existing?.productCount ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{2,8}$/.test(form.code.trim())) {
      showToast('HSN / SAC code must be 2 to 8 digits.', 'danger');
      return;
    }
    if (!form.description.trim()) {
      showToast('Add a short description.', 'danger');
      return;
    }
    if (form.gstRate === '' || !(rate >= 0 && rate <= 100)) {
      showToast('Enter a GST rate between 0 and 100.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const input = { code: form.code.trim(), description: form.description.trim(), gstRate: rate, isActive: form.isActive };
      if (editingId) await updateHsnCode(editingId, input);
      else await createHsnCode(input);
      showToast('HSN code saved', 'success');
      navigate('/inventory/hsn-codes');
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not save the HSN code'), 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      backTo="/inventory/hsn-codes"
      backLabel="Back to HSN & GST"
      title={editingId ? 'Edit HSN Code' : 'Add HSN Code'}
      subtitle="The GST rate set here applies to every product using this code."
      width="md"
      footer={
        <>
          <Link to="/inventory/hsn-codes" className={cancelButtonClass}>
            Cancel
          </Link>
          <button type="submit" form="hsn-form" disabled={saving || loading || missing} className={primaryButtonClass}>
            {saving ? 'Saving…' : 'Save HSN Code'}
          </button>
        </>
      }
    >
      {loading ? (
        <GlassCard>
          <p className="text-center text-xs text-slate-400 py-10">Loading…</p>
        </GlassCard>
      ) : missing ? (
        <GlassCard>
          <p className="text-center text-sm font-bold text-slate-600 dark:text-slate-300 py-10">This HSN code no longer exists.</p>
        </GlassCard>
      ) : (
        <form id="hsn-form" onSubmit={handleSubmit} noValidate>
          <GlassCard className="!p-6 space-y-4">
            <Input
              label="HSN / SAC Code"
              required
              inputMode="numeric"
              placeholder="e.g. 19059090"
              className="font-mono"
              value={form.code}
              onChange={(e) => set({ code: e.target.value.replace(/\D/g, '').slice(0, 8) })}
              hint="Digits only, 2 to 8 long."
            />
            <Input label="Description" required placeholder="e.g. Bakery products" value={form.description} onChange={(e) => set({ description: e.target.value })} />

            <div className="space-y-1.5">
              <Input label="GST Rate (%)" required type="number" min={0} max={100} step="0.01" className="font-mono" value={form.gstRate} onChange={(e) => set({ gstRate: e.target.value })} />
              <div className="flex flex-wrap gap-1.5">
                {COMMON_RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set({ gstRate: String(r) })}
                    className={
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ' +
                      (Number(form.gstRate) === r && form.gstRate !== ''
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-500')
                    }
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>

            <Checkbox label="Active (can be assigned to products)" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />

            {editingId && affected > 0 && (rateChanged || codeChanged) && (
              <div className="flex gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  {rateChanged ? 'Saving updates ' : 'Saving moves '}
                  <b>
                    {affected} product{affected === 1 ? '' : 's'}
                  </b>{' '}
                  to {rateChanged ? `${rate}% GST` : `code ${form.code.trim()}`}. Invoices already issued keep the rate they were issued at.
                </p>
              </div>
            )}
          </GlassCard>
        </form>
      )}
    </PageShell>
  );
}
