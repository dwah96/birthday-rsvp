import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Loader2, ImagePlay, Share2 } from "lucide-react";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

type CropConfig = {
  mode: "cover" | "fit";
  zoom: number;
  offsetX: number;
  offsetY: number;
};

function getCropPlacement(
  imgW: number,
  imgH: number,
  targetW: number,
  targetH: number,
  config: CropConfig,
) {
  let scale =
    config.mode === "cover"
      ? Math.max(targetW / imgW, targetH / imgH)
      : Math.min(targetW / imgW, targetH / imgH);

  scale *= config.zoom;

  const drawW = imgW * scale;
  const drawH = imgH * scale;

  const x = (targetW - drawW) / 2 + config.offsetX * targetW;
  const y = (targetH - drawH) / 2 + config.offsetY * targetH;

  return { x, y, drawW, drawH };
}

function clampCropConfig(
  imgW: number,
  imgH: number,
  targetW: number,
  targetH: number,
  config: CropConfig,
): CropConfig {
  const zoom = Math.max(0.5, Math.min(3, config.zoom));
  const placement = getCropPlacement(imgW, imgH, targetW, targetH, {
    ...config,
    zoom,
  });

  const maxOffsetX = Math.max(0, (placement.drawW - targetW) / (2 * targetW));
  const maxOffsetY = Math.max(0, (placement.drawH - targetH) / (2 * targetH));

  return {
    ...config,
    zoom,
    offsetX: Math.max(-maxOffsetX, Math.min(maxOffsetX, config.offsetX)),
    offsetY: Math.max(-maxOffsetY, Math.min(maxOffsetY, config.offsetY)),
  };
}

