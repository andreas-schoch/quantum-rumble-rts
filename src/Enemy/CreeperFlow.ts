import * as Ph from 'phaser';
import { ISquareDensityData, MarchingSquaresLookup } from './MarchingSquares';
import { NoiseFunction2D, createNoise2D } from 'simplex-noise';

export interface ICreeperFlowConfig {
  squareSize: number;
  numSquaresX: number;
  numSquaresY: number;

  tileDensityMax: number;
  tileDensityThreshold: number[];
}

export interface IRenderQueueItem {
  x: number;
  y: number;
  numSquaresX: number;
  numSquaresY: number;
  threshold: number[];
}

export interface Emitter {
  id: string;
  xCoord: number;
  yCoord: number;
  intensity: number;
}

const defaultConfig: ICreeperFlowConfig = {
  squareSize: 32,
  numSquaresX: 32,
  numSquaresY: 32,
  tileDensityMax: 128,
  tileDensityThreshold: [32, 64, 128],
};

export class CreeperFlow {
  renderQueue: IRenderQueueItem[] = [];
  private scene: Ph.Scene;
  private config: ICreeperFlowConfig;

  prevDensity: number[][];
  density: number[][];
  emitters: Emitter[];

  // private terrain: number[][] = [];
  private readonly terrainGraphics: Ph.GameObjects.Graphics;
  private readonly marchingSquares: MarchingSquaresLookup;
  private readonly noise: NoiseFunction2D = createNoise2D();

  constructor(scene: Ph.Scene, config: ICreeperFlowConfig = defaultConfig) {
    this.scene = scene;
    this.config = config;
    this.prevDensity = this.generateVertices();
    this.density = this.generateVertices();
    this.emitters = [];

    this.marchingSquares = new MarchingSquaresLookup({
      squareSize: config.squareSize,
      // densityThreshold: config.tileDensityThreshold,
      densityMax: config.tileDensityMax,
    });

    this.terrainGraphics = this.scene.add.graphics();
    this.terrainGraphics.setDepth(100000000).setAlpha(0.7);
  }

  addEmitter(xCoord: number, yCoord: number, intensity: number) {
    const emitter = { xCoord, yCoord, intensity, id: Math.random().toString(36).substring(2, 10) };
    this.emitters.push(emitter);
    this.scene.add.sprite(xCoord * this.config.squareSize, yCoord * this.config.squareSize, 'creeperEmitter').setDepth(100000000);
    return emitter.id;
  }

  removeEmitter(id: string) {
    const index = this.emitters.findIndex((e) => e.id === id);
    if (index !== -1) this.emitters.splice(index, 1);
    return index !== -1;
  }

  damage(xCoord: number, yCoord: number, damage: number) {
    const {numSquaresX, numSquaresY} = this.config;
    for (let y = Math.max(0, yCoord - 2); y <= Math.min(numSquaresY, yCoord + 2); y++) {
      for (let x = Math.max(0, xCoord - 2); x <= Math.min(numSquaresX, xCoord + 2); x++) {
        this.density[y][x] -= Math.max(0, damage);
      }
    }
  }

  private generateVertices() {
    const density: number[][] = [];
    console.time('generateVertices');
    const {numSquaresX, numSquaresY} = this.config;
    for (let y = 0; y <= numSquaresY; y++) {
      const row: number[] = [];
      for (let x = 0; x <= numSquaresX; x++) {
        row.push(0);
      }
      density.push(row);
    }
    console.timeEnd('generateVertices');
    return density;
  }

