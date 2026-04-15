import React, { useState, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import EffectCanvas from "@/components/EffectCanvas";
import ControlsPanel from "@/components/ControlsPanel";
import { type EffectSettings } from "@/lib/psychedelic";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEFAULT_SETTINGS: EffectSettings = {
  strokeCount: 15,
  waviness: 20,
  baseWidth: 3,
  widthVariance: 0.4,
  spacing: 8,
  colors: ["#FF6B9D", "#C084FC", "#67E8F9", "#FDE68A"],
  canvasSize: 2048,
};

const Index: React.FC = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [settings, setSettings] = useState<EffectSettings>(DEFAULT_SETTINGS);
  const [downloadTrigger, setDownloadTrigger] = useState(0);

  const handleImageLoaded = useCallback((img: HTMLImageElement) => {
    setImage(img);
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        {image ? (
          <div className="w-full max-w-[720px] aspect-square">
            <EffectCanvas
              image={image}
              settings={settings}
              downloadTrigger={downloadTrigger}
            />
          </div>
        ) : (
          <div className="w-full" style={{ maxWidth: 700 }}>
            <h1 className="text-2xl font-bold mb-6 text-center tracking-tight">
              Psychedelic Outline Generator
            </h1>
            <UploadZone onImageLoaded={handleImageLoaded} />
          </div>
        )}
      </div>

      {/* Controls sidebar */}
      {image && (
        <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-card">
          <ScrollArea className="h-auto md:h-screen">
            <div className="pb-4">
              <ControlsPanel
                settings={settings}
                onChange={setSettings}
                onDownload={() => setDownloadTrigger((d) => d + 1)}
                hasImage={!!image}
              />
              <div className="px-5 mt-2">
                <button
                  onClick={() => setImage(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Upload different image
                </button>
              </div>
            </div>
          </ScrollArea>
        </aside>
      )}
    </div>
  );
};

export default Index;
