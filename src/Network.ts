import WebpackWorker from 'worker-loader!./workers/pathFinder.worker.ts';
import GameScene from './scenes/GameScene';
import { Graph, PathfinderResult } from './Graph';
import { BaseStructure } from './structures/BaseStructure';
import { Cell, City, Energy, EnergyRequest } from './structures/City';
import { GRID, NETWORK_TRAVEL_SPEED, STRUCTURE_BY_NAME, TICK_DELTA, WORLD_DATA, WORLD_X, WORLD_Y } from '.';
import { Remote, wrap } from 'comlink';

export class Network {
  scene: GameScene;
  graph: Graph<BaseStructure, Phaser.GameObjects.Sprite> = new Graph();
  remoteGraph: Remote<Graph>;
  renderTexture: Phaser.GameObjects.RenderTexture;
  textureKeysEdge: Set<string> = new Set();
  // in future iterations this will be a list of "energyStorage" structures
  root: City | null = null;

  // TODO this can be used to determine which structure collects the energy depending on their distance to the cell (equal if same distance)
  //  For enemies, it can be used to determine weather they can place a collector or not (if enemy structure in array, cannot place)
  collectionMap: Map<string, [BaseStructure[], Phaser.GameObjects.Sprite | undefined]> = new Map();
  collectionSpriteSet: Set<Phaser.GameObjects.Sprite> = new Set();

  // State
  speed = 300; // how many pixels energy balls travel per second
  energyProducing = 0;
  energyCollecting = 0;
  energyStorageMax = 0;
  energyStorageCurrent = 0;

  previewEdgeSprite: Phaser.GameObjects.Sprite;
  previewEdgeRenderTexture: Phaser.GameObjects.RenderTexture;
  previewStructureObject: BaseStructure | null = null;

  requestQueue: EnergyRequest[] = [];
  energyDeficit: number;

  constructor(scene: GameScene) {
    const workerInstance = new WebpackWorker();
    // workerInstance.
    this.remoteGraph = wrap(workerInstance);
    this.scene = scene;
    this.previewEdgeSprite = this.scene.add.sprite(0, 0, 'cell_green').setDepth(10).setOrigin(0, 0.5);
    this.previewEdgeRenderTexture = this.scene.add.renderTexture(0, 0, WORLD_X * GRID, WORLD_Y * GRID).setDepth(10).setOrigin(0, 0).setAlpha(0.5);
    this.previewEdgeSprite.setVisible(false);
    this.previewEdgeRenderTexture.draw(this.previewEdgeSprite);
  }

  get energyPerSecond() {
    return this.energyProducing + this.energyCollecting;
  }

  tick(tickCounter: number) {
    const energyPerTick = this.energyPerSecond * TICK_DELTA;
    this.energyStorageCurrent = Math.min(this.energyStorageCurrent + energyPerTick, this.scene.network.energyStorageMax);
    this.energyDeficit = this.scene.network.requestQueue.reduce((acc, cur) => acc + cur.amount, 0);

    while (this.energyStorageCurrent >= 1 && this.requestQueue.length) {
      const request = this.requestQueue.shift()!;
      console.log('request', request.id, request.type);
      this.energyStorageCurrent -= request.amount;
      this.sendEnergyBall(request);
    }
  }

  requestEnergy(type: EnergyRequest['type'], amount: number, requester: BaseStructure) {
    // if (this.destroyed) throw new Error('This structure is already destroyed');
    // if (!this.isEnergyRoot) throw new Error('This structure does not produce energy');
    if (!requester.energyPath.found) throw new Error('This structure is not connected to an energy source');
    const request: EnergyRequest = {id: this.scene.network.generateId(), type, amount, requester};
    this.requestQueue.push(request);
    return request;
  }

  generateId() {
    return Math.random().toString(36).substring(2, 10);
  }

  getCellsInRange(coordX: number, coordY: number, range: number, occupiedOnly = true) {
    const cells: [Cell, number][] = [];
    for (let y = coordY - range; y <= coordY + range; y++) {
      for (let x = coordX - range; x <= coordX + range; x++) {
        if (x < 0 || y < 0 || x >= WORLD_DATA[0].length || y >= WORLD_DATA.length) continue; // skip out of bounds
        const cell = WORLD_DATA[y][x];
        if (occupiedOnly && !cell.ref) continue; // skip unoccupied cells only when desired
        const distance = Math.abs(x - coordX) + Math.abs(y - coordY); // manhattan distance, not euclidean
        if (distance > range) continue; // skip cells that are out of range
        cells.push([cell, distance]);
      }
    }

    return cells;
  }

