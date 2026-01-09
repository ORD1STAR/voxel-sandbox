import * as THREE from 'three';

import { Renderer } from './Renderer';
import { Input } from './Input';
import { Time } from './Time';

import { World } from '../world/World';
import { BlockId, BLOCKS, cropFromStage, cropStage, isCrop } from '../data/blocks';
import { ITEMS } from '../data/items';
import { Player, type Slot } from '../entities/Player';
import { ItemDrop } from '../entities/ItemDrop';
import { PassiveMob } from '../entities/mobs/PassiveMob';
import { HostileMob } from '../entities/mobs/HostileMob';

import { voxelRaycast } from '../utils/voxelRaycast';
import { HUD } from '../ui/HUD';
import { InventoryUI } from '../ui/InventoryUI';

type GameUIRefs = {
  debugEl: HTMLDivElement;
  inventoryEl: HTMLDivElement;
  healthEl: HTMLDivElement;
  hotbarEl: HTMLDivElement;
};

export class Game {

  private controlsObject: THREE.Object3D | null = null;

  renderer: Renderer;
  input: Input;
  time = new Time();

  world: World;
  player = new Player();

  hud: HUD;
  invUI: InventoryUI;

  // selection highlight
  highlight: THREE.LineSegments;

  // entities
  drops: ItemDrop[] = [];
  passive: PassiveMob[] = [];
  hostile: HostileMob[] = [];

  // interactions
  breakT = 0;
  breakDelay = 0.25;

  placeCooldown = 0;
  attackCooldown = 0;

  // farming tick accumulator
  farmAcc = 0;

  // UI state
  started = false;

  constructor(private canvas: HTMLCanvasElement, private ui: GameUIRefs) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(this.renderer.camera, this.renderer.renderer.domElement);
    this.world = new World(this.renderer.scene);

    this.hud = new HUD(ui.debugEl, ui.healthEl, ui.hotbarEl);
    this.invUI = new InventoryUI(ui.inventoryEl);

    // pointer lock object (camera holder)
    const plc: any = this.input.controls;
    this.controlsObject = (typeof plc.getObject === 'function') ? plc.getObject() : (plc.object ?? null);

    if (this.controlsObject) {
      this.renderer.scene.add(this.controlsObject);
    }

    // highlight box
    const hg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
    const hm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    this.highlight = new THREE.LineSegments(hg, hm);
    this.highlight.visible = false;
    this.renderer.scene.add(this.highlight);

    // lock/unlock UI behavior
    this.input.controls.addEventListener('unlock', () => {
      // allow user to use UI again when Esc unlocks
      if (!this.invUI.isOpen()) this.invUI.toggle(true);
    });
    this.input.controls.addEventListener('lock', () => {
      if (this.invUI.isOpen()) this.invUI.toggle(false);
    });

    // hotbar scroll
    window.addEventListener('wheel', (e) => {
      if (!this.started) return;
      if (this.invUI.isOpen()) return;
      const dir = Math.sign(e.deltaY);
      this.player.inventory.setActive(this.player.inventory.active + dir);
    }, { passive: true });

