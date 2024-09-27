import { NoiseFunction2D, createNoise2D } from 'simplex-noise';
import { config, ENERGY_PER_COLLECTING_CELL, FLOW_DISABLED, level, THRESHOLD, TICK_DELTA } from '../constants';

const size = (level.sizeX + 1) * (level.sizeY + 1) * Uint16Array.BYTES_PER_ELEMENT;
export interface CollectionInfo {
  id: string;
  xCoord: number;
  yCoord: number;
  radius: number;
  elevation: number;
}

export interface EmitterInfo {
  id: string;
  xCoord: number;
  yCoord: number;
  fluidPerSecond: number;
  ticksCooldown: number; // how many ticks it pauses before emitting again
  ticksDelay: number; // how many ticks it waits before starting to emit
  active: boolean;
}

export class Simulation {
  prevFluidData = new Uint16Array(new ArrayBuffer(size));
  fluidData = new Uint16Array(new ArrayBuffer(size));
  terrainData = new Uint16Array(new ArrayBuffer(size));
  collectionData = new Uint8Array(new ArrayBuffer(size));

  energyCollecting = 0;

  private currentTick = 0;

  private readonly flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  private readonly flowNeighboursAlt = [[-1, -1], [-1, 1], [1, 1], [1, -1]];
  // private readonly flowNeighboursAlt = [[-2, 0], [2, 0], [0, 2], [0, -2]];
  // private readonly flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1], [-1, -1], [-1, 1], [1, 1], [1, -1]];
  // private readonly flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1], [-1, -1], [-1, 1], [1, 1], [1, -1], [-2, 0], [2, 0], [0, 2], [0, -2]];
  private readonly cellEdges = [[0, 0], [1, 0], [1, 1], [0, 1]]; // marching squares works on edges, while the rest of the game works on cells (consisting of 4 edges each)
  private readonly fluidChangeRequests: {xCoord: number, yCoord: number, amount: number}[] = [];
  private readonly noise: NoiseFunction2D = createNoise2D(() => level.seed);
  readonly collectors = new Map<CollectionInfo['id'], CollectionInfo>();
  readonly emitters = new Map<EmitterInfo['id'], EmitterInfo>();
  collectorDataNeedsUpdate: boolean = false;

  // experimental way to do events without using event emitter
  lastChangeTick = {
    fluid: 0,
    collection: 0,
    terrain: 0,
    emitters: 0,
  };

