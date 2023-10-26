import { GRID, HALF_GRID, WORLD_DATA } from '..';
import { Cell } from '../City';
import GameScene from '../scenes/GameScene';

// export type Structure = Weapon | Collector;

// export interface Structure {
//     id: string;
//     name: string;
//     x: number;
//     y: number;
//     coordX: number;
//     coordY: number;
// }

// export interface EnergyReceiver {
//     path: Phaser.Curves.Path;
//     update?(time: number, delta: number): void;
//     receiveEnergy(amount: number, requestId: string): void;
//     // requestEnergy(request: EnergyRequest): void;
// }

export const getCellsInRange = (coordX: number, coordY: number, range: number, occupiedOnly = true) => {
  const cells: [Cell, number][] = [];
  console.log('-----getNeighboursInRange-----', coordX, coordY, range);
  for (let y = coordY - range; y <= coordY + range; y++) {
    for (let x = coordX - range; x <= coordX + range; x++) {
      if (x < 0 || y < 0 || x >= WORLD_DATA[0].length || y >= WORLD_DATA.length) continue; // skip out of bounds
      const cell = WORLD_DATA[y][x];
      // console.log('x', x, 'y', y, cell);
      if (occupiedOnly && !cell.ref) continue; // skip unoccupied cells only when desired
      if (cell.ref === this) continue; // skip self
      const distance = Math.abs(x - coordX) + Math.abs(y - coordY); // manhattan distance, not euclidean
      if (distance > range) continue; // skip cells that are out of range
      cells.push([cell, distance]);
    }
  }

  console.log('cells', cells);
  return cells;
};

export abstract class BaseStructure {
  scene: GameScene;
  id: string;
  x: number;
  y: number;
  coordX: number;
  coordY: number;
  private static structuresById: Map<string, BaseStructure> = new Map();
  private static activeStructureIds: Set<string> = new Set();
  private static destroyedStructureIds: Set<string> = new Set();

  // Parameters
  abstract name: string;
  abstract connectionRange: number;
  abstract relay: boolean;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    this.scene = scene;
    this.id = Math.random().toString(36).substring(2, 10);
    this.x = coordX * GRID + HALF_GRID;
    this.y = coordY * GRID + HALF_GRID;
    this.coordX = coordX;
    this.coordY = coordY;
    BaseStructure.structuresById.set(this.id, this);
    WORLD_DATA[this.coordY][this.coordX].ref = this;

    // console.log('relay in parent class', this.relay);
  }

  activate() {
    BaseStructure.activeStructureIds.add(this.id);
    // this.onActivate();
  }

  deactivate() {
    BaseStructure.activeStructureIds.delete(this.id);
    // this.onDeactivate();
  }

  destroy() {
    BaseStructure.destroyedStructureIds.add(this.id);
    BaseStructure.activeStructureIds.delete(this.id);
    // this.onDestroy();
  }

  protected static drawStar (graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    graphics.beginPath();
    graphics.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      graphics.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      graphics.lineTo(x, y);
      rot += step;
    }

    graphics.lineTo(cx, cy - outerRadius);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  // abstract update(time: number, delta: number);
  // abstract onDestroy();
  // abstract onActivate();
  // abstract onDeactivate();

  // static update(time: number, delta: number) {
  //   for (const id of BaseStructure.activeStructureIds) {
  //     const structure = BaseStructure.structuresById.get(id);
  //     if (!structure) throw new Error(`Structure with id ${id} not found`);
  //     structure.update(time, delta);
  //   }
  // }
}
