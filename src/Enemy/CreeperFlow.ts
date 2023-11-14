import { ISquareDensityData, MarchingSquares } from './MarchingSquares';
import { NoiseFunction2D, createNoise2D } from 'simplex-noise';
import { GRID, TICK_DELTA, WORLD_X, WORLD_Y } from '../constants';
import { GameObjects, Scene } from 'phaser';
import { Emitter } from '../types/types';

const defaultTerrainConfig: TerrainConfig = {
  wallColor: 0x9b938d - 0x111111,
  elevationMax: 256,
  terrainLayers: [
    {elevation: 0, depth: 0, color: 0x544741},
    {elevation: 48 * 1, depth: 48 * 1, color: 0x544741 + 0x050505},
    {elevation: 96 * 1, depth: 96 * 1, color: 0x544741 + 0x111111},
    {elevation: 144 * 1, depth: 144 * 1, color: 0x544741 + 0x151515},
    {elevation: 192, depth: 192, color: 0x544741 + 0x222222},
    // {threshold: 240, depth: 240, color: 0x544741 + 0x252525},
  ],
  creeperElevationThresholds: [16, 32, 48, 64, 80, 96, 112, 128, 144, 160],
};

// TODO separate rendering out, so it can be used for creeper and terrain. This should only contain the densities and call the generic render methods
//  Rendering of creeper and terrain may be moved to a shader. It is too slow now to play on a large map zoomed out
export class CreeperFlow {
  renderQueue: IRenderQueueItem[] = [];
  private scene: Scene;
  private config: TerrainConfig;

  prevCreeper: number[][];
  creeper: number[][];
  terrain: number[][];
  emitters: Emitter[] = [];

  private readonly terrainGraphics: Map<number, GameObjects.Graphics> = new Map();
  private readonly marchingSquares: MarchingSquares;
  private readonly noise: NoiseFunction2D = createNoise2D();
  prevTotal: number;
  g: GameObjects.Graphics;

  flowNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  pendingSingleEmits: {xCoord: number, yCoord: number, amount: number}[] = [];

  constructor(scene: Scene, config: TerrainConfig = defaultTerrainConfig) {
    this.scene = scene;
    this.config = config;

    this.marchingSquares = new MarchingSquares({squareSize: GRID});

    this.prevCreeper = this.generateMatrix();
    this.creeper = this.generateMatrix();
    this.terrain = this.generateMatrix((x, y) => {
      const n3 = Math.max((this.noise(x / 48, y / 48) * this.config.elevationMax) * 2, 0); // macro
      const n2 = (this.noise(x / 32, y / 32) * this.config.elevationMax) * 1; // midlevel
      const n1 = (this.noise(x / 16, y / 16) * this.config.elevationMax) * 1; // micro
      let n = Math.max(((n1 + n2 + n3) / 3), 0);
      if (n < 32) n = 0;
      return Math.max(n, 0);
    });

    // TODO find more optimal way to display terrain. Static render textures have HORRIBLE performance when creeper graphics is underflowing it.
    // BOTTOM LAYER
    const graphics = this.scene.add.graphics().setDepth(1).setName('terrain').setAlpha(1);
    const BASE_TERRAIN_COLOR = 0x544741;
    graphics.fillStyle(BASE_TERRAIN_COLOR, 1);
    graphics.fillRect(0, 0, WORLD_X * GRID, WORLD_Y * GRID);
    // ELEVATION LAYERS
    for (const {elevation: threshold, color, depth} of defaultTerrainConfig.terrainLayers) {
      const graphics = this.scene.add.graphics().setDepth(depth).setName('terrain').setAlpha(1);
      graphics.lineStyle(2, 0x000000);
      for (let y = 0; y < WORLD_Y; y++) {
        for (let x = 0; x < WORLD_X; x++) {
          graphics.fillStyle(0x9b938d - 0x111111, 1);
          this.renderSquareAt(x, y, threshold - 8, graphics, this.terrain, 10, 20);
          this.renderSquareAt(x, y, threshold - 4, graphics, this.terrain, 5, 10);
          graphics.fillStyle(color, 1);
          this.renderSquareAt(x, y, threshold, graphics, this.terrain, 0, 0);
        }
      }
    }

    config.creeperElevationThresholds.forEach(threshold => this.terrainGraphics.set(threshold, this.scene.add.graphics().setAlpha(1).setDepth(threshold + 1).setName('g' + threshold)));
  }

  emit(xCoord: number, yCoord: number, amount: number) {
    this.pendingSingleEmits.push({xCoord, yCoord, amount});
  }

