import * as THREE from 'three';
import type { World } from '../world/World';
import { Entity } from './Entity';

export class ItemDrop extends Entity {
  mesh: THREE.Mesh;
  itemId: string;
  count: number;

  constructor(itemId: string, count: number) {
    super();
    this.itemId = itemId;
    this.count = count;
    this.hp = 1;

    const g = new THREE.SphereGeometry(0.15, 8, 8);
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0 });
    this.mesh = new THREE.Mesh(g, m);
  }

  update(dt: number, world: World) {
    // simple gravity + bob
    this.vel.y -= 18 * dt;
    this.pos.addScaledVector(this.vel, dt);

    // ground clamp
    if (this.pos.y < 1) {
      this.pos.y = 1;
      this.vel.y = 0;
    }

    this.mesh.position.copy(this.pos);
    this.mesh.position.y += Math.sin(world.worldTime * 5) * 0.05;
  }
}
