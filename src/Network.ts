import WebpackWorker from 'worker-loader!./workers/pathFinder.worker.ts';
import GameScene from './scenes/GameScene';
import { Graph, PathfinderResult } from './Graph';
import { BaseStructure } from './units/BaseUnit';
import { City } from './units/City';
import { Depth, GRID, HALF_GRID, level, TICK_DELTA } from './constants';
import { Unit } from '.';
import { Remote, wrap } from 'comlink';
import { EVENT_ENERGY_CONSUMPTION_CHANGE, EVENT_ENERGY_PRODUCTION_CHANGE, EVENT_ENERGY_STORAGE_CHANGE } from './constants';

export class Network {
  scene: GameScene;
  world: Cell[] = []; // TODO maybe temporary until deciding weather to merge with graph (use vertices as cells)
  graph: Graph<BaseStructure, Phaser.GameObjects.Sprite> = new Graph();
  remoteGraph: Remote<Graph>;
  renderTexture: Phaser.GameObjects.RenderTexture;
  textureKeysEdge: Set<string> = new Set();
  root: City | null = null;

  collectionMap: Map<string, [BaseStructure[], Phaser.GameObjects.Sprite | undefined]> = new Map();
  // collectionSpriteSet: Set<Phaser.GameObjects.Sprite> = new Set();

  // State
  speed = 150; // how many pixels energy balls travel per second
  energyProducing = 0;
  // energyCollecting = 0;
  energyStorageMax = 0;
  energyStorageCurrent = City.energyStorageCapacity; // start full TODO refactor

  previewEdgeSprite: Phaser.GameObjects.Sprite;
  previewUnitSprite: Phaser.GameObjects.Sprite;
  previewUnitClass: Unit | null = null;
  previewEdgeRenderTexture: Phaser.GameObjects.RenderTexture;

  requestQueue: EnergyRequest[] = [];
  energyDeficit: number;
  energyProducedPerSecond = 0;
  energyConsumedPerSecond = 0;

  constructor(scene: GameScene) {
    for (let yCoord = 0; yCoord < level.sizeY; yCoord++) {
      for (let xCoord = 0; xCoord < level.sizeX; xCoord++) {
        const cellIndex = yCoord * (level.sizeX + 1) + xCoord;

        const edgeIndexTL = yCoord * (level.sizeX + 1) + xCoord;
        const edgeIndexBL = edgeIndexTL + level.sizeX + 1;
        const edgeIndexTR = edgeIndexTL + 1;
        const edgeIndexBR = edgeIndexBL + 1;

        const x = xCoord * GRID;
        const y = yCoord * GRID;

        this.world.push({cellIndex, x, y, xCoord, yCoord, edgeIndexTL, edgeIndexTR, edgeIndexBL, edgeIndexBR, ref: null});
      }
    }

    this.remoteGraph = wrap(new WebpackWorker());
    this.scene = scene;
    this.previewEdgeSprite = this.scene.add.sprite(0, 0, 'cell_green').setDepth(Depth.NETWORK).setOrigin(0, 0.5);
    this.previewUnitSprite = this.scene.add.sprite(0, 0, 'cell_green').setDepth(Depth.UNIT).setOrigin(0, 0.5);
    this.previewEdgeRenderTexture = this.scene.add.renderTexture(0, 0, level.sizeX * GRID, level.sizeY * GRID).setDepth(Depth.NETWORK).setOrigin(0, 0).setAlpha(0.5);
    this.previewEdgeSprite.setVisible(false);
    // this.previewEdgeRenderTexture.draw(this.previewEdgeSprite);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(tickCounter: number) {
    const energyProducedPerSecond = this.energyProducing + this.scene.simulation.energyCollecting;
    const energyStorage = Math.min(this.energyStorageCurrent + (energyProducedPerSecond * TICK_DELTA), this.scene.network.energyStorageMax);
    const energyDeficit = this.scene.network.requestQueue.reduce((acc, cur) => acc + cur.amount, 0);

    this.energyProducedPerSecond = energyProducedPerSecond;
    this.energyStorageCurrent = energyStorage;
    this.energyDeficit = energyDeficit;

    while (this.energyStorageCurrent >= 1 && this.requestQueue.length) {
      const request = this.requestQueue.shift()!;
      this.energyStorageCurrent -= request.amount;
      this.energyConsumedPerSecond += request.amount;
      this.sendEnergyBall(request);
    }
    this.scene.observer.emit(EVENT_ENERGY_STORAGE_CHANGE, this.energyStorageCurrent, this.energyStorageMax);
    if (tickCounter % 20 === 0) {
      this.scene.observer.emit(EVENT_ENERGY_PRODUCTION_CHANGE, this.energyProducedPerSecond);
      this.scene.observer.emit(EVENT_ENERGY_CONSUMPTION_CHANGE, this.energyConsumedPerSecond);
      this.energyConsumedPerSecond = 0;
    }
  }

