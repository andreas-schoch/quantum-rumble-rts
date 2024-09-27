import { Depth, GRID, HALF_GRID } from '../constants';
import GameScene from '../scenes/GameScene';
import { drawStar } from '../util';
import { BaseStructure } from './BaseUnit';

export class Relay extends BaseStructure {
  static unitName = 'Relay';
  static buildCost = 20;
  static isRelay = true;
  static movable = false;
  static connectionRange = 19;
  static energyCollectionRange = 0;
  static energyCollectionRate = 0;
  static energyProduction = 0;
  static energyStorageCapacity = 0;
  static healthMax = 1;

  updatePriority = 1;

  constructor(scene: GameScene, coordX: number, coordY: number, elevation: number) {
    super(scene, coordX, coordY, elevation);
    this.sprite = this.scene.add.sprite(this.x, this.y, Relay.unitName).setDepth(Depth.UNIT).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x000000, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3 * 1.15, 3, GRID * 0.4 * 3, GRID * 0.2 * 3);
    graphics.fillStyle(0xffffff, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3 * 1.15, 3, GRID * 0.2 * 3, GRID * 0.1 * 3);
    graphics.generateTexture(Relay.unitName, GRID * 3, GRID * 3);
    graphics.destroy();
  }
}
