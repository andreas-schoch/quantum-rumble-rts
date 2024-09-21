import { GRID, HALF_GRID } from '../constants';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseUnit';

export class Collector extends BaseStructure {
  static unitName = 'Collector';
  static buildCost = 5;
  static isRelay = true;
  static movable = false;
  static connectionRange = 9;
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
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 2);
    graphics.strokeCircle(HALF_GRID * 3, HALF_GRID * 3, GRID - 1);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 1);
    graphics.strokeCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 1);
    graphics.generateTexture(Collector.unitName, GRID * 3, GRID * 3);
    graphics.destroy();
  }
}
