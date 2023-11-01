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

  density: number[][];
  prevDensity: number[][];
  emitters: Emitter[];

  // private terrain: number[][] = [];
  private readonly terrainGraphics: Ph.GameObjects.Graphics;
  private readonly marchingSquares: MarchingSquaresLookup;
  private readonly noise: NoiseFunction2D = createNoise2D();

  constructor(scene: Ph.Scene, config: ICreeperFlowConfig = defaultConfig) {
    this.scene = scene;
    this.config = config;
    this.density = this.generateVertices();
    this.prevDensity = this.generateVertices();
    this.emitters = [];

    this.marchingSquares = new MarchingSquaresLookup({
      squareSize: config.squareSize,
      densityThreshold: config.tileDensityThreshold,
      densityMax: config.tileDensityMax,
    });

    this.terrainGraphics = this.scene.add.graphics();
    this.terrainGraphics.setDepth(100000000).setAlpha(0.7);
  }

  addEmitter(xCoord: number, yCoord: number, intensity: number) {
    const emitter = { xCoord, yCoord, intensity, id: Math.random().toString(36).substring(2, 10) };
    this.emitters.push(emitter);
    return emitter.id;
  }

  removeEmitter(id: string) {
    const index = this.emitters.findIndex((e) => e.id === id);
    if (index !== -1) this.emitters.splice(index, 1);
    return index !== -1;
  }

  private generateVertices() {
    const density: number[][] = [];
    console.time('generateVertices');
    const {numSquaresX, numSquaresY} = this.config;
    for (let y = 0; y <= numSquaresY; y++) {
      const row: number[] = [];
      for (let x = 0; x <= numSquaresX; x++) {
        // row.push(this.noise(x / 10, y / 10) * 128 + 128);
        row.push(0);
      }
      density.push(row);
    }
    console.timeEnd('generateVertices');
    return density;
  }

  public diffuse(): void {
    const {numSquaresX, numSquaresY, tileDensityMax, tileDensityThreshold} = this.config;
    for (const emitter of this.emitters) this.density[emitter.yCoord][emitter.xCoord] += Math.min(emitter.intensity);

    // Iterate over the entire density grid
    for (let y = 0; y < numSquaresY; y++) {
      const rowCreeper = this.density[y];

      for (let x1 = 0; x1 < numSquaresX; x1++) {
        const x = y % 2 === 0 ? numSquaresX - x1 : x1; // Alternate horizontal scan direction
        let remainingDensity = rowCreeper[x];
        rowCreeper[x] -= remainingDensity <= tileDensityThreshold ? 0.1 : 0.05;
        if (remainingDensity <= 0) continue;

        // Try flowing down
        const availableDensityDown = y < numSquaresY - 1 ? tileDensityMax - this.density[y + 1][x] : 0;
        if (y < numSquaresY - 1 && availableDensityDown && this.density[y + 1][x] < remainingDensity) {
          const average = (remainingDensity + this.density[y + 1][x]) / 2;
          this.density[y + 1][x] = average;
          rowCreeper[x] = average;
        }

        remainingDensity = rowCreeper[x];
        if (remainingDensity <= 0) continue;

        // Try flowing left
        const availableDensityLeft = tileDensityMax - rowCreeper[x - 1];
        if (x > 0 && availableDensityLeft && rowCreeper[x - 1] < remainingDensity) {
          const average = (remainingDensity + rowCreeper[x - 1]) / 2;
          rowCreeper[x - 1] = average;
          rowCreeper[x] = average;
        }

        remainingDensity = rowCreeper[x];
        if (remainingDensity <= 0) continue;

        // Try flowing up
        const availableDensityUp = y > 0 ? tileDensityMax - this.density[y - 1][x] : 0;
        if (y > 0 && availableDensityUp && this.density[y - 1][x] < remainingDensity) {
          const average = (remainingDensity + this.density[y - 1][x]) / 2;
          this.density[y - 1][x] = average;
          rowCreeper[x] = average;
        }

        remainingDensity = rowCreeper[x];
        if (remainingDensity <= 0) continue;

        // Try flowing right
        const availableDensityRight = tileDensityMax - rowCreeper[x + 1];
        if (x < numSquaresX - 1 && availableDensityRight && rowCreeper[x + 1] < remainingDensity) {
          const average = (remainingDensity + rowCreeper[x + 1]) / 2;
          rowCreeper[x + 1] = average;
          rowCreeper[x] = average;
        }
      }
    }

    this.renderQueue.push({x: 0, y: 0, numSquaresX: this.config.numSquaresX, numSquaresY: this.config.numSquaresY, materialIndex: 0});
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
    // console.log('-------cache size after update', this.marchingSquares.polygonCache.size);
  }

  private renderSquareAt(x: number, y: number, graphics: Ph.GameObjects.Graphics, override?: ISquareDensityData): void {
    const densityData = override || this.getTileEdges(x, y);
    if (!densityData) return;
    const posX = x * this.config.squareSize;
    const posY = y * this.config.squareSize;
    const {polygons, isoLines, shapeIndex} = this.marchingSquares.getSquareGeomData(densityData);

    graphics.fillStyle(0x4081b7);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.translateCanvas(posX, posY);
    // graphics.scaleCanvas(1.05, 1.05);
    for (const points of polygons) {
      // graphics.generateTexture('terrainCache', this.config.squareSize, this.config.squareSize); // TODO can maybe improve performance together with next line
      // graphics.fillPath('terrainCache) // TODO this could work just like Path2D. Try it out. also try to bake textures from graphics obj and cache only those
      graphics.fillPoints(points, true);
    }

    graphics.lineStyle(3, 0x000000, 1);
    for (const l of isoLines) graphics.lineBetween(l.x1, l.y1, l.x2, l.y2);
    graphics.translateCanvas(-posX, -posY);
  }

  private getTileEdges(x: number, y: number): ISquareDensityData {
    return {
      tl: this.roundToNearestEight(this.density[y][x]),
      tr: this.roundToNearestEight(this.density[y][x + 1]),
      br: this.roundToNearestEight(this.density[y + 1][x + 1]),
      bl: this.roundToNearestEight(this.density[y + 1][x]),
      threshold: this.config.tileDensityThreshold,
      maxDensity: this.config.tileDensityMax,
    };
  }

  private roundToNearestEight(val: number, num = 4): number {
    return Math.round(val / num) * num;
  }

  private isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.config.numSquaresX && y < this.config.numSquaresY;
  }
}

/////////////////////////////////////////////////

export interface Emitter {
  id: string;
  xCoord: number;
  yCoord: number;
  intensity: number;
}
