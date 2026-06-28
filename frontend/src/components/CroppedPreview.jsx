import { useEffect, useRef, useState, useMemo } from 'react';

/**
 * Shows the actual cropped image based on preview URL + crop percentages.
 * Caches the loaded image and only re-draws when crop changes (not on every drag pixel).
 */
export default function CroppedPreview({ previewUrl, crop, label }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'

  // Round crop values to avoid unnecessary re-renders on tiny pixel changes
  const roundedCrop = useMemo(() => ({
    x: Math.round(crop.x * 10) / 10,
    y: Math.round(crop.y * 10) / 10,
    width: Math.round(crop.width * 10) / 10,
    height: Math.round(crop.height * 10) / 10,
  }), [crop.x, crop.y, crop.width, crop.height]);

  // Load image once per previewUrl
  useEffect(() => {
    if (!previewUrl) { setStatus('idle'); imgRef.current = null; return; }
    setStatus('loading');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; setStatus('ready'); };
    img.onerror = () => { imgRef.current = null; setStatus('error'); };
    img.src = previewUrl;
  }, [previewUrl]);

  // Re-crop only when image is ready AND crop changes (rounded)
  useEffect(() => {
    if (status !== 'ready' || !imgRef.current || !canvasRef.current) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const sx = Math.round((roundedCrop.x / 100) * img.naturalWidth);
    const sy = Math.round((roundedCrop.y / 100) * img.naturalHeight);
    const sw = Math.max(Math.round((roundedCrop.width / 100) * img.naturalWidth), 1);
    const sh = Math.max(Math.round((roundedCrop.height / 100) * img.naturalHeight), 1);

    canvas.width = sw;
    canvas.height = sh;
    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  }, [roundedCrop, status]);

  if (!previewUrl) return null;
  if (status === 'error') return null;

  return (
    <div className="mt-4">
      {label && <div className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">crop</span> {label}</div>}
      <div className="border-2 border-dashed border-primary/20 rounded-xl bg-surface-container-low min-h-[120px] flex items-center justify-center overflow-hidden">
        {status === 'ready' ? (
          <canvas ref={canvasRef} className="max-w-full h-auto block rounded-lg" />
        ) : (
          <div className="text-text-dim text-sm py-6 flex items-center gap-2"><span className="material-symbols-outlined animate-spin-slow">progress_activity</span> Generating cropped preview…</div>
        )}
      </div>
    </div>
  );
}