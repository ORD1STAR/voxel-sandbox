import type { Player } from '../entities/Player';

export class HUD {
  constructor(
    private debugEl: HTMLDivElement,
    private healthEl: HTMLDivElement,
    private hotbarEl: HTMLDivElement
  ) {}

  render(player: Player, seed: string) {
    this.debugEl.textContent =
      `seed: ${seed}\n` +
      `pos: ${player.pos.x.toFixed(2)}, ${player.pos.y.toFixed(2)}, ${player.pos.z.toFixed(2)}\n` +
      `hp: ${player.hp}/${player.maxHp}`;

    // health
    this.healthEl.innerHTML = '';
    const hearts = Math.ceil(player.maxHp / 2);
    const full = Math.ceil(player.hp / 2);
    for (let i = 0; i < hearts; i++) {
      const d = document.createElement('div');
      d.className = 'heart' + (i < full ? '' : ' empty');
      this.healthEl.appendChild(d);
    }

    // hotbar
    this.hotbarEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const s = player.inventory.hotbar[i];
      const d = document.createElement('div');
      d.className = 'slot' + (i === player.inventory.active ? ' active' : '');
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = s?.id ?? '';
      const count = document.createElement('div');
      count.className = 'count';
      count.textContent = s && s.count > 1 ? String(s.count) : '';
      d.appendChild(label);
      d.appendChild(count);
      this.hotbarEl.appendChild(d);
    }
  }
}
