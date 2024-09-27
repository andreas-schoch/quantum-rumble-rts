// EVENTS
export const EVENT_ENERGY_STORAGE_CHANGE = 'energy_storage_change';
export const EVENT_ENERGY_PRODUCTION_CHANGE = 'energy_production_change';
export const EVENT_ENERGY_CONSUMPTION_CHANGE = 'energy_consumption_change';
export const EVENT_ENERGY_DEFICIT_CHANGE = 'energy_deficit_change';
export const EVENT_UNIT_SELECTION_CHANGE = 'unit_selection_change';

// CONSTANTS
export const SETTINGS_KEY_RESOLUTION = 'quantum_rumble_resolution';
export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const RESOLUTION_SCALE: number =  1;
export const DEFAULT_ZOOM: number = 1;
export const MAX_ZOOM: number = 2 * RESOLUTION_SCALE;
export const MIN_ZOOM: number = 1 / 3 * RESOLUTION_SCALE;
export const FLOW_DISABLED = false;

export const DEBUG = {
  showFps: true,
  showFluidDensityText: false
};

export const ENERGY_PER_COLLECTING_CELL = 0.0025;
export const SPACE_BETWEEN = 4; // space between generated texture frames
export const GRID = 16;
export const HALF_GRID = GRID / 2;
export const TICK_RATE = 50; // ms
export const TICK_DELTA = TICK_RATE / 1000; // it's easier to change tickrate when things are scaled to a second

export const enum SceneKeys {
  PRELOAD_SCENE = 'PreloadScene',
  GAME_SCENE = 'GameScene',
  GAME_UI_SCENE = 'GameUIScene'
}

export enum Depth {
  TERRAIN = 1,
  Collection,
  NETWORK,
  UNIT,
  ENERGY, // energy ball moving over network
  FLUID,
  EMITTER,
}

export const THRESHOLD = 1000;
export const MAX_UINT16 = 65535;

export const config: TerrainConfig = {
  terrain: {
    elevationMax: THRESHOLD * 12,
  },
  fluid: {
    overflow: THRESHOLD * 2, // we need to ensure overflow and elevationMax are never more than MAX_UINT16!
    flowRate: 0.65,
    evaporation: 5,
  },
  terrainLayers: [
    // { elevation: THRESHOLD * 0, depth: 0, color: 0x544741 }, // this would be the lowest layer. It's rendered differently than the rest since it's a single rectangle
    { elevation: THRESHOLD * 3, color: 0x544741 + 0x111111 },
    { elevation: THRESHOLD * 6, color: 0x544741 + 0x222222 },
    { elevation: THRESHOLD * 9, color: 0x544741 + 0x333333 },
    { elevation: THRESHOLD * 12, color: 0x544741 + 0x444444 }, // Ensure last layers threshold equals config.terrain.elevationMax to prevent holes
  ],
  fluidLayers: [
    // TERRAIN 0
    { elevation: THRESHOLD * 1, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 2, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 3, color: 0x4081b7, alpha: 0.4 },
    // TERRAIN 1
    { elevation: THRESHOLD * 4, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 5, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 6, color: 0x4081b7, alpha: 0.4 },
    // TERRAIN 2
    { elevation: THRESHOLD * 7, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 8, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 9, color: 0x4081b7, alpha: 0.4 },
    // TERRAIN 3
    { elevation: THRESHOLD * 10, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 11, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 12, color: 0x4081b7, alpha: 0.4 },
    // TERRAIN 4
    { elevation: THRESHOLD * 13, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 14, color: 0x4081b7, alpha: 0.4 },
    { elevation: THRESHOLD * 15, color: 0x4081b7, alpha: 0.4 },
  ]
};

export interface TerrainSimulationConfig {
  terrain: {
    elevationMax: number;
  },
  fluid: {
    overflow: number;
    flowRate: number;
    evaporation: number;
  },
}

export interface TerrainRenderConfig {
  terrainLayers: { elevation: number, color: number }[];
  fluidLayers: { elevation: number, color: number, alpha: number }[];
}

export type TerrainConfig = TerrainRenderConfig & TerrainSimulationConfig;

export interface Level {
  seed: number;
  sizeX: number;
  sizeY: number;
  cityCoords: {xCoord: number, yCoord: number};
  noise: {scale: number, offsetX: number, offsetY: number, strength: number, subtract?: boolean}[];
  rects: {xCoord: number, yCoord: number, w: number, h: number, elevation: number}[];
  emitters: { xCoord: number, yCoord: number, fluidPerSecond: number, ticksCooldown: number, ticksDelay: number, active: boolean}[];
}

export const level001: Level = {
  seed: 0.123,
  sizeX: 100,
  sizeY: 100,
  cityCoords: {xCoord: 50, yCoord: 26},
  noise: [
    {scale: 200, offsetX: 0, offsetY: 0, strength: 2.5},
    {scale: 96, offsetX: 0, offsetY: 0, strength: 2},
    {scale: 32, offsetX: 0, offsetY: 0, strength: 1},
    {scale: 32, offsetX: -150, offsetY: -150, strength: 2, subtract: true},
  ],
  rects: [
    {xCoord: 75, yCoord: 25, w: 4, h: 4, elevation: THRESHOLD * 3},
    {xCoord: 75, yCoord: 25, w: 2, h: 2, elevation: 0},
    {xCoord: 8, yCoord: 12, w: 5, h: 2, elevation: THRESHOLD * 6},
    {xCoord: 32, yCoord: 42, w: 3, h: 3, elevation: THRESHOLD * 6},
    {xCoord: 24, yCoord: 52, w: 3, h: 3, elevation: THRESHOLD * 9},
  ],
  emitters: [
    {xCoord: 19, yCoord: 36, fluidPerSecond: MAX_UINT16 * 10, ticksCooldown: 1, ticksDelay: 0, active: true},
    {xCoord: 10, yCoord: 75, fluidPerSecond: MAX_UINT16 * 10, ticksCooldown: 1, ticksDelay: 0, active: true},
    {xCoord: 78, yCoord: 54, fluidPerSecond: MAX_UINT16 * 10, ticksCooldown: 1, ticksDelay: 0, active: true},
  ],
};

export const level: Level = level001;
