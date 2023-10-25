import GameScene from './scenes/GameScene';
import { Collector } from './structures/Collector';
import { Graph } from './Graph';

export class Network {
  scene: GameScene;
  graphics: Phaser.GameObjects.Graphics;
  graph: Graph<Collector, Phaser.GameObjects.Sprite> = new Graph();
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

    const start = this.placeNode(0, 0);
    const end = this.placeNode(this.scene.mapSizeX - 1, this.scene.mapSizeY - 1);

    for (let y = 2; y < this.scene.mapSizeY - 2; y += 4) {
      for (let x = 2; x < this.scene.mapSizeX - 2; x += 4) {
        // if (x > 10 && x < 20 && y > 10 && y < 20) continue;
        // if (x > 25 && x < 30 && y > 25 && y < 30) continue;
        const XRand = Math.abs(Math.floor(Math.random() * this.scene.mapSizeX - 2));
        const YRand = Math.abs(Math.floor(Math.random() * this.scene.mapSizeY - 2));
        this.placeNode(XRand, YRand);
        // this.placeNode(x, y);
      }
    }

    const g = this.scene.add.graphics({ lineStyle: { width: 5, color: 0x0000 }, fillStyle: { color: 0x00ff00 }});
    g.setDepth(100);
    setInterval(() => {
      g.clear();
      const res = this.graph.findPath(start, end, 'euclidian', g);
      g.setDepth(100);
      res.path.forEach((vert, i) => {
        if (i < res.path.length - 1) {
          const vert2 = res.path[i + 1];
          g.lineBetween(vert.x, vert.y, vert2.x, vert2.y);
        }
      });
    }, 3000);
  }

  placeNode(coordX: number, coordY: number): string {
    const collector = new Collector(this.scene, coordX, coordY);
    this.graph.createVertex(collector.id, collector.x, collector.y, collector);

    // TODO this may be inconsistent with when structures have different radii
    collector.getNeighboursInRange().forEach(cell => {
      const ref = cell.ref;
      if (!ref) return;
      if (!(ref instanceof Collector)) return;
      const distance = Math.sqrt(Math.pow(collector.x - ref.x, 2) + Math.pow(collector.y - ref.y, 2));
      const angle = Math.atan2(ref.y - collector.y, ref.x - collector.x);
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

      const sprite = this.scene.add.sprite(collector.x, collector.y, key).setDepth(10).setOrigin(0, 0.5);
      sprite.rotation = angle;
      this.graph.createEdge(collector.id, ref.id, distance, sprite);
    });
    // console.log(this.graph.vertices.size, this.graph.edges.size, this.graph.edgesByVertex);
    return collector.id;
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
