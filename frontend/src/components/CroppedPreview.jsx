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
    <div className="cropped-preview-wrap">
      {label && <div className="cropped-preview-label">{label}</div>}
      <div className="cropped-preview-box">
        {status === 'ready' ? (
          <canvas ref={canvasRef} className="cropped-preview-canvas" />
        ) : (
          <div className="cropped-preview-loading">Generating cropped preview…</div>
        )}
      </div>
    </div>
  );
}