    // quick save
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyK' && this.started) this.saveNow().catch(console.error);
    });

    // click canvas to lock pointer
    this.canvas.addEventListener('click', () => {
      if (!this.started) return;
      if (this.invUI.isOpen()) return;
      this.input.lock();
    });

    // avoid losing saves
    window.addEventListener('beforeunload', () => {
      void this.saveNow();
    });
  }

  async startNewWorld(seed: string) {
    await this.world.newWorld(seed);
    this.started = true;

    // starter items
    this.player.inventory.add('log', 5);
    this.player.inventory.add('seeds', 4);
    this.player.inventory.add('planks', 4);
    this.player.inventory.add('sticks', 4);

    this.spawnInitialMobs();

    this.player.respawn(this.world);
    this.loop();
  }

  async loadWorld(worldId: string) {
    const meta = await this.world.loadWorld(worldId);
    this.started = true;

    // restore player
    this.player.pos.set(meta.player.x, meta.player.y, meta.player.z);
    this.player.hp = meta.player.hp;

    // restore inventory
    this.player.inventory.hotbar = meta.inventory.hotbar as Slot[];
    this.player.inventory.main = meta.inventory.main as Slot[];
    this.player.inventory.active = meta.inventory.active ?? 0;

    this.spawnInitialMobs();
    this.loop();
  }

  private spawnInitialMobs() {
    // clear old
    for (const d of this.drops) this.renderer.scene.remove(d.mesh);
    for (const m of this.passive) this.renderer.scene.remove(m.mesh);
    for (const m of this.hostile) this.renderer.scene.remove(m.mesh);
    this.drops = [];
    this.passive = [];
    this.hostile = [];

    // passive
    for (let i = 0; i < 4; i++) {
      const m = new PassiveMob();
      m.pos.set(this.player.pos.x + (Math.random() - 0.5) * 20, 20, this.player.pos.z + (Math.random() - 0.5) * 20);
      this.renderer.scene.add(m.mesh);
      this.passive.push(m);
    }

    // hostile
    for (let i = 0; i < 2; i++) {
      const m = new HostileMob();
      m.pos.set(this.player.pos.x + (Math.random() - 0.5) * 16, 20, this.player.pos.z + (Math.random() - 0.5) * 16);
      this.renderer.scene.add(m.mesh);
      this.hostile.push(m);
    }
  }

  private cameraPos(): THREE.Vector3 {
    // player.pos is the collision-center; eye is above it
    return new THREE.Vector3(this.player.pos.x, this.player.pos.y + 0.6, this.player.pos.z);
  }

  private wishDir(): THREE.Vector3 {
    const f = this.input.forward - this.input.back;
    const s = this.input.right - this.input.left;

    const dir = new THREE.Vector3();
    if (f === 0 && s === 0) return dir;

    const forward = new THREE.Vector3();
    this.renderer.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize().negate();

    dir.addScaledVector(forward, f);
    dir.addScaledVector(right, s);
    dir.normalize();
    return dir;
  }

  private getTarget(maxDist = 6) {
    const camPos = this.cameraPos();
    const dir = new THREE.Vector3();
    this.renderer.camera.getWorldDirection(dir);

    return voxelRaycast(
      camPos.x, camPos.y, camPos.z,
      dir.x, dir.y, dir.z,
      maxDist,
      (x, y, z) => {
        const b = this.world.getBlock(x, y, z);
        return b !== BlockId.Air && BLOCKS[b].solid;
      }
    );
  }

  private activeItem() {
    const s = this.player.inventory.getActive();
    if (!s) return null;
    return ITEMS[s.id] ?? null;
  }

  private dropItem(id: string, count: number, pos: THREE.Vector3) {
    const d = new ItemDrop(id, count);
    d.pos.copy(pos);
    d.vel.set((Math.random() - 0.5) * 2, 3 + Math.random() * 2, (Math.random() - 0.5) * 2);
    this.drops.push(d);
    this.renderer.scene.add(d.mesh);
  }

  private breakBlock(gx: number, gy: number, gz: number) {
    const b = this.world.getBlock(gx, gy, gz);
    const def = BLOCKS[b];
    if (!def.breakable) return;

    // crops: extra yield on mature
    if (isCrop(b)) {
      const st = cropStage(b);
      if (st >= 3) {
        this.dropItem('food', 1, new THREE.Vector3(gx + 0.5, gy + 0.5, gz + 0.5));
        this.dropItem('seeds', 1, new THREE.Vector3(gx + 0.5, gy + 0.5, gz + 0.5));
      } else {
        this.dropItem('seeds', 1, new THREE.Vector3(gx + 0.5, gy + 0.5, gz + 0.5));
      }
    } else if (def.dropItem) {
      this.dropItem(def.dropItem, 1, new THREE.Vector3(gx + 0.5, gy + 0.5, gz + 0.5));
    }

    this.world.setBlock(gx, gy, gz, BlockId.Air);
  }

  private placeOrUse(hit: ReturnType<Game['getTarget']>) {
    if (!hit.hit) return;

    const b = this.world.getBlock(hit.bx, hit.by, hit.bz);
    const active = this.activeItem();
    const slot = this.player.inventory.getActive();

    // Hoe: till soil
    if (active?.tool?.kind === 'hoe') {
      if ((b === BlockId.Dirt || b === BlockId.Grass) && this.world.getBlock(hit.bx, hit.by + 1, hit.bz) === BlockId.Air) {
        this.world.setBlock(hit.bx, hit.by, hit.bz, BlockId.Farmland);
      }
      return;
    }

    // Seeds: plant only on farmland with air above
    if (slot?.id === 'seeds') {
      if (b === BlockId.Farmland && this.world.getBlock(hit.bx, hit.by + 1, hit.bz) === BlockId.Air) {
        this.world.setBlock(hit.bx, hit.by + 1, hit.bz, cropFromStage(0));
        this.player.inventory.remove('seeds', 1);
      }
      return;
    }

    // Place blocks
    if (active?.type === 'block' && active.placeBlock !== undefined && slot) {
      const px = hit.bx + hit.nx;
      const py = hit.by + hit.ny;
      const pz = hit.bz + hit.nz;

      if (this.world.getBlock(px, py, pz) !== BlockId.Air) return;
      if (this.player.canPlaceBlockInside(this.world, px, py, pz)) return;

      this.world.setBlock(px, py, pz, active.placeBlock);
      this.player.inventory.remove(slot.id, 1);
    }
  }

  private tryAttack(): boolean {
    const camPos = this.cameraPos();
    const dir = new THREE.Vector3();
    this.renderer.camera.getWorldDirection(dir);

    const dmg = this.player.attackDamage();
    const range = 2.2;

    const hitMob = (m: HostileMob | PassiveMob) => {
      if (m.dead) return false;
      const to = m.pos.clone().sub(camPos);
      const dist = to.length();
      if (dist > range) return false;
      to.normalize();
      if (to.dot(dir) < 0.90) return false;

      m.hp -= dmg;
      m.vel.addScaledVector(dir, 5);
      if (m.hp <= 0) {
        m.dead = true;
        this.renderer.scene.remove(m.mesh);
        // drops
        this.dropItem('food', 1, m.pos.clone());
      }
      return true;
    };

    for (const m of this.hostile) if (hitMob(m)) return true;
    for (const m of this.passive) if (hitMob(m)) return true;
    return false;
  }

  private updateEntities(dt: number) {
    for (const d of this.drops) d.update(dt, this.world);
    // pickup
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      const dist = d.pos.distanceTo(this.player.pos);
      if (dist < 1.6) {
        const left = this.player.inventory.add(d.itemId, d.count);
        if (left <= 0) {
          this.renderer.scene.remove(d.mesh);
          this.drops.splice(i, 1);
        } else {
          d.count = left;
        }
      }
    }

    for (const m of this.passive) if (!m.dead) m.update(dt, this.world);

    // hostile AI: chase player at “night”
    const night = (Math.sin(this.world.worldTime * (Math.PI / 30)) < 0); // ~60s cycle
    for (const m of this.hostile) {
      if (m.dead) continue;
      const to = this.player.pos.clone().sub(m.pos);
      const dist = to.length();

      if (night && dist < 18) {
        to.normalize();
        m.vel.x = to.x * 3.2;
        m.vel.z = to.z * 3.2;

        // damage on contact
        if (dist < 1.2 && m.atkCooldown <= 0) {
          this.player.hp -= 1;
          this.player.vel.addScaledVector(to, 5);
          m.atkCooldown = 0.8;
          if (this.player.hp <= 0) this.player.respawn(this.world);
        }
      } else {
        // idle
        m.vel.x *= 0.9;
        m.vel.z *= 0.9;
      }

      m.update(dt, this.world);
    }
  }

  async saveNow() {
    if (!this.started) return;
    if (!this.world.worldId) return;

    const e = new THREE.Euler().setFromQuaternion(this.renderer.camera.quaternion, 'YXZ');

    await this.world.save({
      worldId: this.world.worldId,
      seed: this.world.seed,
      savedAt: Date.now(),
      player: {
        x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z,
        yaw: e.y, pitch: e.x,
        hp: this.player.hp
      },
      inventory: {
        hotbar: this.player.inventory.hotbar,
        main: this.player.inventory.main,
        active: this.player.inventory.active
      },
      worldTime: this.world.worldTime
    });
  }

  private loop = async () => {
    this.time.tick();
    const dt = this.time.dt;

    this.world.tick(dt);
    await this.world.updateStreaming(this.player.pos);

    // inventory toggle
    if (this.input.inventory) {
      // naive debounce: only toggle when E just pressed
      // (quick and dirty: rely on key repeat delay)
      this.invUI.toggle(!this.invUI.isOpen());
      if (this.invUI.isOpen()) this.input.unlock();
    }

    // farming growth tick
    this.farmAcc += dt;
    if (this.farmAcc >= this.world.growthInterval) {
      this.farmAcc = 0;
      this.world.farmingGrowthStep();
    }

    // player movement
    const wish = this.wishDir();
    this.player.update(dt, this.world, wish, this.input.jump, this.input.sprint);

    // sync camera holder to player position (eye offset)
    if (this.controlsObject) {
      this.controlsObject.position.set(this.player.pos.x, this.player.pos.y + 0.6, this.player.pos.z);
    } else {
      // fallback: move the camera directly
      this.renderer.camera.position.set(this.player.pos.x, this.player.pos.y + 0.6, this.player.pos.z);
    }

    // target highlight
    const hit = this.getTarget(6);
    if (hit.hit) {
      this.highlight.visible = true;
      this.highlight.position.set(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5);
    } else {
      this.highlight.visible = false;
    }

    // interactions
    this.placeCooldown = Math.max(0, this.placeCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (!this.invUI.isOpen()) {
      // right click: place/use
      if (this.input.mouseDownR && this.placeCooldown <= 0) {
        this.placeCooldown = 0.18;
        this.placeOrUse(hit);
      }

      // left click: attack first, else break
      if (this.input.mouseDownL) {
        if (this.attackCooldown <= 0 && this.tryAttack()) {
          this.attackCooldown = 0.35;
          this.breakT = 0;
        } else if (hit.hit) {
          this.breakT += dt;
          if (this.breakT >= this.breakDelay) {
            this.breakT = 0;
            this.breakBlock(hit.bx, hit.by, hit.bz);
          }
        }
      } else {
        this.breakT = 0;
      }
    }

    this.updateEntities(dt);

    // render UI
    this.hud.render(this.player, this.world.seed);
    if (this.invUI.isOpen()) this.invUI.render(this.player);

    this.renderer.render();
    requestAnimationFrame(this.loop);
  };
}
