import GameScene from '../scenes/GameScene';
import { GRID, HALF_GRID } from '../constants';
import { BaseStructure } from './BaseUnit';
import { drawStar } from '../util/drawStar';

export class City extends BaseStructure {
  static unitName = 'City';
  static buildCost = 0;
  static connectionRange = 19;
  static movable = true;
  static isRelay = true;
  static energyCollectionRange = 7;
  static energyProduction = 0.6;
  static energyStorageCapacity = 20;
  static healthMax = 500;

  isEnergyRoot = true;
  updatePriority = 10;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x - (HALF_GRID * 9), this.y - (HALF_GRID * 9), City.unitName).setDepth(1000).setOrigin(0, 0);
    this.build(0);
  }

  static generateTextures(scene: Phaser.Scene): void {
    const graphics = scene.add.graphics();

    // outer
    graphics.fillStyle(0xa88924, 1);
    graphics.lineStyle(2, 0x000000 , 1);
    drawStar(graphics, HALF_GRID * 9, HALF_GRID * 9, 8, HALF_GRID * 9 - 5, HALF_GRID * 9 * 0.8);
    graphics.fillStyle(0xa88924 + 0x333333, 1);
    drawStar(graphics, HALF_GRID * 9, HALF_GRID * 9, 8, HALF_GRID * 5, HALF_GRID * 9 * 0.6);
    graphics.generateTexture(City.unitName, GRID * 9, GRID * 9);
    graphics.destroy();
  }
}
