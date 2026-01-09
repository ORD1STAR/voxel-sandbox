export type AABB = { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number; };

export function aabbMove(a: AABB, dx: number, dy: number, dz: number): AABB {
  return { minX: a.minX + dx, minY: a.minY + dy, minZ: a.minZ + dz, maxX: a.maxX + dx, maxY: a.maxY + dy, maxZ: a.maxZ + dz };
}
