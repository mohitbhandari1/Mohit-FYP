'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Reusable image uploader with drag & drop + drag-to-position + zoom ─────
// The crop area is locked to `aspect` (e.g. 16/9 for banners, 1/1 for logos).
// Users drag the image to reposition it and zoom with the slider, scroll wheel
// or +/- buttons. The exported file is cropped to exactly that shape.

interface CropState { zoom: number; x: number; y: number; }
interface LoadedImage { src: string; w: number; h: number; name: string; type: string; }

interface ImageCropperProps {
  /** Crop shape as width/height ratio — 16/9 for banners, 1 for logos. */
  aspect?: number;
  /** Existing image URL shown until the user picks a new one. */
  currentUrl?: string;
  /** Called with the cropped File (or null when removed). */
  onChange: (file: File | null) => void;
  /** Max width of the exported image (never upscaled beyond the source). */
  outputMaxWidth?: number;
  /** Max accepted upload size in MB. */
  maxFileMB?: number;
}

const MAX_ZOOM = 4;

export default function ImageCropper({
  aspect = 16 / 9,
  currentUrl,
  onChange,
  outputMaxWidth = 1920,
  maxFileMB = 15,
}: ImageCropperProps) {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [container, setContainer] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [panning, setPanning] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const initRef = useRef<string | null>(null);

  const hasImg = !!img;

  // Measure the crop container so pan/zoom math matches what the user sees.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainer({ w: rect.width, h: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasImg]);

  const coverScale = useCallback((i: LoadedImage, c: { w: number; h: number }) => {
    return Math.max(c.w / i.w, c.h / i.h);
  }, []);

  const clampCrop = useCallback(
    (c: CropState): CropState => {
      if (!img || container.w === 0) return c;
      const scale = coverScale(img, container) * c.zoom;
      const dispW = img.w * scale;
      const dispH = img.h * scale;
      return {
        zoom: c.zoom,
        x: Math.min(0, Math.max(container.w - dispW, c.x)),
        y: Math.min(0, Math.max(container.h - dispH, c.y)),
      };
    },
    [img, container, coverScale]
  );

  // Center the image once when a new image finishes loading.
  useEffect(() => {
    if (!img || container.w === 0 || initRef.current === img.src) return;
    initRef.current = img.src;
    const scale = coverScale(img, container);
    setCrop({
      zoom: 1,
      x: (container.w - img.w * scale) / 2,
      y: (container.h - img.h * scale) / 2,
    });
  }, [img, container, coverScale]);

  // Keep the image covering the frame if the container resizes.
  useEffect(() => {
    if (!img || container.w === 0) return;
    setCrop((prev) => clampCrop(prev));
  }, [container, img, clampCrop]);

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please choose an image file (JPG, PNG, WebP, GIF...).');
        return;
      }
      if (file.size > maxFileMB * 1024 * 1024) {
        setError(`Image is too large — the maximum is ${maxFileMB} MB.`);
        return;
      }
      setError('');
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        setImg((prev) => {
          if (prev) URL.revokeObjectURL(prev.src);
          return {
            src: url,
            w: image.naturalWidth,
            h: image.naturalHeight,
            name: file.name,
            type: file.type,
          };
        });
        initRef.current = null;
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        setError('Could not read that image — try a different file.');
      };
      image.src = url;
    },
    [maxFileMB]
  );

  const removeImage = useCallback(() => {
    setImg((prev) => {
      if (prev) URL.revokeObjectURL(prev.src);
      return null;
    });
    initRef.current = null;
    setCrop({ zoom: 1, x: 0, y: 0 });
    setPreviewUrl(null);
    onChange(null);
  }, [onChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  };

  // Zoom so that the point under (px, py) stays fixed.
  const applyZoom = useCallback(
    (px: number, py: number, nextZoom: number) => {
      if (!img || container.w === 0) return;
      setCrop((prev) => {
        const base = coverScale(img, container);
        const z = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
        const s0 = base * prev.zoom;
        const s1 = base * z;
        if (Math.abs(s0 - s1) < 0.001) return prev;
        const ix = (px - prev.x) / s0;
        const iy = (py - prev.y) / s0;
        return clampCrop({ zoom: z, x: px - ix * s1, y: py - iy * s1 });
      });
    },
    [img, container, coverScale, clampCrop]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      if (!img || container.w === 0) return;
      const px = container.w / 2;
      const py = container.h / 2;
      applyZoom(px, py, crop.zoom * factor);
    },
    [img, container, crop.zoom, applyZoom]
  );

  const resetCrop = useCallback(() => {
    if (!img) return;
    const scale = coverScale(img, container);
    setCrop({
      zoom: 1,
      x: (container.w - img.w * scale) / 2,
      y: (container.h - img.h * scale) / 2,
    });
  }, [img, container, coverScale]);

  // Scroll-wheel zoom (native listener so we can prevent page scroll).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setCrop((prev) => {
        const base = coverScale(img!, container);
        const z = Math.min(MAX_ZOOM, Math.max(1, prev.zoom * factor));
        const s0 = base * prev.zoom;
        const s1 = base * z;
        if (Math.abs(s0 - s1) < 0.001) return prev;
        const ix = (px - prev.x) / s0;
        const iy = (py - prev.y) / s0;
        return clampCrop({ zoom: z, x: px - ix * s1, y: py - iy * s1 });
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [img, container, coverScale, clampCrop]);

  // Export the cropped image whenever the crop changes (debounced).
  useEffect(() => {
    if (!img || container.w === 0) return;
    const timer = setTimeout(() => {
      const base = coverScale(img, container);
      const scale = base * crop.zoom;
      const visibleW = container.w / scale; // visible width in source pixels
      const outW = Math.max(1, Math.min(outputMaxWidth, Math.round(visibleW)));
      const outH = Math.max(1, Math.round(outW / aspect));
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const isJpeg = img.type === 'image/jpeg' || img.type === 'image/jpg';
      if (isJpeg) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
      }
      const image = new Image();
      image.onload = () => {
        const s = outW / container.w; // container px → output px
        ctx.drawImage(image, -crop.x * s, -crop.y * s, img.w * scale * s, img.h * scale * s);
        const outType = isJpeg ? 'image/jpeg' : img.type === 'image/webp' ? 'image/webp' : 'image/png';
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const baseName = img.name.replace(/\.[^.]+$/, '') || 'image';
            const ext = outType === 'image/jpeg' ? '.jpg' : outType === 'image/webp' ? '.webp' : '.png';
            onChange(new File([blob], `${baseName}-cropped${ext}`, { type: outType }));
          },
          outType,
          0.92
        );
        // Live preview of the exact image that will be uploaded.
        const previewScale = 0.25;
        const pv = document.createElement('canvas');
        pv.width = Math.max(1, Math.round(outW * previewScale));
        pv.height = Math.max(1, Math.round(outH * previewScale));
        const pctx = pv.getContext('2d');
        if (pctx) {
          pctx.drawImage(canvas, 0, 0, pv.width, pv.height);
          setPreviewUrl(pctx.canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', 0.8));
        }
      };
      image.src = img.src;
    }, 120);
    return () => clearTimeout(timer);
  }, [img, crop, container, aspect, outputMaxWidth, onChange, coverScale]);

  const scale = img ? coverScale(img, container) * crop.zoom : 1;
  const dispW = img ? img.w * scale : 0;
  const dispH = img ? img.h * scale : 0;

  const ratioLabel = `${Math.round(aspect * 100) / 100}:1`;

  const panHandlers = img
    ? {
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          panRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            originX: crop.x,
            originY: crop.y,
          };
          setPanning(true);
        },
        onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
          if (!panRef.current) return;
          const dx = e.clientX - panRef.current.startX;
          const dy = e.clientY - panRef.current.startY;
          setCrop((prev) =>
            clampCrop({
              ...prev,
              x: panRef.current!.originX + dx,
              y: panRef.current!.originY + dy,
            })
          );
        },
        onPointerUp: () => { panRef.current = null; setPanning(false); },
        onPointerCancel: () => { panRef.current = null; setPanning(false); },
      }
    : {};

  // ─── Dropzone: nothing selected yet ───
  if (!img && !currentUrl) {
    return (
      <div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all ${
            dragging
              ? 'border-amber-500/60 bg-amber-500/10'
              : 'border-white/15 bg-white/[0.02] hover:border-amber-500/40 hover:bg-white/[0.04]'
          }`}
        >
          <svg className="w-10 h-10 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium text-slate-300">Drag &amp; drop your image here</p>
          <p className="text-xs text-slate-500">or click to browse — {ratioLabel} shape</p>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  // ─── Existing image, no new upload yet ───
  if (!img && currentUrl) {
    return (
      <div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <div className="rounded-xl overflow-hidden border border-white/10 relative">
          <img src={currentUrl} alt="Current image" className="w-full object-cover" style={{ aspectRatio: `${aspect}` }} />
          <span className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-medium tracking-wide bg-slate-950/70 text-slate-300 border border-white/10">
            {ratioLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload a new image
        </button>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    );
  }

  // ─── Cropper: image selected, drag + zoom to position it ───
  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Crop frame */}
      <div
        ref={containerRef}
        {...panHandlers}
        className="relative overflow-hidden rounded-xl border border-white/15 bg-slate-900/80 select-none"
        style={{ aspectRatio: `${aspect}`, touchAction: 'none', cursor: panning ? 'grabbing' : 'grab' }}
      >
        {img && (
          <img
            src={img.src}
            alt=""
            draggable={false}
            className="absolute max-w-none pointer-events-none"
            style={{ left: crop.x, top: crop.y, width: dispW, height: dispH }}
          />
        )}
        {/* Crop frame overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-white/25" />
        <span className="pointer-events-none absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-medium tracking-wide bg-slate-950/70 text-slate-300 border border-white/10">
          {ratioLabel}
        </span>
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] text-slate-300 bg-slate-950/70 border border-white/10 whitespace-nowrap">
          Drag to reposition · Scroll or pinch to zoom
        </span>
      </div>

      {/* Live preview of the final upload */}
      {previewUrl && (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-400 mb-1.5">Final preview — this is exactly what gets uploaded</p>
          <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900/60">
            <img src={previewUrl} alt="Final crop preview" className="w-full block" />
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.15)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-amber-400 transition-all"
          aria-label="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          onChange={(e) => {
            const px = container.w / 2;
            const py = container.h / 2;
            applyZoom(px, py, Number(e.target.value));
          }}
          className="flex-1 accent-amber-500"
          aria-label="Zoom"
        />
        <button
          type="button"
          onClick={() => zoomBy(1.15)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-amber-400 transition-all"
          aria-label="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span className="w-12 text-right text-xs text-slate-400 tabular-nums">{Math.round(crop.zoom * 100)}%</span>
      </div>

      {/* Actions */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all"
        >
          Change image
        </button>
        <button
          type="button"
          onClick={resetCrop}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={removeImage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-all ml-auto"
        >
          Remove
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