  addEmitter(xCoord: number, yCoord: number, creeperPerSecond: number) {
    const emitter = { xCoord, yCoord, creeperPerSecond, id: Math.random().toString(36).substring(2, 10) };
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
    for (let y = Math.max(0, yCoord - 2); y <= Math.min(WORLD_Y, yCoord + 2); y++) {
      for (let x = Math.max(0, xCoord - 2); x <= Math.min(WORLD_X, xCoord + 2); x++) {
        this.creeper[y][x] = Math.max(this.creeper[y][x] - damage, 0);
      }
    }
  }

  private generateMatrix(fn: (x: number, y: number ) => number = () => 0): number[][] {
    const elevation: number[][] = [];
    console.time('generateVertices');
    for (let y = 0; y <= WORLD_Y; y++) {
      const row: number[] = [];
      for (let x = 0; x <= WORLD_X; x++) {
        row.push(fn.call(this, x, y));
      }
      elevation.push(row);
    }
    console.timeEnd('generateVertices');
    return elevation;
  }

  public diffuse(tickCounter: number): void {
    const creeper = this.creeper;
    const prevCreeper = this.prevCreeper;
    const flowRate = 0.15;

    let totalCreeper = 0;
    for (let y = 0; y <= WORLD_Y; y++) {
      const creeperY = creeper[y];
      const prevCreeperY = prevCreeper[y];
      for (let x = 0; x <= WORLD_X; x++) {
        prevCreeperY[x] = Math.max(Math.min(creeperY[x], this.config.elevationMax * 10), 0);
        totalCreeper += prevCreeperY[x];
      }
    }

    if (tickCounter % 20 === 0) {
      console.log('total Creeper', totalCreeper.toFixed(0),'change', totalCreeper - this.prevTotal, 'totalSeconds', (tickCounter * TICK_DELTA).toFixed(0));
      this.prevTotal = totalCreeper;
    }

    // EMIT
    for (const emitter of this.emitters) creeper[emitter.yCoord][emitter.xCoord] += (emitter.creeperPerSecond * TICK_DELTA);
    for (const emit of this.pendingSingleEmits) creeper[emit.yCoord][emit.xCoord] += (emit.amount);
    this.pendingSingleEmits.length = 0;

    for (let y = 0; y <= WORLD_Y; y++) {
      const prevCreeperY = prevCreeper[y];
      const creeperY = creeper[y];
      const terrainY = this.terrain[y];
      for (let x = 0; x <= WORLD_X; x++) {
        if (prevCreeperY[x] <= 8) prevCreeperY[x] = Math.max(prevCreeperY[x] - 0.025, 0); // evaporate
        for (const [dx, dy] of this.flowNeighbours) {
          const newX = x + dx;
          const newY = y + dy;
          // FIXME To make the terrain and creeper layers align correctly at borders I need to do something similar as in my other marching squares based project
          // where water flows down from a sideway perspecvie and perfectly aligns with the terrain due to never allowing water+terrain to exceed max density
          // Here I cannot just do `maxFlow = MAX_DENSITY-terrainDensity` because we work with multiply layers instead of just one in the sideways view...
          // All layers work with the same density/elevation data so maybe I just need to manipulate the resulting densityData before densityGeomData is created
          // E.g. a single point the terrain density is 10. The creeper density at the equivalent point needs to be set to 6 at that particular level (assuming 16 threshold)
          // This is primarily for cosmetic reasons. Ideally we also treat any creeper density where it exceeds to the next level as empty, so it doesn't render.
          // The problem with that is that I'd have to give up transparency or need to be able to automatically adjust it for the topmost layer...
          // Maybe that won't be necessary once I switch to a proper isoband/isoline based rendering instead of tile based...
          if (newX >= 0 && newX <= WORLD_X && newY >= 0 && newY <= WORLD_Y) {
            const currentTotalElevation = prevCreeperY[x] + (Math.round(terrainY[x] / 16) * 16);
            const neighborTotalElevation = prevCreeper[newY][newX] + (Math.round(this.terrain[newY][newX] / 16) * 16);
            const elevationDiff = currentTotalElevation - neighborTotalElevation;
            // If the current tile is higher in total elevation, diffuse down to the neighbor
            if (elevationDiff > 0) {
              const flowAmount = Math.min(elevationDiff, prevCreeper[y][x]) * flowRate;
              creeperY[x] -= flowAmount;
              creeper[newY][newX] += flowAmount;
            }
          }
        }
      }
    }

    const {x, y, width, height} = this.scene.cameras.main.worldView;
    const xCoord = Phaser.Math.Clamp(Math.floor(x / GRID) - 1, 0, WORLD_X - 1);
    const yCoord = Phaser.Math.Clamp(Math.floor(y / GRID) - 1, 0, WORLD_Y - 1);

    const MAX_WIDTH = WORLD_X * GRID;
    const offsetLeftX = x < 0 ? Math.abs(x) : 0;
    const offsetRightX = (width + x) > MAX_WIDTH ? width + x - MAX_WIDTH : 0;
    const WORLD_XInView = Phaser.Math.Clamp(Math.floor((width - offsetLeftX - offsetRightX) / GRID), 0, WORLD_X - 1) + 2;
    if (WORLD_XInView <= 0) return;

    const MAX_HEIGHT = WORLD_Y * GRID;
    const offsetLeftY = y < 0 ? Math.abs(y) : 0;
    const offsetRightY = (height + y) > MAX_HEIGHT ? height + y - MAX_HEIGHT : 0;
    const WORLD_YInView = Phaser.Math.Clamp(Math.floor((height - offsetLeftY - offsetRightY) / GRID), 0, WORLD_Y - 1) + 2;
    if (WORLD_XInView <= 0) return;

    this.renderQueue.push({
      x: xCoord,
      y: yCoord,
      WORLD_X: WORLD_XInView,
      WORLD_Y: WORLD_YInView,
      threshold: this.config.creeperElevationThresholds
    });
  }

