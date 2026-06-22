const PRESETS = [
  { name: 'Amber', value: '' }, // default — omit accent entirely
  { name: 'Brine', value: '#79B0C9' },
  { name: 'Sage', value: '#8FA98C' },
];

export function AccentPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="adm-accent">
      {PRESETS.map((p) => (
        <button
          key={p.name}
          type="button"
          className={(value || '') === p.value ? 'on' : ''}
          onClick={() => onChange(p.value || undefined)}
        >
          <span className="sw" style={{ background: p.value || '#CB8E42' }} />
          {p.name}
        </button>
      ))}
      <label className="adm-accent-custom">
        Custom
        <input
          type="color"
          value={value || '#CB8E42'}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
