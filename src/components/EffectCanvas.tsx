import React, { useRef, useEffect, useCallback } from "react";
import { renderOutsideStroke, type EffectSettings } from "@/lib/psychedelic";

interface EffectCanvasProps {
  image: HTMLImageElement | null;
  settings: EffectSettings;
  downloadTrigger: number;
}

const EffectCanvas: React.FC<EffectCanvasProps> = ({
  image,
  settings,
  downloadTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevDownloadRef = useRef(0);

  const render = useCallback(
    (targetCanvas: HTMLCanvasElement) => {
      if (!image) return;
      const ctx = targetCanvas.getContext("2d");
      if (!ctx) return;

      const size = settings.canvasSize;
      targetCanvas.width = size;
      targetCanvas.height = size;
      ctx.clearRect(0, 0, size, size);

      // Size image so its height is ~25% of the canvas
      const targetHeight = size * 0.25;
      const imgScale = targetHeight / image.height;
      const imgW = image.width * imgScale;
      const imgH = image.height * imgScale;
      const imgX = (size - imgW) / 2;
      const imgY = (size - imgH) / 2;

      renderOutsideStroke(ctx, image, settings, imgX, imgY, imgW, imgH);
    },
    [image, settings]
  );

  // Preview render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    render(canvas);
  }, [render, image]);

  // Download trigger
  useEffect(() => {
    if (downloadTrigger === 0 || downloadTrigger === prevDownloadRef.current)
      return;
    prevDownloadRef.current = downloadTrigger;

    const offscreen = document.createElement("canvas");
    render(offscreen);

    offscreen.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "psychedelic-outline.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [downloadTrigger, render]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-contain rounded-lg"
      style={{ maxWidth: "100%", maxHeight: "100%" }}
    />
  );
};

export default EffectCanvas;
