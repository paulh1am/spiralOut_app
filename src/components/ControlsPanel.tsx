import React from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { EffectSettings } from "@/lib/psychedelic";

interface ControlsPanelProps {
  settings: EffectSettings;
  onChange: (s: EffectSettings) => void;
  onDownload: () => void;
  hasImage: boolean;
}

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-xs font-mono text-muted-foreground">{value}</span>
    </div>
    <Slider
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([v]) => onChange(v)}
    />
  </div>
);

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  settings,
  onChange,
  onDownload,
  hasImage,
}) => {
  const update = (partial: Partial<EffectSettings>) =>
    onChange({ ...settings, ...partial });

  const setColor = (index: number, color: string) => {
    const colors = [...settings.colors];
    colors[index] = color;
    update({ colors });
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
        Controls
      </h2>

      <SliderRow
        label="Canvas Size (px)"
        value={settings.canvasSize}
        min={512}
        max={4096}
        step={128}
        onChange={(v) => update({ canvasSize: v })}
      />
      <SliderRow
        label="Strokes"
        value={settings.strokeCount}
        min={5}
        max={30}
        step={1}
        onChange={(v) => update({ strokeCount: v })}
      />
      <SliderRow
        label="Waviness"
        value={settings.waviness}
        min={0}
        max={100}
        step={1}
        onChange={(v) => update({ waviness: v })}
      />
      <SliderRow
        label="Stroke Width"
        value={settings.baseWidth}
        min={20}
        max={100}
        step={1}
        onChange={(v) => update({ baseWidth: v })}
      />
      <SliderRow
        label="Width Variance"
        value={Math.round(settings.widthVariance * 100)}
        min={0}
        max={100}
        step={1}
        onChange={(v) => update({ widthVariance: v / 100 })}
      />
      <SliderRow
        label="Stroke Spacing"
        value={settings.spacing}
        min={2}
        max={30}
        step={1}
        onChange={(v) => update({ spacing: v })}
      />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Color Palette</Label>
        <div className="flex gap-2">
          {settings.colors.map((c, i) => (
            <label key={i} className="relative w-10 h-10 rounded-lg overflow-hidden border border-muted cursor-pointer">
              <input
                type="color"
                value={c}
                onChange={(e) => setColor(i, e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-full" style={{ backgroundColor: c }} />
            </label>
          ))}
        </div>
      </div>

      <Button
        onClick={onDownload}
        disabled={!hasImage}
        className="w-full mt-2"
        size="lg"
      >
        <Download className="w-4 h-4 mr-2" />
        Download PNG
      </Button>
    </div>
  );
};

export default ControlsPanel;
