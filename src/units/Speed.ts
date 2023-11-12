import { GRID, HALF_GRID } from '../constants';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseUnit';

export class Speed extends BaseStructure {
  static unitName = 'Speed';
  static buildCost = 35;
  static isRelay = false;
  static movable = false;
  static connectionRange = 5;
  static energyCollectionRange = 0;
  static energyProduction = 0;
  static speedIncrease = GRID * 0.5;
  static energyStorageCapacity = 0;
  static healthMax = 5;

  updatePriority = 10;
  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, Speed.unitName).setDepth(500).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xff0000, 1);
    graphics.lineStyle(2, 0x000000, 1);
    this.drawStar(graphics, HALF_GRID, HALF_GRID, 2, HALF_GRID - 4, HALF_GRID - 4);
    graphics.generateTexture(Speed.unitName, GRID, GRID);
    graphics.destroy();
  }
}
