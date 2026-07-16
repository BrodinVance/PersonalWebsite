import { useRef, useState } from 'react';

interface Row {
  id: number;
  text: string;
}

// Ordered list of one-line strings (the home "Currently" items).
export function StringListField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => value.map((text, id) => ({ id, text })));
  const nextId = useRef(rows.length);

  function sync(next: Row[]) {
    setRows(next);
    onChange(next.map((r) => r.text).filter((t) => t.trim()));
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...rows];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    sync(next);
  }

  return (
    <div className="adm-strlist">
      {rows.map((row, i) => (
        <div key={row.id} className="adm-strlist-row">
          <input
            value={row.text}
            placeholder="Supports **bold** and *italics*"
            onChange={(e) =>
              sync(rows.map((r) => (r.id === row.id ? { ...r, text: e.target.value } : r)))
            }
          />
          <button
            type="button"
            className="adm-link-remove"
            title="Move up"
            disabled={i === 0}
            onClick={() => move(i, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="adm-link-remove"
            title="Move down"
            disabled={i === rows.length - 1}
            onClick={() => move(i, 1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="adm-link-remove"
            title="Remove line"
            onClick={() => sync(rows.filter((r) => r.id !== row.id))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="adm-link-add"
        onClick={() => sync([...rows, { id: nextId.current++, text: '' }])}
      >
        + Add line
      </button>
    </div>
  );
}
