import { useEffect, useRef, useState } from 'react';
import { MarkdownEditor, type EditorHandle } from './MarkdownEditor';
import { Toolbar } from './Toolbar';
import { Preview } from './Preview';
import { FrontmatterForm } from './FrontmatterForm';
import './admin.css';

type Collection = 'writing' | 'projects';

interface Entry {
  data: Record<string, any>;
  body: string;
  slug?: string;
  filename?: string;
  sha?: string;
}

interface ListItem {
  filename: string;
  slug: string;
  data: Record<string, any>;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyEntry(c: Collection): Entry {
  return c === 'writing'
    ? { data: { title: '', description: '', date: todayISO(), topics: [], draft: true }, body: '' }
    : {
        data: {
          title: '',
          description: '',
          status: 'building',
          stack: [],
          year: new Date().getFullYear(),
          featured: false,
          order: 0,
          links: {},
        },
        body: '',
      };
}

export default function Editor() {
  const [collection, setCollection] = useState<Collection>('writing');
  const [items, setItems] = useState<ListItem[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const editorRef = useRef<EditorHandle>(null);

  async function loadList(c: Collection) {
    setBusy(true);
    try {
      const res = await fetch(`/api/content?collection=${c}`);
      if (res.status === 401) {
        window.location.href = '/api/auth/login';
        return;
      }
      const j = await res.json();
      setItems(j.items ?? []);
    } catch {
      setToast('Could not load entries');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (view === 'list') loadList(collection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, view]);

  async function openEntry(slug: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/content?collection=${collection}&slug=${encodeURIComponent(slug)}`);
      const j = await res.json();
      if (!res.ok) {
        setToast(j.error ?? 'Could not open entry');
        return;
      }
      setEntry({ data: j.data, body: j.body, slug: j.slug, filename: j.filename, sha: j.sha });
      setView('edit');
    } finally {
      setBusy(false);
    }
  }

  function newEntry() {
    setEntry(emptyEntry(collection));
    setView('edit');
  }

  function flashToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 5000);
  }

  async function remove() {
    if (!entry?.filename) return;
    const name = entry.data.title || entry.slug || entry.filename;
    if (!window.confirm(`Delete "${name}"? This permanently removes the file.`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/content/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection,
          filename: entry.filename,
          sha: entry.sha,
          title: entry.data.title,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        flashToast(j.error ?? 'Delete failed');
        return;
      }
      setView('list');
      setEntry(null);
      loadList(collection);
      flashToast(`Deleted ${name}${j.deployTriggered ? ' · deploy triggered' : ''}`);
    } catch {
      flashToast('Delete failed');
    } finally {
      setBusy(false);
    }
  }

  // Commit the given frontmatter data + current body. Returns the API result
  // on success, or null on failure (toast already shown).
  async function persist(data: Record<string, any>): Promise<any | null> {
    if (!entry) return null;
    setBusy(true);
    try {
      const res = await fetch('/api/content/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection,
          data,
          body: entry.body,
          slug: entry.slug,
          originalFilename: entry.filename,
          sha: entry.sha,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        flashToast(j.error ?? 'Save failed');
        return null;
      }
      // Update local state so further saves target the right file/sha.
      setEntry((e) =>
        e ? { ...e, data, slug: j.slug, filename: j.filename, sha: j.sha } : e
      );
      return j;
    } catch {
      flashToast('Save failed');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function save(publishOverride?: boolean) {
    if (!entry) return;
    if (!entry.data.title?.trim()) {
      flashToast('A title is required.');
      return;
    }
    const data = { ...entry.data };
    if (collection === 'writing' && typeof publishOverride === 'boolean') {
      data.draft = !publishOverride;
    }
    const j = await persist(data);
    if (j) flashToast(`Saved ${j.filename}${j.deployTriggered ? ' · deploy triggered' : ''}`);
  }

  async function toggleHidden() {
    if (!entry?.filename) return;
    const nextHidden = !entry.data.draft;
    const j = await persist({ ...entry.data, draft: nextHidden });
    if (j) {
      flashToast(
        `${nextHidden ? 'Hidden from the site' : 'Now public'}${j.deployTriggered ? ' · deploy triggered' : ''}`
      );
    }
  }

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-tabs">
          {(['writing', 'projects'] as Collection[]).map((c) => (
            <button
              key={c}
              type="button"
              className={collection === c ? 'on' : ''}
              onClick={() => {
                setCollection(c);
                setView('list');
                setEntry(null);
              }}
            >
              {c === 'writing' ? 'Writing' : 'Projects'}
            </button>
          ))}
        </div>
        <div className="adm-top-actions">
          {view === 'edit' && (
            <button type="button" className="adm-ghost" onClick={() => setView('list')}>
              ← All {collection}
            </button>
          )}
          <a className="adm-ghost" href="/api/auth/logout">
            Log out
          </a>
        </div>
      </header>

      {toast && <div className="adm-toast">{toast}</div>}

      {view === 'list' && (
        <section className="adm-list">
          <div className="adm-list-head">
            <h1>{collection === 'writing' ? 'Writing' : 'Projects'}</h1>
            <button type="button" className="adm-primary" onClick={newEntry}>
              + New {collection === 'writing' ? 'post' : 'project'}
            </button>
          </div>
          {busy && <p className="adm-muted">Loading…</p>}
          {!busy && items.length === 0 && <p className="adm-muted">No entries yet.</p>}
          <ul className="adm-entries">
            {items.map((it) => (
              <li key={it.filename}>
                <button type="button" onClick={() => openEntry(it.slug)}>
                  <span className="adm-entry-title">{it.data.title || it.slug}</span>
                  <span className="adm-entry-meta">
                    {it.data.draft ? 'hidden · ' : ''}
                    {it.data.date || it.data.status || ''}
                    {' · '}
                    {it.filename}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === 'edit' && entry && (
        <section className="adm-edit">
          <FrontmatterForm
            key={`${collection}:${entry.filename ?? 'new'}`}
            collection={collection}
            data={entry.data}
            onChange={(data) => setEntry((e) => (e ? { ...e, data } : e))}
          />

          <div className="adm-panes">
            <div className="adm-editor-col">
              <Toolbar editor={editorRef} />
              <MarkdownEditor
                ref={editorRef}
                value={entry.body}
                onChange={(body) => setEntry((e) => (e ? { ...e, body } : e))}
              />
            </div>
            <Preview body={entry.body} accent={entry.data.accent} />
          </div>

          <div className="adm-actions">
            <div className="adm-actions-left">
              {entry.filename && (
                <button type="button" className="adm-danger" disabled={busy} onClick={remove}>
                  Delete
                </button>
              )}
              {entry.filename && (
                <button type="button" className="adm-ghost" disabled={busy} onClick={toggleHidden}>
                  {entry.data.draft ? 'Make public' : 'Hide'}
                </button>
              )}
            </div>
            <div className="adm-actions-right">
              {collection === 'writing' ? (
                <>
                  <button type="button" className="adm-ghost" disabled={busy} onClick={() => save(false)}>
                    Save draft
                  </button>
                  <button type="button" className="adm-primary" disabled={busy} onClick={() => save(true)}>
                    Publish
                  </button>
                </>
              ) : (
                <button type="button" className="adm-primary" disabled={busy} onClick={() => save()}>
                  Save
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
