import { NoiseFunction2D, createNoise2D } from 'simplex-noise';
import { config, FLOW_DISABLED, level, THRESHOLD } from '../constants';

const size = (level.sizeX + 1) * (level.sizeY + 1);
const sharedPrevFluidBuffer = new SharedArrayBuffer(size * Uint16Array.BYTES_PER_ELEMENT);
const sharedFluidBuffer = new SharedArrayBuffer(size * Uint16Array.BYTES_PER_ELEMENT);
const sharedTerrainBuffer = new SharedArrayBuffer(size * Uint16Array.BYTES_PER_ELEMENT);

export const prevFluidData = new Uint16Array(sharedPrevFluidBuffer); // for double buffering to avoid changing flow based on values that were already changed in current cycle
export const fluidData = new Uint16Array(sharedFluidBuffer);
export const terrainData = new Uint16Array(sharedTerrainBuffer);

export class TerrainSimulation {
  private readonly flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // private readonly flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1], [-1, -1], [-1, 1], [1, 1], [1, -1]];
  // private readonly flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1], [-1, -1], [-1, 1], [1, 1], [1, -1], [-2, 0], [2, 0], [0, 2], [0, -2]];
  private readonly cellEdges = [[0, 0], [1, 0], [1, 1], [0, 1]]; // marching squares works on edges, while the rest of the game works on cells (consisting of 4 edges each)
  private readonly fluidChangeRequests: {xCoord: number, yCoord: number, amount: number}[] = [];
  private readonly noise: NoiseFunction2D = createNoise2D(() => level.seed);
  emitters: []; // TODO move here. They are part of the simulation... change requests are only for changes in fluid by other things

  constructor() {
    const {elevationMax} = config.terrain;
    console.log('simulation init');

    const divider = level.noise.filter(n => !n.subtract).length;

    for (let y = 0; y <= level.sizeY; y++) {
      for (let x = 0; x <= level.sizeX; x++) {
        let n = 0;
        let toSubtract = 0;
        for (const {scale, strength, subtract, offsetX, offsetY} of level.noise) {
          const tmp = Math.max((this.noise((x - offsetX) / scale, (y - offsetY) / scale) * elevationMax) * strength, 0); // negative
          if (subtract) toSubtract += tmp;
          else n += tmp;
        }

        n -= toSubtract;
        n = Math.min(Math.max(n / divider, 0), elevationMax);
        if (n < THRESHOLD * 2.5) n = 0;
        n = Math.floor(n / (THRESHOLD * 3)) * (THRESHOLD * 3);

        const index = y * (level.sizeX + 1) + x;
        terrainData[index] = n;
      }
    }
  }

  // It seems that SharedArrayBuffer wouldn't be shared if I don't instantiate it within the worker. Not sure really...
  // It was probably because I had it exported in the index.ts and imported where needed.
  // I assume that if I somehow pass it as an argument to the worker it would also work (??)
  getData() {
    return {terrainData, fluidData};
  }

  fluidChangeRequest(xCoord: number, yCoord: number, totalChange: number, pattern: number[][] = [[0, 0]]) {
    // remember there are always 4 edges per cell and rest of game works exclusively with cells
    // so when xCoord and yCoord are 0,0 we need to change the fluid at 4 edges (0,0), (1,0), (1,1), (0,1)
    const change = totalChange / (pattern.length * 4);
    for (const [patternX, patternY] of pattern) {
      for (const [cellX, cellY] of this.cellEdges) {
        this.fluidChangeRequests.push({xCoord: xCoord + patternX + cellX, yCoord: yCoord + patternY + cellY, amount: change});
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(tickCounter: number) {
    if (FLOW_DISABLED) return;
    // console.time('terrain simulation tick');
    const {flowRate, overflow} = config.fluid;
    const {elevationMax} = config.terrain;

    // Add fluid or remove it from the system
    for (const {xCoord, yCoord, amount} of this.fluidChangeRequests) {
      const index = yCoord * (level.sizeX + 1) + xCoord;
      fluidData[index] =  Math.min(Math.max(fluidData[index] + amount, 0), elevationMax + overflow);
      // fluidData[index] = amount;
    }
    this.fluidChangeRequests.length = 0;
    prevFluidData.set(fluidData);

    const totalFluid = prevFluidData.reduce((acc, cur) => acc + cur, 0);
    // const totalEvaporated = 0;

    const tmp: [number, number][] = Array.from({length: this.flowNeighbours.length}, () => [0, 0]);
    let i = 0;

    for (let y = 0; y <= level.sizeY; y++) {
      for (let x = 0; x <= level.sizeX; x++) {
        const indexCenter = y * (level.sizeX + 1) + x;
        const fluidCenter = prevFluidData[indexCenter];
        const elevationCenter = fluidCenter + terrainData[indexCenter];

        // Evaporate low density fluid
        if (fluidCenter < THRESHOLD * 0.5) prevFluidData[indexCenter] = 0; // Skip if not enough fluid to flow
        if (fluidCenter < THRESHOLD * 0.9) continue;

        i = 0;
        for (const [dx, dy] of this.flowNeighbours) {
          const newX = x + dx;
          const newY = y + dy;
          const cur = tmp[i++];

          if (!(newX >= 0 && newX <= level.sizeX && newY >= 0 && newY <= level.sizeY)) {
            cur[0] = -1;
            cur[1] = -1;
            continue;
          }

          const indexNeighbour = newY * (level.sizeX + 1) + newX;
          const elevationNeighbour = prevFluidData[indexNeighbour] + terrainData[indexNeighbour];

          const elevationDiff = elevationCenter - elevationNeighbour;
          cur[0] = elevationDiff;
          cur[1] = indexNeighbour;
        }

        tmp.sort((a, b) => b[0] - a[0]); // ensure we flow to the lowest neighbour first

        const flow = flowRate / this.flowNeighbours.length;
        for (const [elevationDiff, indexNeighbour] of tmp) {
          if (elevationDiff < 2 || indexNeighbour === -1) continue;

          const maxFlow = elevationDiff * flow;
          const centerFluid = fluidData[indexCenter] * flow; // I think I need this to ensure it doesn't flow more than it can
          const flowAmount = Math.floor(Math.min(Math.max(maxFlow, 0), centerFluid));

          if (flowAmount < 1) break;

          fluidData[indexCenter] -= flowAmount;
          fluidData[indexNeighbour] += flowAmount;
        }
      }
    }

    const totalFluidAfter = fluidData.reduce((acc, cur) => acc + cur, 0);
    console.assert(totalFluid === (totalFluidAfter), 'loss of density due to adding or subtracting fractions to uint16array');
  }
}