  constructor() {
    const {elevationMax} = config.terrain;
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
        this.terrainData[index] = n;
      }
    }

    for (const rect of level.rects) {
      for (let y = rect.yCoord; y < rect.yCoord + rect.h; y++) {
        for (let x = rect.xCoord; x < rect.xCoord + rect.w; x++) {
          const index = y * (level.sizeX + 1) + x;
          this.terrainData[index] = rect.elevation;
        }
      }
    }
  }

  addCollector(collector: CollectionInfo) {
    const id = Math.random().toString(36).substring(2, 10);
    this.collectors.set(collector.id, {...collector, id});
    this.collectorDataNeedsUpdate = true;
    return id;
  }

  removeCollector(id: CollectionInfo['id']) {
    this.collectors.delete(id);
    this.collectorDataNeedsUpdate = true;
  }

  addEmitter(emitter: Omit<EmitterInfo, 'id'>) {
    const id = Math.random().toString(36).substring(2, 10);
    this.emitters.set(id, {...emitter, id});
    this.lastChangeTick.emitters = this.currentTick + 1;
    return id;
  }

  removeEmitter(id: EmitterInfo['id']) {
    this.emitters.delete(id);
    this.lastChangeTick.emitters = this.currentTick + 1;
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

  tick(tickCounter: number) {
    this.currentTick = tickCounter;
    if (!FLOW_DISABLED) this.updateFluid(tickCounter);
    if (this.collectorDataNeedsUpdate) this.updateCollectorData(tickCounter);
    this.checkIfDestroyed();
  }

  updateFluid(tickCounter: number) {
    const {flowRate, overflow} = config.fluid;
    const {elevationMax} = config.terrain;
    const {prevFluidData, fluidData} = this;
    const max = elevationMax + overflow;

    const neighbours = tickCounter % 2 === 0 ? this.flowNeighbours : this.flowNeighboursAlt;

    // Emitters emit fluid continuously
    for (const emitter of this.emitters.values()) {
      if (!emitter.active) continue;
      if (emitter.ticksDelay > tickCounter) continue;
      if (emitter.ticksCooldown > 1  && tickCounter % emitter.ticksCooldown !== 1) continue;
      const amountPerTickAndEdge = (emitter.fluidPerSecond * TICK_DELTA) / 4;
      for (const [cellX, cellY] of this.cellEdges) {
        const xCoord = emitter.xCoord + cellX;
        const yCoord = emitter.yCoord + cellY;
        const index = yCoord * (level.sizeX + 1) + xCoord;
        fluidData[index] = Math.min(Math.max(amountPerTickAndEdge, 0), max);
      }
    }

    // Add or Remove fluid for whatever other reason (weapons, single emits etc)
    for (const {xCoord, yCoord, amount} of this.fluidChangeRequests) {
      const index = yCoord * (level.sizeX + 1) + xCoord;
      fluidData[index] = Math.min(Math.max(fluidData[index] + amount, 0), elevationMax + overflow);
    }
    this.fluidChangeRequests.length = 0;
    prevFluidData.set(fluidData);

    const totalFluid = prevFluidData.reduce((acc, cur) => acc + cur, 0);

    const tmp: [number, number][] = Array.from({length: neighbours.length}, () => [0, 0]);
    let i = 0;

    for (let y = 0; y <= level.sizeY; y++) {
      for (let x = 0; x <= level.sizeX; x++) {
        const indexCenter = y * (level.sizeX + 1) + x;
        const fluidCenter = prevFluidData[indexCenter];
        const elevationCenter = fluidCenter + this.terrainData[indexCenter];

        // Evaporate low density fluid
        if (fluidCenter < THRESHOLD * 0.5) prevFluidData[indexCenter] = 0; // Skip if not enough fluid to flow
        if (fluidCenter < THRESHOLD * 0.9) continue;

        i = 0;
        for (const [dx, dy] of neighbours) {
          const newX = x + dx;
          const newY = y + dy;
          const cur = tmp[i++];

          if (!(newX >= 0 && newX <= level.sizeX && newY >= 0 && newY <= level.sizeY)) {
            cur[0] = -1;
            cur[1] = -1;
            continue;
          }

          const indexNeighbour = newY * (level.sizeX + 1) + newX;
          const elevationNeighbour = prevFluidData[indexNeighbour] + this.terrainData[indexNeighbour];

          const elevationDiff = elevationCenter - elevationNeighbour;
          cur[0] = elevationDiff;
          cur[1] = indexNeighbour;
        }

        tmp.sort((a, b) => b[0] - a[0]); // ensure we flow to the lowest neighbour first

        const flow = flowRate / neighbours.length;
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

  // TODO only collect from same elevation as collector.
  // In CW, the collection seems to be blocked by holes or walls when there is not a direct line of sight to the collector but not doing that now.
  private updateCollectorData(tickCounter: number) {
    this.collectionData.fill(0);
    let collectingCells = 0;

    for (const {xCoord, yCoord, radius} of this.collectors.values()) {
      const collectorElevation = this.terrainData[yCoord * (level.sizeX + 1) + xCoord];

      for (let yOffset = -radius; yOffset <= radius; yOffset++) {
        for (let xOffset = -radius; xOffset <= radius; xOffset++) {
          // for (const [cellX, cellY] of this.cellEdges) {
          const x = xCoord + xOffset;
          const y = yCoord + yOffset;
          const distance = Math.sqrt((xCoord - x) ** 2 + (yCoord - y) ** 2);
          if (distance >= radius) continue; // skip out of range

          for (const [cellX, cellY] of this.cellEdges) {
            const posX = x + cellX;
            const posY = y + cellY;
            if (!(posX >= 0 && posX <= level.sizeX && posY >= 0 && posY <= level.sizeY)) continue;
            const index = posY * (level.sizeX + 1) + posX;
            if (this.collectionData[index] === 1) continue;

            const terrainElevation = this.terrainData[index];
            if (terrainElevation !== collectorElevation) continue;

            collectingCells++;
            this.collectionData[index] = 1;
          }
        }
      }
    }

    this.energyCollecting = collectingCells * ENERGY_PER_COLLECTING_CELL;
    this.collectorDataNeedsUpdate = false;
    this.lastChangeTick.collection = tickCounter;
  }

  checkIfDestroyed() {
    for (const collector of this.collectors.values()) {
      const x = collector.xCoord;
      const y = collector.yCoord;

      const indexTL = y * (level.sizeX + 1) + x;
      const indexBL = indexTL + level.sizeX + 1;
      const indexTR = indexTL + 1;
      const indexBR = indexBL + 1;

      const fluidTL = this.fluidData[indexTL];
      const fluidTR = this.fluidData[indexTR];
      const fluidBR = this.fluidData[indexBR];
      const fluidBL = this.fluidData[indexBL];
      const avg = (fluidTL + fluidTR + fluidBR + fluidBL) / 4;

      if (avg > THRESHOLD) this.removeCollector(collector.id);
    }
  }
}
