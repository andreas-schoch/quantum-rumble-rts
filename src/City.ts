import { Collector } from './structures/Collector';
import { Weapon } from './structures/Weapon';
import GameScene from './scenes/GameScene';

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
  type: 'ammo' | 'energy';
  amount: number;
  requester: Weapon | Collector;
}

export class City {
  private scene: GameScene;
  private networkSpeed = 100;
  // private energyRequestQueue: [] = [];
  // TODO use a priority queue so structures with lower energy, health or ammo are prioritized
  queue: Phaser.Structs.ProcessQueue<EnergyRequest> = new Phaser.Structs.ProcessQueue<EnergyRequest>();

  flowingEnergy: Map<string, Energy> = new Map();
  path: Phaser.Curves.Path;
  points: number[];

  constructor(scene: GameScene, x: number, y: number) {
    this.scene = scene;
    const grid = this.scene.gridSize;

    const city = this.scene.add.graphics();
    // outer
    city.fillStyle(0xd3d3d3, 1);
    city.lineStyle(2, 0x000000 , 1);
    city.fillRoundedRect(0, 0, grid * 3, grid * 3, grid * 0.4);
    city.strokeRoundedRect(0, 0, grid * 3, grid * 3, grid * 0.4);
    // inner
    city.fillStyle(0xffffff, 1);
    city.fillRoundedRect(grid * 0.25, grid * 0.25, grid * 2.5, grid * 2.5, grid * 0.25);
    city.strokeRoundedRect(grid * 0.25, grid * 0.25, grid * 2.5, grid * 2.5, grid * 0.25);

    city.setDepth(10);
    city.generateTexture('city', grid * 3, grid * 3);
    city.destroy();
    this.scene.add.sprite((grid * x) - grid, (grid * y) - grid, 'city').setDepth(12).setOrigin(0, 0);

    const radius = 8;
    const strokeWidth = 1.5;
    const circle = this.scene.add.graphics({ lineStyle: { width: strokeWidth, color: 0x0000 }, fillStyle: { color: 0xd3d3d3 } });
    circle.fillCircle(radius, radius, radius); // Adjust the radius as needed
    circle.strokeCircle(radius, radius, radius - (strokeWidth / 2)); // Adjust the radius as needed
    circle.generateTexture('energy', radius * 2, radius * 2); // Adjust the size as needed

    const coords: number[] = [
      2.5, 13.5,
      6, 13,
      6, 15,
      7, 14,
      8, 12,
      9, 13,
      9, 10,
      10, 11,
      17, 12,
      18, 10,
      18, 5,
      19, 5,
      20, 17,
      30, 20,
      37, 2
    ];

    this.points = coords.map(coord => coord * grid);

    this.path = new Phaser.Curves.Path(this.points[0], this.points[1]);
    for (let i = 2; i < this.points.length; i += 2) this.path.lineTo(this.points[i] + (grid / 2), this.points[i + 1] + (grid / 2));
    const network = this.scene.add.graphics();
    network.lineStyle(6, 0x000000, 1);
    this.path.draw(network, 1);
    network.lineStyle(3, 0xffffff, 1);
    this.path.draw(network, 1);

    //////////////////////////////////////////////////

    // for (let i = 2; i < this.points.length; i += 2) new Collector(this.scene, this.points[i] / grid, this.points[i + 1] / grid);

    this.scene.time.addEvent({
      delay: 1000 / 2, // executes 20 times per second
      callback: this.handleEnergy,
      callbackScope: this,
      loop: true
    });
  }

  handleEnergy() {
    // console.log('-----------handle energy');

    const pathLength = this.path.getLength();
    const speed = 50; // units per second
    const duration = (pathLength / speed) * 1000; // convert to milliseconds

    const energyBall: Energy = {follower: this.scene.add.follower(this.path, this.points[0], this.points[1], 'energy'), id: Math.random().toString(36).substring(2, 10)};
    energyBall.follower.setScale(1);
    // energyBall.follower.setBlendMode(Phaser.BlendModes.ERASE);
    this.flowingEnergy.set(energyBall.id, energyBall);
    energyBall.follower.startFollow({duration, repeat: 0, onComplete: () => {
      energyBall.follower.destroy();
      this.flowingEnergy.delete(energyBall.id);
    }});
  }
}
