import { GRID, HALF_GRID } from '..';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseStructure';

export class Storage extends BaseStructure {
  name = 'Storage';
  isRelay = false;
  movable = false;
  connectionRange = 5;
  energyCollectionRange = 0;
  energyCollectionRate = 0;
  energyProduction = 0;

  energyStorageCapacity = 20;
  healthMax = 5;
  ammoMax = 0;
  buildCost = 20;

  updatePriority = 10;

  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, 'storage').setDepth(12).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    const outer = GRID * 0.30;
    const inner = outer / 2;
    graphics.fillStyle(0x187f18, 1);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillCircle(HALF_GRID, HALF_GRID, outer);
    graphics.strokeCircle(HALF_GRID, HALF_GRID, outer);
    graphics.fillStyle(0x777777, 1);
    graphics.fillCircle(HALF_GRID, HALF_GRID, inner);
    graphics.strokeCircle(HALF_GRID, HALF_GRID, inner);
    graphics.generateTexture('storage', GRID, GRID);
    graphics.destroy();
  }
}
