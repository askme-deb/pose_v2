import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { Scan, AlertTriangle } from 'lucide-react';
import { Drawer } from '@pospe/ui-library';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

export default function BarcodeScannerModal({ open, onClose, onDetected }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  // Kept in a ref so the scan effect only restarts when the drawer opens or
  // closes, not on every render the parent happens to re-create the callback.
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, err, controls) => {
        controlsRef.current = controls;
        if (cancelled || !result) return;
        controls.stop();
        onDetectedRef.current(result.getText());
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Camera unavailable');
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  return (
    <Drawer open={open} onClose={onClose} title="Scan Barcode / QR" width="sm">
      {error ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
          <p className="text-[11px] text-slate-400">
            Allow camera access and try again, or search / enter the SKU manually.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Scan className="w-10 h-10 text-white/70 animate-pulse" />
            </div>
          </div>
          <p className="text-[11px] text-center text-slate-400">Point the camera at a barcode or QR code.</p>
        </div>
      )}
    </Drawer>
  );
}