  protected sendEnergyBall(request: EnergyRequest) {
    // console.log('--------send energy ball', this.requestQueue.length);
    const energyPath = request.requester.energyPath;
    const points = energyPath.path.reduce<number[]>((acc, cur) => acc.concat(cur.x, cur.y), []);
    const path = this.scene.add.path(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);
    const texture = request.type === 'ammo' ? 'energy_red' : 'energy';
    const duration = (energyPath.distance / NETWORK_TRAVEL_SPEED) * 1000;
    const energyBall: Energy = {follower: this.scene.add.follower(path, points[0], points[1], texture), id: this.generateId()};
    energyBall.follower.setScale(1).setDepth(100);
    energyBall.follower.startFollow({duration, repeat: 0, onComplete: () => {
      energyBall.follower.destroy();
      request.requester.receiveEnergy(request);
    }});
  }

  startCollecting(structure: BaseStructure) {
    const {coordX, coordY, energyCollectionRange} = structure;

    if (structure.energyCollectionRange === 0) return;

    this.scene.sfx_start_collect.play();

    for (let y = coordY - energyCollectionRange; y <= coordY + energyCollectionRange; y++) {
      for (let x = coordX - energyCollectionRange; x <= coordX + energyCollectionRange; x++) {
        if (x < 0 || y < 0 || x >= WORLD_DATA[0].length || y >= WORLD_DATA.length) continue; // skip out of bounds
        const manhattanDistance = Math.abs(coordX - x) + Math.abs(coordY - y);
        if (manhattanDistance > energyCollectionRange) continue; // skip out of range
        const key = `${x}-${y}`;
        const arr = this.collectionMap.get(key) || [[], undefined];
        arr[0].push(structure);
        if (arr[0].length === 1) {
          arr[1] = this.scene.add.sprite(x * GRID, y * GRID, 'cell_green').setDepth(0).setOrigin(0, 0);
          this.collectionSpriteSet.add(arr[1]);
        }
        this.collectionMap.set(key, arr);
        this.energyCollecting = this.collectionMap.size * 0.005;
      }
    }
  }

  stopCollecting(structure: BaseStructure) {
    if (structure.energyCollectionRange === 0 || !BaseStructure.activeStructureIds.has(structure.id)) return;
    const {coordX, coordY, energyCollectionRange} = structure;

    for (let y = coordY - energyCollectionRange; y <= coordY + energyCollectionRange; y++) {
      for (let x = coordX - energyCollectionRange; x <= coordX + energyCollectionRange; x++) {
        if (x < 0 || y < 0 || x >= WORLD_DATA[0].length || y >= WORLD_DATA.length) continue; // skip out of bounds
        const manhattanDistance = Math.abs(coordX - x) + Math.abs(coordY - y);
        if (manhattanDistance > energyCollectionRange) continue; // skip out of range
        const key = `${x}-${y}`;
        const arr = this.collectionMap.get(key) || [[], undefined];
        const index = arr[0].findIndex(s => s.id === structure.id);
        if (index === -1) continue;
        arr[0].splice(index, 1);
        this.collectionMap.set(key, arr);
        if (arr[0].length === 0 && arr[1]) {
          arr[1]?.destroy();
          this.collectionSpriteSet.delete(arr[1]);
        }
      }
    }
  }

  previewStructure(coordX: number | null, coordY: number | null, name: string | null) {
    this.previewEdgeRenderTexture.clear();
    this.previewEdgeSprite.setVisible(false);
    if (coordX === null || coordY === null || coordX < 0 || coordY < 0 || coordX >= WORLD_DATA[0].length || coordY >= WORLD_DATA.length) return; // skip out of bounds
    if (name) {
      if (this.previewStructureObject && this.previewStructureObject.name !== name) this.previewCancel();
      this.previewStructureObject = this.previewStructureObject || new STRUCTURE_BY_NAME[name](this.scene, coordX, coordY);
      this.previewStructureObject.move(coordX, coordY);
      this.previewEdge(coordX, coordY, this.previewStructureObject);
    } else if (this.previewStructureObject) this.previewCancel();
  }

