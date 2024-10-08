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
export const TICK_RATE = 50; // ms (CW1 seems to run at 36 ticks per second according to https://knucklecracker.com/forums/index.php?topic=5177.0)
export const TICK_DELTA = TICK_RATE / 1000; // it's easier to change tickrate when things are scaled to a second

export const enum SceneKeys {
  PRELOAD_SCENE = 'PreloadScene',
  GAME_SCENE = 'GameScene',
  GAME_UI_SCENE = 'GameUIScene'
}

export enum Depth {
  TERRAIN = 1,
  COLLECTION,
  COLLECTION_PREVIEW,
  NETWORK,
  AMMO_CIRCLE,
  UNIT,
  PREVIEW_UNIT,
  ENERGY, // energy ball moving over network
  UNIT_SELECTION_OUTLINE,
  FLUID,
  EMITTER,
  MORTAR_SHELL,
  PARTICLE_IMPACT,
  UNIT_MOVING,
}

export const THRESHOLD = 1000;
export const MAX_UINT16 = 65535;

export const config: TerrainConfig = {
  terrain: {
    elevationMax: THRESHOLD * 12,
  },
  fluid: {
    overflow: THRESHOLD * 12, // we need to ensure overflow and elevationMax are never more than MAX_UINT16!
    flowRate: 0.6,
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

export interface SerializableEntityData {
  id?: string;
  xCoord: number;
  yCoord: number;
  active: boolean;
  built: boolean;
  props: EntityProps;
}

// TODO for now to keep it simple I added all properties together. Eventually it will be split up once I refactor all into ECS
export interface EntityProps {
  // Common
  unitName: string;

  // Common for placable units and City
  healthMax: number;
  healthRegenPerSecond: number;
  spriteKeys: string[];
  uiTextureKey: string;
  size: '3x3' | '9x9';
  buildCost: number;
  isRelay: boolean; // whether this unit can relay energy to other units in connectionRange
  distanceFactor: number; // e.g. if 0.5 it means that the distance in the graph is reduced by 50% and therefore 2x as fast
  movable: boolean;
  connectionRadius: number; // can only connect to other units within this distance

  //
  collectionRadius: number; // can collect energy from cells within this distance
  energyProduction: number; // different from collecting, this produces without the need to occupy cells
  energyStorageCapacity: number;
  speedIncrease: number; // makes energy packet travel X px per second faster
  isEnergyRoot: boolean;

  // weapon specific
  ammoCost: number;
  ammoMax: number;
  attackCooldown: number;
  attackRadius: number;
  damage: number;
  damagePattern: [number, number][];

  // emitter specific
  fluidPerSecond: number;
  fluidEmitEveryNthFrame: number; // how many ticks it pauses before emitting again
  fluidDelay: number; // how many ticks it waits before emitting the first time
}

export const UNIT_CONFIG: Record<string, EntityProps> = {
  'City': {
    unitName: 'City',
    size: '9x9',
    spriteKeys: ['City'],
    uiTextureKey: 'City',
    buildCost: 0,
    connectionRadius: 19,
    collectionRadius: 7,
    energyProduction: 0.8,
    energyStorageCapacity: 20,
    healthMax: 8000,
    healthRegenPerSecond: 1,
    speedIncrease: 0,
    movable: false,
    isRelay: true,
    distanceFactor: 1,
    isEnergyRoot: true,
    // weapon specific
    ammoCost: 0,
    ammoMax: 0,
    attackCooldown: 0,
    attackRadius: 0,
    damage: 0,
    damagePattern: [],
    // emitter specific
    fluidPerSecond: 0,
    fluidEmitEveryNthFrame: 0,
    fluidDelay: 0,
  },
  'Collector': {
    unitName: 'Collector',
    size: '3x3',
    spriteKeys: ['Collector'],
    uiTextureKey: 'Collector',
    buildCost: 5,
    connectionRadius: 9,
    collectionRadius: 5,
    energyProduction: 0,
    energyStorageCapacity: 0,
    healthMax: 1,
    healthRegenPerSecond: 0,
    speedIncrease: 0,
    movable: false,
    isRelay: true,
    distanceFactor: 1,
    isEnergyRoot: false,
    // weapon specific
    ammoCost: 0,
    ammoMax: 0,
    attackCooldown: 0,
    attackRadius: 0,
    damage: 0,
    damagePattern: [],
    // emitter specific
    fluidPerSecond: 0,
    fluidEmitEveryNthFrame: 0,
    fluidDelay: 0,
  },
  'Relay': {
    unitName: 'Relay',
    size: '3x3',
    spriteKeys: ['Relay'],
    uiTextureKey: 'Relay',
    buildCost: 20,
    connectionRadius: 19,
    collectionRadius: 0,
    energyProduction: 0,
    energyStorageCapacity: 0,
    healthMax: 1,
    healthRegenPerSecond: 0,
    speedIncrease: 0,
    movable: false,
    isRelay: true,
    distanceFactor: 0.5, // TODO make energy travel faster
    isEnergyRoot: false,
    // weapon specific
    ammoCost: 0,
    ammoMax: 0,
    attackCooldown: 0,
    attackRadius: 0,
    damage: 0,
    damagePattern: [],
    // emitter specific
    fluidPerSecond: 0,
    fluidEmitEveryNthFrame: 0,
    fluidDelay: 0,
  },
  'Blaster': {
    unitName: 'Blaster',
    size: '3x3',
    spriteKeys: ['Blaster', 'Blaster_top'],
    uiTextureKey: 'Blaster_ui',
    buildCost: 25,
    connectionRadius: 9,
    collectionRadius: 0,
    energyProduction: 0,
    energyStorageCapacity: 0,
    healthMax: 150,
    healthRegenPerSecond: 1,
    speedIncrease: 0,
    movable: true,
    isRelay: false,
    distanceFactor: 1,
    isEnergyRoot: false,
    // weapon specific
    ammoCost: 0.2,
    ammoMax: 10,
    attackCooldown: 4,
    attackRadius: 6,
    damage: THRESHOLD * 32,
    damagePattern: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]],
    // emitter specific
    fluidPerSecond: 0,
    fluidEmitEveryNthFrame: 0,
    fluidDelay: 0,
  },
  'Mortar': {
    unitName: 'Mortar',
    size: '3x3',
    spriteKeys: ['Mortar', 'Mortar_shell'],
    uiTextureKey: 'Mortar',
    buildCost: 50,
    connectionRadius: 9,
    collectionRadius: 0,
    energyProduction: 0,
    energyStorageCapacity: 0,
    healthMax: 200,
    healthRegenPerSecond: 1,
    speedIncrease: 0,
    movable: true,
    isRelay: false,
    distanceFactor: 1,
    isEnergyRoot: false,
    // weapon specific
    ammoCost: 10 / 3 - 0.01,
    ammoMax: 20,
    attackCooldown: 50,
    attackRadius: 9,
    damage: THRESHOLD * 256,
    damagePattern: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [-2, 0], [2, 0], [0, 2], [0, -2]],
    // emitter specific
    fluidPerSecond: 0,
    fluidEmitEveryNthFrame: 0,
    fluidDelay: 0,
  },
  'Storage': {
    unitName: 'Storage',
    size: '3x3',
    spriteKeys: ['Storage'],
    uiTextureKey: 'Storage',
    buildCost: 20,
    connectionRadius: 9,
    collectionRadius: 0,
    energyProduction: 0,
    energyStorageCapacity: 20,
    healthMax: 1,
    healthRegenPerSecond: 0,
    speedIncrease: 0,
    movable: false,
    isRelay: false,
    distanceFactor: 1,
    isEnergyRoot: false,
    // weapon specific
    ammoCost: 0,
    ammoMax: 0,
    attackCooldown: 0,
    attackRadius: 0,
    damage: 0,
    damagePattern: [],
    // emitter specific
    fluidPerSecond: 0,
    fluidEmitEveryNthFrame: 0,
    fluidDelay: 0,
  },
  'Speed': {
    unitName: 'Speed',
    size: '3x3',
    spriteKeys: ['Speed'],
    uiTextureKey: 'Speed',
    buildCost: 35,
    connectionRadius: 9,
    collectionRadius: 0,
    energyProduction: 0,
    energyStorageCapacity: 0,
    healthMax: 1,
    healthRegenPerSecond: 0,
    speedIncrease: GRID * 0.5,
    movable: false,
    isRelay: false,
    distanceFactor: 1,
    isEnergyRoot: false,
    // weapon specific
    ammoCost: 0,
    ammoMax: 0,
    attackCooldown: 0,
    attackRadius: 0,
    damage: 0,
    damagePattern: [],
    // emitter specific
    fluidPerSecond: 0,
    fluidEmitEveryNthFrame: 0,
    fluidDelay: 0,
  },
  'Reactor': {
    unitName: 'Reactor',
    size: '3x3',
    spriteKeys: ['Reactor'],
    uiTextureKey: 'Reactor',
    buildCost: 40,
    connectionRadius: 9,
    collectionRadius: 0,
    energyProduction: 0.4,
    energyStorageCapacity: 0,
    healthMax: 1,
    healthRegenPerSecond: 0,
    speedIncrease: 0,
    movable: false,
    isRelay: false,
    distanceFactor: 1,
    isEnergyRoot: false,
    // weapon specific
    ammoCost: 0,
    ammoMax: 0,
    attackCooldown: 0,
    attackRadius: 0,
    damage: 0,
    damagePattern: [],
    // emitter specific
    fluidPerSecond: 0,
    fluidEmitEveryNthFrame: 0,
    fluidDelay: 0,
  },
  'EmitterWeak': {
    unitName: 'Emitter',
    size: '3x3',
    spriteKeys: ['Emitter'],
    uiTextureKey: 'Emitter',
    buildCost: 0,
    connectionRadius: 0,
    collectionRadius: 0,
    energyProduction: 0,
    energyStorageCapacity: 0,
    healthMax: 0,
    healthRegenPerSecond: 0,
    speedIncrease: 0,
    movable: false,
    isRelay: false,
    distanceFactor: 1,
    isEnergyRoot: false,
    // weapon specific
    ammoCost: 0,
    ammoMax: 0,
    attackCooldown: 0,
    attackRadius: 0,
    damage: 0,
    damagePattern: [],
    // emitter specific
    fluidPerSecond: MAX_UINT16 * 2.5,
    fluidEmitEveryNthFrame: 1,
    fluidDelay: 0,
  },
  'EmitterRegular': {
    unitName: 'Emitter',
    size: '3x3',
    spriteKeys: ['Emitter'],
    uiTextureKey: 'Emitter',
    buildCost: 0,
    connectionRadius: 0,
    collectionRadius: 0,
    energyProduction: 0,
    energyStorageCapacity: 0,
    healthMax: 0,
    healthRegenPerSecond: 0,
    speedIncrease: 0,
    movable: false,
    isRelay: false,
    distanceFactor: 1,
    isEnergyRoot: false,
    // weapon specific
    ammoCost: 0,
    ammoMax: 0,
    attackCooldown: 0,
    attackRadius: 0,
    damage: 0,
    damagePattern: [],
    // emitter specific
    fluidPerSecond: MAX_UINT16 * 5,
    fluidEmitEveryNthFrame: 1,
    fluidDelay: 0,
  }
};

