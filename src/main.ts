import './style.css';
import { buildKeychain, DEFAULTS, initGeometry, type Params, type Result } from './keychain';
import { parseSvg, type SvgLayer } from './svg';
import { FONTS, loadFont, loadFontFile, textToSvg } from './text';
import { SHAPES } from './shapes';
import { toBinarySTL, download } from './stl';
import { Viewer } from './viewer';
import type { Font } from 'opentype.js';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const $$ = <T extends HTMLElement = HTMLElement>(sel: string) => [...document.querySelectorAll(sel)] as T[];

// ---------------- state ----------------
const STORE_KEY = 'keychain-maker:v1';
let params: Params = { ...DEFAULTS };
let source: 'svg' | 'text' | 'shape' = 'text';
let svgText = '';
let svgName = '';
let shapeKey = 'heart';
let fontKey = 'pacifico';
let customFont: Font | null = null;
let align: 'left' | 'center' | 'right' = 'center';
let result: Result | null = null;

try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  if (saved?.params) params = { ...DEFAULTS, ...saved.params, ringManual: null };
  if (saved?.source) source = saved.source;
  if (saved?.fontKey && FONTS[saved.fontKey]) fontKey = saved.fontKey;
  if (saved?.shapeKey && SHAPES[saved.shapeKey]) shapeKey = saved.shapeKey;
  if (saved?.text) $<HTMLTextAreaElement>('#text').value = saved.text;
  if (saved?.svgText) (svgText = saved.svgText), (svgName = saved.svgName || 'SVG guardado');
  if (saved?.align) align = saved.align;
} catch { /* storage unavailable */ }
if (source === 'svg' && !svgText) source = 'text';

function persist() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ params, source, fontKey, shapeKey, align, text: $<HTMLTextAreaElement>('#text').value,
        svgText: svgText.length < 400_000 ? svgText : '', svgName }),
    );
  } catch { /* ignore */ }
}

// ---------------- field definitions ----------------
type Field =
  | { k: keyof Params; type: 'range'; label: string; min: number; max: number; step: number; unit?: string; show?: () => boolean }
  | { k: keyof Params; type: 'select'; label: string; options: [string, string][]; show?: () => boolean }
  | { k: keyof Params; type: 'check'; label: string; show?: () => boolean };

const hasBase = () => params.baseShape !== 'none';
const FIELDS: Record<string, Field[]> = {
  design: [
    { k: 'size', type: 'range', label: 'Tamaño (lado mayor)', min: 15, max: 150, step: 1, unit: 'mm' },
    { k: 'whiteKnockout', type: 'check', label: 'Las zonas blancas del SVG son huecos', show: () => source === 'svg' },
    { k: 'mirror', type: 'check', label: 'Espejo horizontal' },
  ],
  base: [
    { k: 'baseShape', type: 'select', label: 'Forma de la base', options: [
      ['silhouette', 'Silueta (sigue el contorno)'], ['rounded', 'Rectángulo redondeado'], ['circle', 'Círculo'], ['none', 'Sin base (solo el diseño recortado)']] },
    { k: 'border', type: 'range', label: 'Borde alrededor', min: 0, max: 12, step: 0.1, unit: 'mm', show: hasBase },
    { k: 'bridge', type: 'range', label: 'Unir huecos entre piezas', min: 0, max: 10, step: 0.1, unit: 'mm', show: () => params.baseShape === 'silhouette' },
    { k: 'fillHoles', type: 'check', label: 'Rellenar agujeros interiores de la base', show: () => params.baseShape === 'silhouette' },
    { k: 'cornerRadius', type: 'range', label: 'Radio de esquinas', min: 0, max: 25, step: 0.5, unit: 'mm', show: () => params.baseShape === 'rounded' },
    { k: 'baseThickness', type: 'range', label: 'Grosor de la base', min: 1, max: 10, step: 0.1, unit: 'mm' },
    { k: 'style', type: 'select', label: 'Estilo del diseño', show: hasBase, options: [
      ['raised', 'En relieve (sobresale)'], ['engraved', 'Grabado (hundido)'], ['inlay', 'Incrustado al ras (multicolor)']] },
    { k: 'reliefHeight', type: 'range', label: 'Altura / profundidad', min: 0.2, max: 6, step: 0.1, unit: 'mm', show: hasBase },
  ],
  ring: [
    { k: 'ringType', type: 'select', label: 'Tipo', options: [
      ['loop', 'Anilla exterior (pestaña)'], ['hole', 'Agujero dentro de la base'], ['none', 'Sin arandela']] },
    { k: 'ringPlacement', type: 'select', label: 'Colocación', show: () => params.ringType !== 'none', options: [
      ['auto', 'Automática (por ángulo)'], ['manual', 'Manual (clic en la vista)']] },
    { k: 'ringAngle', type: 'range', label: 'Posición (ángulo)', min: 0, max: 360, step: 1, unit: '°',
      show: () => params.ringType !== 'none' && params.ringPlacement === 'auto' },
    { k: 'ringOffset', type: 'range', label: 'Desplazar hacia fuera/dentro', min: -6, max: 6, step: 0.1, unit: 'mm',
      show: () => params.ringType !== 'none' && params.ringPlacement === 'auto' },
    { k: 'ringOuter', type: 'range', label: 'Diámetro exterior', min: 5, max: 20, step: 0.1, unit: 'mm', show: () => params.ringType !== 'none' },
    { k: 'ringHole', type: 'range', label: 'Diámetro del agujero', min: 2, max: 14, step: 0.1, unit: 'mm', show: () => params.ringType !== 'none' },
    { k: 'ringThickness', type: 'range', label: 'Grosor anilla (0 = igual que base)', min: 0, max: 10, step: 0.1, unit: 'mm', show: () => params.ringType === 'loop' },
  ],
};

