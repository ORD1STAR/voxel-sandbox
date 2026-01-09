import { BlockId } from './blocks';

export type ItemType = 'block' | 'tool' | 'food' | 'seed' | 'material';

export type ItemDef = {
  id: string;
  name: string;
  type: ItemType;
  stackMax: number;
  placeBlock?: BlockId;
  tool?: { kind: 'pickaxe' | 'hoe' | 'none'; damage: number; };
  food?: { heal: number };
};

export const ITEMS: Record<string, ItemDef> = {
  stone: { id: 'stone', name: 'Stone', type: 'block', stackMax: 64, placeBlock: BlockId.Stone },
  dirt: { id: 'dirt', name: 'Dirt', type: 'block', stackMax: 64, placeBlock: BlockId.Dirt },
  sand: { id: 'sand', name: 'Sand', type: 'block', stackMax: 64, placeBlock: BlockId.Sand },
  log: { id: 'log', name: 'Log', type: 'block', stackMax: 64, placeBlock: BlockId.Log },
  leaves: { id: 'leaves', name: 'Leaves', type: 'block', stackMax: 64, placeBlock: BlockId.Leaves },
  planks: { id: 'planks', name: 'Planks', type: 'block', stackMax: 64, placeBlock: BlockId.Planks },
  sticks: { id: 'sticks', name: 'Sticks', type: 'material', stackMax: 64 },

  coal: { id: 'coal', name: 'Coal', type: 'material', stackMax: 64 },
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', type: 'material', stackMax: 64 },

  seeds: { id: 'seeds', name: 'Seeds', type: 'seed', stackMax: 64 },
  food: { id: 'food', name: 'Food', type: 'food', stackMax: 64, food: { heal: 2 } },

  wood_pickaxe: { id: 'wood_pickaxe', name: 'Wood Pickaxe', type: 'tool', stackMax: 1, tool: { kind: 'pickaxe', damage: 2 } },
  hoe: { id: 'hoe', name: 'Hoe', type: 'tool', stackMax: 1, tool: { kind: 'hoe', damage: 1 } }
};
