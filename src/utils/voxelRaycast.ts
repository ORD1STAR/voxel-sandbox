export type RayHit = {
    hit: boolean;
    bx: number; by: number; bz: number;
    nx: number; ny: number; nz: number;
    dist: number;
  };
  
  export function voxelRaycast(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    maxDist: number,
    isSolid: (x: number, y: number, z: number) => boolean
  ): RayHit {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;
  
    const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
    const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
    const tDeltaZ = dz === 0 ? Infinity : Math.abs(1 / dz);
  
    const fracX = ox - Math.floor(ox);
    const fracY = oy - Math.floor(oy);
    const fracZ = oz - Math.floor(oz);
  
    let tMaxX = dx === 0 ? Infinity : (dx > 0 ? (1 - fracX) : fracX) * tDeltaX;
    let tMaxY = dy === 0 ? Infinity : (dy > 0 ? (1 - fracY) : fracY) * tDeltaY;
    let tMaxZ = dz === 0 ? Infinity : (dz > 0 ? (1 - fracZ) : fracZ) * tDeltaZ;
  
    let nx = 0, ny = 0, nz = 0;
    let t = 0;
  
    for (let i = 0; i < 4096 && t <= maxDist; i++) {
      if (isSolid(x, y, z)) {
        return { hit: true, bx: x, by: y, bz: z, nx, ny, nz, dist: t };
      }
  
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX; t = tMaxX; tMaxX += tDeltaX;
          nx = -stepX; ny = 0; nz = 0;
        } else {
          z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ;
          nx = 0; ny = 0; nz = -stepZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY; t = tMaxY; tMaxY += tDeltaY;
          nx = 0; ny = -stepY; nz = 0;
        } else {
          z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ;
          nx = 0; ny = 0; nz = -stepZ;
        }
      }
    }
  
    return { hit: false, bx: 0, by: 0, bz: 0, nx: 0, ny: 0, nz: 0, dist: maxDist };
  }
  