  previewCancel() {
    this.previewEdgeRenderTexture.clear();
    this.previewEdgeSprite.setVisible(false);
    if (this.previewStructureObject) {
      WORLD_DATA[this.previewStructureObject.coordY][this.previewStructureObject.coordX].ref = null;
      this.previewStructureObject.damage(this.previewStructureObject.healthMax);
      this.previewStructureObject = null;
    }
  }

  placeStructure(coordX: number, coordY: number, ref: BaseStructure) {
    if (WORLD_DATA[coordY][coordX].ref) return;
    this.graph.createVertex(ref.id, ref.x, ref.y, ref);
    this.remoteGraph.createVertex(ref.id, ref.x, ref.y, {x: ref.x, y: ref.y});
    if (ref instanceof City) this.root = ref;
    this.connect(coordX, coordY, ref);
    ref.activate();
    this.previewStructureObject = null;
    this.scene.sfx_place_structure.play();
  }

  private previewEdge(coordX: number, coordY: number, ref: BaseStructure) {
    this.previewEdgeRenderTexture.clear();
    for (const [cell, manhattanDistance] of this.getCellsInRange(coordX, coordY, ref.connectionRange)) {
      if (!cell.ref) continue;
      if (!cell.ref.isRelay && !ref.isRelay) continue; // non-relay structures cannot connect to each other
      if (cell.ref.id === ref.id) continue;
      if (manhattanDistance > cell.ref.connectionRange) continue; // won't connect if neighbour has a smaller connection range
      const euclideanDistance = Math.sqrt(Math.pow(ref.x - cell.ref.x, 2) + Math.pow(ref.y - cell.ref.y, 2));
      if (Math.round(euclideanDistance) === 0) continue;
      this.previewEdgeSprite.setTexture(this.getEdgeSpriteTexture(euclideanDistance));
      this.previewEdgeSprite.setPosition(ref.x, ref.y);
      this.previewEdgeSprite.setRotation(Math.atan2(cell.ref.y - ref.y, cell.ref.x - ref.x));
      // this.previewEdgeSprite.setVisible(true);
      this.previewEdgeRenderTexture.draw(this.previewEdgeSprite);
    }
  }

  private connect(coordX: number, coordY: number, ref: BaseStructure) {
    for (const [cell, manhattanDistance] of this.getCellsInRange(coordX, coordY, ref.connectionRange)) {
      if (!cell.ref) continue;
      if (!cell.ref.isRelay && !ref.isRelay) continue; // non-relay structures cannot connect to each other
      if (cell.ref.id === ref.id) continue;
      const euclideanDistance = Math.sqrt(Math.pow(ref.x - cell.ref.x, 2) + Math.pow(ref.y - cell.ref.y, 2));
      if (manhattanDistance > cell.ref.connectionRange || Math.round(euclideanDistance) === 0) continue; // won't connect if neighbour has a smaller connection range
      const angle = Math.atan2(cell.ref.y - ref.y, cell.ref.x - ref.x);
      const sprite = this.scene.add.sprite(ref.x, ref.y, this.getEdgeSpriteTexture(euclideanDistance)).setDepth(10).setOrigin(0, 0.5).setRotation(angle);
      this.graph.createEdge(ref.id, cell.ref.id, euclideanDistance, sprite);
      this.remoteGraph.createEdge(ref.id, cell.ref.id, euclideanDistance, 'sprite placeholder');
    }
  }

  private getEdgeSpriteTexture(euclideanDistance: number): string {
    const key = `line-${Math.round(euclideanDistance)}`;
    if (!this.textureKeysEdge.has(key)) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xbbbbbb, 1);
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

    const ref = WORLD_DATA[vert.data.coordY][vert.data.coordX].ref;
    if (ref) {
      ref.damage(ref.healthMax);
      WORLD_DATA[vert.data.coordY][vert.data.coordX].ref = null;
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
      if (vert.data.buildCost) {
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
      if (!adj || adj.buildCost) {
        invalid = true;
        break;
      }
    }
    return invalid ? { path: [], distance: Infinity, found: false } : res;
  }
}
