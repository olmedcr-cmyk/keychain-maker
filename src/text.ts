// Text → SVG using real font outlines (opentype.js).
import { parse, type Font } from 'opentype.js';
import pacifico from '@fontsource/pacifico/files/pacifico-latin-400-normal.woff?url';
import lilita from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff?url';
import archivo from '@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff?url';
import fredoka from '@fontsource/fredoka/files/fredoka-latin-700-normal.woff?url';
import bungee from '@fontsource/bungee/files/bungee-latin-400-normal.woff?url';
import righteous from '@fontsource/righteous/files/righteous-latin-400-normal.woff?url';

export const FONTS: Record<string, { label: string; url: string }> = {
  pacifico: { label: 'Pacifico (caligráfica)', url: pacifico },
  fredoka: { label: 'Fredoka Bold (redondeada)', url: fredoka },
  lilita: { label: 'Lilita One (gruesa)', url: lilita },
  archivo: { label: 'Archivo Black', url: archivo },
  bungee: { label: 'Bungee (display)', url: bungee },
  righteous: { label: 'Righteous', url: righteous },
};

const cache = new Map<string, Promise<Font>>();

export function loadFont(key: string): Promise<Font> {
  let p = cache.get(key);
  if (!p) {
    const def = FONTS[key];
    p = fetch(def.url).then((r) => r.arrayBuffer()).then((buf) => parse(buf));
    cache.set(key, p);
  }
  return p;
}

export async function loadFontFile(file: File): Promise<Font> {
  const font = parse(await file.arrayBuffer());
  cache.set('custom', Promise.resolve(font));
  return font;
}

export interface TextOptions {
  text: string;
  letterSpacing: number; // em
  lineHeight: number; // em
  align: 'left' | 'center' | 'right';
}

// Own serializer: opentype.js 2.0's toPathData() sometimes emits "NaN" for
// near-integer coordinates, which produces spikes in the geometry.
function pathData(cmds: any[]): string {
  const n = (v: number) => (Math.round(v * 1000) / 1000).toString();
  let d = '';
  for (const c of cmds) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${n(c.x)} ${n(c.y)}`;
    else if (c.type === 'Q') d += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === 'C') d += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === 'Z') d += 'Z';
  }
  return d;
}

export function textToSvg(font: Font, o: TextOptions): string {
  const size = 100;
  const lines = o.text.split('\n').filter((l, i, arr) => l.length || arr.length === 1);
  const opts = { kerning: true, letterSpacing: o.letterSpacing } as any;
  const widths = lines.map((l) => font.getAdvanceWidth(l, size, opts));
  const maxW = Math.max(...widths, 1);
  let d = '';
  lines.forEach((line, i) => {
    const w = widths[i];
    const x = o.align === 'left' ? 0 : o.align === 'right' ? maxW - w : (maxW - w) / 2;
    const y = size + i * size * o.lineHeight;
    d += pathData(font.getPath(line, x, y, size, opts).commands) + ' ';
  });
  return `<svg xmlns="http://www.w3.org/2000/svg"><path fill="#000" fill-rule="nonzero" d="${d.trim()}"/></svg>`;
}