  tick() {
    if (!this.renderQueue.length) return;
    this.terrainGraphics.forEach((graphics) => graphics.clear());
    for (const bounds of this.renderQueue) {
      for (const threshold of bounds.threshold) {
        const g = this.terrainGraphics.get(threshold);
        if (!g) throw new Error('no graphics');
        g.fillStyle(0x4081b7, 0.4);
        g.lineStyle(2, 0x01030c, 1);
        for (let y = bounds.y; y <= (bounds.y + bounds.WORLD_Y); y++) {
          for (let x = bounds.x; x <= bounds.x + bounds.WORLD_X; x++) {
            if (!this.isWithinBounds(x, y)) continue; // this can be removed if we ensure the renderQueue is always within bounds
            this.renderSquareAt(x, y, threshold, g);
          }
        }
      }
    }

    this.renderQueue.length = 0;
  }

  private renderSquareAt(x: number, y: number, threshold: number, graphics: Phaser.GameObjects.Graphics, matrix: number[][] = this.creeper, offsetX = 0, offsetY = 0): void {
    const densityData = this.getTileEdges(x, y, threshold, matrix, this.terrain === matrix ? undefined : this.terrain);
    if (!densityData) return;
    const posX = x * GRID + offsetX;
    const posY = y * GRID + offsetY;
    const {polygons, isoLines, shapeIndex} = this.marchingSquares.getSquareGeomData(densityData);

    if (shapeIndex === 0) return; // not drawing empty square

    graphics.translateCanvas(posX, posY);
    if (shapeIndex === 15) {
      graphics.fillRect(0, 0, GRID, GRID);
    } else {
      for (const points of polygons) graphics.fillPoints(points, true);
      for (const {p1, p2} of isoLines) graphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }
    graphics.translateCanvas(-posX, -posY);
  }

  private getTileEdges(x: number, y: number, threshold: number, matrix: number[][] = this.creeper, secondary?: number[][]): ISquareDensityData {
    const creeperTL = matrix[y][x];
    const creeperTR = matrix[y][x+1];
    const creeperBR = matrix[y+1][x+1];
    const creeperBL = matrix[y+1][x];

    const secondaryTL = secondary ? secondary[y][x] : 0;
    const secondaryTR = secondary ? secondary[y][x+1] : 0;
    const secondaryBR = secondary ? secondary[y+1][x+1] : 0;
    const secondaryBL = secondary ? secondary[y+1][x] : 0;

    return {
      tl: creeperTL >= 1 ? creeperTL + secondaryTL : creeperTL,
      tr: creeperTR >= 1 ? creeperTR + secondaryTR : creeperTR,
      br: creeperBR >= 1 ? creeperBR + secondaryBR : creeperBR,
      bl: creeperBL >= 1 ? creeperBL + secondaryBL : creeperBL,
      // tl: creeperTL,
      // tr: creeperTR,
      // br: creeperBR,
      // bl: creeperBL,
      threshold,
    };
  }

  private isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < WORLD_X && y < WORLD_Y;
  }
}
export interface TerrainConfig {
    wallColor: number;
    elevationMax: number;
    terrainLayers: TerrainLayer[];
    creeperElevationThresholds: number[];
}

export interface TerrainLayer {
    elevation: number;
    depth: number;
    color: number;
}

export interface IRenderQueueItem {
    x: number;
    y: number;
    WORLD_X: number;
    WORLD_Y: number;
    threshold: number[];
}
