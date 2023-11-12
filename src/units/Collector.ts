import { GRID, HALF_GRID } from '../constants';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseUnit';

export class Collector extends BaseStructure {
  static unitName = 'Collector';
  static buildCost = 10;
  static isRelay = true;
  static movable = false;
  static connectionRange = 5;
  static energyCollectionRange = 4;
  static energyProduction = 0;
  static energyStorageCapacity = 0;
  static healthMax = 1;

  updatePriority = 2;
  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, Collector.unitName).setDepth(500).setAlpha(0.3);
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
    graphics.generateTexture(Collector.unitName, GRID, GRID);
    graphics.destroy();
  }
}
