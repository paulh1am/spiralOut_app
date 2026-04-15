import React from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Shuffle, Plus } from "lucide-react";
import type { EffectSettings } from "@/lib/psychedelic";

const PRESET_COLORS = [
  "#FF6B9D", "#C084FC", "#67E8F9", "#FDE68A",
  "#4ADE80", "#FB923C", "#818CF8", "#F472B6",
  "#34D399", "#F87171", "#A78BFA", "#38BDF8",
];

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

  const addColor = () => {
    const next = PRESET_COLORS[settings.colors.length % PRESET_COLORS.length];
    update({ colors: [...settings.colors, next] });
  };

  const removeColor = (index: number) => {
    if (settings.colors.length <= 1) return;
    update({ colors: settings.colors.filter((_, i) => i !== index) });
  };

  const shuffleColors = () => {
    const arr = [...settings.colors];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    update({ colors: arr });
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
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Color Palette</Label>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={shuffleColors}>
              <Shuffle className="w-3 h-3" /> Shuffle
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={addColor}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.colors.map((c, i) => (
            <label key={i} className="relative group w-9 h-9 rounded-lg overflow-hidden border border-muted cursor-pointer flex-shrink-0">
              <input
                type="color"
                value={c}
                onChange={(e) => setColor(i, e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-full" style={{ backgroundColor: c }} />
              {settings.colors.length > 1 && (
                <button
                  onClick={(e) => { e.preventDefault(); removeColor(i); }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-bold leading-none"
                >
                  ×
                </button>
              )}
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
