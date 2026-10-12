import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard, Input, useToast } from '@pospe/ui-library';
import { createSupplier } from '../../services/api/purchaseOrders';
import PageShell, { cancelButtonClass, primaryButtonClass } from './PageShell';

/** Register a supplier vendor (/purchases/suppliers/new). */
export default function SupplierFormPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ companyName: '', contactPerson: '', phone: '', email: '', gstin: '' });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) {
      showToast('Company / vendor name is required.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const supplier = await createSupplier({
        name: form.companyName.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
      });
      showToast(`Registered supplier vendor "${supplier.companyName}"!`, 'success');
      navigate('/purchases?tab=suppliers');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not register supplier', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      backTo="/purchases?tab=suppliers"
      backLabel="Back to Purchase & Suppliers"
      title="Register Supplier Vendor"
      subtitle="Add supplier contact details, phone, and GSTIN."
      width="md"
      footer={
        <>
          <Link to="/purchases?tab=suppliers" className={cancelButtonClass}>
            Cancel
          </Link>
          <button type="submit" form="supplier-form" disabled={saving} className={primaryButtonClass}>
            {saving ? 'Saving…' : 'Save Supplier Vendor'}
          </button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit} noValidate>
        <GlassCard className="!p-6 space-y-4">
          <Input label="Company / Vendor Name" required placeholder="e.g. Amul Dairy India" value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact Person" placeholder="e.g. Rajesh Sharma" value={form.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} />
            <Input label="Phone Number" placeholder="+91 98201 12345" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email Address" type="email" placeholder="vendor@domain.com" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            <Input label="GSTIN Number" placeholder="24AAACA1234F1Z9" value={form.gstin} onChange={(e) => set({ gstin: e.target.value })} />
          </div>
        </GlassCard>
      </form>
    </PageShell>
  );
}
