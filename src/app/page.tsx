"use client";
/* eslint-disable @next/next/no-img-element -- previews are browser-generated canvas data URLs. */

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

type RatioKey = "4:5" | "3:4" | "1:1";
type Background = "blur" | "white" | "black" | "color" | "custom";
type Dimensions = { width: number; height: number };
type Photo = { id: string; name: string; file: File; preview?: string; dominant?: string };
type DecodedImage = { source: CanvasImageSource; width: number; height: number; close?: () => void };

const ratios: Record<RatioKey, { width: number; height: number; label: string }> = {
  "4:5": { width: 1080, height: 1350, label: "Portrait · 1080 × 1350" },
  "3:4": { width: 1080, height: 1440, label: "Tall · 1080 × 1440" },
  "1:1": { width: 1080, height: 1080, label: "Square · 1080 × 1080" },
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function getAverageColor(image: CanvasImageSource) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 24;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#8b8376";
  ctx.drawImage(image, 0, 0, 24, 24);
  const data = ctx.getImageData(0, 0, 24, 24).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) { if (data[i + 3] > 20) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; } }
  return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
      element.src = objectUrl;
    });
    return { source: image, width: image.width, height: image.height };
  } finally { URL.revokeObjectURL(objectUrl); }
}

async function drawProcessed(photo: Photo, dimensions: Dimensions, background: Background, blur: number, padding: number, customBackground: string) {
  const image = await decodeImage(photo.file);
  try {
      const { width, height } = dimensions;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported by this browser.");
      const dominant = getAverageColor(image.source);
      if (background === "blur") {
        const scale = Math.max(width / image.width, height / image.height);
        const bw = image.width * scale, bh = image.height * scale;
        ctx.save(); ctx.filter = `blur(${blur}px)`;
        ctx.drawImage(image.source, (width - bw) / 2, (height - bh) / 2, bw, bh); ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = background === "white" ? "#ffffff" : background === "black" ? "#000000" : background === "custom" ? customBackground : dominant;
        ctx.fillRect(0, 0, width, height);
      }
      const inset = Math.round(Math.min(width, height) * padding / 100);
      const fit = Math.min((width - inset * 2) / image.width, (height - inset * 2) / image.height);
      const fw = image.width * fit, fh = image.height * fit;
      ctx.drawImage(image.source, (width - fw) / 2, (height - fh) / 2, fw, fh);
      return { preview: canvas.toDataURL("image/jpeg", 0.92), dominant };
  } finally { image.close?.(); }
}

