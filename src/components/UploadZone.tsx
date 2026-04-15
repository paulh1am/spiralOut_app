import React, { useCallback, useRef } from "react";
import { Upload } from "lucide-react";

interface UploadZoneProps {
  onImageLoaded: (img: HTMLImageElement) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onImageLoaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const img = new Image();
      img.onload = () => onImageLoaded(img);
      img.src = URL.createObjectURL(file);
    },
    [onImageLoaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors h-64
        ${dragging ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-primary/60"}`}
    >
      <Upload className="w-10 h-10 text-muted-foreground" />
      <p className="text-muted-foreground text-sm">
        Drop a PNG here or click to upload
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
};

export default UploadZone;