  public diffuse(tickCounter: number): void {
    // console.time('diffuse');
    const {numSquaresX, numSquaresY} = this.config;

    // flip flopping between prev and current matrix falls apart after a while
    // const even = tickCounter % 2 === 0;
    // const density = even ? this.density : this.prevDensity;
    // const prevDensity = even ? this.prevDensity : this.density;

    const density = this.density;
    const prevDensity = this.prevDensity;
    for (let y = 0; y <= numSquaresY; y++) {
      const densityY = density[y];
      const prevDensityY = prevDensity[y];
      for (let x = 0; x <= numSquaresX; x++) {
        prevDensityY[x] = densityY[x];
      }
    }

    for (const emitter of this.emitters) {
      // const intensity = emitter.intensity / 4;
      // density[emitter.yCoord+1][emitter.xCoord] += intensity;
      // density[emitter.yCoord-1][emitter.xCoord] += intensity;
      // density[emitter.yCoord][emitter.xCoord+1] += intensity;
      // density[emitter.yCoord][emitter.xCoord-1] += intensity;
      density[emitter.yCoord][emitter.xCoord] += emitter.intensity;
    }

    for (let y = 0; y <= numSquaresY; y++) {
      const prevDensityY = prevDensity[y];
      const densityY = density[y];
      for (let x = 0; x <= numSquaresX; x++) {
        density[y][x] -= 0.01;
        if (x > 0) {
          const diff = (prevDensityY[x] - densityY[x-1]) * 0.1;
          if (diff) {
            densityY[x] -= diff;
            densityY[x-1] += diff;
          }
        }

        if (y > 0) {
          const diff = (prevDensityY[x] - density[y-1][x]) * 0.1;
          if (diff) {
            densityY[x] -= diff;
            density[y-1][x] += diff;
          }
        }

        if (x < numSquaresX) {
          const diff = (prevDensityY[x] - densityY[x+1]) * 0.1;
          if (diff) {
            densityY[x] -= diff;
            densityY[x+1] += diff;
          }
        }

        if (y < numSquaresY) {
          const diff = (prevDensityY[x] - density[y+1][x]) * 0.1;
          if (diff) {
            densityY[x] -= diff;
            density[y+1][x] += diff;
          }
        }
      }
    }

    // this.renderQueue.push({x: 0, y: 0, numSquaresX: this.config.numSquaresX, numSquaresY: this.config.numSquaresY - 1, threshold: 128});
    // this.renderQueue.push({x: 0, y: 0, numSquaresX: this.config.numSquaresX, numSquaresY: this.config.numSquaresY - 1, threshold: 64});
    this.renderQueue.push({x: 0, y: 0, numSquaresX: this.config.numSquaresX, numSquaresY: this.config.numSquaresY - 1, threshold: [16, 64, 192]});
    // this.renderQueue.push({x: 0, y: 0, numSquaresX: 20, numSquaresY: 20, threshold: 3});
  }

  update() {
    if (!this.renderQueue.length) return;
    const graphics = this.terrainGraphics;
    // console.time('updateTerrain');
    graphics.clear();
    for (const bounds of this.renderQueue) {
      graphics.translateCanvas(0, 0);
      for (let y = bounds.y; y <= (bounds.y + bounds.numSquaresY); y++) {
        for (let x = bounds.x; x <= bounds.x + bounds.numSquaresX; x++) {
          for (const threshold of bounds.threshold) this.renderSquareAt(x, y, threshold, graphics);
          // graphics.clear();
        }
      }
    }

    this.renderQueue.length = 0;
  }

  private renderSquareAt(x: number, y: number, threshold: number, graphics: Ph.GameObjects.Graphics): void {
    const densityData = this.getTileEdges(x, y, threshold);
    if (!densityData) return;
    const posX = x * this.config.squareSize;
    const posY = y * this.config.squareSize;
    const {polygons, isoLines, shapeIndex} = this.marchingSquares.getSquareGeomData(densityData);
    if (shapeIndex === 0) return;
    // if (shapeIndex === 15) return;

    graphics.fillStyle(0x4081b7);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.translateCanvas(posX, posY);
    for (const points of polygons) graphics.fillPoints(points, true);
    graphics.lineStyle(3, 0x01030c, 1);
    for (const l of isoLines) graphics.lineBetween(l.x1, l.y1, l.x2, l.y2);
    graphics.translateCanvas(-posX, -posY);
  }

  private getTileEdges(x: number, y: number, threshold: number): ISquareDensityData {
    return {
      tl: this.roundToNearestEight(this.density[y][x]),
      tr: this.roundToNearestEight(this.density[y][x + 1]),
      br: this.roundToNearestEight(this.density[y + 1][x + 1]),
      bl: this.roundToNearestEight(this.density[y + 1][x]),
      threshold: threshold,
      maxDensity: this.config.tileDensityMax,
    };
  }

  private roundToNearestEight(val: number, num = 1): number {
    // return Math.round(val / num) * num;
    return val;
  }

  private isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x <= this.config.numSquaresX && y <= this.config.numSquaresY;
  }
}
