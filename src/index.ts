import { Game, WEBGL } from 'phaser';
import GameScene from './scenes/GameScene';
import PreloadScene from './scenes/PreloadScene';
import GameUIScene from './scenes/GameUIScene';
import { DEFAULT_WIDTH, RESOLUTION_SCALE, DEFAULT_HEIGHT, DEBUG, EntityProps, UNIT_CONFIG } from './constants';

const config: Phaser.Types.Core.GameConfig = {
  render: {
    antialiasGL: false,
    batchSize: 512
  },
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

  if (DEBUG.showFps) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (function(){const script=document.createElement('script');script.type='application/javascript';script.onload=function(){const stats=new Stats();document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop);});};script.src='./stats.js';document.head.appendChild(script);})();
  }
});

// export type Unit = typeof Collector | typeof Relay | typeof BaseWeaponStructure | typeof Storage | typeof Speed | typeof Reactor;
export const SELECTABLE_UNITS: EntityProps[] = [
  UNIT_CONFIG['Collector'],
  UNIT_CONFIG['Relay'],
  UNIT_CONFIG['Blaster'],
  UNIT_CONFIG['Mortar'],
  UNIT_CONFIG['Storage'],
  UNIT_CONFIG['Speed'],
  UNIT_CONFIG['Reactor']
  // UNIT_CONFIG['EmitterWeak']
];
