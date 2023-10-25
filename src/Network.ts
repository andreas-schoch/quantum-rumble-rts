import GameScene from './scenes/GameScene';
import { Collector } from './structures/Collector';
import { Graph } from './Graph';
import { Structure, getNeighboursInRange as getCellsInRange } from './structures/BaseStructure';
import { City } from './City';

export class Network {
  scene: GameScene;
  graphics: Phaser.GameObjects.Graphics;
  graph: Graph<Structure | City, Phaser.GameObjects.Sprite> = new Graph();
  renderTexture: Phaser.GameObjects.RenderTexture;
  textureKeysEdge: Set<string> = new Set();

  constructor(scene: GameScene) {
    this.scene = scene;

    this.renderTexture = this.scene.add.renderTexture(0, 0, 2000, 1000).setOrigin(0, 0);
    this.renderTexture.setDepth(10);
    this.graphics = this.scene.add.graphics({ lineStyle: { width: 1, color: 0x0000 }, fillStyle: { color: 0xd3d3d3 }});
    this.graphics.setDepth(10);

    // let start = '';
    // let end = '';

    // const start = this.placeNode(0, 0);
    // const end = this.placeNode(WORLD_X - 1, WORLD_Y - 1);

    // for (let y = 2; y < WORLD_Y - 2; y += 4) {
    //   for (let x = 2; x < WORLD_X - 2; x += 4) {
    //     // if (x > 10 && x < 20 && y > 10 && y < 20) continue;
    //     // if (x > 25 && x < 30 && y > 25 && y < 30) continue;
    //     const XRand = Math.abs(Math.floor(Math.random() * WORLD_X - 2));
    //     const YRand = Math.abs(Math.floor(Math.random() * WORLD_Y - 2));
    //     this.placeNode(XRand, YRand);
    //     // this.placeNode(x, y);
    //   }
    // }

    // const g = this.scene.add.graphics({ lineStyle: { width: 5, color: 0x0000 }, fillStyle: { color: 0x00ff00 }});
    // g.setDepth(100);
    // setInterval(() => {
    //   g.clear();
    //   const res = this.graph.findPath(start, end, 'euclidian', g);
    //   g.setDepth(100);
    //   res.path.forEach((vert, i) => {
    //     if (i < res.path.length - 1) {
    //       const vert2 = res.path[i + 1];
    //       g.lineBetween(vert.x, vert.y, vert2.x, vert2.y);
    //     }
    //   });
    // }, 3000);
  }

  placeStructure(coordX: number, coordY: number, ref: Structure | City): string {
    // const collector = new Collector(this.scene, coordX, coordY);
    this.graph.createVertex(ref.id, ref.x, ref.y, ref);

    // TODO this may be inconsistent with when structures have different radii
    // TODO consider merging the concept of Cells and Vertices. Just place Vertices without Edges
    getCellsInRange(coordX, coordY, 5).forEach(cell => {
      if (!cell.ref) return;
      if (cell.ref.id === ref.id) return;
      if (!(cell.ref instanceof Collector)) return; // The only structure that can be connected to is a Collector
      const distance = Math.sqrt(Math.pow(ref.x - cell.ref.x, 2) + Math.pow(ref.y - cell.ref.y, 2));
      const angle = Math.atan2(cell.ref.y - ref.y, cell.ref.x - ref.x);
      // console.log('angle', angle);
      const key = `line-${Math.round(distance)}`;

      if (!this.textureKeysEdge.has(key)) {
        console.log('--------------create texture', key);
        this.graphics.fillStyle(0xbbbbbb, 1);
        this.graphics.fillRect(0, 0, distance, 6);
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillRect(0, 0 + 2, distance, 2);
        this.graphics.generateTexture(key, distance, 6);
        this.graphics.clear();
        this.textureKeysEdge.add(key);
      }

      const sprite = this.scene.add.sprite(ref.x, ref.y, key).setDepth(10).setOrigin(0, 0.5);
      sprite.rotation = angle;
      this.graph.createEdge(ref.id, cell.ref.id, distance, sprite);
    });
    // console.log(this.graph.vertices.size, this.graph.edges.size, this.graph.edgesByVertex);
    return ref.id;
  }

  removeNode(id: string) {
    const vert = this.graph.vertices.get(id);
    if (!vert) return;

    this.graph.edgesByVertex.get(id)?.forEach(edge => {
      const otherVertId = edge.vertA === id ? edge.vertB : edge.vertA;
      this.graph.edgesByVertex.get(otherVertId)?.filter(e => e.id !== edge.id);
      this.graph.edges.delete(edge.id);
    });

    this.graph.removeVertex(id);
  }
}
