import { Game, WEBGL } from 'phaser';
import GameScene from './scenes/GameScene';
import PreloadScene from './scenes/PreloadScene';

export const SETTINGS_KEY_RESOLUTION = 'quantum_rumble_resolution';

export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const RESOLUTION_SCALE: number = Number(localStorage.getItem(SETTINGS_KEY_RESOLUTION) || 1);
export const DEFAULT_ZOOM: number = 1;
export const MAX_ZOOM: number = 2.5 * RESOLUTION_SCALE;
export const MIN_ZOOM: number = 1/3 * RESOLUTION_SCALE;


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

const game = new Game(config);

// window.addEventListener('resize', () => {
//   const width = window.innerWidth;
//   const height = window.innerHeight;
//   game.scale.resize(width, height);
// });
