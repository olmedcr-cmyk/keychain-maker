// Keychain geometry engine: 2D design → base plate + relief + ring → watertight solids.
// All booleans run in manifold-3d (robust, always-manifold output = printable STL).
import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d';
import type { SvgLayer, Vec2 } from './svg';

let wasm: ManifoldToplevel | null = null;
/** Loads the WASM engine once. `wasmPath` is only overridden by the tests, which run in Node. */
export async function initGeometry(wasmPath: string = wasmUrl): Promise<void> {
  if (wasm) return;
  wasm = await Module({ locateFile: () => wasmPath });
  wasm.setup();
  wasm.setCircularSegments(0);
  wasm.setMinCircularAngle(6);
  wasm.setMinCircularEdgeLength(0.3);
}

export type BaseShape = 'silhouette' | 'rounded' | 'circle' | 'none';
export type Style = 'raised' | 'engraved' | 'inlay';
export type RingType = 'loop' | 'hole' | 'none';

export interface Params {
  size: number; // longest side of the design, mm
  whiteKnockout: boolean;
  mirror: boolean;
  baseShape: BaseShape;
  border: number; // mm around the design
  bridge: number; // closing radius to merge nearby pieces, mm
  fillHoles: boolean;
  cornerRadius: number;
  baseThickness: number;
  style: Style;
  reliefHeight: number;
  ringType: RingType;
  ringPlacement: 'auto' | 'manual';
  ringAngle: number; // degrees, 90 = top
  ringManual: Vec2 | null; // ring centre in mm (manual mode)
  ringOuter: number; // outer diameter mm
  ringHole: number; // hole diameter mm
  ringOffset: number; // push ring outwards (+) / inwards (−), mm
  ringThickness: number; // 0 = same as base
}

export const DEFAULTS: Params = {
  size: 50,
  whiteKnockout: true,
  mirror: false,
  baseShape: 'silhouette',
  border: 3,
  bridge: 2,
  fillHoles: true,
  cornerRadius: 4,
  baseThickness: 3,
  style: 'raised',
  reliefHeight: 1.2,
  ringType: 'loop',
  ringPlacement: 'auto',
  ringAngle: 90,
  ringManual: null,
  ringOuter: 9,
  ringHole: 5,
  ringOffset: 0,
  ringThickness: 0,
};

export interface MeshData {
  positions: Float32Array; // non-indexed triangles, xyz
  triangles: number;
}

export interface Result {
  base: MeshData | null; // colour 1
  relief: MeshData | null; // colour 2 (raised design / inlay insert)
  combined: MeshData; // everything fused in one solid
  size: [number, number, number];
  ringCenter: Vec2 | null;
  pieces: number; // separate islands in the main body
  warnings: string[];
}

function signedArea(poly: Vec2[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1]);
  }
  return a / 2;
}

function toMeshData(m: Manifold): MeshData {
  const mesh = m.getMesh();
  const { vertProperties: v, triVerts: t, numProp } = mesh;
  const positions = new Float32Array(t.length * 3);
  for (let i = 0; i < t.length; i++) {
    const o = t[i] * numProp;
    positions[i * 3] = v[o];
    positions[i * 3 + 1] = v[o + 1];
    positions[i * 3 + 2] = v[o + 2];
  }
  return { positions, triangles: t.length / 3 };
}

/** Builds the 2D design from parsed SVG layers (painter's order, white = knockout). */
function designFromLayers(layers: SvgLayer[], p: Params, gc: (x: any) => any): CrossSection {
  const { CrossSection } = wasm!;
  let acc: CrossSection | null = null;
  const anyDark = layers.some((l) => !l.isWhite);
  for (const l of layers) {
    const cs = gc(new CrossSection(l.contours, l.fillRule));
    if (p.whiteKnockout && anyDark && l.isWhite) {
      if (acc) acc = gc(acc.subtract(cs));
    } else acc = acc ? gc(acc.add(cs)) : cs;
  }
  if (!acc) throw new Error('El SVG no tiene formas rellenas que se puedan extruir.');
  return acc;
}

