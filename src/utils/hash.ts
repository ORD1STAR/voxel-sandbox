export function hashString32(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  
  export function hashCoords32(x: number, y: number, z: number, seed: number): number {
    let h = seed ^ 0x9e3779b9;
    h = Math.imul(h ^ x, 0x85ebca6b);
    h = Math.imul(h ^ y, 0xc2b2ae35);
    h = Math.imul(h ^ z, 0x27d4eb2f);
    h ^= h >>> 16;
    return h >>> 0;
  }
  