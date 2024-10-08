import GraphWorker from 'worker-loader!../workers/pathFinder.worker.ts';
import { NoiseFunction2D, createNoise2D } from 'simplex-noise';
import { config, ENERGY_PER_COLLECTING_CELL, EVENT_ENERGY_CONSUMPTION_CHANGE, EVENT_ENERGY_PRODUCTION_CHANGE, EVENT_ENERGY_STORAGE_CHANGE, GRID, level, THRESHOLD, TICK_DELTA } from '../constants';
import { Unit } from '../units/BaseUnit';
import { cellIndexAt, generateId, getCellsInRange } from '../util';
import { Graph, PathfinderResult } from '../Graph';
import { Remote, wrap } from 'comlink';

export interface SimulationState {
  cells: Cell[];
  root: Unit | null;
  graph: Remote<Graph>; // Computed within worker
  tickCounter: number;

  // the below data represents the "edges" of the cells indicating the fluid level, terrain elevation or collection area
  prevFluidData: Uint16Array;
  fluidData: Uint16Array;
  terrainData: Uint16Array;
  collectionData: Uint8Array;

  energyTravelSpeed: number;
  energyStorageMax: number;
  energyStorageCurrent: number;
  energyProducing: number;
  energyCollecting: number;
  energyDeficit: number;
  energyProducedPerSecond: number;
  energyConsumedPerSecond: number;
  energyRequests: {id: string, type: 'ammo' | 'build', amount: number, requester: Unit}[];
  fluidChangeRequests: {xCoord: number, yCoord: number, amount: number}[];

  entities: Map<Unit['id'], Unit>;
  emitterIds: Set<Unit['id']>;
  collectorIds: Set<Unit['id']>;
  selectedEntityId: Unit['id'] | null;

  collectorDataNeedsRefresh: boolean;
  isPaused: boolean;
}

const size = (level.sizeX + 1) * (level.sizeY + 1) * Uint16Array.BYTES_PER_ELEMENT;
export class Simulation {
  state: SimulationState = {
    cells: [],
    root: null,
    graph: wrap(new GraphWorker()),
    prevFluidData: new Uint16Array(new ArrayBuffer(size)),
    fluidData: new Uint16Array(new ArrayBuffer(size)),
    terrainData: new Uint16Array(new ArrayBuffer(size)),
    collectionData: new Uint8Array(new ArrayBuffer(size)),
    energyTravelSpeed: 150,
    energyStorageMax: 0,
    energyStorageCurrent: 0,
    energyProducing: 0,
    energyCollecting: 0,
    energyDeficit: 0,
    energyProducedPerSecond: 0,
    energyConsumedPerSecond: 0,
    energyRequests: [],
    fluidChangeRequests: [],
    entities: new Map(),
    emitterIds: new Set(),
    collectorIds: new Set(),
    selectedEntityId: null,
    collectorDataNeedsRefresh: false,
    isPaused: false,
    tickCounter: 0,
  };

  particlePlaceEntity: Phaser.GameObjects.Particles.ParticleEmitter;

  private readonly flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  private readonly flowNeighboursAlt = [[-1, -1], [-1, 1], [1, 1], [1, -1]];
  private readonly cellEdges = [[0, 0], [1, 0], [1, 1], [0, 1]]; // marching squares works on edges, while the rest of the game works on cells (consisting of 4 edges each)

  constructor(private observer: Phaser.Events.EventEmitter, public renderingAdapter: RenderingAdapter) {
    this.generateWorldCells();
    this.generateTerrainData();
    for(const entityData of level.entities) new Unit(this, entityData);
  }

  step() {
    if (this.state.isPaused) return;
    this.state.tickCounter++;
    this.updateEnergy();
    this.fluidFlow();
    this.updateCollectorData();
    for(const entity of this.state.entities.values()) entity.step();
  }

  removeEntity(id: Unit['id']) {
    const entity = this.state.entities.get(id);
    if (!entity) return;
    this.state.graph.getNeighbourVertices(id).then(vertices => {
      for (const id of vertices) {
        if (id === entity.id) continue;
        const otherEntity = this.state.entities.get(id);
        if (!otherEntity) throw new Error('otherEntity not found');
        this.renderingAdapter.destroyConnectionBetween(entity, otherEntity);
      }
    });
    this.state.cells[entity.cellIndex].ref = null;
    this.state.entities.delete(id);
    if (!entity.isDestroyed) entity.destroy();
    this.state.graph.removeVertex(id);

    // Check if we need to recompute paths for any entity which were connected to the removed entity
    for (const entity of this.state.entities.values()) {
      if (entity.energyPath.found && entity.energyPath.ids.has(id)) {
        // entity.energyPath = Unit.NOT_FOUND;
        entity.resetPath();
        if (entity.props.collectionRadius) {
          this.state.collectorDataNeedsRefresh = true;
          this.state.collectorIds.delete(entity.id);
        }
      }
    }
  }

