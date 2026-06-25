import { AccentPicker } from './AccentPicker';
import { LinksField } from './LinksField';

const TOPICS = ['quantum', 'math', 'gamedev', 'cooking'];
const STATUSES = ['building', 'planned', 'ongoing', 'shipped'];

export function FrontmatterForm({
  collection,
  data,
  onChange,
}: {
  collection: 'writing' | 'projects';
  data: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
}) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });

  return (
    <div className="adm-form">
      <label className="adm-field">
        <span>Title</span>
        <input value={data.title || ''} onChange={(e) => set('title', e.target.value)} />
      </label>

      <label className="adm-field">
        <span>Description</span>
        <textarea
          rows={2}
          value={data.description || ''}
          onChange={(e) => set('description', e.target.value)}
        />
      </label>

      {collection === 'writing' && (
        <>
          <label className="adm-field">
            <span>Date</span>
            <input
              type="date"
              value={data.date || ''}
              onChange={(e) => set('date', e.target.value)}
            />
          </label>

          <fieldset className="adm-field">
            <legend>Topics</legend>
            <div className="adm-checks">
              {TOPICS.map((t) => (
                <label key={t} className="adm-check">
                  <input
                    type="checkbox"
                    checked={(data.topics || []).includes(t)}
                    onChange={(e) => {
                      const cur = new Set<string>(data.topics || []);
                      if (e.target.checked) cur.add(t);
                      else cur.delete(t);
                      set('topics', [...cur]);
                    }}
                  />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="adm-check">
            <input
              type="checkbox"
              checked={!!data.draft}
              onChange={(e) => set('draft', e.target.checked)}
            />
            Draft (hidden in production)
          </label>

          <label className="adm-field">
            <span>Cover image path (optional)</span>
            <input
              value={data.cover || ''}
              placeholder="./cover.png"
              onChange={(e) => set('cover', e.target.value)}
            />
          </label>
        </>
      )}

      {collection === 'projects' && (
        <>
          <label className="adm-field">
            <span>Status</span>
            <select value={data.status || 'building'} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="adm-field">
            <span>Stack (comma-separated)</span>
            <input
              value={(data.stack || []).join(', ')}
              onChange={(e) =>
                set(
                  'stack',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
            />
          </label>

          <label className="adm-field">
            <span>Year</span>
            <input
              type="number"
              value={data.year ?? new Date().getFullYear()}
              onChange={(e) => set('year', Number(e.target.value))}
            />
          </label>

          <label className="adm-check">
            <input
              type="checkbox"
              checked={!!data.featured}
              onChange={(e) => set('featured', e.target.checked)}
            />
            Featured (show on home page)
          </label>

          <label className="adm-field">
            <span>Order (higher = first)</span>
            <input
              type="number"
              value={data.order ?? 0}
              onChange={(e) => set('order', Number(e.target.value))}
            />
          </label>

          <div className="adm-field">
            <span>Links</span>
            <LinksField value={data.links || {}} onChange={(v) => set('links', v)} />
          </div>
        </>
      )}

      <div className="adm-field">
        <span className="adm-label">Accent / theme</span>
        <AccentPicker value={data.accent} onChange={(v) => set('accent', v)} />
      </div>
    </div>
  );
}
