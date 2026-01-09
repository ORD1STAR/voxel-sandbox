import * as THREE from 'three';
import type { World } from '../../world/World';
import { Entity } from '../Entity';
import { BlockId, BLOCKS } from '../../data/blocks';

type State = 'wander' | 'flee';

export class PassiveMob extends Entity {
  mesh: THREE.Mesh;
  state: State = 'wander';
  dir = new THREE.Vector3(1, 0, 0);
  changeT = 0;

  constructor() {
    super();
    this.hp = 6;
    const g = new THREE.BoxGeometry(0.7, 0.6, 0.9);
    const m = new THREE.MeshStandardMaterial({ color: 0xffd6a1, roughness: 1 });
    this.mesh = new THREE.Mesh(g, m);
  }

  private solidAt(world: World, x: number, y: number, z: number) {
    const b = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return b !== BlockId.Air && BLOCKS[b].solid;
  }

  update(dt: number, world: World) {
    this.changeT -= dt;
    if (this.changeT <= 0) {
      const a = Math.random() * Math.PI * 2;
      this.dir.set(Math.cos(a), 0, Math.sin(a));
      this.changeT = 2 + Math.random() * 2;
    }

    const speed = this.state === 'flee' ? 3.2 : 1.6;
    const next = this.pos.clone().addScaledVector(this.dir, speed * dt);

    // avoid walking into solid
    if (!this.solidAt(world, next.x, next.y, next.z) && !this.solidAt(world, next.x, next.y - 1, next.z)) {
      // if in air, fall
      this.vel.y -= 18 * dt;
      this.pos.addScaledVector(this.vel, dt);
    } else {
      this.pos.copy(next);
    }

    // clamp above ground
    if (this.pos.y < 1) this.pos.y = 1;

    this.mesh.position.copy(this.pos);
  }
}
