export function encodeDelta(delta: Map<number, number>): Uint8Array {
    // Format: [countLE16][(indexLE16, blockU8)*count]
    const count = delta.size;
    const out = new Uint8Array(2 + count * 3);
    out[0] = count & 255;
    out[1] = (count >>> 8) & 255;
  
    let o = 2;
    for (const [i, b] of delta) {
      out[o++] = i & 255;
      out[o++] = (i >>> 8) & 255;
      out[o++] = b & 255;
    }
    return out;
  }
  
  export function decodeDelta(bytes: Uint8Array): Map<number, number> {
    const m = new Map<number, number>();
    if (bytes.length < 2) return m;
    const count = bytes[0] | (bytes[1] << 8);
    let o = 2;
    for (let k = 0; k < count; k++) {
      const i = bytes[o++] | (bytes[o++] << 8);
      const b = bytes[o++];
      m.set(i, b);
    }
    return m;
  }
  