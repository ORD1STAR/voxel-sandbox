import { createNoise2D, createNoise3D } from 'simplex-noise';
import alea from 'alea';

import { BlockId } from '../../data/blocks';
import { hashString32, hashCoords32 } from '../../utils/hash';
import { mulberry32 } from '../../utils/rng';

export type Biome = 'plains' | 'desert' | 'forest';

export class WorldGen {
  seedStr: string;
  seed: number;

  nHeight: (x: number, y: number) => number;
  nBiome: (x: number, y: number) => number;
  nCave: (x: number, y: number, z: number) => number;
  nOre: (x: number, y: number, z: number) => number;

  constructor(seedStr: string) {
    this.seedStr = seedStr;
    this.seed = hashString32(seedStr);

    const rngH = alea(seedStr + ':h');
    const rngB = alea(seedStr + ':b');
    const rngC = alea(seedStr + ':c');
    const rngO = alea(seedStr + ':o');

    this.nHeight = createNoise2D(rngH);
    this.nBiome  = createNoise2D(rngB);
    this.nCave   = createNoise3D(rngC);
    this.nOre    = createNoise3D(rngO);
  }

  biomeAt(x: number, z: number): Biome {
    const v = this.nBiome(x * 0.0035, z * 0.0035);
    if (v < -0.2) return 'desert';
    if (v > 0.25) return 'forest';
    return 'plains';
  }

  heightAt(x: number, z: number): number {
    const b = this.biomeAt(x, z);
    const base = 20;
    const amp = b === 'desert' ? 7 : b === 'forest' ? 11 : 9;

    let h = 0;
    let f = 0.01;
    let a = 1.0;
    for (let o = 0; o < 4; o++) {
      h += this.nHeight(x * f, z * f) * a;
      f *= 2.0;
      a *= 0.5;
    }
    const v = base + h * amp;
    return Math.max(3, Math.min(60, Math.floor(v)));
  }

  caveAt(_x: number, _y: number, _z: number): boolean {
    // Caves disabled while stabilizing visuals
    return false;
  }

  oreAt(x: number, y: number, z: number): BlockId {
    const v = this.nOre(x * 0.08, y * 0.08, z * 0.08);
    if (y < 18 && v > 0.58) return BlockId.IronOre;
    if (y < 40 && v > 0.62) return BlockId.CoalOre;
    return BlockId.Stone;
  }

  tryTree(cx: number, cz: number, gx: number, gy: number, gz: number, biome: Biome): { x: number; y: number; z: number }[] {
    const s = hashCoords32(gx, 0, gz, this.seed);
    const r = mulberry32(s);
    const p = biome === 'forest' ? 0.06 : biome === 'plains' ? 0.01 : 0.0;
    if (r() > p) return [];

    const h = 4 + Math.floor(r() * 3);
    const blocks: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < h; i++) blocks.push({ x: gx, y: gy + i, z: gz });

    const canopyY = gy + h;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      const d = Math.abs(dx) + Math.abs(dz);
      if (d > 3) continue;
      blocks.push({ x: gx + dx, y: canopyY, z: gz + dz });
      if (d <= 2) blocks.push({ x: gx + dx, y: canopyY - 1, z: gz + dz });
    }

    return blocks;
  }

  tryStructure(cx: number, cz: number, originX: number, originY: number, originZ: number): { x: number; y: number; z: number; b: BlockId }[] {
    const s = hashCoords32(cx, 0, cz, this.seed ^ 0x13579bdf);
    const r = mulberry32(s);
    if (r() > 0.02) return [];

    const out: { x: number; y: number; z: number; b: BlockId }[] = [];
    const w = 5, d = 4;
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
      const edge = x === 0 || x === w - 1 || z === 0 || z === d - 1;
      if (!edge) continue;
      out.push({ x: originX + x, y: originY, z: originZ + z, b: BlockId.Planks });
      if (r() < 0.65) out.push({ x: originX + x, y: originY + 1, z: originZ + z, b: BlockId.Planks });
    }
    return out;
  }

  generateChunk(chunkSize: number, height: number, cx: number, cz: number): Uint8Array {
    var blocks = new Uint8Array(chunkSize * height * chunkSize);
    const idx = (lx: number, y: number, lz: number) => (y * chunkSize + lz) * chunkSize + lx;

    const ox = cx * chunkSize;
    const oz = cz * chunkSize;

    for (let lx = 0; lx < chunkSize; lx++) for (let lz = 0; lz < chunkSize; lz++) {
      const gx = ox + lx;
      const gz = oz + lz;

      const biome = this.biomeAt(gx, gz);
      const h = this.heightAt(gx, gz);

      for (let y = 0; y < height; y++) {
        let b = BlockId.Air;

        if (y === 0) b = BlockId.Bedrock;
        else if (y < h - 4) {
          b = this.oreAt(gx, y, gz);
        } else if (y < h - 1) {
          b = BlockId.Dirt;
        } else if (y === h - 1) {
          b = (biome === 'desert') ? BlockId.Sand : BlockId.Grass;
        }

        blocks[idx(lx, y, lz)] = b;
      }


      if (biome !== 'desert') {
        const topY = h - 1;
        const tree = this.tryTree(cx, cz, gx, topY + 1, gz, biome);
        for (const p of tree) {
          const lx2 = p.x - ox, lz2 = p.z - oz;
          if (lx2 < 0 || lx2 >= chunkSize || lz2 < 0 || lz2 >= chunkSize) continue;
          if (p.y <= 0 || p.y >= height) continue;

          const isLog = p.x === gx && p.z === gz && p.y <= topY + 6;
          blocks[idx(lx2, p.y, lz2)] = isLog ? BlockId.Log : BlockId.Leaves;
        }
      }
    }

    const centerX = ox + 6;
    const centerZ = oz + 6;
    const y = this.heightAt(centerX, centerZ);
    const sBlocks = this.tryStructure(cx, cz, 4, y, 4);
    for (const p of sBlocks) {
      const lx = p.x, lz = p.z;
      if (lx < 0 || lx >= chunkSize || lz < 0 || lz >= chunkSize) continue;
      if (p.y <= 0 || p.y >= height) continue;
      blocks[idx(lx, p.y, lz)] = p.b;
    }

    return blocks;
  }
}
