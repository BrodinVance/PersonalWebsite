const COMBINING_MARKS = /[̀-ͯ]/g;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

// Detect KaTeX math: a $$...$$ block or an inline $...$ pair (ignoring code).
export function hasMath(body: string): boolean {
  const s = stripCode(body);
  return /\$\$[\s\S]+?\$\$/.test(s) || /(?:^|[^\\$])\$[^\n$]+?\$/.test(s);
}

// Detect JSX/component usage that requires .mdx.
export function hasJsx(body: string): boolean {
  return /<[A-Z][A-Za-z0-9]*[\s/>]/.test(body);
}

export function extensionFor(body: string): 'md' | 'mdx' {
  return hasMath(body) || hasJsx(body) ? 'mdx' : 'md';
}
