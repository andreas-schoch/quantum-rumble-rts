import { ISquareDensityData, MarchingSquares } from './MarchingSquares';
import { GRID, TICK_DELTA, WORLD_X, WORLD_Y } from '../constants';
import { GameObjects, Scene } from 'phaser';
import { Emitter } from '../types/types';
import { TerrainSimulation, TerrainSimulationConfig } from './TerrainSimulation';
import GameScene from '../scenes/GameScene';

const defaultTerrainConfig: TerrainConfig = {
  terrain: {
    worldSizeX: WORLD_X,
    worldSizeY: WORLD_Y,
    elevationMax: 256,
  },
  fluid: {
    overflow: 10,
    flowRate: 0.15,
    evaporation: -0.025,
  },
  wallColor: 0x9b938d - 0x111111,
  terrainLayers: [
    {elevation: 0, depth: 0, color: 0x544741},
    {elevation: 48 * 1, depth: 48 * 1, color: 0x544741 + 0x050505},
    {elevation: 96 * 1, depth: 96 * 1, color: 0x544741 + 0x111111},
    {elevation: 144 * 1, depth: 144 * 1, color: 0x544741 + 0x151515},
    {elevation: 192, depth: 192, color: 0x544741 + 0x222222},
    // {threshold: 240, depth: 240, color: 0x544741 + 0x252525},
  ],
  fluidLayerThresholds: [16, 32, 48, 64, 80, 96, 112, 128, 144, 160],
};

export class Terrain {
  private readonly simulation: TerrainSimulation;
  private readonly scene: Scene;
  private readonly config: TerrainRenderConfig;
  private readonly emitters: Emitter[] = []; // TODO make this a class
  private readonly terrainGraphics: Map<number, GameObjects.Graphics> = new Map();
  private readonly marchingSquares: MarchingSquares;

  constructor(scene: GameScene, config: TerrainConfig = defaultTerrainConfig) {
    this.scene = scene;
    const {fluid, terrain, ...renderConfig} = config;
    this.config = renderConfig;
    this.simulation = new TerrainSimulation({terrain, fluid});
    this.marchingSquares = new MarchingSquares({squareSize: GRID});

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
          this.renderSquareAt(x, y, threshold - 8, graphics, this.simulation.terrain, 10, 20);
          this.renderSquareAt(x, y, threshold - 4, graphics, this.simulation.terrain, 5, 10);
          graphics.fillStyle(color, 1);
          this.renderSquareAt(x, y, threshold, graphics, this.simulation.terrain, 0, 0);
        }
      }
    }

    config.fluidLayerThresholds.forEach(threshold => this.terrainGraphics.set(threshold, this.scene.add.graphics().setAlpha(1).setDepth(threshold + 1).setName('g' + threshold)));
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
    this.simulation.damage(xCoord, yCoord, damage);
    // TODO add particle effects here?
  }

  tick(tickCounter: number) {
    this.emitters.forEach((emitter) => this.simulation.emit(emitter.xCoord, emitter.yCoord, emitter.creeperPerSecond * TICK_DELTA));
    this.simulation.diffuse(tickCounter);
    const bounds = this.getVisibleBounds();
    if (!bounds) return;

    this.terrainGraphics.forEach((graphics) => graphics.clear());
    for (const threshold of this.config.fluidLayerThresholds) {
      const g = this.terrainGraphics.get(threshold);
      if (!g) throw new Error('no graphics');
      g.fillStyle(0x4081b7, 0.4);
      g.lineStyle(2, 0x01030c, 1);
      for (let y = bounds.coordY; y <= (bounds.coordY + bounds.numCoordsY); y++) {
        for (let x = bounds.coordX; x <= bounds.coordX + bounds.numCoordsX; x++) {
          if (!this.isWithinBounds(x, y)) continue; // this can be removed if we ensure the renderQueue is always within bounds
          this.renderSquareAt(x, y, threshold, g);
        }
      }
    }
  }

  private getVisibleBounds(): CoordBounds | null {
    const {x, y, width, height} = this.scene.cameras.main.worldView;

    const MAX_WIDTH = WORLD_X * GRID;
    const offsetLeftX = x < 0 ? Math.abs(x) : 0;
    const offsetRightX = (width + x) > MAX_WIDTH ? width + x - MAX_WIDTH : 0;
    const numCoordsX = Phaser.Math.Clamp(Math.floor((width - offsetLeftX - offsetRightX) / GRID), 0, WORLD_X - 1) + 2;
    if (numCoordsX <= 0) return null;

    const MAX_HEIGHT = WORLD_Y * GRID;
    const offsetLeftY = y < 0 ? Math.abs(y) : 0;
    const offsetRightY = (height + y) > MAX_HEIGHT ? height + y - MAX_HEIGHT : 0;
    const numCoordsY = Phaser.Math.Clamp(Math.floor((height - offsetLeftY - offsetRightY) / GRID), 0, WORLD_Y - 1) + 2;
    if (numCoordsY <= 0) return null;

    const coordX = Phaser.Math.Clamp(Math.floor(x / GRID) - 1, 0, WORLD_X - 1);
    const coordY = Phaser.Math.Clamp(Math.floor(y / GRID) - 1, 0, WORLD_Y - 1);
    return {coordX, coordY, numCoordsX, numCoordsY};
  }

  private renderSquareAt(x: number, y: number, threshold: number, graphics: Phaser.GameObjects.Graphics, matrix: number[][] = this.simulation.fluid, offsetX = 0, offsetY = 0): void {
    const densityData = this.getTileEdges(x, y, threshold, matrix, this.simulation.terrain === matrix ? undefined : this.simulation.terrain);
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

  private getTileEdges(x: number, y: number, threshold: number, matrix: number[][] = this.simulation.fluid, secondary?: number[][]): ISquareDensityData {
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

export interface TerrainRenderConfig {
  wallColor: number;
  terrainLayers: {elevation: number, depth: number, color: number}[];
  fluidLayerThresholds: number[];
}

export type TerrainConfig = TerrainRenderConfig & TerrainSimulationConfig;

export interface CoordBounds {
  coordX: number;
  coordY: number;
  numCoordsX: number;
  numCoordsY: number;
}
