import { GRID, HALF_GRID } from '..';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseStructure';

export class Relay extends BaseStructure {
  name = 'Relay';
  isRelay = true;
  movable = false;
  connectionRange = 13;
  energyCollectionRange = 0;
  energyCollectionRate = 0;
  energyProduction = 0;

  energyStorageCapacity = 0;
  healthMax = 1;
  ammoMax = 0;
  buildCost = 20;

  updatePriority = 1;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, 'relay').setDepth(12).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x777777, 1);
    BaseStructure.drawStar(graphics, HALF_GRID, HALF_GRID * 1.15, 3, GRID * 0.4, GRID * 0.2);
    graphics.fillStyle(0xffffff, 1);
    BaseStructure.drawStar(graphics, HALF_GRID, HALF_GRID * 1.15, 3, GRID * 0.2, GRID * 0.1);
    graphics.generateTexture('relay', GRID, GRID);
    graphics.destroy();
  }
}
