import type { Player, Slot } from '../entities/Player';
import { ITEMS } from '../data/items';

type Held = Slot;

export class InventoryUI {
  open = false;
  private held: Held = null;

  constructor(private el: HTMLDivElement) {}

  toggle(v?: boolean) {
    this.open = v ?? !this.open;
    this.el.classList.toggle('hidden', !this.open);
  }

  isOpen() { return this.open; }

  private slotLabel(s: Slot): string {
    if (!s) return '';
    return ITEMS[s.id]?.name ?? s.id;
  }

  private slotCap(id: string): number {
    return ITEMS[id]?.stackMax ?? 64;
  }

  private tryMerge(into: Slot, from: Slot): { into: Slot; leftover: Slot } {
    if (!from) return { into, leftover: null };
    if (!into) return { into: { ...from }, leftover: null };
    if (into.id !== from.id) return { into, leftover: { ...from } };

    const cap = this.slotCap(into.id);
    const space = cap - into.count;
    const take = Math.min(space, from.count);
    into.count += take;

    const left = from.count - take;
    return { into, leftover: left > 0 ? { id: from.id, count: left } : null };
  }

  private renderSlot(div: HTMLDivElement, s: Slot) {
    div.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = this.slotLabel(s);

    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = s && s.count > 1 ? String(s.count) : '';

    div.appendChild(label);
    div.appendChild(count);
  }

  private bindSlot(div: HTMLDivElement, getSlot: () => Slot, setSlot: (s: Slot) => void) {
    div.onmousedown = (e) => {
      e.preventDefault();

      const s = getSlot();

      // Pick up
      if (!this.held && s) {
        this.held = { ...s };
        setSlot(null);
        return;
      }

      // Place into empty
      if (this.held && !s) {
        setSlot(this.held);
        this.held = null;
        return;
      }

      // Merge if same, otherwise swap
      if (this.held && s) {
        if (this.held.id === s.id) {
          const r = this.tryMerge({ ...s }, this.held);
          setSlot(r.into);
          this.held = r.leftover;
        } else {
          setSlot(this.held);
          this.held = { ...s };
        }
      }
    };
  }

  private craft(player: Player, id: 'planks' | 'sticks' | 'wood_pickaxe' | 'hoe') {
    // Minimal hardcoded recipes (kept here so it's immediately testable)
    if (id === 'planks') {
      if (!player.inventory.remove('log', 1)) return;
      player.inventory.add('planks', 4);
      return;
    }
    if (id === 'sticks') {
      if (!player.inventory.remove('planks', 2)) return;
      player.inventory.add('sticks', 4);
      return;
    }
    if (id === 'wood_pickaxe') {
      if (!player.inventory.remove('sticks', 2)) return;
      if (!player.inventory.remove('planks', 3)) { player.inventory.add('sticks', 2); return; }
      player.inventory.add('wood_pickaxe', 1);
      return;
    }
    if (id === 'hoe') {
      if (!player.inventory.remove('sticks', 2)) return;
      if (!player.inventory.remove('planks', 2)) { player.inventory.add('sticks', 2); return; }
      player.inventory.add('hoe', 1);
      return;
    }
  }

  render(player: Player) {
    this.el.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = 'Inventory (E to close)';
    this.el.appendChild(title);

    // Held item display
    const held = document.createElement('div');
    held.style.marginTop = '8px';
    held.style.fontSize = '12px';
    held.style.opacity = '0.9';
    held.textContent = this.held
      ? `Held: ${this.slotLabel(this.held)} x${this.held.count}`
      : 'Held: (empty)';
    this.el.appendChild(held);

    // Craft buttons
    const craftRow = document.createElement('div');
    craftRow.className = 'row';
    craftRow.style.marginTop = '10px';

    const mkBtn = (label: string, onClick: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = (e) => { e.preventDefault(); onClick(); this.render(player); };
      return b;
    };

    craftRow.appendChild(mkBtn('Log→Planks', () => this.craft(player, 'planks')));
    craftRow.appendChild(mkBtn('Planks→Sticks', () => this.craft(player, 'sticks')));
    this.el.appendChild(craftRow);

    const craftRow2 = document.createElement('div');
    craftRow2.className = 'row';
    craftRow2.style.marginTop = '8px';
    craftRow2.appendChild(mkBtn('Wood Pickaxe', () => this.craft(player, 'wood_pickaxe')));
    craftRow2.appendChild(mkBtn('Hoe', () => this.craft(player, 'hoe')));
    this.el.appendChild(craftRow2);

    // Hotbar
    const hotbarTitle = document.createElement('div');
    hotbarTitle.style.marginTop = '10px';
    hotbarTitle.style.fontSize = '12px';
    hotbarTitle.style.opacity = '0.85';
    hotbarTitle.textContent = 'Hotbar';
    this.el.appendChild(hotbarTitle);

    const hot = document.createElement('div');
    hot.className = 'grid';
    for (let i = 0; i < player.inventory.hotbar.length; i++) {
      const slotDiv = document.createElement('div');
      slotDiv.className = 'invSlot';
      const getSlot = () => player.inventory.hotbar[i];
      const setSlot = (s: Slot) => (player.inventory.hotbar[i] = s);

      this.renderSlot(slotDiv, getSlot());
      this.bindSlot(slotDiv, getSlot, setSlot);

      // rerender on mouseup so the UI reflects changes
      slotDiv.onmouseup = () => this.render(player);

      hot.appendChild(slotDiv);
    }
    this.el.appendChild(hot);

    // Main
    const mainTitle = document.createElement('div');
    mainTitle.style.marginTop = '10px';
    mainTitle.style.fontSize = '12px';
    mainTitle.style.opacity = '0.85';
    mainTitle.textContent = 'Backpack';
    this.el.appendChild(mainTitle);

    const main = document.createElement('div');
    main.className = 'grid';
    for (let i = 0; i < player.inventory.main.length; i++) {
      const slotDiv = document.createElement('div');
      slotDiv.className = 'invSlot';
      const getSlot = () => player.inventory.main[i];
      const setSlot = (s: Slot) => (player.inventory.main[i] = s);

      this.renderSlot(slotDiv, getSlot());
      this.bindSlot(slotDiv, getSlot, setSlot);
      slotDiv.onmouseup = () => this.render(player);

      main.appendChild(slotDiv);
    }
    this.el.appendChild(main);
  }
}
