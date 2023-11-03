import { GRID, HALF_GRID } from '..';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseStructure';

export class Collector extends BaseStructure {
  name = 'Collector';
  isRelay = true;
  movable = false;
  connectionRange = 5;
  energyCollectionRange = 3;
  energyCollectionRate = 0.05;
  energyProduction = 0;

  energyStorageCapacity = 0;
  healthMax = 1;
  ammoMax = 0;
  buildCost = 10;

  updatePriority = 2;

  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, 'collector').setDepth(12).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    const outer = GRID * 0.30;
    const inner = outer / 2;
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillCircle(HALF_GRID, HALF_GRID, outer);
    graphics.strokeCircle(HALF_GRID, HALF_GRID, outer);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(HALF_GRID, HALF_GRID, inner);
    graphics.strokeCircle(HALF_GRID, HALF_GRID, inner);
    graphics.generateTexture('collector', GRID, GRID);
    graphics.destroy();
  }
}