export interface Level {
  seed: number;
  sizeX: number;
  sizeY: number;
  noise: {scale: number, offsetX: number, offsetY: number, strength: number, subtract?: boolean}[];
  rects: {xCoord: number, yCoord: number, w: number, h: number, elevation: number}[];
  entities: SerializableEntityData[];
}

// TODO create a few levels and start the game from a level selector menu
export const level001: Level = {
  seed: 0.123,
  sizeX: 100,
  sizeY: 100,
  noise: [
    {scale: 200, offsetX: 0, offsetY: 0, strength: 2.5},
    {scale: 96, offsetX: 0, offsetY: 0, strength: 2},
    {scale: 32, offsetX: 0, offsetY: 0, strength: 1},
    {scale: 32, offsetX: -150, offsetY: -150, strength: 2, subtract: true},
  ],
  rects: [
    {xCoord: 75, yCoord: 25, w: 4, h: 4, elevation: THRESHOLD * 3},
    {xCoord: 75, yCoord: 25, w: 2, h: 2, elevation: 0},
    {xCoord: 9, yCoord: 12, w: 5, h: 2, elevation: THRESHOLD * 6},
    {xCoord: 32, yCoord: 42, w: 3, h: 3, elevation: THRESHOLD * 6},
    {xCoord: 24, yCoord: 52, w: 3, h: 3, elevation: THRESHOLD * 9},

    {xCoord: 19, yCoord: 45, w: 7, h: 3, elevation: 0},
    {xCoord: 25, yCoord: 46, w: 7, h: 3, elevation: 0},
    {xCoord: 30, yCoord: 47, w: 5, h: 5, elevation: 0},

    {xCoord: 9, yCoord: 3, w: 1, h: 5, elevation: 0},
    {xCoord: 8, yCoord: 7, w: 1, h: 5, elevation: 0},
    {xCoord: 7, yCoord: 10, w: 1, h: 5, elevation: 0},
    {xCoord: 6, yCoord: 14, w: 1, h: 5, elevation: 0},

    {xCoord: 42, yCoord: 24, w: 2, h: 3, elevation: THRESHOLD * 3},
    {xCoord: 40, yCoord: 26, w: 2, h: 3, elevation: THRESHOLD * 3},

    {xCoord: 38, yCoord: 27, w: 9, h: 10, elevation: THRESHOLD * 3},
  ],
  entities: [
    {id: 'city', xCoord: 50, yCoord: 26, active: true, built: true, props: UNIT_CONFIG['City']},
    {id: 'emitter1', xCoord: 19, yCoord: 36, active: true, built: false, props: UNIT_CONFIG['EmitterWeak']},
    {id: 'emitter2', xCoord: 10, yCoord: 75, active: true, built: false, props: UNIT_CONFIG['EmitterWeak']},
    {id: 'emitter3', xCoord: 85, yCoord: 68, active: true, built: false, props: UNIT_CONFIG['EmitterWeak']},
    {id: 'emitter4', xCoord: 95, yCoord: 5, active: true, built: false, props: UNIT_CONFIG['EmitterWeak']},
    {id: 'collector2', xCoord: 44, yCoord: 20, active: true, built: false, props: UNIT_CONFIG['Collector']},
    {id: 'relay1', xCoord: 75, yCoord: 27, active: true, built: true, props: UNIT_CONFIG['Relay']},
    {id: 'Mortar1', xCoord: 38, yCoord: 32, active: true, built: true, props: UNIT_CONFIG['Mortar']},
  ],
};

export const level: Level = level001;
