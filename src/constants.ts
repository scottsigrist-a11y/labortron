import { TowerConfig, TowerType, CreepSpec } from './types';

// Display and Grid configuration for Meta Ray-Ban Display (600x600 px)
export const SCREEN_SIZE = 600;
export const GRID_SIZE = 12; // 12x12
export const CELL_SIZE = 25; // 25px per cell
export const CELL_GAP = 1; // 1px
export const GRID_PADDING = 4; // 4px padding
export const CANVAS_PIXEL_SIZE = 12 * (CELL_SIZE + CELL_GAP) - CELL_GAP + GRID_PADDING * 2; // 319px
export const ROW_HEIGHT = 60; // 60px per action drawer

export const TOWERS: Record<TowerType, TowerConfig> = {
  arrow: {
    type: 'arrow',
    name: 'Arrow',
    cost: 10,
    damage: 6,
    fireRate: 0.4,
    range: 3,
    splash: 0,
    target: 'both',
    color: '#facc15',
    dot: '#fde047',
    desc: 'Fast ground & air',
  },
  cannon: {
    type: 'cannon',
    name: 'Cannon',
    cost: 20,
    damage: 25,
    fireRate: 1.8,
    range: 2.5,
    splash: 1,
    target: 'ground',
    color: '#9ca3af',
    dot: '#e5e7eb',
    desc: 'Splash ground',
  },
  air: {
    type: 'air',
    name: 'Air',
    cost: 20,
    damage: 12,
    fireRate: 0.8,
    range: 4,
    splash: 0,
    target: 'air',
    color: '#7dd3fc',
    dot: '#bae6fd',
    desc: 'Long air',
  },
  water: {
    type: 'water',
    name: 'Water',
    cost: 50,
    damage: 15,
    fireRate: 0.5,
    range: 3,
    splash: 0,
    target: 'both',
    slow: 2,
    color: '#2563eb',
    dot: '#60a5fa',
    desc: 'Slows 40% 2s',
  },
  earth: {
    type: 'earth',
    name: 'Earth',
    cost: 50,
    damage: 40,
    fireRate: 1.2,
    range: 2.8,
    splash: 0,
    target: 'ground',
    color: '#92400e',
    dot: '#d97706',
    desc: 'Heavy ground',
  },
  fire: {
    type: 'fire',
    name: 'Fire',
    cost: 50,
    damage: 35,
    fireRate: 1.5,
    range: 3.2,
    splash: 1.2,
    target: 'both',
    color: '#ea580c',
    dot: '#fb923c',
    desc: 'Splash fire',
  },
  combo: {
    type: 'combo',
    name: 'Rocket',
    cost: 120,
    damage: 80,
    fireRate: 0.7,
    range: 5,
    splash: 1.5,
    target: 'both',
    color: '#9333ea',
    dot: '#facc15',
    desc: 'Ultimate',
  },
};

// Map path generation
export function generatePath(): Array<{ x: number; y: number }> {
  const p: Array<{ x: number; y: number }> = [];
  for (let n = 0; n <= 10; n++) p.push({ x: n, y: 1 });
  p.push({ x: 10, y: 2 }, { x: 10, y: 3 });
  for (let n = 9; n >= 1; n--) p.push({ x: n, y: 3 });
  p.push({ x: 1, y: 4 }, { x: 1, y: 5 });
  for (let n = 2; n <= 10; n++) p.push({ x: n, y: 5 });
  p.push({ x: 10, y: 6 }, { x: 10, y: 7 }, { x: 10, y: 8 });
  for (let n = 9; n >= 1; n--) p.push({ x: n, y: 8 });
  p.push({ x: 1, y: 9 }, { x: 1, y: 10 });
  for (let n = 2; n <= 11; n++) p.push({ x: n, y: 10 });
  return p;
}

export const MAP_PATH = generatePath();
export const PATH_SET = new Set(MAP_PATH.map((pt) => `${pt.x},${pt.y}`));

export function canBuildAt(
  x: number,
  y: number,
  towers: Array<{ x: number; y: number }>
): boolean {
  if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return false;
  if (PATH_SET.has(`${x},${y}`)) return false;
  if (towers.some((t) => t.x === x && t.y === y)) return false;
  return true;
}

export function gridToPixel(x: number, y: number): { px: number; py: number } {
  return {
    px: GRID_PADDING + x * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
    py: GRID_PADDING + y * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
  };
}

export function getWaveModifiers(wave: number): {
  isBossWave: boolean;
  isAir: boolean;
  isFast: boolean;
  isImmune: boolean;
} {
  const isBossWave = [7, 14, 21, 28, 35].includes(wave);
  const isAir = [8, 16, 24, 32].includes(wave);
  const isFast = [10, 20, 30].includes(wave);
  const isImmune = [18, 26].includes(wave);
  return { isBossWave, isAir, isFast, isImmune };
}

export function generateWaveCreeps(wave: number): CreepSpec[] {
  const baseHp = 20 * Math.pow(1.18, wave - 1);
  const count = 20 + Math.floor(wave / 5) * 5;
  const { isBossWave, isAir, isFast, isImmune } = getWaveModifiers(wave);

  if (wave === 39) {
    const list: CreepSpec[] = [];
    for (let i = 0; i < 30; i++) {
      list.push({
        hp: baseHp * 1.5,
        speed: isFast ? 2.2 : 1.0,
        isAir: false,
        isImmune: false,
        isBoss: false,
      });
    }
    list.push({
      hp: baseHp * 25,
      speed: 0.6,
      isAir: false,
      isImmune: true,
      isBoss: true,
    });
    return list;
  }

  if (isBossWave) {
    return [
      {
        hp: baseHp * 20,
        speed: 0.6,
        isAir: false,
        isImmune: false,
        isBoss: true,
      },
    ];
  }

  const speed = isFast ? 2.2 : 1.0;
  const list: CreepSpec[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      hp: baseHp,
      speed,
      isAir,
      isImmune,
      isBoss: false,
    });
  }
  return list;
}
