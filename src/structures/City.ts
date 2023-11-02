import GameScene from '../scenes/GameScene';
import { GRID, HALF_GRID } from '..';
import { BaseStructure } from './BaseStructure';

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
  isRelay = true;
  movable = true;
  connectionRange = 10;
  energyCollectionRange = 4;
  energyCollectionRate = 0;
  energyProduction = 0.8 * 500;
  energyStorageCapacity = 2000;

  healthMax = 500;
  ammoMax = 0;
  buildCost = 0;

  isEnergyRoot = true;
  updatePriority = 10;
  private textEnergyStorage: Phaser.GameObjects.Text;
  private textEnergyCollection: Phaser.GameObjects.Text;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x - (HALF_GRID * 3), this.y - (HALF_GRID * 3), 'city').setDepth(1000).setOrigin(0, 0);
    this.textEnergyStorage = this.scene.add.text(this.x, this.y - HALF_GRID, '0/20').setDepth(500000).setOrigin(0.5, 0.5).setColor('red').setResolution(2).setFontSize(20);
    this.textEnergyCollection = this.scene.add.text(this.x, this.y + HALF_GRID, `+ ${this.scene.network.collectionSpriteSet.size * 0.005 + this.scene.network.energyProducing}`)
      .setDepth(500000).setOrigin(0.5, 0.5).setColor('darkgreen').setResolution(2);
    this.build(0);
  }

  tick(tickCounter: number) {
    if (!super.tick(tickCounter)) return;
    const network = this.scene.network;
    this.textEnergyStorage.setText(`${network.energyStorageCurrent.toFixed(0)}/${network.energyStorageMax}`);
    this.textEnergyStorage.setColor(network.energyDeficit ? 'red' : 'darkgreen');
    this.textEnergyCollection.setText(`+ ${network.energyPerSecond.toFixed(1)}`);
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