  requestEnergy(type: EnergyRequest['type'], amount: number, requester: Unit) {
    if (requester.isDestroyed) throw new Error('This structure is already destroyed');
    if (requester.props.isEnergyRoot) throw new Error('Energy roots cannot request energy');
    if (!requester.energyPath.found) throw new Error('This structure is not connected to an energy source. ID: ' + requester.id);
    const request: EnergyRequest = {id: generateId(), type, amount, requester};
    this.state.energyRequests.push(request);
    return request;
  }

  connectToEnergyNetwork(entity: Unit) {
    // Register the entity as a node in the network
    this.state.graph.createVertex(entity.id, entity.x, entity.y, {x: entity.x, y: entity.y});

    // Connect the node to its neighbours if they are within range
    for (const [cell, distance] of getCellsInRange(this.state, entity.xCoord, entity.yCoord, entity.props.connectionRadius, true)) {
      if (!cell.ref) continue;
      if (!cell.ref.props.isRelay && !entity.props.isRelay) continue; // non-relay structures cannot connect to each other
      if (cell.ref.id === entity.id) continue;
      const distancePixel = distance * GRID;
      if (distance > cell.ref.props.connectionRadius || Math.floor(distance) === 0) continue; // won't connect if neighbour has a smaller connection range
      this.state.graph.createEdge(entity.id, cell.ref.id, distancePixel, null);
      this.renderingAdapter.renderConnectionBetween(entity, cell.ref, distancePixel);
    }
  }

  fluidChangeRequest(xCoord: number, yCoord: number, totalChange: number, pattern: number[][] = [[0, 0]]) {
    // remember there are always 4 edges per cell and rest of game works exclusively with cells
    // so when xCoord and yCoord are 0,0 we need to change the fluid at 4 edges (0,0), (1,0), (1,1), (0,1)
    const change = totalChange / (pattern.length * 4);
    for (const [patternX, patternY] of pattern) {
      for (const [cellX, cellY] of this.cellEdges) {
        this.state.fluidChangeRequests.push({xCoord: xCoord + patternX + cellX, yCoord: yCoord + patternY + cellY, amount: change});
      }
    }
  }

