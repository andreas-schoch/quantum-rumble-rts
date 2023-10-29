import GameScene from './scenes/GameScene';
import { GRID, HALF_GRID, NETWORK_TRAVEL_SPEED } from '.';
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
  movable = true;
  connectionRange = 10;
  energyCollectionRange = 4;
  energyCollectionRate = 0;
  energyProduction = 5;

  energyStorageCurrent = 0;
  energyStorageMax = 20;
  healthCurrent = 500;
  healthMax = 500;
  ammoCurrent = 0;
  ammoMax = 0;
  buildCost = 0;
  buildCostPaid = 0;

  updatePriority = 10;
  private textEnergyStorage: Phaser.GameObjects.Text;
  private textEnergyCollection: Phaser.GameObjects.Text;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x - (HALF_GRID * 3), this.y - (HALF_GRID * 3), 'city').setDepth(1000).setOrigin(0, 0);
    this.textEnergyStorage = this.scene.add.text(this.x, this.y - HALF_GRID, '0/20').setDepth(500000).setOrigin(0.5, 0.5).setColor('red').setResolution(2).setFontSize(20);
    this.textEnergyCollection = this.scene.add.text(this.x, this.y + HALF_GRID, `+ ${this.scene.network.collectionSpriteSet.size * 0.03}`)
      .setDepth(500000).setOrigin(0.5, 0.5).setColor('darkgreen').setResolution(2);
  }

  update(): void {
    super.update();
    const energyGenerated = this.scene.network.collectionSpriteSet.size * 0.03;
    this.energyStorageCurrent = Math.min(this.energyStorageMax, this.energyStorageCurrent + energyGenerated);
    while (this.energyStorageCurrent >= 1 && this.requestQueue.length) {
      this.energyStorageCurrent--;
      const request = this.requestQueue.shift()!;
      const energyPath = request.requester.energyPath;
      const points = energyPath.path.reduce<number[]>((acc, cur) => acc.concat(cur.x, cur.y), []);
      const path = this.scene.add.path(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);
      const texture = request.type === 'ammo' ? 'energy_red' : 'energy';
      const duration = (energyPath.distance / NETWORK_TRAVEL_SPEED) * 1000;
      const energyBall: Energy = {follower: this.scene.add.follower(path, points[0], points[1], texture), id: this.generateId()};
      energyBall.follower.setScale(1).setDepth(100);
      energyBall.follower.startFollow({duration, repeat: 0, onComplete: () => {
        energyBall.follower.destroy();
        request.requester.receiveEnergy(request);
      }});
    }
    const deficit = this.requestQueue.reduce((acc, cur) => acc + cur.amount, 0);
    this.textEnergyStorage.setText(`${this.energyStorageCurrent.toFixed(0)}/${this.energyStorageMax}`);
    this.textEnergyStorage.setColor(deficit ? 'red' : 'darkgreen');
    this.textEnergyCollection.setText(`+ ${energyGenerated.toFixed(1)}`);
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
