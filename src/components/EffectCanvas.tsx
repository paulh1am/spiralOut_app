import React, { useRef, useEffect, useCallback } from "react";
import { extractContours, simplifyContour } from "@/lib/contour";
import { renderPsychedelicStrokes, type EffectSettings } from "@/lib/psychedelic";

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
    (targetCanvas: HTMLCanvasElement, forDownload = false) => {
      if (!image) return;
      const ctx = targetCanvas.getContext("2d");
      if (!ctx) return;

      const size = settings.canvasSize;
      targetCanvas.width = size;
      targetCanvas.height = size;

      ctx.clearRect(0, 0, size, size);

      // Scale image to fit within canvas with padding for strokes
      const maxStrokeExtent =
        settings.strokeCount * settings.spacing + settings.waviness * 2;
      const padding = maxStrokeExtent + 20;
      const availableSize = size - padding * 2;
      const imgScale = Math.min(
        availableSize / image.width,
        availableSize / image.height
      );
      const imgW = image.width * imgScale;
      const imgH = image.height * imgScale;
      const imgX = (size - imgW) / 2;
      const imgY = (size - imgH) / 2;

      // Extract contour from image alpha
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCtx.drawImage(image, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, image.width, image.height);

      const contours = extractContours(imageData);
      if (contours.length === 0) return;

      // Use the largest contour
      const mainContour = contours.reduce((a, b) =>
        a.length > b.length ? a : b
      );
      const simplified = simplifyContour(mainContour, 2);

      // Render psychedelic strokes
      renderPsychedelicStrokes(
        ctx,
        simplified,
        settings,
        imgX,
        imgY,
        imgScale
      );

      // Draw original image on top
      ctx.drawImage(image, imgX, imgY, imgW, imgH);
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
    render(offscreen, true);

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
