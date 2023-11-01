import * as Ph from 'phaser';
import { ISquareDensityData, MarchingSquaresLookup } from './MarchingSquares';
import { NoiseFunction2D, createNoise2D } from 'simplex-noise';

export interface ICreeperFlowConfig {
  squareSize: number;
  numSquaresX: number;
  numSquaresY: number;

  tileDensityMax: number;
  tileDensityThreshold: number;
}

export interface IRenderQueueItem {
  x: number;
  y: number;
  numSquaresX: number;
  numSquaresY: number;
  materialIndex: number;
}

const defaultConfig: ICreeperFlowConfig = {
  squareSize: 32,
  numSquaresX: 32,
  numSquaresY: 32,
  tileDensityMax: 128,
  tileDensityThreshold: 64,
};

export class CreeperFlow {
  renderQueue: IRenderQueueItem[] = [];
  private scene: Ph.Scene;
  private config: ICreeperFlowConfig;

  private terrain: number[][] = [];
  private readonly terrainGraphics: Ph.GameObjects.Graphics;
  private readonly marchingSquares: MarchingSquaresLookup;
  private noise: NoiseFunction2D;

  private readonly worldScale: number;

  constructor(scene: Ph.Scene, worldScale: number, config: ICreeperFlowConfig = defaultConfig) {
    this.scene = scene;
    this.config = config;
    // this.noise = createNoise2D();

    this.worldScale = worldScale;

    this.marchingSquares = new MarchingSquaresLookup({
      squareSize: config.squareSize,
      densityThreshold: config.tileDensityThreshold,
      densityMax: config.tileDensityMax,
    });

    this.terrainGraphics = this.scene.add.graphics();
    this.terrainGraphics.setDepth(100000000);

    this.terrain = [];
    this.generateRandomTerrain();
  }

  generateRandomTerrain() {
    this.noise = createNoise2D();
    const {tileDensityMax, numSquaresX, numSquaresY, tileDensityThreshold} = this.config;
    this.generateVertices((x, y) => {
      const n1 = (this.noise(x / 8, y / 8) * tileDensityMax) * 0.3;
      // const n2 = (this.noise(x / 16, y / 16) * tileDensityMax) * 0.5;
      const n3 = (this.noise(x / 36, y / 36) * tileDensityMax) * 1.25;
      return ((n1 + 0 + n3) / 2) + tileDensityThreshold;
    });
    this.renderQueue.push({x: 0, y: 0, numSquaresX: numSquaresX, numSquaresY: numSquaresY, materialIndex: 0});
  }

  update() {
    if (!this.renderQueue.length) return;
    const graphics = this.terrainGraphics;
    console.time('updateTerrain');
    graphics.clear();
    this.renderQueue.forEach((bounds) => {
      graphics.translateCanvas(0, 0);
      for (let y = bounds.y; y < (bounds.y + bounds.numSquaresY); y++) {
        for (let x = bounds.x; x < bounds.x + bounds.numSquaresX; x++) {
          if (!this.isWithinBounds(x, y)) continue;
          this.renderSquareAt(x, y, graphics);
        }
      }
    });

    this.renderQueue.length = 0;
    console.timeEnd('updateTerrain');
    console.log('-------cache size after update', this.marchingSquares.polygonCache.size);
  }

  private renderSquareAt(x: number, y: number, graphics: Ph.GameObjects.Graphics, override?: ISquareDensityData): void {
    const densityData = override || this.getTileEdges(x, y);
    if (!densityData) return;
    const posX = x * this.config.squareSize;
    const posY = y * this.config.squareSize;
    const {polygons, isoLines, shapeIndex} = this.marchingSquares.getSquareGeomData(densityData);

    graphics.fillStyle(0xF5DEB3);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.translateCanvas(posX, posY);
    // graphics.scaleCanvas(1.05, 1.05);
    for (const points of polygons) {
      // graphics.generateTexture('terrainCache', this.config.squareSize, this.config.squareSize); // TODO can maybe improve performance together with next line
    // graphics.fillPath('terrainCache) // TODO this could work just like Path2D. Try it out. also try to bake textures from graphics obj and cache only those
      graphics.strokePoints(points, true);
    }

    graphics.lineStyle(5, 0x000000, 1);
    // for (const l of isoLines) graphics.lineBetween(l.x1, l.y1, l.x2, l.y2);
    graphics.translateCanvas(-posX, -posY);

    // const posXScaled = posX / this.worldScale;
    // const posYScaled = posY / this.worldScale;
    // isoLines
    //   .map(l => l.setTo(l.x1 / this.worldScale, l.y1 / this.worldScale, l.x2 / this.worldScale, l.y2 / this.worldScale))
    //   .map(l => l.setTo(l.x1 + posXScaled, l.y1 + posYScaled, l.x2 + posXScaled, l.y2 + posYScaled))
    //   .forEach(l => this.terrainFixtures.createFixture(Pl.Edge(Pl.Vec2(l.x1, l.y1), Pl.Vec2(l.x2, l.y2))), {
    //     friction: 0,
    //     density: 0,
    //   });
  }

  private getTileEdges(x: number, y: number): ISquareDensityData {
    return {
      tl: this.roundToNearestEight(this.terrain[y][x]),
      tr: this.roundToNearestEight(this.terrain[y][x + 1]),
      br: this.roundToNearestEight(this.terrain[y + 1][x + 1]),
      bl: this.roundToNearestEight(this.terrain[y + 1][x]),
      threshold: this.config.tileDensityThreshold,
      maxDensity: this.config.tileDensityMax,
    };
  }

  private roundToNearestEight(val: number, num = 1): number {
    return Math.round(val / num) * num;
  }

  private isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.config.numSquaresX && y < this.config.numSquaresY;
  }

  private generateVertices(noiseFunction) {
    this.terrain = [];
    console.time('generateVertices');
    const {numSquaresX, numSquaresY} = this.config;
    for (let y = 0; y <= numSquaresY; y++) {
      const row: number[] = [];
      for (let x = 0; x <= numSquaresX; x++) {
        row.push(noiseFunction.call(this, x, y));
      }
      this.terrain.push(row);
    }
    console.timeEnd('generateVertices');
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////

}

/////////////////////////////////////////////////

export type Emitter = {
  xCoord: number;
  yCoord: number;
  intensity: number;
};

export class CreeperFlow2 {
  width: number;
  height: number;
  density: number[][];
  prevDensity: number[][];
  emitters: Emitter[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.density = Array.from({ length: width }, () => Array(height).fill(0));
    this.prevDensity = Array.from({ length: width }, () => Array(height).fill(0));
    this.emitters = []; // Array of Emitters
  }

  addEmitter(xCoord: number, yCoord: number, intensity: number): void {
    this.emitters.push({ xCoord, yCoord, intensity });
  }

  update(): void {
    // Update based on Emitters
    for (const emitter of this.emitters) {
      this.density[emitter.xCoord][emitter.yCoord] += emitter.intensity;
    }

    // Diffuse
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        let sum = 0;
        let count = 0;

        // Check neighbors
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
              sum += this.prevDensity[nx][ny];
              count++;
            }
          }
        }

        this.density[x][y] = sum / count;
      }
    }

    // Swap density arrays
    [this.density, this.prevDensity] = [this.prevDensity, this.density];

    // Render the creepers
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.renderSquareAt(x, y);
      }
    }
  }

  // Your renderSquareAt function remains unchanged here...
  renderSquareAt(x: number, y: number): void {
    // ... Existing logic
  }
}
