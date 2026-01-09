export type WorldMeta = {
    worldId: string;
    seed: string;
    savedAt: number;
  
    player: { x: number; y: number; z: number; yaw: number; pitch: number; hp: number };
    inventory: { hotbar: any[]; main: any[]; active: number };
    worldTime: number;
  };
  
  type DBStores = 'worlds' | 'chunks';
  
  export class DB {
    private dbp: Promise<IDBDatabase> | null = null;
  
    private open() {
      if (this.dbp) return this.dbp;
      this.dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open('voxel-sandbox', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds', { keyPath: 'worldId' });
          if (!db.objectStoreNames.contains('chunks')) db.createObjectStore('chunks', { keyPath: 'key' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return this.dbp;
    }
  
    async put(store: DBStores, value: any) {
      const db = await this.open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(store).put(value);
      });
    }
  
    async get<T>(store: DBStores, key: any): Promise<T | undefined> {
      const db = await this.open();
      return await new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      });
    }
  
    async getAll<T>(store: DBStores): Promise<T[]> {
      const db = await this.open();
      return await new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      });
    }
  
    async saveWorldMeta(meta: WorldMeta) {
      await this.put('worlds', meta);
    }
  
    async listWorlds(): Promise<WorldMeta[]> {
      const all = await this.getAll<WorldMeta>('worlds');
      all.sort((a, b) => b.savedAt - a.savedAt);
      return all;
    }
  
    chunkKey(worldId: string, cx: number, cz: number) {
      return `${worldId}|${cx},${cz}`;
    }
  
    async saveChunkDelta(worldId: string, cx: number, cz: number, deltaBytes: Uint8Array) {
      const key = this.chunkKey(worldId, cx, cz);
      await this.put('chunks', { key, worldId, cx, cz, deltaBytes, savedAt: Date.now() });
    }
  
    async loadChunkDelta(worldId: string, cx: number, cz: number): Promise<Uint8Array | null> {
      const key = this.chunkKey(worldId, cx, cz);
      const v = await this.get<any>('chunks', key);
      return v?.deltaBytes ?? null;
    }
  }
  