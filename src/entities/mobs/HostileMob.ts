import * as THREE from 'three';
import type { World } from '../../world/World';
import { Entity } from '../Entity';

type State = 'idle' | 'chase' | 'attack';

export class HostileMob extends Entity {
  mesh: THREE.Mesh;
  state: State = 'idle';
  atkCooldown = 0;

  constructor() {
    super();
    this.hp = 10;
    const g = new THREE.BoxGeometry(0.8, 1.2, 0.8);
    const m = new THREE.MeshStandardMaterial({ color: 0x8a3cff, roughness: 1 });
    this.mesh = new THREE.Mesh(g, m);
  }

  update(dt: number, world: World) {
    // actual behavior is driven by Game (needs player position); keep physics minimal here
    this.atkCooldown = Math.max(0, this.atkCooldown - dt);
    this.vel.y -= 18 * dt;
    this.pos.addScaledVector(this.vel, dt);
    if (this.pos.y < 1) { this.pos.y = 1; this.vel.y = 0; }
    this.mesh.position.copy(this.pos);
  }
}
