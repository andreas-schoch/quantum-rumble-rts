import GameScene from '../scenes/GameScene';
import { GRID, HALF_GRID } from '../constants';
import { BaseStructure } from './BaseUnit';

export class City extends BaseStructure {
  static unitName = 'City';
  static buildCost = 0;
  static connectionRange = 10;
  static movable = true;
  static isRelay = true;
  static energyCollectionRange = 4;
  static energyProduction = 20;
  static energyStorageCapacity = 100;
  static healthMax = 500;

  isEnergyRoot = true;
  updatePriority = 10;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x - (HALF_GRID * 3), this.y - (HALF_GRID * 3), City.unitName).setDepth(1000).setOrigin(0, 0);
    this.build(0);
  }

  static generateTextures(scene: Phaser.Scene): void {
    const graphics = scene.add.graphics();

    // outer
    graphics.fillStyle(0xa88924, 1);
    graphics.lineStyle(2, 0x000000 , 1);
    this.drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 8, HALF_GRID * 3 - 2, HALF_GRID * 3 * 0.8);
    graphics.fillStyle(0xa88924 + 0x333333, 1);
    this.drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 8, HALF_GRID * 2, HALF_GRID * 3 * 0.6);
    graphics.generateTexture(City.unitName, GRID * 3, GRID * 3);
    graphics.destroy();
  }
}
