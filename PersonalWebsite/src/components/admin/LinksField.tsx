import { useRef, useState } from 'react';

interface Row {
  id: number;
  name: string;
  url: string;
}

function toRows(value: Record<string, string>): Row[] {
  return Object.entries(value || {}).map(([name, url], i) => ({ id: i, name, url }));
}

export function LinksField({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(value));
  const nextId = useRef(rows.length);

  function sync(next: Row[]) {
    setRows(next);
    const obj: Record<string, string> = {};
    for (const r of next) {
      const key = r.name.trim();
      const url = r.url.trim();
      if (key && url) obj[key] = url;
    }
    onChange(obj);
  }

  const update = (id: number, patch: Partial<Row>) =>
    sync(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = () => sync([...rows, { id: nextId.current++, name: '', url: '' }]);
  const remove = (id: number) => sync(rows.filter((r) => r.id !== id));

  return (
    <div className="adm-links">
      {rows.map((r) => (
        <div key={r.id} className="adm-link-row">
          <input
            className="adm-link-name"
            placeholder="Label (e.g. Trello)"
            value={r.name}
            onChange={(e) => update(r.id, { name: e.target.value })}
          />
          <input
            className="adm-link-url"
            placeholder="https://…"
            value={r.url}
            onChange={(e) => update(r.id, { url: e.target.value })}
          />
          <button
            type="button"
            className="adm-link-remove"
            title="Remove link"
            aria-label="Remove link"
            onClick={() => remove(r.id)}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="adm-link-add" onClick={add}>
        + Add link
      </button>
    </div>
  );
}
