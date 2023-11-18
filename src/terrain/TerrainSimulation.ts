import { NoiseFunction2D, createNoise2D } from 'simplex-noise';
import { MAX_UINT16, THRESHOLD } from '../constants';

export interface TerrainSimulationConfig {
  terrain: {
    worldSizeX: number;
    worldSizeY: number;
    elevationMax: number;
  },
  fluid: {
    overflow: number;
    flowRate: number;
    evaporation: number;
  },
}

// Separate class to decouple from phaser dependencies irrelevant for simulation and make it easier to test
export class TerrainSimulation {
  readonly terrain: Uint32Array;
  readonly fluid: Uint32Array;
  private readonly prevFluid: Uint32Array;
  private readonly config: TerrainSimulationConfig;
  private readonly flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  private readonly cellEdges = [[0, 0], [1, 0], [1, 1], [0, 1]]; // marching squares works on edges, while the rest of the game works on cells (consisting of 4 edges each)
  private readonly fluidChangeRequests: {xCoord: number, yCoord: number, amount: number}[] = [];
  private readonly noise: NoiseFunction2D = createNoise2D();

  constructor(config: TerrainSimulationConfig) {
    this.config = config;
    const {elevationMax} = config.terrain;
    const size = (config.terrain.worldSizeX + 1) * (config.terrain.worldSizeY + 1);
    this.prevFluid = new Uint32Array(size);
    this.fluid = new Uint32Array(size);
    this.terrain = new Uint32Array(size);
    for (let y = 0; y <= config.terrain.worldSizeY; y++) {
      for (let x = 0; x <= config.terrain.worldSizeX; x++) {
        const n3 = Math.max((this.noise(x / 48, y / 48) * elevationMax) * 2, 0); // macro
        const n2 = (this.noise(x / 32, y / 32) * elevationMax) * 2; // midlevel
        const n1 = (this.noise(x / 16, y / 16) * elevationMax) * 1; // micro
        const n = Math.min(Math.max(((n1 + n2 + n3) / 3), 0), elevationMax);
        const index = y * (config.terrain.worldSizeX + 1) + x;
        this.terrain[index] = Math.min(Math.floor(n / (THRESHOLD * 3)) * (THRESHOLD * 3), MAX_UINT16);
        // this.terrain[index] = n;
      }
    }
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
    const {flowRate, evaporation, overflow} = this.config.fluid;
    const {worldSizeX, worldSizeY, elevationMax} = this.config.terrain;
    const {terrain, fluid, prevFluid} = this;

    for (const {xCoord, yCoord, amount} of this.fluidChangeRequests) {
      const index = yCoord * (worldSizeX + 1) + xCoord;
      fluid[index] =  Math.max(Math.min(fluid[index] +  amount, elevationMax + overflow), 0);
    }
    this.fluidChangeRequests.length = 0;
    prevFluid.set(fluid);

    for (let y = 0; y <= worldSizeY; y++) {
      for (let x = 0; x <= worldSizeX; x++) {
        const indexCenter = y * (worldSizeX + 1) + x;
        // Evaoprate fluid a little bit earlier than stopping it from flowing to prevent invisible spread
        // Using interpolation makes fluid smoother but also leads to fluid flowing while invisible
        // Once it acumulates enough it can look like it suddenly appears out of nowhere
        const prevFluidValue = prevFluid[indexCenter];
        if (prevFluidValue < THRESHOLD * 1.5) prevFluid[indexCenter] = Math.max(prevFluidValue - evaporation, 0);
        if (prevFluidValue < THRESHOLD * 1.25) continue;

        // sorting neighbours ensures hat it flows in the direction with the largest difference in elevation
        const sortedByTotalElevation = this.flowNeighbours.map(([dx, dy]) => {
          const newX = x + dx;
          const newY = y + dy;
          if (newX >= 0 && newX <= worldSizeX && newY >= 0 && newY <= worldSizeY) {
            const indexNeighbour = newY * (worldSizeX + 1) + newX;
            const currentTotalElevation = prevFluid[indexCenter] + (Math.floor(terrain[indexCenter] / (THRESHOLD * 3)) * (THRESHOLD * 3));
            const neighborTotalElevation = prevFluid[indexNeighbour] + (Math.floor(terrain[indexNeighbour] / (THRESHOLD * 3)) * (THRESHOLD * 3));
            const elevationDiff = currentTotalElevation - neighborTotalElevation;
            return [elevationDiff, indexNeighbour];
          }
          return [0, -1];
        }).sort((a, b) => b[0] - a[0]);

        // Diffuse to non-diagonal neighbouring edges
        for (const [elevationDiff, indexNeighbour] of sortedByTotalElevation) {
          if (elevationDiff < 0 || indexNeighbour === -1) continue;
          // FIXME To make the terrain and creeper layers align correctly at borders I need to do something similar as in my other marching squares based project
          // where water flows down from a sideway perspecvie and perfectly aligns with the terrain due to never allowing water+terrain to exceed max density
          // Here I cannot just do `maxFlow = MAX_DENSITY-terrainDensity` because we work with multiply layers instead of just one in the sideways view...
          // All layers work with the same density/elevation data so maybe I just need to manipulate the resulting densityData before densityGeomData is created
          // E.g. a single point the terrain density is 10. The creeper density at the equivalent point needs to be set to 6 at that particular level (assuming 16 threshold)
          // This is primarily for cosmetic reasons. Ideally we also treat any creeper density where it exceeds to the next level as empty, so it doesn't render.
          // The problem with that is that I'd have to give up transparency or need to be able to automatically adjust it for the topmost layer...
          // Maybe that won't be necessary once I switch to a proper isoband/isoline based rendering instead of tile based...
          const flowAmount = Math.floor(Math.min(elevationDiff * flowRate, prevFluid[indexCenter] * flowRate));
          if (flowAmount >= 1) {
            fluid[indexCenter] -= flowAmount;
            fluid[indexNeighbour] += flowAmount;
          }
        }
      }
    }
  }
}
