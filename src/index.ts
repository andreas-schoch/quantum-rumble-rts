import { Game, WEBGL } from 'phaser';
import GameScene from './scenes/GameScene';
import PreloadScene from './scenes/PreloadScene';
import { Weapon } from './structures/Weapon';
import { Collector } from './structures/Collector';
import { Cell, City } from './City';
import { Relay } from './structures/Relay';
import { BaseStructure } from './structures/BaseStructure';

export const SETTINGS_KEY_RESOLUTION = 'quantum_rumble_resolution';

export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const RESOLUTION_SCALE: number = Number(localStorage.getItem(SETTINGS_KEY_RESOLUTION) || 1);
export const DEFAULT_ZOOM: number = 1;
export const MAX_ZOOM: number = 2.5 * RESOLUTION_SCALE;
export const MIN_ZOOM: number = 1/3 * RESOLUTION_SCALE;

export const GRID = 40;
export const HALF_GRID = GRID / 2;
export const WORLD_X = 17;
export const WORLD_Y = 17;
export const WORLD_DATA: Cell[][] = []; // TODO maybe temporary until deciding weather to merge with graph (use vertices as cells)

export const STRUCTURE_BY_NAME = {
  [Weapon.name]: Weapon,
  [Collector.name]: Collector,
  [City.name]: City,
  [Relay.name]: Relay,
};

export const enum SceneKeys {
  PRELOAD_SCENE = 'PreloadScene',
  GAME_SCENE = 'GameScene',
  GAME_UI_SCENE = 'GameUIScene',
}

const config: Phaser.Types.Core.GameConfig = {
  type: WEBGL,
  backgroundColor: '0xffffff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DEFAULT_WIDTH * RESOLUTION_SCALE,
    height: DEFAULT_HEIGHT * RESOLUTION_SCALE,
  },
  fps: {
    // target: 30,
    // min: 24,
    // forceSetTimeOut: true,
    smoothStep: true
  },
  // canvas: document.getElementById('game') as HTMLCanvasElement,
  parent: 'game', // DON'T use canvas as it will lead to horizontal scrollbar with fullHD resolution
  // pixelArt: true,
  // roundPixels: true,
  // physics: {
  //   default: 'arcade',
  //   arcade: {
  //     gravity: { y: 0 },
  //     // debug: true
  //   }
  // },
  scene: [PreloadScene, GameScene]
};

new Game(config);
