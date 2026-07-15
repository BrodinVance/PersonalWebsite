/**
 * Open Graph card renderer — the blue-hour night, 1200×630.
 *
 * Satori lays out a plain element tree (no JSX at build time), resvg
 * rasterizes it. Marcellus is the only face on the card; it's the site's
 * display voice and the one family Fontsource ships in a format satori
 * can read (.woff — satori doesn't parse woff2).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);

const marcellus = readFileSync(
  require.resolve('@fontsource/marcellus/files/marcellus-latin-400-normal.woff')
);

// site tokens, resolved to hex (see global.css for the oklch sources)
const C = {
  zenith: '#060c24',
  bg: '#0d172f',
  horizon: '#233d64',
  ink: '#eaeff5',
  inkFaint: '#8e9daf',
  accent: '#e9b452',
};

// deterministic star scatter, clear of the text column
const STARS: Array<[number, number, number]> = [
  [860, 80, 0.5], [1050, 150, 0.35], [960, 300, 0.4], [1120, 420, 0.3],
  [780, 200, 0.3], [340, 70, 0.35], [560, 120, 0.25], [1160, 60, 0.45],
];

export interface OgCard {
  title: string;
  /** small-caps kicker under the rule, e.g. "Writing" or "Project" */
  kind: string;
  /** dim meta line beside the kind, e.g. a date or a stack */
  meta?: string;
}

function el(type: string, style: Record<string, unknown>, children?: unknown) {
  return { type, props: { style, children } };
}

export async function renderOgCard({ title, kind, meta }: OgCard): Promise<Uint8Array> {
  const titleSize = title.length > 48 ? 58 : title.length > 26 ? 72 : 92;

  const tree = el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 84px',
      backgroundImage: `linear-gradient(180deg, ${C.zenith} 0%, ${C.bg} 58%, ${C.horizon} 155%)`,
      fontFamily: 'Marcellus',
      color: C.ink,
      position: 'relative',
    },
    [
      // lamplight pooling in from the lower right. Full-bleed overlay: satori
      // faintly tints the whole gradient box, so the box must be the card
      // itself or its edge reads as a seam. rgba stops only — hex-with-alpha
      // stops render as a dark ring.
      el('div', {
        position: 'absolute',
        top: '0px',
        left: '0px',
        width: '1200px',
        height: '630px',
        backgroundImage:
          'radial-gradient(620px 520px at 88% 100%, rgba(233,180,82,0.13) 0%, rgba(233,180,82,0) 72%)',
      }),
      ...STARS.map(([x, y, o]) =>
        el('div', {
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: '4px',
          height: '4px',
          borderRadius: '4px',
          backgroundColor: C.ink,
          opacity: o,
        })
      ),
      // masthead
      el(
        'div',
        { display: 'flex', flexDirection: 'column' },
        [
          el(
            'div',
            { fontSize: 26, letterSpacing: '0.22em', color: C.inkFaint },
            'BRODIN VANCE'
          ),
          el('div', {
            width: '56px',
            height: '3px',
            marginTop: '18px',
            backgroundColor: C.accent,
            borderRadius: '2px',
          }),
        ]
      ),
      // the title, riding just above the horizon light
      el(
        'div',
        {
          fontSize: titleSize,
          lineHeight: 1.12,
          letterSpacing: '-0.01em',
          maxWidth: '980px',
          display: 'block',
          lineClamp: 3,
        },
        title
      ),
      // kind + meta
      el(
        'div',
        {
          display: 'flex',
          alignItems: 'center',
          fontSize: 25,
          letterSpacing: '0.14em',
          color: C.inkFaint,
        },
        [
          el('div', { color: C.accent }, kind.toUpperCase()),
          ...(meta
            ? [
                el('div', { margin: '0 20px', color: C.inkFaint }, '·'),
                el('div', {}, meta.toUpperCase()),
              ]
            : []),
        ]
      ),
    ]
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Marcellus', data: marcellus, weight: 400, style: 'normal' }],
  });

  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}

export const OG_HEADERS = { 'Content-Type': 'image/png' };
