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

  private readonly queue: EnergyRequest[] = [];

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x - (HALF_GRID * 3), this.y - (HALF_GRID * 3), 'city').setDepth(12).setOrigin(0, 0);

    // this.scene.time.addEvent({
    //   delay: 1000 / 2, // executes 20 times per second
    //   callback: this.handleEnergy,
    //   callbackScope: this,
    //   loop: true
    // });
  }

  // update(time: number, delta: number) {
  // // get energy collected from structures taking delta time into account (divide by number of cities if more than one connected to same network)

  // // iterate through queue and send energy to any structure that needs it (debounce how much a single structure can get per second)
  // }

  // requestEnergy(request: EnergyRequest) {
  //   this.queue.push(request);
  // }

  // handleEnergy() {
  //   if (this.queue.length === 0) return;
  //   const request = this.queue.shift()!;
  //   const path = request?.requester.path;

  //   const pathLength = path.getLength();
  //   const speed = 50; // units per second
  //   const duration = (pathLength / speed) * 1000; // convert to milliseconds

  //   const energyBall: Energy = {follower: this.scene.add.follower(this.path, this.points[0], this.points[1], 'energy'), id: Math.random().toString(36).substring(2, 10)};
  //   energyBall.follower.setScale(1);
  //   energyBall.follower.startFollow({duration, repeat: 0, onComplete: () => {
  //     energyBall.follower.destroy();
  //     request.requester.receiveEnergy(request.amount, request.id);
  //   }});
  // }

  static generateTextures(scene: Phaser.Scene): void {
    const city = scene.add.graphics();
    // outer
    city.fillStyle(0xd3d3d3, 1);
    city.lineStyle(2, 0x000000 , 1);
    city.fillRoundedRect(0, 0, GRID * 3, GRID * 3, GRID * 0.4);
    city.strokeRoundedRect(1, 1, GRID * 3 - 2, GRID * 3 - 2, GRID * 0.4);
    // inner
    city.fillStyle(0xffffff, 1);
    city.fillRoundedRect(GRID * 0.25, GRID * 0.25, GRID * 2.5, GRID * 2.5, GRID * 0.25);
    city.strokeRoundedRect(GRID * 0.25, GRID * 0.25, GRID * 2.5, GRID * 2.5, GRID * 0.25);
    city.generateTexture('city', GRID * 3, GRID * 3);
    city.destroy();

    const radius = 8;
    const strokeWidth = 1.5;
    const circle = scene.add.graphics({ lineStyle: { width: strokeWidth, color: 0x0000 }, fillStyle: { color: 0xd3d3d3 } });
    circle.fillCircle(radius, radius, radius); // Adjust the radius as needed
    circle.strokeCircle(radius, radius, radius - (strokeWidth / 2)); // Adjust the radius as needed
    circle.generateTexture('energy', radius * 2, radius * 2); // Adjust the size as needed
    circle.destroy();
  }
}
