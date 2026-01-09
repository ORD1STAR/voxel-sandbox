import * as THREE from 'three';

export class Renderer {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  sun: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b6ff);
    this.scene.fog = new THREE.Fog(0x87b6ff, 40, 140);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.95);
    this.sun.position.set(80, 120, 40);
    this.sun.castShadow = false;

    this.scene.add(this.ambient, this.sun);

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
