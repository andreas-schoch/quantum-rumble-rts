import { Depth, GRID, HALF_GRID } from '../constants';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseUnit';

export class Storage extends BaseStructure {
  static unitName = 'Storage';
  static buildCost = 20;
  static isRelay = false;
  static movable = false;
  static connectionRange = 5;
  static energyCollectionRange = 0;
  static energyCollectionRate = 0;
  static energyProduction = 0;
  static energyStorageCapacity = 20;
  static healthMax = 5;

  updatePriority = 10;
  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: GameScene, coordX: number, coordY: number, elevation: number) {
    super(scene, coordX, coordY, elevation);
    this.sprite = this.scene.add.sprite(this.x, this.y, Storage.unitName).setDepth(Depth.UNIT).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x187f18, 1);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 2);
    graphics.strokeCircle(HALF_GRID * 3, HALF_GRID * 3, GRID - 1);
    graphics.fillStyle(0x777777, 1);
    graphics.fillCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 1);
    graphics.strokeCircle(HALF_GRID * 3, HALF_GRID * 3, HALF_GRID * 1);
    graphics.generateTexture(Storage.unitName, GRID * 3, GRID * 3);
    graphics.destroy();
  }
}
