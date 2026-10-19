import * as THREE from 'three';
import type { World } from '../world/World';
import { aabbMove, type AABB } from '../utils/aabb';
import { clamp } from '../utils/math';
import { ITEMS } from '../data/items';
import { BlockId, BLOCKS } from '../data/blocks';

export type ItemStack = { id: string; count: number };
export type Slot = ItemStack | null;

export class Inventory {
  hotbar: Slot[] = Array.from({ length: 9 }, () => null);
  main: Slot[] = Array.from({ length: 27 }, () => null);

  active = 0;

  get allSlots(): Slot[] { return [...this.hotbar, ...this.main]; }

  getActive(): Slot { return this.hotbar[this.active]; }

  setActive(i: number) { this.active = ((i % 9) + 9) % 9; }

  add(id: string, count: number): number {
    const def = ITEMS[id] ?? { stackMax: 64 };
    let left = count;

    const tryFill = (arr: Slot[]) => {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (!s || s.id !== id) continue;
        const cap = def.stackMax - s.count;
        if (cap <= 0) continue;
        const take = Math.min(cap, left);
        s.count += take;
        left -= take;
        if (left <= 0) return;
      }
    };

    const tryEmpty = (arr: Slot[]) => {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i]) continue;
        const take = Math.min(def.stackMax, left);
        arr[i] = { id, count: take };
        left -= take;
        if (left <= 0) return;
      }
    };

    tryFill(this.hotbar); tryFill(this.main);
    tryEmpty(this.hotbar); tryEmpty(this.main);

    return left;
  }

  has(needId: string, needCount: number): boolean {
    let c = 0;
    for (const s of this.allSlots) if (s?.id === needId) c += s.count;
    return c >= needCount;
  }

  remove(needId: string, needCount: number): boolean {
    if (!this.has(needId, needCount)) return false;
    let left = needCount;
    const consume = (arr: Slot[]) => {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (!s || s.id !== needId) continue;
        const take = Math.min(s.count, left);
        s.count -= take;
        left -= take;
        if (s.count <= 0) arr[i] = null;
        if (left <= 0) return;
      }
    };
    consume(this.hotbar); consume(this.main);
    return true;
  }
}

export class Player {
  pos = new THREE.Vector3(0, 30, 0);
  vel = new THREE.Vector3();
  yaw = 0;
  pitch = 0;

  onGround = false;

  hp = 10;
  maxHp = 10;

  inventory = new Inventory();

  bboxHalf = new THREE.Vector3(0.3, 0.9, 0.3);

  respawn(world: World) {
    // spawn just above the terrain surface at the origin
    this.pos.set(0.5, world.gen.heightAt(0, 0) + 2, 0.5);
    this.vel.set(0, 0, 0);
    this.hp = this.maxHp;
  }

  getAABB(): AABB {
    return {
      minX: this.pos.x - this.bboxHalf.x,
      minY: this.pos.y - this.bboxHalf.y,
      minZ: this.pos.z - this.bboxHalf.z,
      maxX: this.pos.x + this.bboxHalf.x,
      maxY: this.pos.y + this.bboxHalf.y,
      maxZ: this.pos.z + this.bboxHalf.z
    };
  }

  private collides(a: AABB, world: World): boolean {
    const x0 = Math.floor(a.minX), x1 = Math.floor(a.maxX);
    const y0 = Math.floor(a.minY), y1 = Math.floor(a.maxY);
    const z0 = Math.floor(a.minZ), z1 = Math.floor(a.maxZ);

    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const b = world.getBlock(x, y, z);
      if (b !== BlockId.Air && BLOCKS[b].solid) return true;
    }
    return false;
  }

  private moveAxis(world: World, dx: number, dy: number, dz: number) {
    let a = this.getAABB();

    // X
    if (dx !== 0) {
      const moved = aabbMove(a, dx, 0, 0);
      if (!this.collides(moved, world)) this.pos.x += dx;
      else this.vel.x = 0;
    }

    // Z
    a = this.getAABB();
    if (dz !== 0) {
      const moved = aabbMove(a, 0, 0, dz);
      if (!this.collides(moved, world)) this.pos.z += dz;
      else this.vel.z = 0;
    }

    // Y
    a = this.getAABB();
    if (dy !== 0) {
      const moved = aabbMove(a, 0, dy, 0);
      if (!this.collides(moved, world)) {
        this.pos.y += dy;
        this.onGround = false;
      } else {
        if (dy < 0) this.onGround = true;
        this.vel.y = 0;
      }
    }
  }

  update(dt: number, world: World, wishDir: THREE.Vector3, jump: boolean, sprint: boolean) {
    const speed = sprint ? 7.0 : 4.5;

    const accel = this.onGround ? 40 : 18;
    const targetVx = wishDir.x * speed;
    const targetVz = wishDir.z * speed;

    this.vel.x += clamp(targetVx - this.vel.x, -accel * dt, accel * dt);
    this.vel.z += clamp(targetVz - this.vel.z, -accel * dt, accel * dt);

    this.vel.y -= 18 * dt;

    if (jump && this.onGround) {
      this.vel.y = 7.2;
      this.onGround = false;
    }

    const dx = this.vel.x * dt;
    const dy = this.vel.y * dt;
    const dz = this.vel.z * dt;

    this.moveAxis(world, dx, 0, 0);
    this.moveAxis(world, 0, 0, dz);
    this.moveAxis(world, 0, dy, 0);

    if (this.pos.y < -10) this.respawn(world);
  }

  canPlaceBlockInside(world: World, x: number, y: number, z: number): boolean {
    const a = this.getAABB();
    const bx0 = Math.floor(a.minX), bx1 = Math.floor(a.maxX);
    const by0 = Math.floor(a.minY), by1 = Math.floor(a.maxY);
    const bz0 = Math.floor(a.minZ), bz1 = Math.floor(a.maxZ);
    return x >= bx0 && x <= bx1 && y >= by0 && y <= by1 && z >= bz0 && z <= bz1;
  }

  attackDamage(): number {
    const s = this.inventory.getActive();
    if (!s) return 1;
    const def = ITEMS[s.id];
    return def?.tool?.damage ?? 1;
  }
}
