import type { Game } from '../engine/Game';
import type { WorldMeta } from '../world/storage/db';

export class StartScreen {
  constructor(private el: HTMLDivElement, private game: Game) {}

  async init() {
    const seedInput = document.querySelector<HTMLInputElement>('#seedInput')!;
    const newBtn = document.querySelector<HTMLButtonElement>('#newWorldBtn')!;
    const loadBtn = document.querySelector<HTMLButtonElement>('#loadWorldBtn')!;
    const listEl = document.querySelector<HTMLDivElement>('#worldList')!;

    const refreshList = async () => {
      listEl.innerHTML = '';
      const worlds = await this.game.world.db.listWorlds();
      if (worlds.length === 0) {
        const p = document.createElement('div');
        p.style.opacity = '0.8';
        p.style.fontSize = '12px';
        p.textContent = 'No saved worlds yet.';
        listEl.appendChild(p);
        return;
      }

      for (const w of worlds) {
        const b = document.createElement('button');
        b.className = 'worldBtn';
        b.textContent = `${w.worldId} (saved ${new Date(w.savedAt).toLocaleString()})`;
        b.onclick = async () => {
          this.hide();
          await this.game.loadWorld(w.worldId);
        };
        listEl.appendChild(b);
      }
    };

    await refreshList();

    newBtn.onclick = async () => {
      const seed = seedInput.value.trim() || 'default';
      this.hide();
      await this.game.startNewWorld(seed);
    };

    loadBtn.onclick = async () => {
      // loads most recent if exists
      const worlds = await this.game.world.db.listWorlds();
      if (worlds.length === 0) return;
      this.hide();
      await this.game.loadWorld(worlds[0].worldId);
    };

    // if user returns to menu later you can call refreshList() again
    // (kept simple for now).
  }

  hide() {
    this.el.classList.add('hidden');
  }

  show() {
    this.el.classList.remove('hidden');
  }
}
