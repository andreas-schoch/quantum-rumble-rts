import { GRID, HALF_GRID } from '../constants';
import GameScene from '../scenes/GameScene';
import { drawStar } from '../util';
import { BaseStructure } from './BaseUnit';

export class Reactor extends BaseStructure {
  static unitName = 'Reactor';
  static buildCost = 40;
  static connectionRange = 5;
  static energyCollectionRange = 0;
  static energyProduction = 0.3;
  static energyStorageCapacity = 0;
  static healthMax = 5;

  updatePriority = 10;

  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, Reactor.unitName).setDepth(500).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x2e5982, 1);
    graphics.lineStyle(2, 0x000000, 1);
    drawStar(graphics, HALF_GRID * 3, HALF_GRID * 3, 4, (HALF_GRID * 3 * 0.8) - 2, HALF_GRID * 3 * 0.35);
    graphics.generateTexture(Reactor.unitName, GRID * 3, GRID * 3);
    graphics.destroy();
  }
}
