import { useEffect, useState } from 'react';
import { Button, Checkbox, Drawer, Input, Select, useToast } from '@pospe/ui-library';
import { usePrinterStore, type PrinterMode } from '../printing/printerStore';
import { listSystemPrinters, openCashDrawer, pairSerialPrinter, printReceipt, SUPPORTED_MODES } from '../printing/transport';

const MODE_LABELS: Record<PrinterMode, string> = {
  browser: 'Browser print dialog',
  serial: 'USB thermal printer (ESC/POS)',
  network: 'Network thermal printer (ESC/POS, TCP 9100)',
  system: 'Installed printer (silent)',
};

export default function PrinterSettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = usePrinterStore();
  const { showToast } = useToast();
  const [systemPrinters, setSystemPrinters] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && settings.mode === 'system') listSystemPrinters().then(setSystemPrinters).catch(() => setSystemPrinters([]));
  }, [open, settings.mode]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      showToast(success, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Printer error', 'danger');
    } finally {
      setBusy(false);
    }
  }

  const testPrint = () =>
    run(async () => {
      const printed = await printReceipt(
        {
          storeName: 'PosPe Test Print',
          invoiceNumber: 'TEST-0001',
          cashier: 'Setup',
          register: 'Printer check',
          createdAt: new Date().toISOString(),
          items: [{ name: 'Sample item', quantity: 1, unitPrice: 10, lineTotal: 10 }],
          subtotal: 10,
          gst: 0.5,
          total: 10.5,
          method: 'Cash',
          footer: 'Printer is working.',
        },
        false,
      );
      if (!printed) window.print();
    }, 'Test page sent');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Receipt Printer"
      subtitle="Saved on this terminal"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="primary" className="flex-1" onClick={testPrint} disabled={busy}>
            Test Print
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Select
          label="Printer type"
          value={settings.mode}
          onChange={(e) => settings.update({ mode: e.target.value as PrinterMode })}
          options={SUPPORTED_MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }))}
        />

        {settings.mode === 'serial' && (
          <Button variant="secondary" onClick={() => run(pairSerialPrinter, 'Printer paired')} disabled={busy}>
            Pair USB printer…
          </Button>
        )}

        {settings.mode === 'network' && (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Printer IP / hostname" placeholder="192.168.1.50" value={settings.host} onChange={(e) => settings.update({ host: e.target.value.trim() })} />
            </div>
            <Input label="Port" type="number" value={settings.port} onChange={(e) => settings.update({ port: Number(e.target.value) || 9100 })} />
          </div>
        )}

        {settings.mode === 'system' && (
          <Select
            label="Installed printer"
            value={settings.systemPrinter}
            onChange={(e) => settings.update({ systemPrinter: e.target.value })}
            options={[{ value: '', label: 'System default printer' }, ...systemPrinters.map((p) => ({ value: p, label: p }))]}
          />
        )}

        {(settings.mode === 'serial' || settings.mode === 'network') && (
          <>
            <Select
              label="Paper width"
              value={String(settings.paperWidth)}
              onChange={(e) => settings.update({ paperWidth: e.target.value === '58' ? 58 : 80 })}
              options={[
                { value: '80', label: '80 mm (48 columns)' },
                { value: '58', label: '58 mm (32 columns)' },
              ]}
            />
            <Checkbox
              label="Open cash drawer on cash sales"
              checked={settings.openDrawerOnCash}
              onChange={(e) => settings.update({ openDrawerOnCash: e.target.checked })}
            />
            <Button variant="secondary" onClick={() => run(openCashDrawer, 'Drawer opened')} disabled={busy}>
              Open cash drawer now
            </Button>
          </>
        )}

        <Checkbox label="Print automatically after each sale" checked={settings.autoPrint} onChange={(e) => settings.update({ autoPrint: e.target.checked })} />
      </div>
    </Drawer>
  );
}
