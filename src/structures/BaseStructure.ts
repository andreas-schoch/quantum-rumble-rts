import { WORLD_DATA } from '..';
import { Cell } from '../City';
import { Collector } from './Collector';
import { Weapon } from './Weapon';

export type Structure = Weapon | Collector;

export interface EnergyReceiver {
    path: Phaser.Curves.Path;
    update?(time: number, delta: number): void;
    receiveEnergy(amount: number, requestId: string): void;
    // requestEnergy(request: EnergyRequest): void;
}

export const getNeighboursInRange = (coordX: number, coordY: number, range: number, occupiedOnly = true) => {
  const cells: Cell[] = [];
  for (let y = coordY - range; y <= coordY + range; y++) {
    for (let x = coordX - range; x <= coordX + range; x++) {
      if (x < 0 || y < 0 || x >= WORLD_DATA[0].length || y >= WORLD_DATA.length) continue; // skip out of bounds
      const cell = WORLD_DATA[y][x];
      if (occupiedOnly && !cell.ref) continue; // skip unoccupied cells only when desired
      if (cell.ref === this) continue; // skip self
      const distance = Math.abs(x - coordX) + Math.abs(y - coordY); // manhattan distance, not euclidean
      if (distance > range) continue; // skip cells that are out of range
      cells.push(cell);
    }
  }
  return cells;
};

// export class Structure2 implements EnergyReceiver {

// }
