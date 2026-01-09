export type Ingredient = { id: string; count: number };
export type Recipe = { id: string; name: string; in: Ingredient[]; out: Ingredient };

export const RECIPES: Recipe[] = [
  { id: 'logs_to_planks', name: 'Log → Planks', in: [{ id: 'log', count: 1 }], out: { id: 'planks', count: 4 } },
  { id: 'planks_to_sticks', name: 'Planks → Sticks', in: [{ id: 'planks', count: 2 }], out: { id: 'sticks', count: 4 } }
];

// “sticks” is virtual material stored as item id; define it in inventory even if not placeable.
