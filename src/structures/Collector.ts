import { GRID, HALF_GRID } from '..';
import GameScene from '../scenes/GameScene';
import { BaseStructure } from './BaseStructure';

// TODO consider turning into a "Claimer" whose only purpose is to claim land without relaying energy.
//  Right now "Relay" is too similar to this. Once this diverges from being just a creeper world like game,
//  I may want every structure to have specific purposes and keep their numbers limited
export class Collector extends BaseStructure {
  name = 'Collector';
  relay = true;
  connectionRange = 5;
  buildCost = 5;
  healthMax = 1;
  ammoMax = 0;
  energyCollectionRange = 4;
  energyCollectionRate = 0.05;
  energyProduction = 0;
  movable = false;
  updatePriority = -1;

  buildCostPaid = 0;
  healthCurrent = 1;
  ammoCurrent = 0;

  sprite: Phaser.GameObjects.Sprite;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.sprite = this.scene.add.sprite(this.x, this.y, 'collector').setDepth(12);
    this.sprite.setAlpha(0.3);
    // this.activate();
    // WORLD_DATA[this.coordY][this.coordX].ref = this;

    // this.scene.city.requestEnergy({
    //   id: Math.random().toString(36).substring(2, 9),
    //   type: 'energy',
    //   amount: 100,
    //   requester: this
    // });
  }

  // update(time: number, delta: number) {
  //   if (this.destroyed || !this.energyPath.found) return;
  //   if (this.buildCostPaid < this.buildCost) {
  //     this.energyPath.path[0].data.ref?.receiveEnergy(this.energyCollectionRate * delta, this.id);
  //     return;
  //   }

  // }

  destroy() {
    super.destroy();
    this.sprite.destroy();
  }

  // destroy() {
  //   WORLD_DATA[this.coordY][this.coordX].ref = null;
  //   // this.graphics.destroy();
  // }

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