  updateEnergy() {
    const energyProducedPerSecond = this.state.energyProducing + this.state.energyCollecting;
    const energyStorage = Math.min(this.state.energyStorageCurrent + (energyProducedPerSecond * TICK_DELTA), this.state.energyStorageMax);
    const energyDeficit = this.state.energyRequests.reduce((acc, cur) => acc + cur.amount, 0);

    this.state.energyProducedPerSecond = energyProducedPerSecond;
    this.state.energyStorageCurrent = energyStorage;
    this.state.energyDeficit = energyDeficit;

    while (this.state.energyStorageCurrent >= 1 && this.state.energyRequests.length) {
      const request = this.state.energyRequests.shift()!;
      this.state.energyStorageCurrent -= request.amount;
      this.state.energyConsumedPerSecond += request.amount;
      this.renderingAdapter.renderEnergyBall(this.state, request);
    }

    // TODO this doesn't need to be an event. The outside world can just read the value
    // this.onEnergyStorageChange(this.state.energyStorageCurrent, this.state.energyStorageMax);
    this.observer.emit(EVENT_ENERGY_STORAGE_CHANGE, this.state.energyStorageCurrent, this.state.energyStorageMax);
    if (this.state.tickCounter % 20 === 0) {
      // this.onEnergyProductionChange(this.state.energyProducedPerSecond);
      // this.onEnergyConsumptionChange(this.state.energyConsumedPerSecond);
      this.observer.emit(EVENT_ENERGY_PRODUCTION_CHANGE, this.state.energyProducedPerSecond);
      this.observer.emit(EVENT_ENERGY_CONSUMPTION_CHANGE, this.state.energyConsumedPerSecond);
      this.state.energyConsumedPerSecond = 0;
    }
  }
  fluidFlow() {
    const {flowRate, overflow} = config.fluid;
    const {elevationMax} = config.terrain;
    const {prevFluidData, fluidData} = this.state;

    // Add or Remove fluid for whatever other reason (weapons, single emits etc)
    for (const {xCoord, yCoord, amount} of this.state.fluidChangeRequests) {
      const index = cellIndexAt(xCoord, yCoord);
      fluidData[index] = Math.min(Math.max(fluidData[index] + amount, 0), elevationMax + overflow);
    }
    this.state.fluidChangeRequests.length = 0;
    prevFluidData.set(fluidData);

    const totalFluid = prevFluidData.reduce((acc, cur) => acc + cur, 0);

    const neighbours = this.state.tickCounter % 2 === 0 ? this.flowNeighbours : this.flowNeighboursAlt;
    const tmp: [number, number][] = Array.from({length: neighbours.length}, () => [0, 0]);
    let i = 0;

    for (let y = 0; y <= level.sizeY; y++) {
      for (let x = 0; x <= level.sizeX; x++) {
        const indexCenter = cellIndexAt(x, y);
        const fluidCenter = prevFluidData[indexCenter];
        const elevationCenter = fluidCenter + this.state.terrainData[indexCenter];

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

          const indexNeighbour = cellIndexAt(newX, newY);
          const elevationNeighbour = prevFluidData[indexNeighbour] + this.state.terrainData[indexNeighbour];

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
    this.renderingAdapter.renderFluid(this.state.cells, fluidData, this.state.terrainData);
  }

  // TODO only collect from same elevation as collector.
  // In CW, the collection seems to be blocked by holes or walls when there is not a direct line of sight to the collector but not doing that now.
  private updateCollectorData() {
    if (!this.state.collectorDataNeedsRefresh) return;
    this.state.collectionData.fill(0);
    let collectingCells = 0;

    for (const entityId of this.state.collectorIds) {
      const entity = this.state.entities.get(entityId);
      if (!entity) throw new Error('Collector not found. State corrupted');
      const {xCoord, yCoord, props: {collectionRadius}} = entity;
      const collectorElevation = this.state.terrainData[cellIndexAt(xCoord, yCoord)];

      for (let yOffset = -collectionRadius; yOffset <= collectionRadius; yOffset++) {
        for (let xOffset = -collectionRadius; xOffset <= collectionRadius; xOffset++) {
          const x = xCoord + xOffset;
          const y = yCoord + yOffset;
          const distance = Math.sqrt((xCoord - x) ** 2 + (yCoord - y) ** 2);
          if (distance >= collectionRadius) continue; // skip out of range

          for (const [cellX, cellY] of this.cellEdges) {
            const posX = x + cellX;
            const posY = y + cellY;
            if (!(posX >= 0 && posX <= level.sizeX && posY >= 0 && posY <= level.sizeY)) continue;
            const index = cellIndexAt(posX, posY);
            if (this.state.collectionData[index] === 1) continue;

            const terrainElevation = this.state.terrainData[index];
            if (terrainElevation !== collectorElevation) continue;

            collectingCells++;
            this.state.collectionData[index] = 1;
          }
        }
      }
    }

    this.state.energyCollecting = collectingCells * ENERGY_PER_COLLECTING_CELL;
    this.state.collectorDataNeedsRefresh = false;
    this.renderingAdapter.renderCollectionArea(this.state.cells, this.state.collectionData);
  }

  private generateWorldCells() {
    for (let yCoord = 0; yCoord <= level.sizeY; yCoord++) {
      for (let xCoord = 0; xCoord <= level.sizeX; xCoord++) {
        const cellIndex = cellIndexAt(xCoord, yCoord);

        const edgeIndexTL = cellIndexAt(xCoord, yCoord);
        const edgeIndexBL = edgeIndexTL + level.sizeX + 1;
        const edgeIndexTR = edgeIndexTL + 1;
        const edgeIndexBR = edgeIndexBL + 1;

        const isTopEdge = yCoord === 0;
        const isLeftEdge = xCoord === 0;
        const isRightEdge = xCoord === level.sizeX;
        const isBottomEdge = yCoord === level.sizeY;

        this.state.cells.push({
          cellIndex,
          edgeIndexTL,
          edgeIndexTR,
          edgeIndexBL,
          edgeIndexBR,
          xCoord,
          yCoord,
          x: xCoord * GRID,
          y: yCoord * GRID,
          cellIndexTop: isTopEdge ? null : cellIndex - level.sizeX - 1,
          cellIndexRight: isLeftEdge ? null : cellIndex - 1,
          cellIndexLeft: isBottomEdge ? null : cellIndex + level.sizeX + 1,
          cellIndexBottom: isRightEdge ? null : cellIndex + 1,
          cellIndexTopLeft: (isTopEdge || isLeftEdge) ? null : cellIndex - level.sizeX - 2,
          cellIndexTopRight: (isTopEdge || isRightEdge) ? null : cellIndex - level.sizeX,
          cellIndexBottomLeft: (isBottomEdge || isLeftEdge) ? null : cellIndex + level.sizeX,
          cellIndexBottomRight: (isBottomEdge || isRightEdge) ? null : cellIndex + level.sizeX + 2,
          ref: null
        });
      }
    }
  }

  private generateTerrainData() {
    const {elevationMax} = config.terrain;
    const divider = level.noise.filter(n => !n.subtract).length;
    const noise: NoiseFunction2D = createNoise2D(() => level.seed);

    for (let y = 0; y <= level.sizeY; y++) {
      for (let x = 0; x <= level.sizeX; x++) {
        let n = 0;
        let toSubtract = 0;
        for (const {scale, strength, subtract, offsetX, offsetY} of level.noise) {
          const tmp = Math.max((noise((x - offsetX) / scale, (y - offsetY) / scale) * elevationMax) * strength, 0); // negative
          if (subtract) toSubtract += tmp;
          else n += tmp;
        }

        n -= toSubtract;
        n = Math.min(Math.max(n / divider, 0), elevationMax);
        if (n < THRESHOLD * 2.5) n = 0;
        n = Math.floor(n / (THRESHOLD * 3)) * (THRESHOLD * 3);

        const index = cellIndexAt(x, y);

        if (n % (THRESHOLD * 3) !== 0) throw new Error('Terrain elevation must be divisible by 3');
        this.state.terrainData[index] = n;
      }
    }

    for (const rect of level.rects) {
      for (let y = rect.yCoord; y < rect.yCoord + rect.h; y++) {
        for (let x = rect.xCoord; x < rect.xCoord + rect.w; x++) {
          const index = cellIndexAt(x, y);
          this.state.terrainData[index] = rect.elevation;
        }
      }
    }

    this.renderingAdapter.renderTerrain(this.state.cells, this.state.terrainData);
  }

  async findPathToEnergySourceAsync(structure: Unit): Promise<PathfinderResult<{x: number, y: number}>> {
    if (!this.state.root) throw new Error('root is null');
    const start = this.state.root.id;
    const end = structure.id;
    const res = await this.state.graph.findPath(start, end, 'euclidian');
    let invalid = false;
    for (const vert of res.path) {
      if (vert.id === structure.id) continue;
      const adj = this.state.entities.get(vert.id);
      if (!adj || !adj.built) {
        invalid = true;
        break;
      }
    }
    return invalid ? { path: [], distance: Infinity, ids: new Set(), found: false } : res;
  }
}

export interface Energy {
  follower: Phaser.GameObjects.PathFollower;
  id: string;
}

export interface EnergyRequest {
  id: string;
  type: 'ammo' | 'build';
  amount: number;
  requester: Unit;
}

export interface Cell {
  cellIndex: number;
  x: number;
  y: number;
  xCoord: number;
  yCoord: number;
  ref: Unit | null;

  edgeIndexTL: number;
  edgeIndexTR: number;
  edgeIndexBL: number;
  edgeIndexBR: number;

  // Null if out of bounds
  cellIndexTop: number | null;
  cellIndexLeft: number | null;
  cellIndexRight: number | null;
  cellIndexBottom: number | null;
  cellIndexTopLeft: number | null;
  cellIndexTopRight: number | null;
  cellIndexBottomLeft: number | null;
  cellIndexBottomRight: number | null;

  // terrainElevation: number;
}

export interface RenderingAdapter {
  renderTerrain(world: Cell[], terrainData: Uint16Array): void;
  renderCollectionArea(world: Cell[], cd: Uint8Array): void;
  renderFluid(world: Cell[], fluid: Uint16Array, terrain: Uint16Array): void;
  renderEnergyBall(state: SimulationState, request: EnergyRequest): void;

  renderConnectionBetween(entityA: Unit, entityB: Unit, euclideanDistance: number): unknown;
  destroyConnectionBetween(entityA: Unit, entityB: Unit): unknown;
}
