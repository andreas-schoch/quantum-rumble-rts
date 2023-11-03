import * as Ph from 'phaser';
import { ISquareDensityData, MarchingSquaresLookup } from './MarchingSquares';
import { NoiseFunction2D, createNoise2D } from 'simplex-noise';
import { GRID, TICK_DELTA } from '..';

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

  private readonly terrainGraphics: Map<number, Ph.GameObjects.Graphics> = new Map();
  private readonly marchingSquares: MarchingSquaresLookup;
  private readonly noise: NoiseFunction2D = createNoise2D();
  prevTotal: number;
  currentShapesByThreshold: Map<number, number[][]> = new Map();
  g: Ph.GameObjects.Graphics;

  constructor(scene: Ph.Scene, config: ICreeperFlowConfig = defaultConfig) {
    this.scene = scene;
    this.config = config;
    this.prevDensity = this.generateMatrix();
    this.density = this.generateMatrix();
    this.emitters = [];

    this.marchingSquares = new MarchingSquaresLookup({
      squareSize: config.squareSize,
      densityMax: config.tileDensityMax,
    });

    config.tileDensityThreshold.forEach(threshold => this.terrainGraphics.set(threshold, this.scene.add.graphics().setAlpha(0.3).setDepth(100000).setName('g' + threshold)));
    config.tileDensityThreshold.forEach(threshold => this.currentShapesByThreshold.set(threshold, this.generateMatrix()));
  }

  addEmitter(xCoord: number, yCoord: number, intensity: number) {
    const emitter = { xCoord, yCoord, intensity, id: Math.random().toString(36).substring(2, 10) };
    this.emitters.push(emitter);
    this.scene.add.sprite(xCoord * GRID, yCoord * GRID, 'creeperEmitter').setDepth(100000000);
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
        this.density[y][x] = Math.max(this.density[y][x] - damage, 0);
      }
    }
  }

  private generateMatrix() {
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
    const {numSquaresX, numSquaresY} = this.config;
    const density = this.density;
    const prevDensity = this.prevDensity;

    let totalDensity = 0;
    for (let y = 0; y <= numSquaresY; y++) {
      const densityY = density[y];
      const prevDensityY = prevDensity[y];
      for (let x = 0; x <= numSquaresX; x++) {
        totalDensity += densityY[x];
        prevDensityY[x] = densityY[x];
      }
    }

    if (tickCounter % 20 === 0) {
      console.log('totalDensity', totalDensity.toFixed(0),'change', totalDensity - this.prevTotal, 'totalSeconds', (tickCounter * TICK_DELTA).toFixed(0));
      this.prevTotal = totalDensity;
    }

    // if (tickCounter % 4 === 0) {
    for (const emitter of this.emitters) {
      const intensity = (emitter.intensity * TICK_DELTA);
      // density[emitter.yCoord+1][emitter.xCoord] += intensity;
      // density[emitter.yCoord-1][emitter.xCoord] += intensity;
      // density[emitter.yCoord][emitter.xCoord+1] += intensity;
      // density[emitter.yCoord][emitter.xCoord-1] += intensity;
      density[emitter.yCoord][emitter.xCoord] += intensity;
    }
    // }

    for (let y = 0; y <= numSquaresY; y++) {
      const prevDensityY = prevDensity[y];
      const densityY = density[y];
      for (let x = 0; x <= numSquaresX; x++) {

        if (densityY[x] <= 8) {
          densityY[x] = Math.max(densityY[x] - 0.05, 0);
          continue;
        }
        // } else densityY[x] *= 0.99995;
        if (x > 0) {
          const diff = (prevDensityY[x] - densityY[x-1]) * 0.05;
          // if (diff) {
          densityY[x] -= diff;
          densityY[x-1] += diff;
          // }
        }

        if (y > 0) {
          const diff = (prevDensityY[x] - density[y-1][x]) * 0.05;
          // if (diff) {
          densityY[x] -= diff;
          density[y-1][x] += diff;
          // }
        }

        if (x < numSquaresX) {
          const diff = (prevDensityY[x] - densityY[x+1]) * 0.05;
          // if (diff) {
          densityY[x] -= diff;
          densityY[x+1] += diff;
          // }
        }

        if (y < numSquaresY) {
          const diff = (prevDensityY[x] - density[y+1][x]) * 0.05;
          // if (diff) {
          densityY[x] -= diff;
          density[y+1][x] += diff;
          // }
        }
      }
    }

    const {x, y, width, height} = this.scene.cameras.main.worldView;
    const xCoord = Phaser.Math.Clamp(Math.floor(x / GRID) - 1, 0, numSquaresX - 1);
    const yCoord = Phaser.Math.Clamp(Math.floor(y / GRID) - 1, 0, numSquaresY - 1);

    const MAX_WIDTH = numSquaresX * GRID;
    const offsetLeftX = x < 0 ? Math.abs(x) : 0;
    const offsetRightX = (width + x) > MAX_WIDTH ? width + x - MAX_WIDTH : 0;
    const numSquaresXInView = Phaser.Math.Clamp(Math.floor((width - offsetLeftX - offsetRightX) / GRID), 0, numSquaresX - 1) + 2;
    if (numSquaresXInView <= 0) return;

    const MAX_HEIGHT = numSquaresY * GRID;
    const offsetLeftY = y < 0 ? Math.abs(y) : 0;
    const offsetRightY = (height + y) > MAX_HEIGHT ? height + y - MAX_HEIGHT : 0;
    const numSquaresYInView = Phaser.Math.Clamp(Math.floor((height - offsetLeftY - offsetRightY) / GRID), 0, numSquaresY - 1) + 2;
    if (numSquaresXInView <= 0) return;

    this.renderQueue.push({
      x: xCoord,
      y: yCoord,
      numSquaresX: numSquaresXInView,
      numSquaresY: numSquaresYInView,
      threshold: this.config.tileDensityThreshold
    });
  }

  update() {
    if (!this.renderQueue.length) return;
    this.terrainGraphics.forEach((graphics) => graphics.clear());
    for (const bounds of this.renderQueue) {
      for (const threshold of bounds.threshold) {
        const g = this.terrainGraphics.get(threshold);
        if (!g) throw new Error('no graphics');
        for (let y = bounds.y; y <= (bounds.y + bounds.numSquaresY); y++) {
          for (let x = bounds.x; x <= bounds.x + bounds.numSquaresX; x++) {
            if (!this.isWithinBounds(x, y)) continue; // this can be removed if we ensure the renderQueue is always within bounds
            this.renderSquareAt(x, y, threshold, g);
          }
        }
      }
    }

    this.renderQueue.length = 0;
  }

  private renderSquareAt(x: number, y: number, threshold: number, graphics: Phaser.GameObjects.Graphics): void {
    const densityData = this.getTileEdges(x, y, threshold);
    if (!densityData) return;
    const posX = x * GRID;
    const posY = y * GRID;
    const {polygons, isoLines, shapeIndex, hash} = this.marchingSquares.getSquareGeomData(densityData);

    if (shapeIndex === 0) return;
    if (shapeIndex === 15) {
      graphics.fillStyle(0x4081b7);
      graphics.translateCanvas(posX, posY);
      graphics.fillRect(0, 0, GRID, GRID);
      graphics.translateCanvas(-posX, -posY);
      return;
    }

    graphics.translateCanvas(posX, posY);
    graphics.fillStyle(0x4081b7);
    graphics.lineStyle(3, 0x01030c);
    for (const points of polygons) graphics.fillPoints(points, true);
    for (const l of isoLines) graphics.lineBetween(l.x1, l.y1, l.x2, l.y2);
    graphics.translateCanvas(-posX, -posY);
  }

  private getTileEdges(x: number, y: number, threshold: number): ISquareDensityData {
    return {
      tl: this.density[y][x],
      tr: this.density[y][x + 1],
      br: this.density[y + 1][x + 1],
      bl: this.density[y + 1][x],
      threshold: threshold,
      maxDensity: this.config.tileDensityMax,
    };
  }

  private isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.config.numSquaresX && y < this.config.numSquaresY;
  }
}