export default function InvitationGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ w: 1, h: 1 });
  const [cropConfig, setCropConfig] = useState({
    mode: "cover" as "cover" | "fit",
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [generatedResult, setGeneratedResult] = useState<{
    url: string;
    file: File;
    type: "png" | "gif";
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, offX: 0, offY: 0 });
  const previewRef = React.useRef<HTMLDivElement>(null);
  const cropConfigRef = React.useRef<CropConfig>(cropConfig);

  const activePointersRef = React.useRef(new Map<number, { x: number; y: number }>());
  const initialPinchRef = React.useRef({ distance: 0, zoom: 1 });

  useEffect(() => {
    cropConfigRef.current = cropConfig;
  }, [cropConfig]);

  const getPreviewTargetSize = () => ({
    width: previewRef.current?.clientWidth || 315,
    height: previewRef.current?.clientHeight || 308,
  });

  const updateCropConfig = (updater: CropConfig | ((current: CropConfig) => CropConfig)) => {
    setCropConfig((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      const { width, height } = getPreviewTargetSize();
      return clampCropConfig(imageSize.w, imageSize.h, width, height, next);
    });
    setGeneratedResult(null);
  };

  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!customImage) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pointers = Array.from(activePointersRef.current.values()) as { x: number; y: number }[];

    if (pointers.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: pointers[0].x,
        y: pointers[0].y,
        offX: cropConfigRef.current.offsetX,
        offY: cropConfigRef.current.offsetY,
      };
    } else if (pointers.length === 2) {
      setIsDragging(false); // Stop single-finger drag
      const dist = calculateDistance(pointers[0], pointers[1]);
      initialPinchRef.current = {
        distance: dist,
        zoom: cropConfigRef.current.zoom,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!customImage) return;
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pointers = Array.from(activePointersRef.current.values()) as { x: number; y: number }[];

    if (pointers.length === 1 && isDragging) {
      const dx = pointers[0].x - dragStartRef.current.x;
      const dy = pointers[0].y - dragStartRef.current.y;

      const containerW = previewRef.current?.clientWidth || 315;
      const containerH = previewRef.current?.clientHeight || 308;

      let normDx = dx / containerW;
      let normDy = dy / containerH;

      updateCropConfig((c) => ({
        ...c,
        offsetX: dragStartRef.current.offX + normDx,
        offsetY: dragStartRef.current.offY + normDy,
      }));
    } else if (pointers.length === 2) {
      const dist = calculateDistance(pointers[0], pointers[1]);
      if (initialPinchRef.current.distance > 0) {
        const scale = dist / initialPinchRef.current.distance;
        let newZoom = initialPinchRef.current.zoom * scale;
        newZoom = Math.max(0.5, Math.min(3, newZoom));

        updateCropConfig((c) => ({
          ...c,
          zoom: newZoom,
        }));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const pointers = Array.from(activePointersRef.current.values()) as { x: number; y: number }[];
    if (pointers.length < 2) {
      initialPinchRef.current.distance = 0;
    }
    if (pointers.length === 1) {
      // Re-initialize drag for the remaining pointer
      setIsDragging(true);
      dragStartRef.current = {
        x: pointers[0].x,
        y: pointers[0].y,
        offX: cropConfigRef.current.offsetX,
        offY: cropConfigRef.current.offsetY,
      };
    } else if (pointers.length === 0) {
      setIsDragging(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!customImage) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    updateCropConfig((c) => ({
      ...c,
      zoom: c.zoom * zoomFactor,
    }));
  };

  const currentImageSrc = customImage;

  const previewTargetW = previewRef.current?.clientWidth || 315;
  const previewTargetH = previewRef.current?.clientHeight || 560 * 0.55; // 308
  const preCrop = getCropPlacement(
    imageSize.w,
    imageSize.h,
    previewTargetW,
    previewTargetH,
    cropConfig,
  );

  useEffect(() => {
    if (isOpen && currentImageSrc) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ w: img.width, h: img.height });
        setImageLoaded(true);
        setImageError(false);
      };
      img.onerror = () => {
        setImageError(true);
        setImageLoaded(false);
      };
      img.src = currentImageSrc;
    } else {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [isOpen, currentImageSrc]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomImage(url);
      setGeneratedResult(null);
      setCropConfig({ mode: "cover", zoom: 1, offsetX: 0, offsetY: 0 });
    }
  };

  const handleShareOrSave = async () => {
    if (!generatedResult) return;

    const shareData = {
      files: [generatedResult.file],
      title: "Sam 的邀請圖",
      text: "將邀請圖儲存到照片後，就可以分享到 Instagram。",
    };

    try {
      if (navigator.canShare?.(shareData) && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Share failed", err);
    }

    window.open(generatedResult.url, "_blank", "noopener,noreferrer");
    setDownloadMessage(
      "如果圖片開在新分頁，請長按圖片並選擇「儲存圖片」或「加入照片」。",
    );
  };

  const handleDirectDownload = () => {
    if (!generatedResult) return;

    const url = URL.createObjectURL(generatedResult.file);
    const link = document.createElement("a");
    link.href = url;
    link.download = generatedResult.file.name;
    link.rel = "noopener";
    link.style.display = "none";

    try {
      document.body.appendChild(link);
      link.click();
      setDownloadMessage(
        "下載已開始。如果沒有反應，請使用「分享／儲存到照片」，或用正式連結開啟。",
      );
    } catch (err) {
      console.error("Download failed", err);
      window.open(url, "_blank", "noopener,noreferrer");
      setDownloadMessage(
        "如果圖片開在新分頁，請右鍵或長按圖片並選擇「儲存圖片」。",
      );
    } finally {
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };

  const handleGenerateGif = async () => {
    setIsGeneratingGif(true);
    setDownloadMessage("正在產生動態 GIF，請稍等一下...");
    try {
      // Allow browser to render the "Generating..." message
      await new Promise((r) => setTimeout(r, 50));

      const width = 720;
      const height = 1280;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Could not get canvas context");

      const encoder = GIFEncoder();

      const frames = 30; // 3 seconds at 10fps

      // Load image first if not error
      let imgObj: HTMLImageElement | null = null;
      if (imageLoaded && !imageError) {
        try {
          imgObj = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = currentImageSrc;
          });
        } catch (e) {
          console.warn("Could not load image for GIF", e);
        }
      }

      for (let i = 0; i < frames; i++) {
        // Clear background
        ctx.fillStyle = "#FAF5EE";
        ctx.fillRect(0, 0, width, height);

        // Borders
        ctx.strokeStyle = "rgba(197, 161, 111, 0.3)";
        ctx.lineWidth = 3;
        ctx.strokeRect(24, 24, width - 48, height - 48);
        ctx.strokeStyle = "rgba(197, 161, 111, 0.1)";
        ctx.lineWidth = 3;
        ctx.strokeRect(32, 32, width - 64, height - 64);

        // Normalize time (t=0 to 1)
        const t = i / (frames - 1);

        // Image Fade In (t=0.1 to 0.4)
        const imgAlpha = Math.max(0, Math.min(1, (t - 0.1) / 0.3));

        if (imgObj && imgAlpha > 0) {
          const targetW = width;
          const targetH = height * 0.55;
          const { x, y, drawW, drawH } = getCropPlacement(
            imgObj.width,
            imgObj.height,
            targetW,
            targetH,
            cropConfig,
          );

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, targetW, targetH);
          ctx.clip();
          ctx.globalAlpha = imgAlpha * 0.9;
          ctx.drawImage(imgObj, x, y, drawW, drawH);
          ctx.globalAlpha = 1.0;
          ctx.restore();

          // Gradient Overlay
          const grad = ctx.createLinearGradient(0, 0, 0, targetH);
          grad.addColorStop(0, "rgba(250, 245, 238, 0)");
          grad.addColorStop(0.6, "rgba(250, 245, 238, 0)");
          grad.addColorStop(1, "rgba(250, 245, 238, 1)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, targetW, targetH);
        }

        // Text Drawing
        const textAlpha = Math.max(0, Math.min(1, (t - 0.4) / 0.3));
        const yOffset = (1 - textAlpha) * 20; // Slides up

        ctx.textAlign = "center";
        const startY = imgObj ? 720 : 500;

        const setLetterSpacing = (spacing: string) => {
          if ("letterSpacing" in ctx) {
            (ctx as any).letterSpacing = spacing;
          }
        };

        ctx.globalAlpha = textAlpha;

        if (textAlpha > 0) {
          // Invitation label
          setLetterSpacing("6px");
          ctx.fillStyle = "#C5A16F";
          ctx.font = "500 18px sans-serif";
          ctx.fillText("誠摯邀請", width / 2, startY + yOffset);

          // Sam title
          setLetterSpacing("-1px");
          ctx.fillStyle = "#1E1B15";
          ctx.font = "300 96px serif";
          ctx.fillText("Sam 的", width / 2, startY + 100 + yOffset);

          // Birthday line
          setLetterSpacing("2px");
          ctx.fillStyle = "#C5A16F";
          ctx.font = "400 48px sans-serif";
          ctx.fillText("22 歲的 10 週年紀念日", width / 2, startY + 180 + yOffset);

          // Line
          ctx.strokeStyle = "rgba(197, 161, 111, 0.3)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(220, startY + 240 + yOffset);
          ctx.lineTo(500, startY + 240 + yOffset);
          ctx.stroke();

          // Date header
          setLetterSpacing("3px");
          ctx.fillStyle = "#C5A16F";
          ctx.font = "600 22px serif";
          ctx.fillText("日期", width / 2, startY + 300 + yOffset);

          // Date value
          setLetterSpacing("0px");
          ctx.fillStyle = "#1E1B15";
          ctx.font = "500 28px sans-serif";
          ctx.fillText("7 月 17 日（星期五）", width / 2, startY + 335 + yOffset);

          // Venue header
          setLetterSpacing("3px");
          ctx.fillStyle = "#C5A16F";
          ctx.font = "600 22px serif";
          ctx.fillText("地點", width / 2, startY + 400 + yOffset);

          // Venue Value
          setLetterSpacing("0px");
          ctx.fillStyle = "#1E1B15";
          ctx.font = "500 28px sans-serif";
          ctx.fillText("Barcode Taipei", width / 2, startY + 440 + yOffset);
        }

        ctx.globalAlpha = 1.0;

        // Encode frame
        const imageData = ctx.getImageData(0, 0, width, height);
        // Add a delay specifically to allow async yielding so UI doesn't completely freeze if it runs fast
        if (i % 3 === 0) {
          await new Promise((r) => setTimeout(r, 1));
        }

        const palette = quantize(imageData.data, 256, { format: "rgba4444" });
        const indexOut = applyPalette(imageData.data, palette, "rgba4444");
        encoder.writeFrame(indexOut, width, height, { palette, delay: 100 });
      }

      encoder.finish();
      const buffer = encoder.bytes();
      const blob = new Blob([buffer], { type: "image/gif" });
      
      const fileName = "sam-invitation.gif";
      const file = new File([blob], fileName, { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      
      setGeneratedResult({ url, file, type: "gif" });
      setDownloadMessage("GIF 已準備好。手機請點「分享／儲存到照片」。");
      setIsGeneratingGif(false);
    } catch (err) {
      console.error("Failed to generate GIF", err);
      setDownloadMessage("產生 GIF 時發生錯誤，請再試一次。");
      setIsGeneratingGif(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setDownloadMessage(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Background
      ctx.fillStyle = "#FAF5EE";
      ctx.fillRect(0, 0, 1080, 1920);

      // Borders
      ctx.strokeStyle = "rgba(197, 161, 111, 0.3)";
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, 1008, 1848);
      ctx.strokeStyle = "rgba(197, 161, 111, 0.1)";
      ctx.lineWidth = 4;
      ctx.strokeRect(48, 48, 984, 1824);

      // Draw Image
      let usedImage = false;
      if (imageLoaded && !imageError) {
        try {
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const targetW = 1080;
              const targetH = 1056;
              const { x, y, drawW, drawH } = getCropPlacement(
                img.width,
                img.height,
                targetW,
                targetH,
                cropConfig,
              );

              ctx.save();
              ctx.beginPath();
              ctx.rect(0, 0, targetW, targetH);
              ctx.clip();
              ctx.globalAlpha = 0.9;
              ctx.drawImage(img, x, y, drawW, drawH);
              ctx.globalAlpha = 1.0;
              ctx.restore();

              // Gradient Overlay
              const grad = ctx.createLinearGradient(0, 0, 0, targetH);
              grad.addColorStop(0, "rgba(250, 245, 238, 0)");
              grad.addColorStop(0.6, "rgba(250, 245, 238, 0)");
              grad.addColorStop(1, "rgba(250, 245, 238, 1)");
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, targetW, targetH);

              resolve();
            };
            img.onerror = () =>
              reject(new Error("Failed to load image for canvas"));
            img.src = currentImageSrc;
          });
          usedImage = true;
        } catch (e) {
          console.error("Failed to draw image, falling back to text only", e);
        }
      }

      // Text Drawing
      ctx.textAlign = "center";

      const startY = usedImage ? 1160 : 800;

      const setLetterSpacing = (spacing: string) => {
        if ("letterSpacing" in ctx) {
          (ctx as any).letterSpacing = spacing;
        }
      };

      // Invitation label
      setLetterSpacing("8px");
      ctx.fillStyle = "#C5A16F";
      ctx.font = "500 28px sans-serif";
      ctx.fillText("誠摯邀請", 540, startY);

      // Sam title
      setLetterSpacing("-2px");
      ctx.fillStyle = "#1E1B15";
      ctx.font = "300 144px serif";
      ctx.fillText("Sam 的", 540, startY + 150);

      // Birthday line
      setLetterSpacing("3px");
      ctx.fillStyle = "#C5A16F";
      ctx.font = "400 72px sans-serif";
      ctx.fillText("22 歲的 10 週年紀念日", 540, startY + 270);

      // Line
      ctx.strokeStyle = "rgba(197, 161, 111, 0.3)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(340, startY + 360);
      ctx.lineTo(740, startY + 360);
      ctx.stroke();

      // Date header
      setLetterSpacing("4px");
      ctx.fillStyle = "#C5A16F";
      ctx.font = "600 34px serif";
      ctx.fillText("日期", 540, startY + 450);

      // Date value
      setLetterSpacing("0px");
      ctx.fillStyle = "#1E1B15";
      ctx.font = "500 44px sans-serif";
      ctx.fillText("7 月 17 日（星期五）", 540, startY + 500);

      // Venue header
      setLetterSpacing("4px");
      ctx.fillStyle = "#C5A16F";
      ctx.font = "600 34px serif";
      ctx.fillText("地點", 540, startY + 600);

      // Venue Value
      setLetterSpacing("0px");
      ctx.fillStyle = "#1E1B15";
      ctx.font = "500 44px sans-serif";
      ctx.fillText("Barcode Taipei", 540, startY + 660);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error("Failed to create blob from canvas");
          setIsGenerating(false);
          return;
        }

        const fileName = "Sam-Birthday-Invitation.png";
        const file = new File([blob], fileName, { type: "image/png" });
        const url = URL.createObjectURL(blob);
        
        setGeneratedResult({ url, file, type: "png" });
        setDownloadMessage("PNG 已準備好。手機請點「分享／儲存到照片」。");
        setIsGenerating(false);
      }, "image/png");
    } catch (err) {
      console.error("Failed to generate image", err);
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-[#FAF5EE] text-[#C5A16F] border border-[#C5A16F]/30 rounded-2xl py-4 sm:py-5 font-bold tracking-widest uppercase text-xs sm:text-sm hover:bg-[#F2ECD9] active:scale-[0.99] transition duration-300 shadow-sm cursor-pointer mt-4"
      >
        <Download className="w-5 h-5" />
        產生 IG 邀請圖
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-[100dvh]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#FCFAF6] rounded-[32px] p-6 max-w-sm w-full relative flex flex-col max-h-full overflow-y-auto shadow-2xl overflow-x-hidden"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 bg-neutral-100/50 hover:bg-neutral-200 rounded-full transition-colors z-[60]"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>

              <h3 className="font-serif text-2xl text-center text-[#1E1B15] mb-2 pr-8 pl-8 mt-2">
                你的邀請圖
              </h3>
              <p className="text-center text-xs text-[#5C5446] mb-6">
                預覽你的 IG 限時動態邀請圖，下載前可以再確認一次。
              </p>

              {/* Photo Upload Section */}
              <div className="flex flex-col items-center mb-4">
                <label className="cursor-pointer bg-white border border-[#E5DFC9] text-[#5C5446] text-xs px-5 py-2.5 rounded-xl shadow-sm hover:bg-[#FAF5EE] transition mb-3">
                  <span className="font-medium tracking-wide">
                    上傳自己的照片（選填）
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>

                {customImage && (
                  <div className="w-full flex flex-col items-center gap-1.5 mt-1 mb-2">
                    <p className="text-[10px] text-center text-[#5C5446] italic mb-1">
                      拖曳照片調整位置。手機可雙指縮放，電腦可用滑鼠滾輪縮放。
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCropConfig((c) => ({ ...c, zoom: c.zoom - 0.1 }))}
                        className="w-7 h-7 flex items-center justify-center bg-[#FAF5EE] border border-[#C5A16F]/20 rounded-full text-[#5C5446] hover:bg-[#F2ECD9] transition text-base leading-none active:scale-95"
                      >
                        -
                      </button>
                      <button
                        onClick={() =>
                          updateCropConfig({
                            mode: "cover",
                            zoom: 1,
                            offsetX: 0,
                            offsetY: 0,
                          })
                        }
                        className="text-[9px] uppercase tracking-widest px-4 py-1.5 bg-[#FAF5EE] border border-[#C5A16F]/20 rounded-full text-[#5C5446] hover:bg-[#F2ECD9] transition flex items-center justify-center active:scale-95"
                      >
                        重設照片
                      </button>
                      <button
                        onClick={() => updateCropConfig((c) => ({ ...c, zoom: c.zoom + 0.1 }))}
                        className="w-7 h-7 flex items-center justify-center bg-[#FAF5EE] border border-[#C5A16F]/20 rounded-full text-[#5C5446] hover:bg-[#F2ECD9] transition text-base leading-none active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Aspect Ratio 9:16 Container (1080x1920) */}
              <div className="flex-1 w-full flex justify-center items-center overflow-hidden min-h-0 bg-[#FAF5EE] rounded-2xl relative mb-4">
                <div
                  className="w-[315px] h-[560px] bg-[#FAF5EE] relative flex flex-col text-center overflow-hidden shrink-0 origin-center"
                  style={{
                    transform: "scale(1)",
                    touchAction: customImage ? "none" : "auto",
                    userSelect: "none",
                    cursor: customImage ? (isDragging ? "grabbing" : "grab") : "default",
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onWheel={handleWheel}
                >
                  {/* Decorative Borders */}
                  <div className="absolute inset-3 border border-[#C5A16F] opacity-30 z-20 pointer-events-none"></div>
                  <div className="absolute inset-4 border border-[#C5A16F] opacity-10 z-20 pointer-events-none"></div>

                  {/* Image Background Fill or Top Section (Optional) */}
                  {imageLoaded && !imageError ? (
                    <motion.div
                      ref={previewRef}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.9, delay: 0.3 }}
                      className="w-full h-[55%] relative overflow-hidden shrink-0"
                      style={{
                        backgroundColor: "#FAF5EE",
                        touchAction: "none",
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    >
                      <img
                        src={currentImageSrc}
                        alt="邀請圖照片"
                        crossOrigin="anonymous"
                        draggable={false}
                        className="opacity-90 max-w-none origin-top-left pointer-events-none"
                        style={{
                          position: "absolute",
                          left: `${preCrop?.x || 0}px`,
                          top: `${preCrop?.y || 0}px`,
                          width: `${preCrop?.drawW || 315}px`,
                          height: `${preCrop?.drawH || 308}px`,
                          userSelect: "none",
                          WebkitUserDrag: "none",
                        }}
                      />
                      {/* Gradient Overlay using rgba to prevent html2canvas oklab issues */}
                      <div
                        className="absolute inset-0 z-10 pointer-events-none"
                        style={{
                          backgroundImage:
                            "linear-gradient(to bottom, rgba(250, 245, 238, 0) 0%, rgba(250, 245, 238, 0) 60%, rgba(250, 245, 238, 1) 100%)",
                        }}
                      ></div>
                    </motion.div>
                  ) : (
                    imageError && (
                      <div className="w-full py-6 flex items-center justify-center bg-[#FAF5EE] border-b border-[#C5A16F]/20">
                        <p className="text-xs text-[#C5A16F]">
                          照片載入失敗
                        </p>
                      </div>
                    )
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 1.2 }}
                    className={`flex-1 flex flex-col items-center z-20 relative bg-[#FAF5EE] px-8 ${!imageError && imageLoaded ? "justify-start pt-2" : "justify-center py-6"}`}
                  >
                    <div className="uppercase tracking-widest text-[8px] text-[#C5A16F] font-sans font-medium mb-3">
                      誠摯邀請
                    </div>

                    <h1 className="font-serif text-[42px] leading-[1.1] text-[#1E1B15] tracking-tight font-light mb-1">
                      Sam 的
                      <span className="font-sans font-normal text-[#C5A16F] tracking-tight block mt-1 text-2xl">
                        22 歲的 10 週年紀念日
                      </span>
                    </h1>

                    <div className="w-12 border-b-2 border-[#C5A16F]/30 mt-3 mb-4"></div>

                    <div className="flex flex-col items-center space-y-3 mt-1">
                      <div>
                        <p className="font-serif text-[#C5A16F] text-[10px] tracking-widest uppercase font-semibold">
                          日期
                        </p>
                        <p className="text-[#1E1B15] text-[13px] font-medium mt-0.5">
                          7 月 17 日（星期五）
                        </p>
                      </div>

                      <div>
                        <p className="font-serif text-[#C5A16F] text-[10px] tracking-widest uppercase font-semibold">
                          地點
                        </p>
                        <p className="text-[#1E1B15] text-[13px] font-medium mt-0.5">
                          Barcode Taipei
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full mt-2">
                {generatedResult ? (
                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={handleShareOrSave}
                      className="w-full bg-[#C5A16F] text-white rounded-2xl py-3.5 font-bold tracking-widest uppercase text-xs shadow-sm hover:bg-[#b08d5b] transition flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      分享／儲存到照片
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectDownload}
                      className="w-full bg-[#1E1B15] text-[#FAF5EE] rounded-2xl py-3.5 font-bold tracking-widest uppercase text-xs text-center flex items-center justify-center gap-2 hover:bg-neutral-800 transition shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      下載 {generatedResult.type.toUpperCase()}
                    </button>
                    <button
                      onClick={() => setGeneratedResult(null)}
                      className="text-xs text-[#5C5446] underline mt-1 mx-auto py-2"
                    >
                      回到編輯
                    </button>
                    <div className="mt-1 text-center px-4 py-3 bg-[#E5DFC9]/20 rounded-xl border border-[#C5A16F]/10">
                      <p className="text-[11px] text-[#5C5446] leading-relaxed">
                        如果儲存時開啟新分頁，請長按圖片並儲存。iPhone 請在分享選單中選擇「儲存圖片」或「加入照片」。
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || isGeneratingGif}
                      className="w-full bg-[#1E1B15] text-[#FAF5EE] rounded-2xl py-3.5 font-bold tracking-widest uppercase text-xs hover:bg-neutral-800 transition duration-300 shadow-sm cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 flex-shrink-0"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          正在產生 PNG...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          下載靜態 PNG
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleGenerateGif}
                      disabled={isGenerating || isGeneratingGif}
                      className="w-full bg-white text-[#1E1B15] border border-[#1E1B15]/20 hover:border-[#1E1B15] rounded-2xl py-3.5 font-bold tracking-widest uppercase text-xs transition duration-300 shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0"
                    >
                      {isGeneratingGif ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          正在產生 GIF...
                        </>
                      ) : (
                        <>
                          <ImagePlay className="w-4 h-4" />
                          下載動態 GIF
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              <AnimatePresence>
                {downloadMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 text-center p-3 bg-blue-50/50 rounded-xl border border-blue-100/50"
                  >
                    <p className="text-[11px] text-[#5C5446] leading-relaxed">
                      {downloadMessage}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
