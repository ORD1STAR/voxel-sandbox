import * as THREE from 'three';
import { Chunk, CHUNK_HEIGHT, CHUNK_SIZE } from './Chunk';
import { WorldGen } from './generation/WorldGen';
import { BlockId, BLOCKS, cropFromStage, cropStage, isCrop } from '../data/blocks';
import { DB, type WorldMeta } from './storage/db';
import { decodeDelta, encodeDelta } from './storage/codec';
import { hashCoords32 } from '../utils/hash';
import { mulberry32 } from '../utils/rng';

export class World {
  gen: WorldGen;
  chunks = new Map<string, Chunk>();
  db = new DB();

  worldId = '';
  seed = '';

  // persisted time (seconds)
  worldTime = 0;

  // config
  viewRadiusChunks = 6;

  // farming
  growthInterval = 5.0;

  constructor(public scene: THREE.Scene) {
    this.gen = new WorldGen('default');
  }

  async newWorld(seed: string) {
    this.seed = seed || 'default';
    this.worldId = `${this.seed}`;
    this.gen = new WorldGen(this.seed);
    this.clear();
    this.worldTime = 0;
  }

  async loadWorld(worldId: string) {
    const meta = await this.db.get<WorldMeta>('worlds', worldId);
    if (!meta) throw new Error('World not found');
    this.seed = meta.seed;
    this.worldId = meta.worldId;
    this.gen = new WorldGen(this.seed);
    this.clear();
    this.worldTime = meta.worldTime ?? 0;
    return meta;
  }

  clear() {
    for (const c of this.chunks.values()) this.scene.remove(c.mesh);
    this.chunks.clear();
  }

  chunkAt(cx: number, cz: number) {
    return this.chunks.get(`${cx},${cz}`) ?? null;
  }

  getBlock(gx: number, y: number, gz: number): BlockId {
    if (y < 0 || y >= CHUNK_HEIGHT) return BlockId.Air;
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cz = Math.floor(gz / CHUNK_SIZE);
    const c = this.chunkAt(cx, cz);
    if (!c) return BlockId.Air;
    const lx = gx - cx * CHUNK_SIZE;
    const lz = gz - cz * CHUNK_SIZE;
    return c.getLocal(lx, y, lz);
  }

  setBlock(gx: number, y: number, gz: number, b: BlockId) {
    if (y <= 0) return; // protect bedrock layer
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cz = Math.floor(gz / CHUNK_SIZE);
    const c = this.chunkAt(cx, cz);
    if (!c) return;
    const lx = gx - cx * CHUNK_SIZE;
    const lz = gz - cz * CHUNK_SIZE;

    if (b !== BlockId.Air && !BLOCKS[b].breakable) return;

    c.setLocal(lx, y, lz, b);

    // neighbor chunks may need rebuild if on edge
    const markDirty = (cx2: number, cz2: number) => {
      const n = this.chunkAt(cx2, cz2);
      if (n) n.dirty = true;
    };
    
    if (lx === 0) markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) markDirty(cx + 1, cz);
    if (lz === 0) markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) markDirty(cx, cz + 1);
    
  }

  async ensureChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return;

    const base = this.gen.generateChunk(CHUNK_SIZE, CHUNK_HEIGHT, cx, cz);
    const chunk = new Chunk(cx, cz, base);

    // load delta
    if (this.worldId) {
      const bytes = await this.db.loadChunkDelta(this.worldId, cx, cz);
      if (bytes) {
        const d = decodeDelta(bytes);
        chunk.delta = d;
        for (const [i, b] of d) chunk.blocks[i] = b;
        chunk.dirty = true;
      }
    }

    this.chunks.set(key, chunk);
    this.scene.add(chunk.mesh);
  }

  unloadFar(keepKeys: Set<string>) {
    for (const [k, c] of this.chunks) {
      if (keepKeys.has(k)) continue;
      this.scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      this.chunks.delete(k);
    }
  }

  async updateStreaming(playerPos: THREE.Vector3) {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE);

    const keep = new Set<string>();
    const tasks: Promise<void>[] = [];

    for (let dz = -this.viewRadiusChunks; dz <= this.viewRadiusChunks; dz++) {
      for (let dx = -this.viewRadiusChunks; dx <= this.viewRadiusChunks; dx++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        keep.add(`${cx},${cz}`);
        tasks.push(this.ensureChunk(cx, cz));
      }
    }
    await Promise.all(tasks);
    this.unloadFar(keep);

    // rebuild dirty meshes
    for (const c of this.chunks.values()) {
      if (!c.dirty) continue;
      c.rebuildMesh((gx, y, gz) => this.getBlock(gx, y, gz));
    }
  }

  tick(dt: number) {
    this.worldTime += dt;
  }

  // Farming growth: deterministic RNG by (seed, pos, tickIndex)
  farmingGrowthStep() {
    const tickIndex = Math.floor(this.worldTime / this.growthInterval);
    for (const c of this.chunks.values()) {
      const ox = c.cx * CHUNK_SIZE;
      const oz = c.cz * CHUNK_SIZE;

      for (let y = 1; y < CHUNK_HEIGHT - 1; y++) for (let lx = 0; lx < CHUNK_SIZE; lx++) for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const b = c.getLocal(lx, y, lz);
        if (!isCrop(b)) continue;

        const st = cropStage(b);
        if (st >= 3) continue;

        const gx = ox + lx;
        const gz = oz + lz;

        const h = hashCoords32(gx, y ^ tickIndex, gz, this.gen.seed);
        const r = mulberry32(h);
        const chance = 0.28;
        if (r() < chance) {
          c.setLocal(lx, y, lz, cropFromStage(st + 1));
        }
      }

      if (c.dirty) c.rebuildMesh((gx, y, gz) => this.getBlock(gx, y, gz));
    }
  }

  async save(meta: WorldMeta) {
    if (!this.worldId) return;

    meta.savedAt = Date.now();
    await this.db.saveWorldMeta(meta);

    for (const c of this.chunks.values()) {
      const bytes = encodeDelta(c.delta);
      await this.db.saveChunkDelta(this.worldId, c.cx, c.cz, bytes);
    }
  }
}
