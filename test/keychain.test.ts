// End-to-end checks of the geometry pipeline: SVG/text → layers → solids → STL.
// Runs in Node (happy-dom provides DOMParser for three's SVGLoader).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parse } from 'opentype.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildKeychain, DEFAULTS, initGeometry, type MeshData, type Params } from '../src/keychain';
import { SHAPES } from '../src/shapes';
import { toBinarySTL } from '../src/stl';
import { parseSvg } from '../src/svg';
import { textToSvg } from '../src/text';

const require = createRequire(import.meta.url);

beforeAll(async () => {
  await initGeometry(require.resolve('manifold-3d/manifold.wasm'));
});

/** A closed surface: every directed edge a→b has a matching b→a. */
function openEdges(mesh: MeshData): number {
  const key = (i: number) => {
    const p = mesh.positions;
    return `${p[i * 3].toFixed(4)},${p[i * 3 + 1].toFixed(4)},${p[i * 3 + 2].toFixed(4)}`;
  };
  const count = new Map<string, number>();
  for (let t = 0; t < mesh.triangles; t++) {
    const v = [key(t * 3), key(t * 3 + 1), key(t * 3 + 2)];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      count.set(`${a}|${b}`, (count.get(`${a}|${b}`) ?? 0) + 1);
    }
  }
  let open = 0;
  for (const [k, n] of count) {
    const [a, b] = k.split('|');
    if ((count.get(`${b}|${a}`) ?? 0) !== n) open++;
  }
  return open;
}

const BASES: Params['baseShape'][] = ['silhouette', 'rounded', 'circle', 'none'];
const STYLES: Params['style'][] = ['raised', 'engraved', 'inlay'];
const RINGS: Params['ringType'][] = ['loop', 'hole', 'none'];

it('the closed-surface check catches a missing triangle', () => {
  const r = buildKeychain(parseSvg(SHAPES.heart.svg), DEFAULTS);
  const n = r.combined.triangles - 1;
  expect(openEdges({ positions: r.combined.positions.slice(0, n * 9), triangles: n })).toBeGreaterThan(0);
});

describe('every shape × base × style × ring gives closed solids', () => {
  for (const [name, shape] of Object.entries(SHAPES)) {
    it(name, () => {
      const layers = parseSvg(shape.svg);
      for (const baseShape of BASES)
        for (const style of STYLES)
          for (const ringType of RINGS) {
            const r = buildKeychain(layers, { ...DEFAULTS, baseShape, style, ringType });
            const where = `${baseShape}/${style}/${ringType}`;
            expect(r.combined.triangles, where).toBeGreaterThan(0);
            expect(openEdges(r.combined), where).toBe(0);
            if (r.base) expect(openEdges(r.base), `${where} base`).toBe(0);
            if (r.relief) expect(openEdges(r.relief), `${where} relief`).toBe(0);
          }
    });
  }
});

describe('text', () => {
  const file = require.resolve('@fontsource/fredoka/files/fredoka-latin-700-normal.woff');
  const buf = readFileSync(file);
  const font = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

  it('two lines, inlay: base and insert are separate closed bodies', () => {
    const svg = textToSvg(font, { text: 'Hola\nMundo', letterSpacing: 0, lineHeight: 1.05, align: 'center' });
    const r = buildKeychain(parseSvg(svg), { ...DEFAULTS, style: 'inlay' });
    expect(r.relief).not.toBeNull();
    expect(openEdges(r.base!)).toBe(0);
    expect(openEdges(r.relief!)).toBe(0);
    // Inlay is flush: the insert never rises above the base.
    expect(r.size[2]).toBeCloseTo(DEFAULTS.baseThickness, 3);
  });

  it('the longest side matches the requested size', () => {
    const svg = textToSvg(font, { text: 'Cris', letterSpacing: 0, lineHeight: 1, align: 'center' });
    const r = buildKeychain(parseSvg(svg), { ...DEFAULTS, baseShape: 'none', ringType: 'none', size: 50 });
    expect(Math.max(r.size[0], r.size[1])).toBeCloseTo(50, 1);
  });
});

describe('limits and warnings', () => {
  it('engraving deeper than the base allows is clamped, with a warning', () => {
    const r = buildKeychain(parseSvg(SHAPES.heart.svg), {
      ...DEFAULTS, style: 'engraved', baseThickness: 2, reliefHeight: 5,
    });
    expect(r.warnings.join(' ')).toMatch(/profundidad/);
    expect(r.size[2]).toBeCloseTo(2, 3);
  });

  it('a raised design adds its height on top of the base', () => {
    const r = buildKeychain(parseSvg(SHAPES.star.svg), { ...DEFAULTS, style: 'raised' });
    expect(r.size[2]).toBeCloseTo(DEFAULTS.baseThickness + DEFAULTS.reliefHeight, 3);
  });

  it('an SVG with no fill is rejected with a readable message', () => {
    expect(() => buildKeychain(parseSvg('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), DEFAULTS)).toThrow(/SVG/);
  });
});

describe('STL', () => {
  it('binary layout: 80-byte header, count, 50 bytes per triangle', async () => {
    const r = buildKeychain(parseSvg(SHAPES.paw.svg), DEFAULTS);
    const buf = new DataView(await toBinarySTL(r.combined, 'test').arrayBuffer());
    expect(buf.byteLength).toBe(84 + 50 * r.combined.triangles);
    expect(buf.getUint32(80, true)).toBe(r.combined.triangles);
  });
});
