import * as THREE from 'three';
import { BLOCKS, BlockId } from '../../data/blocks';

export type MeshData = {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
};

function colorToRGB(c: number): [number, number, number] {
  const r = ((c >> 16) & 255) / 255;
  const g = ((c >> 8) & 255) / 255;
  const b = (c & 255) / 255;
  return [r, g, b];
}

function faceColor(block: BlockId, nx: number, ny: number, nz: number): number {
  let col = BLOCKS[block].color;

  if (block === BlockId.Grass) {
    if (ny === 1) col = 0x4ea33b;        // top
    else if (ny === -1) col = 0x2b1a10;  // bottom
    else col = 0x6a4a2a;                 // sides
  } else if (block === BlockId.Dirt) {
    col = ny === 1 ? 0x6a4a2a : 0x50351f;
  } else if (block === BlockId.Sand) {
    col = ny === -1 ? 0xb9a35f : 0xd6c27a;
  } else if (block === BlockId.Stone) {
    col = ny === 1 ? 0x8a8a8a : 0x6f6f6f;
  } else if (block === BlockId.Log) {
    col = ny !== 0 ? 0x8a6a46 : 0x6f4f32;
  } else if (block === BlockId.Leaves) {
    col = 0x2fa85a;
  }

  return col;
}

// SIMPLE FACE-CULLING MESHER (one quad per exposed face)
export function greedyMesh(
  sx: number, sy: number, sz: number,
  get: (x: number, y: number, z: number) => BlockId
): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const pushFace = (
    x: number, y: number, z: number,
    nx: number, ny: number, nz: number,
    block: BlockId
  ) => {
    const baseIndex = positions.length / 3;

    // Build quad vertices (axis‑aligned)
    const size = 1;
    const ex = x;
    const ey = y;
    const ez = z;

    let v: number[][];

    if (nx === 1) {
      // +X
      v = [
        [ex + size, ey, ez],
        [ex + size, ey, ez + size],
        [ex + size, ey + size, ez + size],
        [ex + size, ey + size, ez]
      ];
    } else if (nx === -1) {
      // -X
      v = [
        [ex, ey, ez],
        [ex, ey + size, ez],
        [ex, ey + size, ez + size],
        [ex, ey, ez + size]
      ];
    } else if (ny === 1) {
      // +Y
      v = [
        [ex, ey + size, ez],
        [ex + size, ey + size, ez],
        [ex + size, ey + size, ez + size],
        [ex, ey + size, ez + size]
      ];
    } else if (ny === -1) {
      // -Y
      v = [
        [ex, ey, ez],
        [ex, ey, ez + size],
        [ex + size, ey, ez + size],
        [ex + size, ey, ez]
      ];
    } else if (nz === 1) {
      // +Z
      v = [
        [ex, ey, ez + size],
        [ex, ey + size, ez + size],
        [ex + size, ey + size, ez + size],
        [ex + size, ey, ez + size]
      ];
    } else {
      // -Z
      v = [
        [ex, ey, ez],
        [ex + size, ey, ez],
        [ex + size, ey + size, ez],
        [ex, ey + size, ez]
      ];
    }

    const col = faceColor(block, nx, ny, nz);
    const [cr, cg, cb] = colorToRGB(col);

    for (const p of v) {
      positions.push(p[0], p[1], p[2]);
      normals.push(nx, ny, nz);
      colors.push(cr, cg, cb);
    }

    // Pick the triangle winding so the front face always matches the normal
    // (the vertex orders above are not all counter-clockwise).
    const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
    const bx = v[2][0] - v[0][0], by = v[2][1] - v[0][1], bz = v[2][2] - v[0][2];
    const dot = (ay * bz - az * by) * nx + (az * bx - ax * bz) * ny + (ax * by - ay * bx) * nz;

    if (dot > 0) {
      indices.push(
        baseIndex, baseIndex + 1, baseIndex + 2,
        baseIndex, baseIndex + 2, baseIndex + 3
      );
    } else {
      indices.push(
        baseIndex, baseIndex + 2, baseIndex + 1,
        baseIndex, baseIndex + 3, baseIndex + 2
      );
    }
  };

  for (let x = 0; x < sx; x++) {
    for (let y = 0; y < sy; y++) {
      for (let z = 0; z < sz; z++) {
        const b = get(x, y, z);
        if (b === BlockId.Air) continue;

        // neighbor sampling
        const n = (nx: number, ny: number, nz: number) =>
          get(x + nx, y + ny, z + nz) !== BlockId.Air &&
          BLOCKS[get(x + nx, y + ny, z + nz)].solid;

        if (!n( 1, 0, 0)) pushFace(x, y, z,  1, 0, 0, b);
        if (!n(-1, 0, 0)) pushFace(x, y, z, -1, 0, 0, b);
        if (!n(0,  1, 0)) pushFace(x, y, z, 0,  1, 0, b);
        if (!n(0, -1, 0)) pushFace(x, y, z, 0, -1, 0, b);
        if (!n(0, 0,  1)) pushFace(x, y, z, 0, 0,  1, b);
        if (!n(0, 0, -1)) pushFace(x, y, z, 0, 0, -1, b);
      }
    }
  }

  return { positions, normals, colors, indices };
}

export function buildGeometry(md: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(md.positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(md.normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(md.colors, 3));
  g.setIndex(md.indices);
  g.computeBoundingSphere();
  return g;
}