  requestEnergy(type: EnergyRequest['type'], amount: number, requester: BaseStructure) {
    if (requester.destroyed) throw new Error('This structure is already destroyed');
    if (!requester.energyPath.found) throw new Error('This structure is not connected to an energy source');
    const request: EnergyRequest = {id: this.scene.network.generateId(), type, amount, requester};
    this.requestQueue.push(request);
    return request;
  }

  generateId() {
    return Math.random().toString(36).substring(2, 10);
  }

  getCellsInRange(coordX: number, coordY: number, range: number, occupiedOnly = true) {
    const startY = Math.max(coordY - range, 0);
    const startX = Math.max(coordX - range, 0);
    const endY = Math.min(coordY + range, level.sizeY);
    const endX = Math.min(coordX + range, level.sizeX);

    const cells: [Cell, number][] = [];
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const index = y * (level.sizeX + 1) + x;
        const cell = this.world[index];

        if (occupiedOnly && !cell.ref) continue; // skip unoccupied cells only when desired
        const distance = Math.abs(x - coordX) + Math.abs(y - coordY); // manhattan distance, not euclidean
        if (distance > range) continue; // skip cells that are out of range
        cells.push([cell, distance]);
      }
    }

    return cells;
  }

  protected sendEnergyBall(request: EnergyRequest) {
    const energyPath = request.requester.energyPath;
    const points = energyPath.path.reduce<number[]>((acc, cur) => acc.concat(cur.x, cur.y), []);
    const path = this.scene.add.path(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);
    const texture = request.type === 'ammo' ? 'energy_red' : 'energy';
    const duration = (energyPath.distance / this.speed) * 1000;
    const energyBall: Energy = {follower: this.scene.add.follower(path, points[0], points[1], texture), id: this.generateId()};
    energyBall.follower.setScale(1).setDepth(Depth.ENERGY);
    energyBall.follower.startFollow({duration, repeat: 0, onComplete: () => {
      energyBall.follower.destroy();
      request.requester.receiveEnergy(request);
    }});
  }

  // startCollecting(structure: BaseStructure) {
  //   const {coordX, coordY, CLASS: {energyCollectionRange}} = structure;
  //   if (energyCollectionRange === 0) return;
  //   this.scene.sfx_start_collect.play();
  //   const collector = {coordX, coordY, range: energyCollectionRange};
  //   // this.scene.simulation.addCollector(coordX, coordY, range: energyCollectionRange, id);

  //   for (let y = coordY - energyCollectionRange; y <= coordY + energyCollectionRange; y++) {
  //     for (let x = coordX - energyCollectionRange; x <= coordX + energyCollectionRange; x++) {
  //       if (x < 0 || y < 0 || x >= this.world[0].length || y >= this.world.length) continue; // skip out of bounds
  //       const manhattanDistance = Math.abs(coordX - x) + Math.abs(coordY - y);
  //       if (manhattanDistance > energyCollectionRange) continue; // skip out of range
  //       const key = `${x}-${y}`;
  //       // TODO merge into CELL
  //       const arr = this.collectionMap.get(key) || [[], undefined];
  //       arr[0].push(structure);
  //       // if (arr[0].length === 1) {
  //       // TODO use marching squares to draw the collecting area. Draw each elevation separately
  //       // arr[1] = this.scene.add.sprite(x * GRID, y * GRID, 'cell_green').setDepth(500).setOrigin(0, 0).setAlpha(0.4);
  //       // this.collectionSpriteSet.add(arr[1]);
  //       // }
  //       // this.collectionMap.set(key, arr);
  //       this.energyCollecting = this.collectionMap.size * 0.005;
  //       this.scene.observer.emit(EVENT_ENERGY_PRODUCTION_CHANGE, this.energyCollecting + this.energyProducing);

  //     }
  //   }
  // }

  // stopCollecting(structure: BaseStructure) {
  //   if (structure.CLASS.energyCollectionRange === 0 || !BaseStructure.activeStructureIds.has(structure.id)) return;
  //   const {coordX, coordY, CLASS: {energyCollectionRange}} = structure;

  //   for (let y = coordY - energyCollectionRange; y <= coordY + energyCollectionRange; y++) {
  //     for (let x = coordX - energyCollectionRange; x <= coordX + energyCollectionRange; x++) {
  //       if (x < 0 || y < 0 || x >= this.world[0].length || y >= this.world.length) continue; // skip out of bounds
  //       const manhattanDistance = Math.abs(coordX - x) + Math.abs(coordY - y);
  //       if (manhattanDistance > energyCollectionRange) continue; // skip out of range
  //       const key = `${x}-${y}`;
  //       const arr = this.collectionMap.get(key) || [[], undefined];
  //       const index = arr[0].findIndex(s => s.id === structure.id);
  //       if (index === -1) continue;
  //       arr[0].splice(index, 1);
  //       this.collectionMap.set(key, arr);
  //       // this.energyCollecting = this.collectionMap.size * 0.005;
  //       // this.scene.observer.emit(EVENT_ENERGY_PRODUCTION_CHANGE, this.energyCollecting + this.energyProducing);
  //       if (arr[0].length === 0 && arr[1]) {
  //         arr[1]?.destroy();
  //         // this.collectionSpriteSet.delete(arr[1]);
  //       }
  //     }
  //   }
  // }

  previewStructure(coordX: number | null, coordY: number | null, unitClass: Unit | null) {
    if (coordX === null || coordY === null || coordX < 0 || coordY < 0 || coordX >= level.sizeX || coordY >= level.sizeY) return; // skip out of bounds
    if (unitClass) {
      this.previewUnitSprite.setPosition(coordX * GRID - GRID, coordY * GRID + HALF_GRID);
      if (this.previewUnitClass && this.previewUnitClass !== unitClass) this.previewCancel();
      this.previewUnitSprite.setTexture(unitClass.unitName).setVisible(true);
      this.previewUnitClass = unitClass;
      this.previewEdge(coordX, coordY, unitClass);
    }
  }

  previewCancel() {
    this.previewEdgeRenderTexture.clear();
    this.previewEdgeSprite.setVisible(false);
    this.previewUnitSprite.setVisible(false);
  }

  placeUnit(coordX: number, coordY: number, ref: BaseStructure) {
    const cellIndex = coordY * (level.sizeX + 1) + coordX;
    if (this.world[cellIndex].ref) return;
    this.graph.createVertex(ref.id, ref.x, ref.y, ref);
    this.remoteGraph.createVertex(ref.id, ref.x, ref.y, {x: ref.x, y: ref.y});
    if (ref instanceof City) this.root = ref;
    this.connect(coordX, coordY, ref);
    ref.activate();
    // this.previewStructureObject = null;
    this.scene.sfx_place_structure.play();
  }

  private previewEdge(coordX: number, coordY: number, previewUnitClass: Unit) {
    this.previewEdgeRenderTexture.clear();
    for (const [cell, manhattanDistance] of this.getCellsInRange(coordX, coordY, previewUnitClass.connectionRange)) {
      if (!cell.ref) continue;
      if (!cell.ref.CLASS.isRelay && !previewUnitClass.isRelay) continue; // non-relay structures cannot connect to each other
      if (manhattanDistance > cell.ref.CLASS.connectionRange) continue; // won't connect if neighbour has a smaller connection range
      this.previewEdgeSprite.setPosition(coordX * GRID + HALF_GRID, coordY * GRID + HALF_GRID);
      const euclideanDistance = Math.sqrt(Math.pow(this.previewEdgeSprite.x - cell.ref.x, 2) + Math.pow(this.previewEdgeSprite.y - cell.ref.y, 2));
      if (Math.round(euclideanDistance) === 0) continue;
      this.previewEdgeSprite.setTexture(this.getEdgeSpriteTexture(euclideanDistance));
      this.previewEdgeSprite.setRotation(Math.atan2(cell.ref.y - this.previewEdgeSprite.y, cell.ref.x - this.previewEdgeSprite.x));
      // this.previewEdgeSprite.setVisible(true);
      this.previewEdgeRenderTexture.draw(this.previewEdgeSprite);
    }
  }

  private connect(coordX: number, coordY: number, ref: BaseStructure) {
    for (const [cell, manhattanDistance] of this.getCellsInRange(coordX, coordY, ref.CLASS.connectionRange)) {
      if (!cell.ref) continue;
      if (!cell.ref.CLASS.isRelay && !ref.CLASS.isRelay) continue; // non-relay structures cannot connect to each other
      if (cell.ref.id === ref.id) continue;
      const euclideanDistance = Math.sqrt(Math.pow(ref.x - cell.ref.x, 2) + Math.pow(ref.y - cell.ref.y, 2));
      if (manhattanDistance > cell.ref.CLASS.connectionRange || Math.round(euclideanDistance) === 0) continue; // won't connect if neighbour has a smaller connection range
      const angle = Math.atan2(cell.ref.y - ref.y, cell.ref.x - ref.x);
      const sprite = this.scene.add.sprite(ref.x, ref.y, this.getEdgeSpriteTexture(euclideanDistance)).setDepth(Depth.NETWORK).setOrigin(0, 0.5).setRotation(angle);
      this.graph.createEdge(ref.id, cell.ref.id, euclideanDistance, sprite);
      this.remoteGraph.createEdge(ref.id, cell.ref.id, euclideanDistance, 'sprite placeholder');
    }
  }

  private getEdgeSpriteTexture(euclideanDistance: number): string {
    const key = `line-${Math.round(euclideanDistance)}`;
    if (!this.textureKeysEdge.has(key)) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(0, 0, euclideanDistance, 6);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(0, 0 + 2, euclideanDistance, 2);
      graphics.generateTexture(key, euclideanDistance, 6);
      graphics.destroy();
      this.textureKeysEdge.add(key);
    }
    return key;
  }

  removeStructure(id: string) {
    const vert = this.graph.vertices.get(id);
    if (!vert) return;

    this.graph.edgesByVertex.get(id)?.forEach(edge => {
      const otherVertId = edge.vertA === id ? edge.vertB : edge.vertA;
      this.graph.edgesByVertex.get(otherVertId)?.filter(e => e.id !== edge.id);
      edge.data.destroy();
      this.graph.edges.delete(edge.id);
      this.remoteGraph.edges.then(e => e.delete(edge.id));
    });

    const cellIndex = vert.data.yCoord * (level.sizeX + 1) + vert.data.xCoord;
    const ref = this.world[cellIndex].ref; // TODO store cell index on vert.data. maybe merge with cell?
    if (ref) {
      ref.hit(ref.CLASS.healthMax);
      this.world[vert.data.yCoord][vert.data.xCoord].ref = null;
    }
    this.graph.removeVertex(id);
    this.remoteGraph.removeVertex(id);
  }

  findPathToEnergySource(structure: BaseStructure): PathfinderResult<BaseStructure> {
    if (!this.root) throw new Error('root is null');
    const start = this.root.id;
    const end = structure.id;
    const res = this.graph.findPath(start, end, 'euclidian');
    let invalid = false;
    for (const vert of res.path) {
      if (vert.data.id === structure.id) continue;
      if (!vert.data.built) {
        invalid = true;
        break;
      }
    }
    return invalid ? { path: [], distance: Infinity, found: false } : res;
  }

  async findPathToEnergySourceAsync(structure: BaseStructure): Promise<PathfinderResult<{x: number, y: number}>> {
    if (!this.root) throw new Error('root is null');
    const start = this.root.id;
    const end = structure.id;
    const res = await this.remoteGraph.findPath(start, end, 'euclidian');
    let invalid = false;
    for (const vert of res.path) {
      if (vert.id === structure.id) continue;
      const adj = BaseStructure.structuresById.get(vert.id);
      if (!adj || !adj.built) {
        invalid = true;
        break;
      }
    }
    return invalid ? { path: [], distance: Infinity, found: false } : res;
  }
}

export interface Energy {
    follower: Phaser.GameObjects.PathFollower;
    id: string;
}

export interface EnergyRequest {
    id: string;
    type: 'ammo' | 'build' | 'health';
    amount: number;
    requester: BaseStructure;
}

export interface Cell {
  cellIndex: number;
  x: number;
  y: number;
  xCoord: number;
  yCoord: number;
  ref: BaseStructure | null;

  // fluidElevation: number;
  // terrainElevation: number;

  edgeIndexTL: number;
  edgeIndexTR: number;
  edgeIndexBL: number;
  edgeIndexBR: number;
}
