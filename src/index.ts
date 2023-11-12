import { Game, WEBGL } from 'phaser';
import GameScene from './scenes/GameScene';
import PreloadScene from './scenes/PreloadScene';
import GameUIScene from './scenes/GameUIScene';
import { DEFAULT_WIDTH, RESOLUTION_SCALE, DEFAULT_HEIGHT, DEBUG } from './constants';
import { Collector } from './units/Collector';
import { Reactor } from './units/Reactor';
import { Relay } from './units/Relay';
import { Speed } from './units/Speed';
import { Storage } from './units/Storage';
import { BaseWeaponStructure } from './units/BaseWeaponUnit';

const config: Phaser.Types.Core.GameConfig = {
  type: WEBGL,
  backgroundColor: '0xffffff',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DEFAULT_WIDTH * RESOLUTION_SCALE,
    height: DEFAULT_HEIGHT * RESOLUTION_SCALE,
  },
  dom: {
    createContainer: true,
    // behindCanvas: true,
  },
  disableContextMenu: true,
  parent: 'game', // DON'T use canvas as it will lead to horizontal scrollbar with fullHD resolution
  scene: [PreloadScene, GameScene, GameUIScene]
};

window.addEventListener('load', () => {
  new Game(config);

  if (DEBUG) {
    // Display fps and memory usage
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (function(){const script=document.createElement('script');script.onload=function(){const stats=new Stats();document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop);});};script.src='https://mrdoob.github.io/stats.js/build/stats.min.js';document.head.appendChild(script);})();
  }
});

export type Unit = typeof Collector | typeof Relay | typeof BaseWeaponStructure | typeof Storage | typeof Speed | typeof Reactor;
export const UNITS: Unit[] = [
  Collector,
  Relay,
  BaseWeaponStructure,
  BaseWeaponStructure,
  BaseWeaponStructure,
  BaseWeaponStructure,
  Storage,
  Speed,
  Reactor
];
