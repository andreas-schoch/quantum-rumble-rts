import { Collector } from './structures/Collector';
import { Weapon } from './structures/Weapon';
import GameScene from './scenes/GameScene';
import { GRID, WORLD_DATA } from '.';
import { Structure } from './structures/BaseStructure';

export interface Energy {
  follower: Phaser.GameObjects.PathFollower;
  id: string;
}

export interface Cell {
  x: number;
  y: number;
  ref: Weapon | Collector | City | null;
}

export interface EnergyRequest {
  id: string;
  type: 'ammo' | 'energy';
  amount: number;
  requester: Structure;
}

export class City {
  id: string;
  x: number;
  y: number;
  private scene: GameScene;
  private networkSpeed = 100;
  // private energyRequestQueue: [] = [];
  // TODO use a priority queue so structures with lower energy, health or ammo are prioritized
  private readonly queue: EnergyRequest[] = [];

  flowingEnergy: Map<string, Energy> = new Map();
  path: Phaser.Curves.Path;
  points: number[];
  coordX: number;
  coordY: number;
  range: number = 5;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    this.id = Math.random().toString(36).substring(2, 10);
    this.x = coordX * GRID;
    this.y = coordY * GRID;
    this.coordX = coordX;
    this.coordY = coordY;
    this.scene = scene;
    this.scene.add.sprite(this.x - GRID, this.y - GRID, 'city').setDepth(12).setOrigin(0, 0);

    scene.network.placeStructure(this.x, this.y, this);

    // this.scene.time.addEvent({
    //   delay: 1000 / 2, // executes 20 times per second
    //   callback: this.handleEnergy,
    //   callbackScope: this,
    //   loop: true
    // });
  }

  requestEnergy(request: EnergyRequest) {
    this.queue.push(request);
  }

  getNeighboursInRange(range: number = this.range, occupiedOnly = true): Cell[] {
    const cells: Cell[] = [];
    for (let y = this.coordY - range; y <= this.coordY + range; y++) {
      for (let x = this.coordX - range; x <= this.coordX + range; x++) {
        if (x < 0 || y < 0 || x >= WORLD_DATA[0].length || y >= WORLD_DATA.length) continue; // skip out of bounds
        const cell = WORLD_DATA[y][x];
        if (occupiedOnly && !cell.ref) continue; // skip unoccupied cells only when desired
        if (cell.ref === this) continue; // skip self
        const distance = Math.abs(x - this.coordX) + Math.abs(y - this.coordY); // manhattan distance, not euclidean
        if (distance > range) continue; // skip cells that are out of range
        cells.push(cell);
      }
    }
    return cells;
  }

  handleEnergy() {
    if (this.queue.length === 0) return;
    const request = this.queue.shift()!;
    const path = request?.requester.path;

    const pathLength = path.getLength();
    const speed = 50; // units per second
    const duration = (pathLength / speed) * 1000; // convert to milliseconds

    const energyBall: Energy = {follower: this.scene.add.follower(this.path, this.points[0], this.points[1], 'energy'), id: Math.random().toString(36).substring(2, 10)};
    energyBall.follower.setScale(1);
    // energyBall.follower.setBlendMode(Phaser.BlendModes.ERASE);
    this.flowingEnergy.set(energyBall.id, energyBall);
    energyBall.follower.startFollow({duration, repeat: 0, onComplete: () => {
      energyBall.follower.destroy();
      this.flowingEnergy.delete(energyBall.id);
      request.requester.receiveEnergy(request.amount, request.id);
    }});
  }

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
