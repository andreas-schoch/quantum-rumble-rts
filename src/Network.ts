import GameScene from './scenes/GameScene';
import { Graph, PathfinderResult } from './Graph';
import { BaseStructure, getCellsInRange } from './structures/BaseStructure';
import { City } from './City';
import { GRID, STRUCTURE_BY_NAME, WORLD_DATA, WORLD_X, WORLD_Y } from '.';

export class Network {
  scene: GameScene;
  graph: Graph<BaseStructure, Phaser.GameObjects.Sprite> = new Graph();
  renderTexture: Phaser.GameObjects.RenderTexture;
  textureKeysEdge: Set<string> = new Set();
  // in future iterations this will be a list of "energyStorage" structures
  root: City | null = null;
  speed = 300; // how many pixels energy balls travel per second

  // TODO this can be used to determine which structure collects the energy depending on their distance to the cell (equal if same distance)
  //  For enemies, it can be used to determine weather they can place a collector or not (if enemy structure in array, cannot place)
  collectionMap: Map<string, [BaseStructure[], Phaser.GameObjects.Sprite | undefined]> = new Map();
  collectionSpriteSet: Set<Phaser.GameObjects.Sprite> = new Set();
  previewEdgeSprite: Phaser.GameObjects.Sprite;
  previewEdgeRenderTexture: Phaser.GameObjects.RenderTexture;
  previewStructureObject: BaseStructure | null = null;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.previewEdgeSprite = this.scene.add.sprite(0, 0, 'cell_green').setDepth(10).setOrigin(0, 0.5);
    this.previewEdgeRenderTexture = this.scene.add.renderTexture(0, 0, WORLD_X * GRID, WORLD_Y * GRID).setDepth(10).setOrigin(0, 0);
    this.previewEdgeSprite.setVisible(false);
    this.previewEdgeRenderTexture.draw(this.previewEdgeSprite);
  }

  startCollecting(structure: BaseStructure) {
    const {coordX, coordY, energyCollectionRange} = structure;

    if (structure.energyCollectionRange === 0) return;

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
    if (ref instanceof City) this.root = ref;
    this.connect(coordX, coordY, ref);
    ref.activate();
    this.previewStructureObject = null;
  }

  private previewEdge(coordX: number, coordY: number, ref: BaseStructure) {
    this.previewEdgeRenderTexture.clear();
    for (const [cell, manhattanDistance] of getCellsInRange(coordX, coordY, ref.connectionRange)) {
      if (!cell.ref) continue;
      if (!cell.ref.relay && !ref.relay) continue; // non-relay structures cannot connect to each other
      if (cell.ref.id === ref.id) continue;
      if (manhattanDistance > cell.ref.connectionRange) continue; // won't connect if neighbour has a smaller connection range
      const euclideanDistance = Math.sqrt(Math.pow(ref.x - cell.ref.x, 2) + Math.pow(ref.y - cell.ref.y, 2));
      if (Math.round(euclideanDistance) === 0) continue;
      this.previewEdgeSprite.setTexture(this.getEdgeSpriteTexture(euclideanDistance));
      this.previewEdgeSprite.setPosition(ref.x, ref.y);
      this.previewEdgeSprite.setRotation(Math.atan2(cell.ref.y - ref.y, cell.ref.x - ref.x));
      this.previewEdgeSprite.setVisible(true);
      this.previewEdgeRenderTexture.draw(this.previewEdgeSprite);
    }
  }

  private connect(coordX: number, coordY: number, ref: BaseStructure) {
    for (const [cell, manhattanDistance] of getCellsInRange(coordX, coordY, ref.connectionRange)) {
      if (!cell.ref) continue;
      if (!cell.ref.relay && !ref.relay) continue; // non-relay structures cannot connect to each other
      if (cell.ref.id === ref.id) continue;
      const euclideanDistance = Math.sqrt(Math.pow(ref.x - cell.ref.x, 2) + Math.pow(ref.y - cell.ref.y, 2));
      if (manhattanDistance > cell.ref.connectionRange || Math.round(euclideanDistance) === 0) continue; // won't connect if neighbour has a smaller connection range
      const angle = Math.atan2(cell.ref.y - ref.y, cell.ref.x - ref.x);
      const sprite = this.scene.add.sprite(ref.x, ref.y, this.getEdgeSpriteTexture(euclideanDistance)).setDepth(10).setOrigin(0, 0.5).setRotation(angle);
      this.graph.createEdge(ref.id, cell.ref.id, euclideanDistance, sprite);
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
    });

    const ref = WORLD_DATA[vert.data.coordY][vert.data.coordX].ref;
    if (ref) {
      ref.damage(ref.healthMax);
      WORLD_DATA[vert.data.coordY][vert.data.coordX].ref = null;
    }
    this.graph.removeVertex(id);
  }

  findPathToEnergySource(structure: BaseStructure): PathfinderResult<BaseStructure> {
    if (!this.root) throw new Error('root is null');
    const start = this.root.id;
    const end = structure.id;
    const res = this.graph.findPath(start, end, 'euclidian');
    let invalid = false;
    for (const vert of res.path) {
      if (vert.data.id === structure.id) continue;
      if (vert.data.buildCostPaid < vert.data.buildCost) {
        invalid = true;
        break;
      }
    }
    return invalid ? { path: [], distance: Infinity, found: false } : res;
  }
}
