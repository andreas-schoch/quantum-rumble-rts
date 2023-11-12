import { GRID, HALF_GRID } from '../constants';
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

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, Storage.unitName).setDepth(500).setAlpha(0.3);
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    const outer = GRID * 0.30;
    const inner = outer / 2;
    graphics.fillStyle(0x187f18, 1);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillCircle(HALF_GRID, HALF_GRID, outer);
    graphics.strokeCircle(HALF_GRID, HALF_GRID, outer);
    graphics.fillStyle(0x777777, 1);
    graphics.fillCircle(HALF_GRID, HALF_GRID, inner);
    graphics.strokeCircle(HALF_GRID, HALF_GRID, inner);
    graphics.generateTexture(Storage.unitName, GRID, GRID);
    graphics.destroy();
  }
}
