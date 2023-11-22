import { ISquareDensityData, MarchingSquares } from './MarchingSquares';
import { GRID, THRESHOLD, WORLD_X, WORLD_Y } from '../constants';
import { GameObjects, Scene } from 'phaser';
import { TerrainSimulation, TerrainSimulationConfig } from './TerrainSimulation';
import GameScene from '../scenes/GameScene';

const defaultTerrainConfig: TerrainConfig = {
  terrain: {
    worldSizeX: WORLD_X,
    worldSizeY: WORLD_Y,
    elevationMax: THRESHOLD * 12,
  },
  fluid: {
    overflow: THRESHOLD * 12,
    flowRate: 0.15,
    evaporation: 5,
  },
  wallColor: 0x9b938d - 0x111111,
  terrainLayers: [
    // { elevation: THRESHOLD * 0, depth: 0, color: 0x544741 }, // this would be the lowest layer. It's rendered differently than the rest since it's a single rectangle
    { elevation: THRESHOLD * 3, depth: 4, color: 0x544741 + 0x111111 },
    { elevation: THRESHOLD * 6, depth: 7, color: 0x544741 + 0x222222 },
    { elevation: THRESHOLD * 9, depth: 10, color: 0x544741 + 0x333333 },
    { elevation: THRESHOLD * 12, depth: 13, color: 0x544741 + 0x444444 }, // Ensure last layers threshold equals config.terrain.elevationMax to prevent holes
  ],
  fluidLayerThresholds: [
    // TERRAIN 0
    { elevation: THRESHOLD * 1, depth: 1, color: 0x4081b7 },
    { elevation: THRESHOLD * 2, depth: 2, color: 0x4081b7 },
    { elevation: THRESHOLD * 3, depth: 3, color: 0x4081b7 },
    // TERRAIN 1
    { elevation: THRESHOLD * 4, depth: 4, color: 0x4081b7 },
    { elevation: THRESHOLD * 5, depth: 5, color: 0x4081b7 },
    { elevation: THRESHOLD * 6, depth: 6, color: 0x4081b7 },
    // TERRAIN 2
    { elevation: THRESHOLD * 7, depth: 7, color: 0x4081b7 },
    { elevation: THRESHOLD * 8, depth: 8, color: 0x4081b7 },
    { elevation: THRESHOLD * 9, depth: 9, color: 0x4081b7 },
    // TERRAIN 3
    { elevation: THRESHOLD * 10, depth: 10, color: 0x4081b7 },
    { elevation: THRESHOLD * 11, depth: 11, color: 0x4081b7 },
    { elevation: THRESHOLD * 12, depth: 12, color: 0x4081b7 },
    // TERRAIN 4
    { elevation: THRESHOLD * 13, depth: 13, color: 0x4081b7 },
    { elevation: THRESHOLD * 14, depth: 14, color: 0x4081b7 },
    { elevation: THRESHOLD * 15, depth: 15, color: 0x4081b7 },
  ]
};

export class Terrain {
  readonly simulation: TerrainSimulation;
  private readonly scene: Scene;
  private readonly config: TerrainConfig;
  private readonly terrainGraphics: Map<number, GameObjects.Graphics> = new Map();
  private readonly marchingSquares: MarchingSquares;

  constructor(scene: GameScene, config: TerrainConfig = defaultTerrainConfig) {
    this.scene = scene;
    this.config = config;
    const { fluid, terrain } = config;
    this.simulation = new TerrainSimulation({ terrain, fluid });
    this.marchingSquares = new MarchingSquares({ squareSize: GRID });
    this.initTerrain();
    config.fluidLayerThresholds.forEach(({elevation, depth, color}) => this.terrainGraphics.set(elevation, this.scene.add.graphics().setAlpha(1).setDepth(depth).fillStyle(color, 0.4)));
  }

  tick(tickCounter: number) {
    // console.time('terrain simulation tick');
    this.simulation.tick(tickCounter);
    // console.timeEnd('terrain simulation tick');
    const bounds = this.getVisibleBounds();
    if (!bounds) return;

    for (const {elevation, color} of this.config.fluidLayerThresholds) {
      const g = this.terrainGraphics.get(elevation);
      if (!g) throw new Error('no graphics');
      g.clear().fillStyle(color, 0.4);
      for (let y = bounds.coordY; y <= (bounds.coordY + bounds.numCoordsY); y++) {
        for (let x = bounds.coordX; x <= bounds.coordX + bounds.numCoordsX; x++) {
          if (!this.isWithinBounds(x, y)) continue;
          this.renderFluidAt(x, y, elevation, g);
        }
      }
    }
  }

