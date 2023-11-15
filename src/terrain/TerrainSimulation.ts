import { NoiseFunction2D, createNoise2D } from 'simplex-noise';

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
  readonly terrain: number[][];
  readonly fluid: number[][];
  private prevTotalFluidDensity: number;
  private readonly config: TerrainSimulationConfig;
  private readonly prevFluid: number[][];
  private readonly flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  private readonly cellEdges = [[0, 0], [1, 0], [1, 1], [0, 1]]; // marching squares works on edges, while the rest of the game works on cells (consisting of 4 edges each)
  private readonly fluidChangeRequests: {xCoord: number, yCoord: number, amount: number}[] = [];
  private readonly noise: NoiseFunction2D = createNoise2D();

  constructor(config: TerrainSimulationConfig) {
    this.config = config;
    this.prevFluid = this.generateMatrix();
    this.fluid = this.generateMatrix();
    this.terrain = this.generateMatrix((x, y) => {
      const n3 = Math.max((this.noise(x / 48, y / 48) * config.terrain.elevationMax) * 2, 0); // macro
      const n2 = (this.noise(x / 32, y / 32) * config.terrain.elevationMax) * 1; // midlevel
      const n1 = (this.noise(x / 16, y / 16) * config.terrain.elevationMax) * 1; // micro
      let n = Math.max(((n1 + n2 + n3) / 3), 0);
      if (n < 32) n = 0;
      return Math.max(n, 0);
    });
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

  private generateMatrix(fn: (x: number, y: number ) => number = () => 0): number[][] {
    const elevation: number[][] = [];
    console.time('generateVertices');
    for (let y = 0; y <= this.config.terrain.worldSizeY; y++) {
      const row: number[] = [];
      for (let x = 0; x <= this.config.terrain.worldSizeX; x++) {
        row.push(fn.call(this, x, y));
      }
      elevation.push(row);
    }
    console.timeEnd('generateVertices');
    return elevation;
  }

  tick(tickCounter: number) {
    const {overflow, flowRate, evaporation} = this.config.fluid;
    const {worldSizeX, worldSizeY, elevationMax} = this.config.terrain;
    const creeper = this.fluid;
    const prevCreeper = this.prevFluid;

    let totalCreeper = 0;
    for (let y = 0; y <= worldSizeY; y++) {
      const creeperY = creeper[y];
      const prevCreeperY = prevCreeper[y];
      for (let x = 0; x <= worldSizeX; x++) {
        prevCreeperY[x] = Math.max(Math.min(creeperY[x], elevationMax * overflow), 0);
        totalCreeper += prevCreeperY[x];
      }
    }

    if (tickCounter % 20 === 0) {
      // console.log('total Creeper', totalCreeper.toFixed(0),'change', totalCreeper - this.prevTotalFluidDensity);
      this.prevTotalFluidDensity = totalCreeper;
    }

    // Fluid Change requests besides regular flow (such as damage by weapons, emitters, etc.)
    // These may potentially happen outside of the regular tick cycle
    for (const request of this.fluidChangeRequests) {
      creeper[request.yCoord][request.xCoord] += (request.amount);
    }
    this.fluidChangeRequests.length = 0;

    for (let y = 0; y <= worldSizeY; y++) {
      const prevCreeperY = prevCreeper[y];
      const creeperY = creeper[y];
      const terrainY = this.terrain[y];
      for (let x = 0; x <= worldSizeX; x++) {
        if (prevCreeperY[x] <= 8) prevCreeperY[x] = Math.max(prevCreeperY[x] - evaporation, 0); // evaporate
        for (const [dx, dy] of this.flowNeighbours) {
          const newX = x + dx;
          const newY = y + dy;
          // FIXME To make the terrain and creeper layers align correctly at borders I need to do something similar as in my other marching squares based project
          // where water flows down from a sideway perspecvie and perfectly aligns with the terrain due to never allowing water+terrain to exceed max density
          // Here I cannot just do `maxFlow = MAX_DENSITY-terrainDensity` because we work with multiply layers instead of just one in the sideways view...
          // All layers work with the same density/elevation data so maybe I just need to manipulate the resulting densityData before densityGeomData is created
          // E.g. a single point the terrain density is 10. The creeper density at the equivalent point needs to be set to 6 at that particular level (assuming 16 threshold)
          // This is primarily for cosmetic reasons. Ideally we also treat any creeper density where it exceeds to the next level as empty, so it doesn't render.
          // The problem with that is that I'd have to give up transparency or need to be able to automatically adjust it for the topmost layer...
          // Maybe that won't be necessary once I switch to a proper isoband/isoline based rendering instead of tile based...
          if (newX >= 0 && newX <= worldSizeX && newY >= 0 && newY <= worldSizeY) {
            const currentTotalElevation = prevCreeperY[x] + (Math.round(terrainY[x] / 16) * 16);
            const neighborTotalElevation = prevCreeper[newY][newX] + (Math.round(this.terrain[newY][newX] / 16) * 16);
            const elevationDiff = currentTotalElevation - neighborTotalElevation;
            // If the current tile is higher in total elevation, diffuse down to the neighbor
            // TODO prioritize flowing on same or lower level first before considering to flow up
            // Maybe get the total fluid density available that can flow at the start
            // Then call a method to give you the neighbours with the lowest total density first
            // Then just flow there if it is lower than center. If not break out of loop as all other will be higher
            // If it is lower and it did flow reduce the remaining density and break out of loop if it is 0
            if (elevationDiff > 0) {
              const flowAmount = Math.min(elevationDiff, prevCreeper[y][x]) * flowRate;
              creeperY[x] -= flowAmount;
              creeper[newY][newX] += flowAmount;
            }
          }
        }
      }
    }
  }
}