function renderFields() {
  for (const [group, fields] of Object.entries(FIELDS)) {
    const box = $(`[data-group="${group}"]`);
    box.innerHTML = '';
    for (const f of fields) {
      const wrap = document.createElement('div');
      wrap.className = `field ${f.type}`;
      wrap.dataset.k = f.k;
      const v = params[f.k] as any;
      if (f.type === 'range') {
        wrap.innerHTML = `<div class="lbl"><span>${f.label}</span><span class="val"><input type="number" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}"/>${f.unit ?? ''}</span></div>
          <input type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}"/>`;
        const [num, range] = wrap.querySelectorAll('input');
        const set = (x: string, from: HTMLInputElement) => {
          const n = parseFloat(x);
          if (Number.isNaN(n)) return;
          (params as any)[f.k] = n;
          if (from !== num) num.value = String(n);
          if (from !== range) range.value = String(n);
          schedule();
        };
        range.addEventListener('input', () => set(range.value, range));
        num.addEventListener('change', () => set(num.value, num));
      } else if (f.type === 'select') {
        wrap.innerHTML = `<label><span>${f.label}</span><select>${f.options.map(([val, l]) => `<option value="${val}" ${val === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
        wrap.querySelector('select')!.addEventListener('change', (e) => {
          (params as any)[f.k] = (e.target as HTMLSelectElement).value;
          if (f.k === 'ringPlacement') params.ringManual = null;
          updateVisibility();
          schedule();
        });
      } else {
        wrap.innerHTML = `<label class="check"><input type="checkbox" ${v ? 'checked' : ''}/><span>${f.label}</span></label>`;
        wrap.querySelector('input')!.addEventListener('change', (e) => {
          (params as any)[f.k] = (e.target as HTMLInputElement).checked;
          schedule();
        });
      }
      box.appendChild(wrap);
    }
  }
  updateVisibility();
}

function updateVisibility() {
  for (const fields of Object.values(FIELDS))
    for (const f of fields) {
      const el = $(`.field[data-k="${f.k}"]`);
      if (el) el.hidden = f.show ? !f.show() : false;
    }
  $('#manualHint').hidden = !(params.ringType !== 'none' && params.ringPlacement === 'manual');
  $('#dlRelief').hidden = !(hasBase() && params.style !== 'engraved');
  $('#dlBase').hidden = $('#dlRelief').hidden;
}

// ---------------- source UI ----------------
function setSource(s: typeof source) {
  source = s;
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.src === s));
  $$('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== s));
  updateVisibility();
  schedule();
}
$$('.tabs button').forEach((b) => b.addEventListener('click', () => setSource(b.dataset.src as any)));

const fontSel = $<HTMLSelectElement>('#font');
fontSel.innerHTML = Object.entries(FONTS).map(([k, f]) => `<option value="${k}">${f.label}</option>`).join('');
fontSel.value = fontKey;
fontSel.addEventListener('change', () => { fontKey = fontSel.value; customFont = null; schedule(); });
$<HTMLInputElement>('#fontFile').addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    customFont = await loadFontFile(file);
    if (![...fontSel.options].some((o) => o.value === 'custom')) fontSel.add(new Option(`Tu fuente: ${file.name}`, 'custom'));
    fontSel.value = 'custom';
    schedule();
  } catch (err) { showError(`No se pudo leer la fuente: ${(err as Error).message}`); }
});
['#text', '#letterSpacing', '#lineHeight'].forEach((s) => $(s).addEventListener('input', schedule));
$$('#align button').forEach((b) => {
  b.classList.toggle('active', b.dataset.v === align);
  b.addEventListener('click', () => {
    align = b.dataset.v as any;
    $$('#align button').forEach((x) => x.classList.toggle('active', x === b));
    schedule();
  });
});

const shapesBox = $('#shapes');
for (const [k, s] of Object.entries(SHAPES)) {
  const b = document.createElement('button');
  b.className = 'shape' + (k === shapeKey ? ' active' : '');
  b.innerHTML = `<span class="thumb">${s.svg}</span><span>${s.label}</span>`;
  b.addEventListener('click', () => {
    shapeKey = k;
    $$('.shape').forEach((x) => x.classList.toggle('active', x === b));
    schedule();
  });
  shapesBox.appendChild(b);
}