function download(url: string, name: string) { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ratio, setRatioValue] = useState<RatioKey>("4:5");
  const [background, setBackground] = useState<Background>("blur");
  const [customBackground, setCustomBackground] = useState("#d9b9a6");
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState(720);
  const [customHeight, setCustomHeight] = useState(1080);
  const [blur, setBlur] = useState(24);
  const [padding, setPadding] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const selectedPhoto = photos.find((photo) => photo.id === selectedId) ?? photos[0];
  const outputWidth = useCustomSize ? customWidth : ratios[ratio].width;
  const outputHeight = useCustomSize ? customHeight : ratios[ratio].height;
  const dimensions = useMemo(() => ({ width: outputWidth, height: outputHeight }), [outputWidth, outputHeight]);
  const setRatio = (nextRatio: RatioKey) => { setUseCustomSize(false); setRatioValue(nextRatio); };

  useEffect(() => {
    document.documentElement.style.setProperty("--preview-aspect", `${outputWidth} / ${outputHeight}`);
  }, [outputWidth, outputHeight]);

  useEffect(() => {
    if (!photos.length) return;
    let active = true;
    Promise.all(photos.map(async p => ({ ...p, ...(await drawProcessed(p, dimensions, background, blur, padding, customBackground)) })))
      .then((next) => { if (active) setPhotos(next); })
      .catch((error: Error) => setNotice(`Processing failed: ${error.message}`));
    return () => { active = false; };
    // Image settings intentionally trigger a fresh local canvas render.
  }, [ratio, useCustomSize, customWidth, customHeight, background, customBackground, blur, padding]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const pending = photos.filter((photo) => !photo.preview);
    if (!pending.length) return;
    Promise.all(pending.map(async (photo) => ({ id: photo.id, ...(await drawProcessed(photo, dimensions, background, blur, padding, customBackground)) })))
      .then((rendered) => {
        setPhotos((current) => current.map((photo) => ({ ...photo, ...rendered.find((item) => item.id === photo.id) })));
      })
      .catch((error: Error) => setNotice(`Processing failed: ${error.message}`));
  }, [photos, dimensions, background, customBackground, blur, padding]);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter((f) => ACCEPTED.includes(f.type));
    const remaining = 20 - photos.length;
    if (!incoming.length) { setNotice("Please choose JPG, PNG, or WebP photos."); return; }
    if (incoming.length > remaining) setNotice(`Only ${Math.max(remaining, 0)} more photos can be added (20 maximum).`);
    const added = incoming.slice(0, remaining).map((file) => ({ id: crypto.randomUUID(), name: file.name, file }));
    setPhotos((current) => [...current, ...added]);
    setSelectedId((current) => current ?? added[0]?.id ?? null);
  }
  function onInput(event: ChangeEvent<HTMLInputElement>) { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }
  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }
  function remove(id: string) { setPhotos(current => current.filter(p => p.id !== id)); if (id === selectedId) setSelectedId(null); }
  async function zipAll() {
    const ready = photos.filter(p => p.preview);
    if (!ready.length) return;
    setIsZipping(true);
    try { const zip = new JSZip(); ready.forEach((p, i) => zip.file(`instagram-no-crop-${String(i + 1).padStart(2, "0")}.jpg`, p.preview!.split(",")[1], { base64: true })); const blob = await zip.generateAsync({ type: "blob" }); download(URL.createObjectURL(blob), "instagram-no-crop-carousel.zip"); }
    finally { setIsZipping(false); }
  }

  return <main>
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><a href="#top" className="font-display text-lg font-bold tracking-tight">NoCrop<span className="text-coral">.</span></a><a href="#how-it-works" className="text-sm font-medium text-stone-600 hover:text-stone-950">How it works</a></nav>
    <section id="top" className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:pb-24 md:pt-16">
      <div className="mx-auto max-w-3xl text-center"><p className="eyebrow">Free · private · browser-based</p><h1 className="mt-4 font-display text-4xl font-bold tracking-[-.045em] text-stone-950 sm:text-5xl md:text-6xl">Every photo fits.<br/><em className="font-normal">Nothing gets cropped.</em></h1><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">Make an Instagram carousel with different photo shapes, all perfectly sized. Your photos stay on your device.</p></div>
      <div className="tool-shell mt-10 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_24px_80px_rgba(50,42,31,.10)]">
        <div className="border-b border-stone-100 px-5 py-4 sm:px-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Create your carousel</h2><p className="mt-0.5 text-sm text-stone-500">Up to 20 photos · JPG, PNG or WebP</p></div><span className="privacy-pill">Photos never leave your device</span></div></div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_370px]">
          <div className="p-5 sm:p-7 lg:p-8">
            {photos.length === 0 ? <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop} onClick={() => input.current?.click()} className={`upload-zone flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center ${isDragging ? "border-coral bg-orange-50" : "border-stone-200 bg-stone-50"}`}><div className="upload-icon">↑</div><h3 className="mt-4 font-display text-xl font-semibold">Drop photos here</h3><p className="mt-2 max-w-xs text-sm leading-6 text-stone-500">or tap to choose from your device</p><button className="mt-5 rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-white">Choose photos</button></div> : <div className="preview-workspace"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-medium">{photos.length} of 20 photos</p><button onClick={() => input.current?.click()} className="text-sm font-semibold text-coral hover:underline">Add photos</button></div><div className="preview-layout"><div className="preview-stage" style={{ aspectRatio: `${ratios[ratio].width}/${ratios[ratio].height}` }}>{selectedPhoto?.preview ? <img src={selectedPhoto.preview} alt={`Processed preview ${photos.findIndex((photo) => photo.id === selectedPhoto.id) + 1}`} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-stone-400">Processing…</div>}<span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white">{photos.findIndex((photo) => photo.id === selectedPhoto?.id) + 1} / {photos.length}</span></div><div className="preview-thumbnails">{photos.map((photo, index) => <button onClick={() => setSelectedId(photo.id)} className={`thumbnail ${selectedPhoto?.id === photo.id ? "selected" : ""}`} key={photo.id} aria-label={`Preview photo ${index + 1}`}>{photo.preview ? <img src={photo.preview} alt={`Photo ${index + 1}`} /> : <span>…</span>}<span className="thumbnail-number">{index + 1}</span><span onClick={(event) => { event.stopPropagation(); remove(photo.id); }} role="button" tabIndex={0} aria-label={`Remove ${photo.name}`} className="thumbnail-remove">×</span></button>)}</div></div></div>}
            <input ref={input} onChange={onInput} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple className="hidden" />
            {notice && <p className="mt-4 text-sm text-coral" role="alert">{notice}</p>}
            <div className="custom-options mt-5">
              <div>
                <span className="control-label">Custom canvas</span>
                <p className="mt-1 text-xs leading-5 text-stone-500">Use any export size, such as 720 × 1080.</p>
              </div>
              <div className="custom-size-fields">
                <label><span>Width</span><input type="number" min="100" max="4096" value={customWidth} onChange={(event) => { setCustomWidth(Math.max(100, Math.min(4096, Number(event.target.value) || 100))); setUseCustomSize(true); }} /></label>
                <span className="custom-times">×</span>
                <label><span>Height</span><input type="number" min="100" max="4096" value={customHeight} onChange={(event) => { setCustomHeight(Math.max(100, Math.min(4096, Number(event.target.value) || 100))); setUseCustomSize(true); }} /></label>
              </div>
              <button onClick={() => setUseCustomSize(true)} className={`custom-size-button ${useCustomSize ? "selected" : ""}`}>{useCustomSize ? `Custom · ${dimensions.width} × ${dimensions.height}` : "Use custom size"}</button>
              <label className="custom-color"><span className="control-label">Custom background</span><input type="color" value={customBackground} onChange={(event) => { setCustomBackground(event.target.value); setBackground("custom"); }} /><span>{customBackground.toUpperCase()}</span></label>
            </div>
          </div>
          <aside className="border-t border-stone-100 bg-stone-50 p-5 sm:p-7 lg:border-l lg:border-t-0"><fieldset><legend className="control-label">Instagram size</legend><div className="mt-2 grid gap-2">{(Object.keys(ratios) as RatioKey[]).map(key => <button key={key} onClick={() => setRatio(key)} className={`ratio-button ${ratio === key ? "selected" : ""}`}><span className="font-semibold">{key}</span><span>{ratios[key].label}</span></button>)}</div></fieldset><fieldset className="mt-7"><legend className="control-label">Background</legend><div className="mt-2 grid grid-cols-2 gap-2">{(["blur", "white", "black", "color"] as Background[]).map(mode => <button key={mode} onClick={() => setBackground(mode)} className={`background-button ${background === mode ? "selected" : ""}`}><i className={`swatch ${mode}`}/>{mode === "blur" ? "Blurred photo" : mode === "color" ? "Image color" : mode[0].toUpperCase()+mode.slice(1)}</button>)}</div></fieldset>{background === "blur" && <label className="mt-7 block"><span className="control-label flex justify-between">Blur strength <b>{blur}px</b></span><input className="range mt-3" type="range" min="0" max="48" value={blur} onChange={e => setBlur(+e.target.value)} /></label>}<label className="mt-7 block"><span className="control-label flex justify-between">Image padding <b>{padding}%</b></span><input className="range mt-3" type="range" min="0" max="18" value={padding} onChange={e => setPadding(+e.target.value)} /></label><div className="mt-8 border-t border-stone-200 pt-5">{photos.length ? <><button onClick={zipAll} disabled={isZipping || photos.some(p => !p.preview)} className="w-full rounded-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{isZipping ? "Creating ZIP…" : "Download all as ZIP"}</button><div className="mt-3 grid grid-cols-2 gap-2">{photos.map((p, i) => <button disabled={!p.preview} onClick={() => p.preview && download(p.preview, `instagram-no-crop-${i+1}.jpg`)} className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-white disabled:opacity-40" key={p.id}>Download {i + 1}</button>)}</div></> : <p className="text-center text-sm leading-6 text-stone-500">Your ready-to-post images will appear here.</p>}</div></aside>
        </div>
      </div>
    </section>
    <section id="how-it-works" className="border-y border-stone-200 bg-white px-5 py-16 md:py-24"><div className="mx-auto max-w-6xl"><p className="eyebrow">Simple by design</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">How it works</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{[["01", "Add your photos", "Upload up to 20 JPG, PNG or WebP images from any device."], ["02", "Choose your look", "Pick an Instagram size and a background that matches your photos."], ["03", "Post with confidence", "Download individual images or the whole carousel as a ZIP."]].map(([n,t,d]) => <div key={n} className="border-t border-stone-300 pt-4"><span className="text-sm font-bold text-coral">{n}</span><h3 className="mt-4 font-display text-xl font-semibold">{t}</h3><p className="mt-2 leading-7 text-stone-600">{d}</p></div>)}</div></div></section>
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24"><div className="grid gap-10 md:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow">Made for carousels</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">Your pictures deserve the whole frame.</h2></div><div className="grid gap-7 sm:grid-cols-2">{[["No missing edges", "Every original photo is scaled to fit. We never crop the important parts."], ["Consistent posts", "Mix portrait, landscape and square images while keeping one polished Instagram format."], ["Private by default", "Canvas processing happens locally in your browser. No upload, account or waiting."], ["Ready at 1080px", "Export sharp, Instagram-ready images in 4:5, 3:4, or 1:1 formats."]].map(([t,d]) => <div key={t}><h3 className="font-display text-lg font-semibold">{t}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{d}</p></div>)}</div></div></section>
    <section className="bg-stone-950 px-5 py-16 text-stone-100 md:py-24"><div className="mx-auto max-w-3xl"><p className="eyebrow text-orange-300">Questions, answered</p><h2 className="mt-3 font-display text-3xl font-semibold">FAQ</h2><div className="mt-8 divide-y divide-stone-700">{[["Will my images be cropped?", "Never. Your original image is always fitted fully inside the selected Instagram canvas."], ["Are my photos uploaded anywhere?", "No. All processing uses your browser’s Canvas API on your device. Your files never leave it."], ["Which Instagram carousel aspect ratio should I use?", "4:5 is a popular portrait format. Choose 3:4 for taller images, or 1:1 for a square carousel."], ["Can I download all photos at once?", "Yes. Use Download all as ZIP to get all your processed images in a single folder."]].map(([q,a]) => <details key={q} className="group py-5"><summary className="flex cursor-pointer list-none justify-between font-medium">{q}<span className="ml-4 text-coral group-open:rotate-45">+</span></summary><p className="max-w-2xl pt-3 leading-7 text-stone-400">{a}</p></details>)}</div></div></section>
    <footer className="bg-stone-950 px-5 pb-8 pt-2 text-sm text-stone-500"><div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-stone-800 pt-7 sm:flex-row sm:justify-between"><span className="font-display font-semibold text-stone-100">NoCrop<span className="text-coral">.</span></span><span>Free Instagram carousel no-crop maker · Your photos stay private.</span></div></footer>
  </main>;
}
