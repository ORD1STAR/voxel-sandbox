export enum BlockId {
    Air = 0,
    Bedrock = 1,
    Stone = 2,
    Dirt = 3,
    Grass = 4,
    Sand = 5,
    Log = 6,
    Leaves = 7,
    Planks = 8,
    CoalOre = 9,
    IronOre = 10,
    Farmland = 11,
    Water = 12,      // minimal: used for decoration; still treated as non-solid
    Crop0 = 20,
    Crop1 = 21,
    Crop2 = 22,
    Crop3 = 23
  }
  
  export type BlockDef = {
    id: BlockId;
    name: string;
    solid: boolean;
    breakable: boolean;
    color: number;
    dropItem: string | null;
  };
  
  export const BLOCKS: Record<number, BlockDef> = {
    [BlockId.Air]: { id: BlockId.Air, name: 'Air', solid: false, breakable: false, color: 0x000000, dropItem: null },
    [BlockId.Bedrock]: { id: BlockId.Bedrock, name: 'Bedrock', solid: true, breakable: false, color: 0x1a1a1a, dropItem: null },
    [BlockId.Stone]: { id: BlockId.Stone, name: 'Stone', solid: true, breakable: true, color: 0x7a7a7a, dropItem: 'stone' },
    [BlockId.Dirt]: { id: BlockId.Dirt, name: 'Dirt', solid: true, breakable: true, color: 0x6a4a2a, dropItem: 'dirt' },
    [BlockId.Grass]: { id: BlockId.Grass, name: 'Grass', solid: true, breakable: true, color: 0x4ea33b, dropItem: 'dirt' },
    [BlockId.Sand]: { id: BlockId.Sand, name: 'Sand', solid: true, breakable: true, color: 0xd6c27a, dropItem: 'sand' },
    [BlockId.Log]: { id: BlockId.Log, name: 'Log', solid: true, breakable: true, color: 0x7b5a3a, dropItem: 'log' },
    [BlockId.Leaves]: { id: BlockId.Leaves, name: 'Leaves', solid: true, breakable: true, color: 0x3aa85c, dropItem: 'leaves' },
    [BlockId.Planks]: { id: BlockId.Planks, name: 'Planks', solid: true, breakable: true, color: 0xb88c55, dropItem: 'planks' },
    [BlockId.CoalOre]: { id: BlockId.CoalOre, name: 'Coal Ore', solid: true, breakable: true, color: 0x3f3f3f, dropItem: 'coal' },
    [BlockId.IronOre]: { id: BlockId.IronOre, name: 'Iron Ore', solid: true, breakable: true, color: 0x9a7a58, dropItem: 'iron_ore' },
    [BlockId.Farmland]: { id: BlockId.Farmland, name: 'Farmland', solid: true, breakable: true, color: 0x5a3d24, dropItem: 'dirt' },
    [BlockId.Water]: { id: BlockId.Water, name: 'Water', solid: false, breakable: false, color: 0x2d62ff, dropItem: null },
  
    [BlockId.Crop0]: { id: BlockId.Crop0, name: 'Crop (0)', solid: false, breakable: true, color: 0x2b8f3a, dropItem: 'seeds' },
    [BlockId.Crop1]: { id: BlockId.Crop1, name: 'Crop (1)', solid: false, breakable: true, color: 0x33a943, dropItem: 'seeds' },
    [BlockId.Crop2]: { id: BlockId.Crop2, name: 'Crop (2)', solid: false, breakable: true, color: 0x3bc453, dropItem: 'seeds' },
    [BlockId.Crop3]: { id: BlockId.Crop3, name: 'Crop (3)', solid: false, breakable: true, color: 0x54d36a, dropItem: 'food' }
  };
  
  export const isCrop = (b: BlockId) => b === BlockId.Crop0 || b === BlockId.Crop1 || b === BlockId.Crop2 || b === BlockId.Crop3;
  export const cropStage = (b: BlockId) => (b >= BlockId.Crop0 && b <= BlockId.Crop3) ? (b - BlockId.Crop0) : -1;
  export const cropFromStage = (s: number) => (BlockId.Crop0 + s) as BlockId;
  