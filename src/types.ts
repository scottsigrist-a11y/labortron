export type TowerType =
  | 'arrow'
  | 'cannon'
  | 'air'
  | 'water'
  | 'earth'
  | 'fire'
  | 'combo';

export interface TowerConfig {
  type: TowerType;
  name: string;
  cost: number;
  damage: number;
  fireRate: number; // seconds between shots
  range: number; // in grid cells
  splash: number; // splash radius
  target: 'ground' | 'air' | 'both';
  slow?: number; // duration in seconds
  color: string;
  dot: string;
  desc: string;
}

export interface PlacedTower {
  id: number;
  type: TowerType;
  x: number;
  y: number;
  level: number; // 0 to 3
  damage: number;
  range: number;
  fireRate: number;
  splash: number;
  cooldown: number;
  invested: number;
  kills: number;
}

export interface CreepSpec {
  hp: number;
  speed: number;
  isAir: boolean;
  isImmune: boolean;
  isBoss: boolean;
}

export interface CreepInstance {
  id: number;
  spec: CreepSpec;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  pathPos: number; // floating index along path
  x: number;
  y: number;
  isAir: boolean;
  isImmune: boolean;
  isBoss: boolean;
  slowTimer: number;
  alive: boolean;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetCreepId: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  splash: number;
  color: string;
  towerType: TowerType;
  slow: number;
}

export interface HitEffect {
  x: number;
  y: number;
  color: string;
  radius: number;
  life: number;
}

export type FocusRow = 'MAP' | 'BUILD' | 'UPGRADE' | 'RESEARCH' | 'WAVE';

export type GameStatus = 'start' | 'playing' | 'gameover' | 'win';

export type WaveState = 'idle' | 'spawning' | 'active';

export interface ResearchState {
  water: number;
  earth: number;
  fire: number;
  combo: number;
}

export interface ResearchItem {
  key: string;
  label: string;
  cost: number;
  available: boolean;
  desc: string;
  owned: boolean;
}
