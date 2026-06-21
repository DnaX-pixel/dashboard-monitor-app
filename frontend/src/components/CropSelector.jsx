import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const CW = 960;
const CH = 540;

// Fullscreen uses higher resolution for clarity
const FW = 1920;
const FH = 1080;

export default function CropSelector({ previewUrl, crop, onChange }) {
  const canvasRef  = useRef(null);
  const fullCanvasRef = useRef(null);
  const imgRef     = useRef(null);
  const fullImgRef = useRef(null);
  const dragging   = useRef(false);
  const fullDragging = useRef(false);
  const startRef   = useRef({ x: 0, y: 0 });
  const boxRef     = useRef(null);
  const fullStartRef = useRef({ x: 0, y: 0 });
  const fullBoxRef = useRef(null);
  const [isMoving, setIsMoving] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullMoving, setFullMoving] = useState(false);

  const draw = useCallback((canvas, img, box, w, h) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    if (img) {
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
    }

    if (box && box.w > 2 && box.h > 2) {
      ctx.fillStyle = 'rgba(15,23,42,0.55)';
      ctx.fillRect(0,       0,       w,         box.y);
      ctx.fillRect(0,       box.y,     box.x,        box.h);
      ctx.fillRect(box.x+box.w, box.y,     w-box.x-box.w, box.h);
      ctx.fillRect(0,       box.y+box.h, w,          h-box.y-box.h);

      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth   = 3;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.setLineDash([]);

      ctx.fillStyle = '#6366f1';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth  = 2;
      const HS = 8;
      [[box.x, box.y], [box.x+box.w, box.y], [box.x, box.y+box.h], [box.x+box.w, box.y+box.h]].forEach(([hx, hy]) => {
        ctx.beginPath();
        ctx.arc(hx, hy, HS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      if (box.w > 60 && box.h > 40) {
        const wPct = ((box.w / w) * 100).toFixed(1);
        const hPct = ((box.h / h) * 100).toFixed(1);
        ctx.fillStyle = 'rgba(99,102,241,0.9)';
        const labelText = `${wPct}% x ${hPct}%`;
        ctx.font = 'bold 14px -apple-system, Segoe UI, Roboto, sans-serif';
        const tw = ctx.measureText(labelText).width;
        ctx.fillRect(box.x + 6, box.y + 6, tw + 16, 26);
        ctx.fillStyle = '#fff';
        ctx.fillText(labelText, box.x + 14, box.y + 24);
      }
    }
  }, []);

  const drawNormal = useCallback(() => draw(canvasRef.current, imgRef.current, boxRef.current, CW, CH), [draw]);
  const drawFull = useCallback(() => draw(fullCanvasRef.current, fullImgRef.current, fullBoxRef.current, FW, FH), [draw]);

  // Load image when previewUrl changes (both normal + fullscreen)
  useEffect(() => {
    if (!previewUrl) {
      imgRef.current = null;
      fullImgRef.current = null;
      drawNormal();
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      drawNormal();
      // Also load for fullscreen
      const fimg = new Image();
      fimg.onload = () => { fullImgRef.current = fimg; drawFull(); };
      fimg.src = previewUrl;
    };
    img.onerror = () => { imgRef.current = null; drawNormal(); };
    img.src = previewUrl;
  }, [previewUrl, drawNormal, drawFull]);

  // Sync box from crop prop (normal)
  useEffect(() => {
    if (!dragging.current && crop) {
      boxRef.current = {
        x: (crop.x / 100) * CW,
        y: (crop.y / 100) * CH,
        w: (crop.width  / 100) * CW,
        h: (crop.height / 100) * CH,
      };
      drawNormal();
    }
  }, [crop, drawNormal]);

  // Load fullscreen image + draw when fullscreen opens
  useEffect(() => {
    if (!fullscreen || !previewUrl) return;
    const img = new Image();
    img.onload = () => {
      fullImgRef.current = img;
      // Set box from current crop
      if (crop) {
        fullBoxRef.current = {
          x: (crop.x / 100) * FW,
          y: (crop.y / 100) * FH,
          w: (crop.width / 100) * FW,
          h: (crop.height / 100) * FH,
        };
      }
      drawFull();
    };
    img.src = previewUrl;
  }, [fullscreen, previewUrl, crop, drawFull]);

  function getPos(e, canvas, w, h) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(w, (e.clientX - r.left) * (w / r.width))),
      y: Math.max(0, Math.min(h, (e.clientY - r.top)  * (h / r.height))),
    };
  }

  // Normal canvas handlers
  function onMouseDown(e) {
    if (!previewUrl) return;
    const p = getPos(e, canvasRef.current, CW, CH);
    dragging.current = true;
    startRef.current = p;
    boxRef.current = { x: p.x, y: p.y, w: 0, h: 0 };
    setIsMoving(true);
    drawNormal();
  }
  function onMouseMove(e) {
    if (!dragging.current) return;
    const p = getPos(e, canvasRef.current, CW, CH);
    boxRef.current = {
      x: Math.min(startRef.current.x, p.x),
      y: Math.min(startRef.current.y, p.y),
      w: Math.abs(p.x - startRef.current.x),
      h: Math.abs(p.y - startRef.current.y),
    };
    drawNormal();
  }
  function onMouseUp() {
    if (!dragging.current) return;
    dragging.current = false;
    setIsMoving(false);
    const b = boxRef.current;
    if (b && b.w > 5 && b.h > 5) {
      onChange({
        x: (b.x / CW) * 100, y: (b.y / CH) * 100,
        width: (b.w / CW) * 100, height: (b.h / CH) * 100,
      });
    }
  }

  // Fullscreen canvas handlers
  function onFullMouseDown(e) {
    const p = getPos(e, fullCanvasRef.current, FW, FH);
    fullDragging.current = true;
    fullStartRef.current = p;
    fullBoxRef.current = { x: p.x, y: p.y, w: 0, h: 0 };
    setFullMoving(true);
    drawFull();
  }
  function onFullMouseMove(e) {
    if (!fullDragging.current) return;
    const p = getPos(e, fullCanvasRef.current, FW, FH);
    fullBoxRef.current = {
      x: Math.min(fullStartRef.current.x, p.x),
      y: Math.min(fullStartRef.current.y, p.y),
      w: Math.abs(p.x - fullStartRef.current.x),
      h: Math.abs(p.y - fullStartRef.current.y),
    };
    drawFull();
  }
  function onFullMouseUp() {
    if (!fullDragging.current) return;
    fullDragging.current = false;
    setFullMoving(false);
    const b = fullBoxRef.current;
    if (b && b.w > 5 && b.h > 5) {
      onChange({
        x: (b.x / FW) * 100, y: (b.y / FH) * 100,
        width: (b.w / FW) * 100, height: (b.h / FH) * 100,
      });
    }
  }

  return (
    <>
      <div className={`crop-canvas-wrap ${!previewUrl ? 'empty' : ''}`}>
        {previewUrl && (
          <button className="btn btn-sm fullscreen-btn" onClick={() => setFullscreen(true)} title="Crop in fullscreen">
            <Icon name="fullscreen" size={14} /> Fullscreen
          </button>
        )}
        <canvas
          ref={canvasRef}
          width={CW} height={CH}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ opacity: isMoving ? 0.95 : 1 }}
        />
        {!previewUrl && (
          <div className="crop-empty">
            <span className="crop-icon">Screenshot Preview</span>
            <span>Enter a URL above and click Preview to load the page</span>
          </div>
        )}
      </div>

      {/* Fullscreen overlay — rendered via portal to escape parent backdrop-filter */}
      {fullscreen && createPortal(
        <div className="crop-fullscreen-overlay">
          <div className="crop-fullscreen-header">
            <span className="crop-fullscreen-title"><Icon name="fullscreen" size={14} /> Fullscreen Crop Mode</span>
            <div className="crop-fullscreen-actions">
              <span className="crop-fullscreen-hint">Drag to select crop area · click outside or Done to close</span>
              <button className="btn btn-sm btn-primary" onClick={() => setFullscreen(false)}><Icon name="check" size={14} /> Done</button>
            </div>
          </div>
          <div className="crop-fullscreen-canvas-wrap" onClick={(e) => e.target === e.currentTarget && setFullscreen(false)}>
            <canvas
              ref={fullCanvasRef}
              width={FW} height={FH}
              onMouseDown={onFullMouseDown}
              onMouseMove={onFullMouseMove}
              onMouseUp={onFullMouseUp}
              onMouseLeave={onFullMouseUp}
              style={{ opacity: fullMoving ? 0.95 : 1 }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}