import { GRID, HALF_GRID } from '..';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseStructure';

export class Reactor extends BaseStructure {
  name = 'Reactor';
  isRelay = false;
  movable = false;
  connectionRange = 5;
  energyCollectionRange = 0;
  energyProduction = 0.3;

  energyStorageCapacity = 0;
  healthMax = 5;
  ammoMax = 0;
  buildCost = 40;

  updatePriority = 10;

  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, 'reactor').setDepth(500).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x2e5982, 1);
    graphics.lineStyle(2, 0x000000, 1);
    this.drawStar(graphics, HALF_GRID, HALF_GRID, 4, HALF_GRID - 2, HALF_GRID * 0.4);
    graphics.generateTexture('reactor', GRID, GRID);
    graphics.destroy();
  }
}
