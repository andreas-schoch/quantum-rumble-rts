import { GRID, HALF_GRID, WORLD_DATA } from '..';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseStructure';

export class Relay extends BaseStructure {
  name = 'Relay';
  relay = true;
  connectionRange = 13;
  buildCost = 20;
  healthMax = 1;
  ammoMax = 0;
  energyCollectionRange = 0;
  energyCollectionRate = 0;
  energyProduction = 0;
  movable = false;
  updatePriority = -1;

  buildCostPaid = 0;
  healthCurrent = 1;
  ammoCurrent = 0;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, 'relay').setDepth(12);
  }

  destroy() {
    WORLD_DATA[this.coordY][this.coordX].ref = null;
    // this.graphics.destroy();
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
