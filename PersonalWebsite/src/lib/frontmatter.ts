// js-yaml is CommonJS; this interop works in both the Vite dev server and the
// production Node ESM bundle (where a bare default import fails).
import * as yamlNs from 'js-yaml';
const yaml = (yamlNs as any).default ?? yamlNs;

export interface Parsed {
  data: Record<string, any>;
  body: string;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parse(raw: string): Parsed {
  const m = raw.match(FM_RE);
  if (!m) return { data: {}, body: raw };
  const data = (yaml.load(m[1]) as Record<string, any>) ?? {};
  return { data, body: m[2] ?? '' };
}

export function serialize(data: Record<string, any>, body: string): string {
  // Drop empty values so frontmatter stays clean and diffs stay small.
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    clean[k] = v;
  }
  const yamlStr = yaml.dump(clean, { lineWidth: -1, quotingType: '"' } as any);
  return `---\n${yamlStr}---\n\n${body.trim()}\n`;
}
