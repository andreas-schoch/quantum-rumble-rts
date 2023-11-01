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
    console.time('diffuse');
    const {numSquaresX, numSquaresY, tileDensityMax, tileDensityThreshold} = this.config;
    for (const emitter of this.emitters) this.density[emitter.yCoord][emitter.xCoord] += emitter.intensity;

    // update prevDensity
    for (let y = 0; y < numSquaresY; y++) {
      for (let x = 0; x < numSquaresX; x++) {
        this.prevDensity[y][x] = this.density[y][x];
      }
    }

    // Iterate over the entire density grid
    for (let y = 0; y < numSquaresY; y++) {
      // const y = y1 % 2 === 0 ? numSquaresY - y1 : y1; // Alternate vertical scan direction
      // const rowCreeper = this.density[y];
      for (let x = 0; x < numSquaresX; x++) {
        // const x = y % 2 !== 0 ? numSquaresX - x1 : x1; // Alternate horizontal scan direction
        const remainingDensity = this.prevDensity[y][x];
        // this.prevDensity[y][x] -= remainingDensity <= tileDensityThreshold ? 0.1 : 0.05;
        this.density[y][x] *= this.prevDensity[y][x] <= tileDensityThreshold ? 0.9 : 1;
        if (remainingDensity < tileDensityThreshold) continue;

        try {
          const densityDown = y < numSquaresY - 1 ? this.prevDensity[y + 1][x] : tileDensityMax;
          const densityLeft = x > 0 ? this.prevDensity[y][x - 1] : tileDensityMax;
          const densityUp = y > 0 ? this.prevDensity[y - 1][x] : tileDensityMax;
          const densityRight = x < numSquaresX - 1 ? this.prevDensity[y][x + 1] : tileDensityMax;

          // This gives kind of an interesting effect that looks a bit alien and aggressive
          // if (densityDown < tileDensityThreshold + -20 && densityLeft < tileDensityThreshold + -1 && densityUp < tileDensityThreshold + -1 && densityRight < tileDensityThreshold + -1 && remainingDensity < tileDensityThreshold + -1) continue;

          const canFlowDown = densityDown < remainingDensity;
          const canFlowLeft = densityLeft < remainingDensity;
          const canFlowUp = densityUp < remainingDensity;
          const canFlowRight = densityRight < remainingDensity;

          const totalFlowDirections = (canFlowDown ? 1 : 0) + (canFlowLeft ? 1 : 0) + (canFlowUp ? 1 : 0) + (canFlowRight ? 1 : 0);

          let totalDiff = 0;
          if (canFlowDown) totalDiff += (remainingDensity - densityDown);
          if (canFlowLeft) totalDiff += (remainingDensity - densityLeft);
          if (canFlowUp) totalDiff += (remainingDensity - densityUp);
          if (canFlowRight) totalDiff += (remainingDensity - densityRight);

          if (totalFlowDirections === 0) continue;
          if (totalDiff === 0) continue;

          const weightDown = canFlowDown ? (remainingDensity - densityDown) / totalDiff : 0;
          const weightLeft = canFlowLeft ? (remainingDensity - densityLeft) / totalDiff : 0;
          const weightUp = canFlowUp ? (remainingDensity - densityUp) / totalDiff : 0;
          const weightRight = canFlowRight ? (remainingDensity - densityRight) / totalDiff : 0;

          const halfRemainingDensity = (remainingDensity / 2) * 0.1;

          if (weightDown) this.density[y + 1][x] += halfRemainingDensity * weightDown;
          if (weightLeft) this.density[y][x - 1] += halfRemainingDensity * weightLeft;
          if (weightUp) this.density[y - 1][x] += halfRemainingDensity * weightUp;
          if (weightRight) this.density[y][x + 1] += halfRemainingDensity * weightRight;

          this.density[y][x] -= halfRemainingDensity;

        } catch (e) {
          continue;
        }
      }
    }

    this.renderQueue.push({x: 0, y: 0, numSquaresX: this.config.numSquaresX, numSquaresY: this.config.numSquaresY, materialIndex: 0});
    console.timeEnd('diffuse');
  }

  update() {
    if (!this.renderQueue.length) return;
    const graphics = this.terrainGraphics;
    // console.time('updateTerrain');
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
    // console.timeEnd('updateTerrain');
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