function useSvg(text: string, name: string) {
  if (!/<svg[\s>]/i.test(text)) return showError('Eso no parece un SVG.');
  svgText = text;
  svgName = name;
  $('#dropTitle').textContent = name;
  const base = name.replace(/\.svg$/i, '').trim();
  if (base) $<HTMLInputElement>('#fileName').value = base;
  params.ringManual = null;
  setSource('svg');
}
const drop = $('#drop');
$<HTMLInputElement>('#svgFile').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) useSvg(await f.text(), f.name);
});
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
drop.addEventListener('drop', async (e) => {
  e.preventDefault();
  const f = (e as DragEvent).dataTransfer?.files?.[0];
  if (f) useSvg(await f.text(), f.name);
});
// drop anywhere on the page
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f && /svg/i.test(f.type || f.name)) useSvg(await f.text(), f.name);
});
$('#svgPasteBtn').addEventListener('click', () => useSvg($<HTMLTextAreaElement>('#svgPaste').value, 'SVG pegado'));
if (svgText) $('#dropTitle').textContent = svgName;

// ---------------- viewer ----------------
const viewer = new Viewer($('#viewer'));
const root = document.documentElement;
const applyTheme = () => {
  const dark = root.dataset.theme === 'dark';
  viewer.setBackground(getComputedStyle(root).getPropertyValue('--viewport').trim() || '#e3e3df', dark);
  const label = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  $('#theme').title = label;
  $('#theme').setAttribute('aria-label', label);
};
$('#theme').addEventListener('click', () => {
  const dark = root.dataset.theme !== 'dark';
  if (dark) root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  try { localStorage.setItem('keychain-maker:theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  applyTheme();
});
applyTheme();
const colors = () => viewer.setColors($<HTMLInputElement>('#colBase').value, $<HTMLInputElement>('#colRelief').value);
['#colBase', '#colRelief'].forEach((s) => $(s).addEventListener('input', colors));
colors();
viewer.onPick = (x, y) => {
  if (params.ringType === 'none' || params.ringPlacement !== 'manual') return;
  params.ringManual = [x, y];
  schedule();
};
$('#reframe').addEventListener('click', () => viewer.frame());

// ---------------- build ----------------
let timer = 0;
let building = false;
let again = false;
function schedule() {
  clearTimeout(timer);
  timer = window.setTimeout(rebuild, 60);
}

async function currentLayers(): Promise<SvgLayer[]> {
  if (source === 'svg') {
    if (!svgText) throw new Error('Sube un SVG para empezar.');
    return parseSvg(svgText);
  }
  if (source === 'shape') return parseSvg(SHAPES[shapeKey].svg);
  const text = $<HTMLTextAreaElement>('#text').value;
  if (!text.trim()) throw new Error('Escribe un texto.');
  const font = fontSel.value === 'custom' && customFont ? customFont : await loadFont(fontKey);
  return parseSvg(textToSvg(font, {
    text,
    letterSpacing: parseFloat($<HTMLInputElement>('#letterSpacing').value) || 0,
    lineHeight: parseFloat($<HTMLInputElement>('#lineHeight').value) || 1.05,
    align,
  }));
}

function showError(msg: string | null) {
  const el = $('#err');
  el.hidden = !msg;
  el.textContent = msg ?? '';
}

let ready = false;
async function rebuild() {
  if (!ready) return;
  if (building) { again = true; return; }
  building = true;
  try {
    const t0 = performance.now();
    const layers = await currentLayers();
    result = buildKeychain(layers, params);
    viewer.pickZ = params.baseThickness;
    viewer.show(result);
    const [w, h, d] = result.size;
    $('#stats').innerHTML = `<span class="dot">●</span> <b>${w.toFixed(1)} × ${h.toFixed(1)} × ${d.toFixed(1)} mm</b>&emsp;${result.combined.triangles.toLocaleString('es')} triángulos&emsp;${Math.round(performance.now() - t0)} ms`;
    const warn = $('#warn');
    warn.hidden = !result.warnings.length;
    warn.textContent = result.warnings.join(' ');
    showError(null);
    persist();
  } catch (err) {
    showError((err as Error).message || String(err));
  } finally {
    building = false;
    if (again) { again = false; schedule(); }
  }
}

// ---------------- export ----------------
const fname = () => ($<HTMLInputElement>('#fileName').value.trim() || 'llavero').replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/g, '_');
$('#dlAll').addEventListener('click', () => result && download(toBinarySTL(result.combined, fname()), `${fname()}.stl`));
$('#dlBase').addEventListener('click', () => result?.base && download(toBinarySTL(result.base), `${fname()}-base.stl`));
$('#dlRelief').addEventListener('click', () => result?.relief && download(toBinarySTL(result.relief), `${fname()}-relieve.stl`));

// ---------------- boot ----------------
renderFields();
setSource(source);
initGeometry()
  .then(() => { ready = true; return rebuild(); })
  .catch((e) => showError(`No se pudo cargar el motor 3D: ${e.message}`));
