import { relay } from "@/app/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const presets = [
  { name: "Lime", color: relay.accent },
  { name: "Blue", color: "#2563eb" },
  { name: "Violet", color: "#a78bfa" },
  { name: "Pink", color: "#f472b6" },
  { name: "Orange", color: "#fb923c" },
];

export function AccentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const selected = /^#[0-9a-f]{6}$/i.test(value) ? value : relay.accent;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="workspace-accent">Accent color</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="workspace-accent"
          type="color"
          value={selected}
          onChange={(event) => onChange(event.target.value)}
          className="w-12 cursor-pointer border-[var(--text-meta)] p-1"
        />
        {presets.map(({ name, color }) => (
          <Button
            key={name}
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Use ${name.toLowerCase()} accent`}
            aria-pressed={selected.toLowerCase() === color.toLowerCase()}
            onClick={() => onChange(color)}
          >
            <span
              className="size-4 rounded-sm"
              style={{ backgroundColor: color }}
            />
          </Button>
        ))}
        <Button type="button" variant="ghost" onClick={() => onChange("")}>
          Reset
        </Button>
      </div>
    </div>
  );
}
