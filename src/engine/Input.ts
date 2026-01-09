import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';


export class Input {
  keys = new Set<string>();
  mouseDownL = false;
  mouseDownR = false;

  controls: PointerLockControls;

  constructor(public camera: THREE.Camera, public dom: HTMLElement) {
    this.controls = new PointerLockControls(camera, dom);

    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDownL = true;
      if (e.button === 2) this.mouseDownR = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDownL = false;
      if (e.button === 2) this.mouseDownR = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  lock() { this.controls.lock(); }
  unlock() { this.controls.unlock(); }

  get forward() { return this.keys.has('KeyW') ? 1 : 0; }
  get back() { return this.keys.has('KeyS') ? 1 : 0; }
  get left() { return this.keys.has('KeyA') ? 1 : 0; }
  get right() { return this.keys.has('KeyD') ? 1 : 0; }
  get jump() { return this.keys.has('Space'); }
  get sprint() { return this.keys.has('ShiftLeft'); }
  get inventory() { return this.keys.has('KeyE'); }
}
