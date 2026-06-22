import { useState } from 'react';

const PRESETS = [
  { name: 'Brine', value: 'var(--brine)' },
  { name: 'Sage', value: 'var(--status-sage)' },
  { name: 'Amber', value: 'var(--accent)' },
];

export function ColorPicker({ onPick }: { onPick: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="adm-color">
      <button type="button" title="Text color" onClick={() => setOpen((o) => !o)}>
        A<span aria-hidden>▾</span>
      </button>
      {open && (
        <span className="adm-color-pop">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              style={{ color: p.value }}
              onClick={() => {
                onPick(p.value);
                setOpen(false);
              }}
            >
              {p.name}
            </button>
          ))}
          <input
            type="color"
            title="Custom color"
            onChange={(e) => {
              onPick(e.target.value);
              setOpen(false);
            }}
          />
        </span>
      )}
    </span>
  );
}
