import GameScene from './scenes/GameScene';
import { GRID, HALF_GRID } from '.';
import { BaseStructure } from './structures/BaseStructure';

export interface Energy {
  follower: Phaser.GameObjects.PathFollower;
  id: string;
}

export interface Cell {
  x: number;
  y: number;
  ref: BaseStructure | null;
}

export interface EnergyRequest {
  id: string;
  type: 'ammo' | 'build' | 'health';
  amount: number;
  requester: BaseStructure
}

export class City extends BaseStructure {
  name = 'City';
  relay = true;
  connectionRange = 10;
  buildCost = 0;
  healthMax = 500;
  ammoMax = 0;
  energyCollectionRange = 0;
  energyCollectionRate = 0;
  energyProduction = 5;
  movable = true;
  updatePriority = 10;

  buildCostPaid = 0;
  healthCurrent = 500;
  ammoCurrent = 0;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x - (HALF_GRID * 3), this.y - (HALF_GRID * 3), 'city').setDepth(12).setOrigin(0, 0);
  }

  static generateTextures(scene: Phaser.Scene): void {
    const graphics = scene.add.graphics();
    // outer
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x000000 , 1);
    graphics.fillRoundedRect(0, 0, GRID * 3, GRID * 3, GRID * 0.4);
    graphics.strokeRoundedRect(1, 1, GRID * 3 - 2, GRID * 3 - 2, GRID * 0.4);
    // inner
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(GRID * 0.25, GRID * 0.25, GRID * 2.5, GRID * 2.5, GRID * 0.25);
    graphics.strokeRoundedRect(GRID * 0.25, GRID * 0.25, GRID * 2.5, GRID * 2.5, GRID * 0.25);
    graphics.generateTexture('city', GRID * 3, GRID * 3);
    graphics.destroy();
  }
}
