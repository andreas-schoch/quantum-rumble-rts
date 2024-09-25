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
}

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

// The "precision" for each fluid layer depends on the threshold value. The higher it is the smoother the interpolation and flow.
// Even when no-interpolation is desired (for marching squares), the threshold is important to allow gradual flow of fluid between cells.
export const THRESHOLD = 1000;
export const MAX_UINT16 = 65535;

export const config: TerrainConfig = {
  terrain: {
    elevationMax: THRESHOLD * 12,
  },
  fluid: {
    overflow: THRESHOLD * 2, // we need to ensure overflow and elevationMax are never more than MAX_UINT16!
    flowRate: 0.4,
    evaporation: 10,
  },
  terrainLayers: [
    // { elevation: THRESHOLD * 0, depth: 0, color: 0x544741 }, // this would be the lowest layer. It's rendered differently than the rest since it's a single rectangle
    { elevation: THRESHOLD * 3, depth: 40, color: 0x544741 + 0x111111 },
    { elevation: THRESHOLD * 6, depth: 70, color: 0x544741 + 0x222222 },
    { elevation: THRESHOLD * 9, depth: 100, color: 0x544741 + 0x333333 },
    { elevation: THRESHOLD * 12, depth: 130, color: 0x544741 + 0x444444 }, // Ensure last layers threshold equals config.terrain.elevationMax to prevent holes
  ],
  fluidLayers: [
    // TERRAIN 0
    { elevation: THRESHOLD * 1, depth: 11, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 2, depth: 21, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 3, depth: 31, color: 0x4081b7, alpha: 0.2 },
    // TERRAIN 1
    { elevation: THRESHOLD * 4, depth: 41, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 5, depth: 51, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 6, depth: 61, color: 0x4081b7, alpha: 0.2 },
    // TERRAIN 2
    { elevation: THRESHOLD * 7, depth: 71, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 8, depth: 81, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 9, depth: 91, color: 0x4081b7, alpha: 0.2 },
    // TERRAIN 3
    { elevation: THRESHOLD * 10, depth: 101, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 11, depth: 111, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 12, depth: 121, color: 0x4081b7, alpha: 0.2 },
    // TERRAIN 4
    { elevation: THRESHOLD * 13, depth: 131, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 14, depth: 141, color: 0x4081b7, alpha: 0.2 },
    { elevation: THRESHOLD * 15, depth: 151, color: 0x4081b7, alpha: 0.2 },
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
  terrainLayers: { elevation: number, depth: number, color: number }[];
  fluidLayers: { elevation: number, depth: number, color: number, alpha: number }[];
}

export type TerrainConfig = TerrainRenderConfig & TerrainSimulationConfig;

export interface Level {
  seed: number;
  sizeX: number;
  sizeY: number;
  cityCoords: {x: number, y: number};
  noise: {scale: number, offsetX: number, offsetY: number, strength: number, subtract?: boolean}[];
  rects: {x: number, y: number, w: number, h: number, elevation: number}[];
  emitters: { xCoord: number, yCoord: number, fluidPerSecond: number, ticksCooldown: number, ticksDelay: number }[];
}

export const level001: Level = {
  seed: 0.123,
  sizeX: 100,
  sizeY: 100,
  cityCoords: {x: 50, y: 27},
  // cityCoords: {x: 20, y: 27},
  noise: [
    {scale: 200, offsetX: 0, offsetY: 0, strength: 2.5},
    {scale: 96, offsetX: 0, offsetY: 0, strength: 2},
    {scale: 32, offsetX: 0, offsetY: 0, strength: 1},
    {scale: 32, offsetX: -150, offsetY: -150, strength: 2, subtract: true},
  ],
  rects: [
    {x: 75, y: 25, w: 4, h: 4, elevation: THRESHOLD * 3},
    {x: 75, y: 25, w: 2, h: 2, elevation: 0},
  ],
  emitters: [
    {xCoord: 19, yCoord: 36, fluidPerSecond: MAX_UINT16 * 2, ticksCooldown: 1, ticksDelay: 0},
    {xCoord: 10, yCoord: 75, fluidPerSecond: MAX_UINT16 * 2, ticksCooldown: 1, ticksDelay: 0},
    {xCoord: 78, yCoord: 54, fluidPerSecond: MAX_UINT16 * 2, ticksCooldown: 1, ticksDelay: 0},
    // {xCoord: 20, yCoord: 54, fluidPerSecond: MAX_UINT16 * 10, ticksCooldown: 1, ticksDelay: 0},
    // {xCoord: 80, yCoord: 80, fluidPerSecond: MAX_UINT16 * 10, ticksCooldown: 1, ticksDelay: 0},
    // {xCoord: 90, yCoord: 5, fluidPerSecond: MAX_UINT16 * 10, ticksCooldown: 1, ticksDelay: 0},
  ],
};

export const level: Level = level001;
