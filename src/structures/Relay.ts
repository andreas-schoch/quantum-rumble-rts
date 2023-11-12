import { GRID, HALF_GRID } from '../constants';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseStructure';

export class Relay extends BaseStructure {
  static unitName = 'Relay';
  static buildCost = 20;
  static isRelay = true;
  static movable = false;
  static connectionRange = 13;
  static energyCollectionRange = 0;
  static energyCollectionRate = 0;
  static energyProduction = 0;
  static energyStorageCapacity = 0;
  static healthMax = 1;

  updatePriority = 1;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, Relay.unitName).setDepth(5000).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x000000, 1);
    BaseStructure.drawStar(graphics, HALF_GRID, HALF_GRID * 1.15, 3, GRID * 0.4, GRID * 0.2);
    graphics.fillStyle(0xffffff, 1);
    BaseStructure.drawStar(graphics, HALF_GRID, HALF_GRID * 1.15, 3, GRID * 0.2, GRID * 0.1);
    graphics.generateTexture(Relay.unitName, GRID, GRID);
    graphics.destroy();
  }
}