  private initTerrain() {
    // TODO find more optimal way to display terrain. Static render textures have HORRIBLE performance when creeper graphics is underflowing it.
    // BOTTOM LAYER
    let graphics = this.scene.add.graphics().setDepth(1);
    const BASE_TERRAIN_COLOR = 0x544741;
    graphics.fillStyle(BASE_TERRAIN_COLOR, 1);
    graphics.fillRect(0, 0, WORLD_X * GRID, WORLD_Y * GRID);
    // ELEVATION LAYERS
    for (const { elevation: threshold, color, depth} of defaultTerrainConfig.terrainLayers) {
      graphics = this.scene.add.graphics().setDepth(depth);
      graphics.lineStyle(2, 0x000000);
      for (let y = 0; y < WORLD_Y; y++) {
        for (let x = 0; x < WORLD_X; x++) {
          graphics.fillStyle(0x9b938d - 0x111111, 1);
          this.renderTerrainAt(x, y, threshold, graphics, 9, 30);
          this.renderTerrainAt(x, y, threshold, graphics, 6, 20);
          this.renderTerrainAt(x, y, threshold, graphics, 3, 10);
          graphics.fillStyle(color, 1);
          this.renderTerrainAt(x, y, threshold, graphics, 0, 0);
        }
      }
    }
    graphics = this.scene.add.graphics().setDepth(this.config.terrainLayers.at(-1)?.depth || 0);
    graphics.fillStyle(0x333333, 1); // matching camera background
    graphics.fillRect(0, WORLD_Y * GRID, WORLD_X * GRID, GRID).setDepth(this.config.terrainLayers.at(-1)?.depth || 0);
    graphics.fillRect(WORLD_X * GRID, 0, GRID,WORLD_Y * GRID + GRID).setDepth(this.config.terrainLayers.at(-1)?.depth || 0);
  }

  private getVisibleBounds(): CoordBounds | null {
    const { x, y, width, height } = this.scene.cameras.main.worldView;

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
    return { coordX, coordY, numCoordsX, numCoordsY };
  }

  private renderTerrainAt(x: number, y: number, threshold: number, graphics: Phaser.GameObjects.Graphics, offsetX = 0, offsetY = 0): void {
    const edgeDataAbove = this.getCellEdges(x, y, threshold + (THRESHOLD * 3));

    const shapeIndexAbove = this.marchingSquares.getShapeIndex(edgeDataAbove.terrain);
    if (shapeIndexAbove === 15) return; // prevent drawing invisible terrain

    const posX = x * GRID + offsetX;
    const posY = y * GRID + offsetY;
    const edgeData = this.getCellEdges(x, y, threshold);
    this.renderAt(posX, posY, edgeData.terrain, graphics);
  }

  private renderFluidAt(x: number, y: number, threshold: number, graphics: Phaser.GameObjects.Graphics): void {
    const {terrain, fluid} = this.getCellEdges(x, y, threshold);

    const densityData = {
      tl: fluid.tl >= THRESHOLD - 256 ? terrain.tl + fluid.tl : fluid.tl,
      tr: fluid.tr >= THRESHOLD - 256 ? terrain.tr + fluid.tr : fluid.tr,
      br: fluid.br >= THRESHOLD - 256 ? terrain.br + fluid.br : fluid.br,
      bl: fluid.bl >= THRESHOLD - 256 ? terrain.bl + fluid.bl : fluid.bl,
      threshold,
    };
    const posX = x * GRID;
    const posY = y * GRID;
    this.renderAt(posX, posY, densityData, graphics);
  }

  private renderAt(x: number, y: number, densityData: ISquareDensityData, graphics: GameObjects.Graphics): void {
    const { polygons, isoLines, shapeIndex } = this.marchingSquares.getSquareGeomData(densityData);

    if (shapeIndex === 0) return; // not drawing empty square

    graphics.translateCanvas(x, y);
    if (shapeIndex === 15) {
      graphics.fillRect(0, 0, GRID, GRID);
    } else {
      for (const points of polygons) graphics.fillPoints(points, true);
      for (const { p1, p2 } of isoLines) graphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }
    graphics.translateCanvas(-x, -y);
  }

  private getCellEdges(x: number, y: number, threshold: number): {terrain: ISquareDensityData, fluid: ISquareDensityData} {
    const { worldSizeX } = this.config.terrain;
    const indexTL = y * (worldSizeX + 1) + x;
    const indexBL = indexTL + worldSizeX + 1;
    const indexTR = indexTL + 1;
    const indexBR = indexBL + 1;

    const terrain = {
      tl: this.simulation.terrain[indexTL],
      tr: this.simulation.terrain[indexTR],
      br: this.simulation.terrain[indexBR],
      bl: this.simulation.terrain[indexBL],
      threshold,
    };

    const fluid = {
      tl: this.simulation.fluid[indexTL],
      tr: this.simulation.fluid[indexTR],
      br: this.simulation.fluid[indexBR],
      bl: this.simulation.fluid[indexBL],
      threshold,
    };

    return { terrain, fluid };
  }

  private isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < WORLD_X && y < WORLD_Y;
  }
}

export interface TerrainRenderConfig {
  wallColor: number;
  terrainLayers: { elevation: number, depth: number, color: number }[];
  fluidLayerThresholds: { elevation: number, depth: number, color: number }[];
}

export type TerrainConfig = TerrainRenderConfig & TerrainSimulationConfig;

export interface CoordBounds {
  coordX: number;
  coordY: number;
  numCoordsX: number;
  numCoordsY: number;
}
