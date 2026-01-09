import * as THREE from 'three';
import { BlockId, BLOCKS } from '../data/blocks';
import { greedyMesh, buildGeometry } from './meshing/greedyMesh';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

export class Chunk {
  key: string;

  base: Uint8Array;
  blocks: Uint8Array;
  delta = new Map<number, number>(); // index -> blockId

  mesh: THREE.Mesh;
  dirty = true;

  constructor(
    public cx: number,
    public cz: number,
    baseBlocks: Uint8Array
  ) {
    this.key = `${cx},${cz}`;
    this.base = baseBlocks;
    this.blocks = baseBlocks.slice();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.0
    });

    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    this.mesh.frustumCulled = true;
    this.mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
  }

  idx(lx: number, y: number, lz: number) {
    return (y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
  }

  inBounds(lx: number, y: number, lz: number) {
    return lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT;
  }

  getLocal(lx: number, y: number, lz: number): BlockId {
    if (!this.inBounds(lx, y, lz)) return BlockId.Air;
    return this.blocks[this.idx(lx, y, lz)] as BlockId;
  }

  setLocal(lx: number, y: number, lz: number, b: BlockId) {
    if (!this.inBounds(lx, y, lz)) return;
    const i = this.idx(lx, y, lz);
    if (!BLOCKS[b].breakable && b !== BlockId.Air) return;

    this.blocks[i] = b;
    const baseB = this.base[i];
    if (b !== baseB) this.delta.set(i, b);
    else this.delta.delete(i);

    this.dirty = true;
  }

  rebuildMesh(getNeighbor: (gx: number, y: number, gz: number) => BlockId) {
    const md = greedyMesh(CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE, (x, y, z) => {
      // For meshing we need neighbor-aware sampling at edges.
      if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
        const gx = this.cx * CHUNK_SIZE + x;
        const gz = this.cz * CHUNK_SIZE + z;
        return getNeighbor(gx, y, gz);
      }
      if (y < 0 || y >= CHUNK_HEIGHT) return BlockId.Air;
      return this.getLocal(x, y, z);
    });

    const g = buildGeometry(md);
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;

    this.dirty = false;
  }
}
