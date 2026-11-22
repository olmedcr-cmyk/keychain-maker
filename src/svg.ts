// SVG → 2D polygons (in SVG units, Y flipped so +Y is up).
// Uses three.js SVGLoader for parsing (paths, transforms, curves, strokes).
import { Color } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

export type Vec2 = [number, number];

export interface SvgLayer {
  /** Closed contours. */
  contours: Vec2[][];
  fillRule: 'NonZero' | 'EvenOdd';
  /** True if this shape is (near) white — can be used as a knockout. */
  isWhite: boolean;
}

const CURVE_DIVISIONS = 24;

function isNone(v: unknown): boolean {
  return v === undefined || v === null || v === 'none' || v === 'transparent';
}

function luminance(c: Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function signedArea(poly: Vec2[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1]);
  }
  return a / 2;
}

function dedupe(points: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const p of points) {
    const q = out[out.length - 1];
    if (!q || Math.abs(q[0] - p[0]) > 1e-9 || Math.abs(q[1] - p[1]) > 1e-9) out.push(p);
  }
  if (out.length > 1) {
    const a = out[0], b = out[out.length - 1];
    if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) out.pop();
  }
  return out;
}

export function parseSvg(svgText: string): SvgLayer[] {
  const loader = new SVGLoader();
  const data = loader.parse(svgText);
  const layers: SvgLayer[] = [];

  for (const path of data.paths) {
    const style: any = path.userData?.style ?? {};
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const color = path.color ?? new Color(0, 0, 0);

    // Fill
    const fill = style.fill;
    const fillOpacity = style.fillOpacity ?? 1;
    if (!isNone(fill) && fillOpacity > 0.05) {
      const contours: Vec2[][] = [];
      for (const sub of path.subPaths) {
        const pts = sub.getPoints(CURVE_DIVISIONS).map((p) => [p.x, -p.y] as Vec2);
        const clean = dedupe(pts);
        if (clean.length >= 3) contours.push(clean);
      }
      if (contours.length) {
        const fillColor = new Color();
        try { fillColor.setStyle(fill); } catch { fillColor.copy(color); }
        layers.push({
          contours,
          fillRule: style.fillRule === 'evenodd' ? 'EvenOdd' : 'NonZero',
          isWhite: luminance(fillColor) > 0.9,
        });
      }
    }

    // Stroke → triangles (each normalised CCW so a NonZero fill unions them)
    const stroke = style.stroke;
    const strokeWidth = style.strokeWidth ?? 1;
    if (!isNone(stroke) && strokeWidth > 0 && (style.strokeOpacity ?? 1) > 0.05) {
      const contours: Vec2[][] = [];
      for (const sub of path.subPaths) {
        const pts = sub.getPoints(CURVE_DIVISIONS);
        const geom = SVGLoader.pointsToStroke(pts, style, CURVE_DIVISIONS, 0.001);
        if (!geom) continue;
        const pos = geom.getAttribute('position');
        const idx = geom.getIndex();
        const count = idx ? idx.count : pos.count;
        for (let i = 0; i + 2 < count; i += 3) {
          const tri: Vec2[] = [0, 1, 2].map((k) => {
            const vi = idx ? idx.getX(i + k) : i + k;
            return [pos.getX(vi), -pos.getY(vi)] as Vec2;
          });
          const a = signedArea(tri);
          if (Math.abs(a) < 1e-12) continue;
          contours.push(a < 0 ? tri.reverse() : tri);
        }
        geom.dispose();
      }
      if (contours.length) {
        const sc = new Color();
        try { sc.setStyle(stroke); } catch { sc.copy(color); }
        layers.push({ contours, fillRule: 'NonZero', isWhite: luminance(sc) > 0.9 });
      }
    }
  }
  return layers;
}
