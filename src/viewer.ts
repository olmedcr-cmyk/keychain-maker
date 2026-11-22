// three.js preview (Z up, millimetres).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MeshData, Result } from './keychain';

export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private group = new THREE.Group();
  private baseMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.55, metalness: 0.05 });
  private reliefMat = new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.45, metalness: 0.05 });
  private grid: THREE.GridHelper;
  private hasFramed = false;
  onPick: ((x: number, y: number) => void) | null = null;
  /** Height of the plane used for click-picking (top of the base). */
  pickZ = 0;

  constructor(private el: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(0, -110, 90);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(60, -80, 140);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9ab8ff, 0.8);
    rim.position.set(-80, 90, 40);
    this.scene.add(rim);

    this.grid = new THREE.GridHelper(200, 20, 0xa9a9a3, 0xcdcdc8);
    this.grid.rotation.x = Math.PI / 2;
    this.scene.add(this.grid, this.group);

    // click (without drag) → pick a point on the base plane
    let down: [number, number] | null = null;
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4 || !this.onPick) return;
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, this.camera);
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.pickZ), hit)) this.onPick(hit.x, hit.y);
    });

    new ResizeObserver(() => this.resize()).observe(el);
    this.resize();
    const loop = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    loop();
  }

  setColors(base: string, relief: string) {
    this.baseMat.color.set(base);
    this.reliefMat.color.set(relief);
  }

  setBackground(bg: string, dark: boolean) {
    this.scene.background = new THREE.Color(bg);
    this.scene.remove(this.grid);
    this.grid.dispose();
    this.grid = new THREE.GridHelper(200, 20, dark ? 0x3a3a3a : 0xa9a9a3, dark ? 0x262626 : 0xcdcdc8);
    this.grid.rotation.x = Math.PI / 2;
    this.scene.add(this.grid);
  }

  private meshFrom(d: MeshData, mat: THREE.Material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
    g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  }

  show(r: Result) {
    for (const c of [...this.group.children]) {
      (c as THREE.Mesh).geometry?.dispose();
      this.group.remove(c);
    }
    if (r.base) this.group.add(this.meshFrom(r.base, this.baseMat));
    if (r.relief) this.group.add(this.meshFrom(r.relief, this.reliefMat));
    if (!this.hasFramed) {
      this.frame();
      this.hasFramed = true;
    }
  }

  frame() {
    const box = new THREE.Box3().setFromObject(this.group);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    this.controls.target.copy(c);
    this.camera.position.set(c.x, c.y - size * 1.25, c.z + size * 1.05);
    this.controls.update();
  }

  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  private resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
