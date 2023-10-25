import { GRID, HALF_GRID, WORLD_DATA } from '..';
import GameScene from '../scenes/GameScene';
import { EnergyReceiver } from './BaseStructure';

export class Collector implements EnergyReceiver {
  name: string = 'Collector';
  id: string;
  x: number;
  y: number;
  coordX: number;
  coordY: number;
  range = 5;
  private scene: GameScene;
  path: Phaser.Curves.Path;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    this.scene = scene;
    this.id = Math.random().toString(36).substring(2, 9);
    this.x = coordX * GRID + HALF_GRID;
    this.y = coordY * GRID + HALF_GRID;
    this.coordX = coordX;
    this.coordY = coordY;

    this.scene.add.sprite(this.x, this.y, 'collector').setDepth(12);
    WORLD_DATA[this.coordY][this.coordX].ref = this;

    this.scene.city.requestEnergy({
      id: Math.random().toString(36).substring(2, 9),
      type: 'energy',
      amount: 100,
      requester: this
    });
  }

  receiveEnergy(amount: number, requestId: string): void {
    console.log('received energy', amount, requestId);
  }

  destroy() {
    WORLD_DATA[this.coordY][this.coordX].ref = null;
    // this.graphics.destroy();
  }

  static generateTextures(scene: Phaser.Scene) {
    const graphics = scene.add.graphics();
    const outer = GRID * 0.30;
    const inner = outer / 2;
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x777777, 1);
    graphics.fillCircle(HALF_GRID, HALF_GRID, outer);
    graphics.strokeCircle(HALF_GRID, HALF_GRID, outer);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(HALF_GRID, HALF_GRID, inner);
    graphics.strokeCircle(HALF_GRID, HALF_GRID, inner);
    graphics.generateTexture('collector', GRID, GRID);
    graphics.destroy();
  }
}
