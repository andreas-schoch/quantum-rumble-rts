
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
export const RESOLUTION_SCALE: number =  0.5;
export const DEFAULT_ZOOM: number = 0.25;
export const MAX_ZOOM: number = 2.5 * RESOLUTION_SCALE;
export const MIN_ZOOM: number = 1 / 3 * RESOLUTION_SCALE;
export const DEBUG = true;

export const GRID = 40;
export const HALF_GRID = GRID / 2;
export const WORLD_X = 64;
export const WORLD_Y = 64;
export const TICK_RATE = 50; // ms
export const TICK_DELTA = TICK_RATE / 1000; // it's easier to change tickrate when things are scaled to a second

export const enum SceneKeys {
  PRELOAD_SCENE = 'PreloadScene',
  GAME_SCENE = 'GameScene',
  GAME_UI_SCENE = 'GameUIScene'
}

// The "precision" for each fluid layer depends on the threshold value. The higher it is the smoother the interpolation and flow.
// Even when no-interpolation is desired (for marching squares), the threshold is important to allow gradual flow of fluid between cells.
export const THRESHOLD = 1024;
export const MAX_UINT16 = 65535;