export function buildKeychain(layers: SvgLayer[], p: Params): Result {
  if (!wasm) throw new Error('Geometría no inicializada');
  const { CrossSection, Manifold } = wasm;
  const trash: { delete(): void }[] = [];
  const gc = <T extends { delete(): void }>(x: T): T => (trash.push(x), x);
  const warnings: string[] = [];

  try {
    // ---------- 1. Design, normalised to size & centred ----------
    let design = designFromLayers(layers, p, gc);
    if (design.isEmpty()) throw new Error('El SVG no tiene formas rellenas que se puedan extruir.');
    let b = design.bounds();
    const w0 = b.max[0] - b.min[0], h0 = b.max[1] - b.min[1];
    const s = p.size / Math.max(w0, h0);
    design = gc(design.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]));
    design = gc(design.scale(s));
    if (p.mirror) design = gc(design.mirror([1, 0]));
    design = gc(design.simplify(0.01));

    // ---------- 2. Base plate ----------
    let base: CrossSection;
    b = design.bounds();
    const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2;
    switch (p.baseShape) {
      case 'silhouette': {
        base = gc(design.offset(p.border + p.bridge, 'Round'));
        if (p.bridge > 0) base = gc(base.offset(-p.bridge, 'Round'));
        if (p.fillHoles) {
          const outers = base.toPolygons().filter((poly) => signedArea(poly as Vec2[]) > 0);
          base = gc(new CrossSection(outers, 'NonZero'));
        }
        break;
      }
      case 'rounded': {
        const w = b.max[0] - b.min[0] + 2 * p.border, h = b.max[1] - b.min[1] + 2 * p.border;
        const r = Math.max(0.01, Math.min(p.cornerRadius, w / 2 - 0.01, h / 2 - 0.01));
        base = gc(CrossSection.square([w - 2 * r, h - 2 * r], true));
        base = gc(base.offset(r, 'Round'));
        base = gc(base.translate([cx, cy]));
        break;
      }
      case 'circle': {
        let rMax = 0;
        for (const poly of design.toPolygons())
          for (const [x, y] of poly) rMax = Math.max(rMax, Math.hypot(x - cx, y - cy));
        base = gc(CrossSection.circle(rMax + p.border).translate([cx, cy]));
        break;
      }
      case 'none':
      default:
        base = design;
    }

    // ---------- 3. Ring / hole ----------
    let ringSolid: CrossSection | null = null;
    let holeCS: CrossSection | null = null;
    let ringCenter: Vec2 | null = null;
    const R = p.ringOuter / 2, rh = Math.min(p.ringHole / 2, R - 0.4);
    const wall = R - rh;
    if (p.ringType !== 'none') {
      const verts: Vec2[] = base.toPolygons().flat() as Vec2[];
      let anchor: Vec2;
      let dir: Vec2;
      if (p.ringPlacement === 'manual' && p.ringManual) {
        ringCenter = p.ringManual;
        // nearest boundary vertex to the chosen centre
        let best = Infinity;
        anchor = verts[0];
        for (const v of verts) {
          const d = Math.hypot(v[0] - ringCenter[0], v[1] - ringCenter[1]);
          if (d < best) (best = d), (anchor = v);
        }
        const dx = ringCenter[0] - anchor[0], dy = ringCenter[1] - anchor[1];
        const len = Math.hypot(dx, dy) || 1;
        dir = [dx / len, dy / len];
      } else {
        const a = (p.ringAngle * Math.PI) / 180;
        dir = [Math.cos(a), Math.sin(a)];
        let maxDot = -Infinity;
        for (const v of verts) maxDot = Math.max(maxDot, v[0] * dir[0] + v[1] * dir[1]);
        // among the extreme vertices pick the one closest to the axis through the centre
        let best = Infinity;
        anchor = verts[0];
        for (const v of verts) {
          if (v[0] * dir[0] + v[1] * dir[1] < maxDot - 0.6) continue;
          const off = Math.abs((v[0] - cx) * dir[1] - (v[1] - cy) * dir[0]);
          if (off < best) (best = off), (anchor = v);
        }
        const dist = p.ringType === 'loop' ? rh + wall * 0.55 + p.ringOffset : -(rh + wall) + p.ringOffset;
        ringCenter = [anchor[0] + dir[0] * dist, anchor[1] + dir[1] * dist];
      }
      const circle = (r: number, c: Vec2) => gc(CrossSection.circle(r).translate(c));
      if (p.ringType === 'loop') {
        ringSolid = gc(CrossSection.hull([circle(R, ringCenter), circle(Math.min(R * 0.8, R), anchor)]));
      }
      holeCS = circle(rh, ringCenter);
    }

    // ---------- 4. Solids ----------
    const T = p.baseThickness;
    const H = p.reliefHeight;
    const ringT = p.ringThickness > 0 ? p.ringThickness : T;
    let body2D = base;
    const ext = (cs: CrossSection, h: number, z = 0) => {
      if (cs.isEmpty() || h <= 0) return null;
      let m = gc(cs.extrude(h));
      if (z) m = gc(m.translate([0, 0, z]));
      return m;
    };

    let baseM: Manifold | null;
    let reliefM: Manifold | null = null;

    if (ringSolid && ringT === T) body2D = gc(body2D.add(ringSolid));
    if (holeCS) body2D = gc(body2D.subtract(holeCS));
    baseM = ext(body2D, T);
    if (ringSolid && ringT !== T) {
      const ringOnly = gc(ringSolid.subtract(holeCS!));
      const ringM = ext(ringOnly, ringT);
      if (ringM && baseM) baseM = gc(baseM.add(ringM));
    }

    const designCut = holeCS ? gc(design.subtract(holeCS)) : design;

    if (p.baseShape !== 'none') {
      if (p.style === 'raised') {
        reliefM = ext(designCut, H, T);
      } else {
        const depth = Math.min(H, T - 0.4);
        if (depth < H) warnings.push(`La profundidad se limitó a ${depth.toFixed(1)} mm para no atravesar la base.`);
        const cut = ext(design, depth + 0.01, T - depth);
        if (cut && baseM) baseM = gc(baseM.subtract(cut));
        if (p.style === 'inlay') reliefM = ext(designCut, depth, T - depth);
      }
    }

    if (!baseM) throw new Error('La base quedó vacía.');
    const combinedM = reliefM ? gc(baseM.add(reliefM)) : baseM;

    // islands check on the 2D footprint
    const outers = body2D.toPolygons().filter((poly) => signedArea(poly as Vec2[]) > 0).length;
    if (outers > 1)
      warnings.push(
        `La base tiene ${outers} piezas sueltas. Sube el borde o «Unir huecos», o usa base rectangular/círculo.`,
      );

    const bb = combinedM.boundingBox();
    return {
      base: toMeshData(baseM),
      relief: reliefM ? toMeshData(reliefM) : null,
      combined: toMeshData(combinedM),
      size: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]],
      ringCenter,
      pieces: outers,
      warnings,
    };
  } finally {
    for (const t of trash) {
      try { t.delete(); } catch { /* already freed */ }
    }
  }
}
