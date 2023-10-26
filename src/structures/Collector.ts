import { GRID, HALF_GRID, WORLD_DATA } from '..';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseStructure';

export class Collector extends BaseStructure {
  name = 'Collector';
  relay = true;
  connectionRange = 5;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.relay = true;
    this.scene.add.sprite(this.x, this.y, 'collector').setDepth(12);
    // WORLD_DATA[this.coordY][this.coordX].ref = this;

    // this.scene.city.requestEnergy({
    //   id: Math.random().toString(36).substring(2, 9),
    //   type: 'energy',
    //   amount: 100,
    //   requester: this
    // });
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
