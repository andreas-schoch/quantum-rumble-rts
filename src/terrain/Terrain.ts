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
    overflow: 4,
    flowRate: 0.15,
    evaporation: 2,
  },
  wallColor: 0x9b938d - 0x111111,
  terrainLayers: [
    // {elevation: 0, depth: 0, color: 0x544741},
    { elevation: THRESHOLD * 3, depth: THRESHOLD * 3, color: 0x544741 + 0x050505 },
    { elevation: THRESHOLD * 6, depth: THRESHOLD * 6, color: 0x544741 + 0x111111 },
    { elevation: THRESHOLD * 9, depth: THRESHOLD * 9, color: 0x544741 + 0x151515 },
    // { elevation: THRESHOLD * 12, depth: THRESHOLD * 12, color: 0x544741 + 0x222222 },
  ],
  fluidLayerThresholds: [THRESHOLD * 1, THRESHOLD * 2, THRESHOLD * 3, THRESHOLD * 4, THRESHOLD * 5, THRESHOLD * 6, THRESHOLD * 7, THRESHOLD * 8, THRESHOLD * 9, THRESHOLD * 10, THRESHOLD * 11, THRESHOLD * 12],
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

    // TODO find more optimal way to display terrain. Static render textures have HORRIBLE performance when creeper graphics is underflowing it.
    // BOTTOM LAYER
    const graphics = this.scene.add.graphics().setDepth(1).setName('terrain').setAlpha(1);
    const BASE_TERRAIN_COLOR = 0x544741;
    graphics.fillStyle(BASE_TERRAIN_COLOR, 1);
    graphics.fillRect(0, 0, WORLD_X * GRID, WORLD_Y * GRID);
    // ELEVATION LAYERS
    for (const { elevation: threshold, color} of defaultTerrainConfig.terrainLayers) {
      const graphics = this.scene.add.graphics().setDepth(threshold).setName('terrain').setAlpha(1);
      graphics.lineStyle(2, 0x000000);
      for (let y = 0; y < WORLD_Y; y++) {
        for (let x = 0; x < WORLD_X; x++) {
          graphics.fillStyle(0x9b938d - 0x111111, 1);
          this.renderTerrainAt(x, y, threshold - 8, graphics, 10, 20);
          this.renderTerrainAt(x, y, threshold - 4, graphics, 5, 10);
          graphics.fillStyle(color, 1);
          this.renderTerrainAt(x, y, threshold, graphics, 0, 0);
        }
      }
    }

    config.fluidLayerThresholds.forEach(threshold => this.terrainGraphics.set(threshold, this.scene.add.graphics().setAlpha(1).setDepth(threshold).setName('g' + threshold)));
  }

  tick(tickCounter: number) {
    console.time('terrain simulation tick');
    this.simulation.tick(tickCounter);
    const bounds = this.getVisibleBounds();
    if (!bounds) return;

    this.terrainGraphics.forEach((graphics) => graphics.clear());
    for (const threshold of this.config.fluidLayerThresholds) {
      const g = this.terrainGraphics.get(threshold);
      if (!g) throw new Error('no graphics');
      // g.fillStyle(0x4081b7, 0.4);
      // g.lineStyle(2, 0x01030c, 1);
      for (let y = bounds.coordY; y <= (bounds.coordY + bounds.numCoordsY); y++) {
        for (let x = bounds.coordX; x <= bounds.coordX + bounds.numCoordsX; x++) {
          if (!this.isWithinBounds(x, y)) continue; // this can be removed if we ensure the renderQueue is always within bounds
          // const terrainElevation = this.simulation.terrain[x + y * (WORLD_X + 1)];
          // const stepped = Math.round(terrainElevation / (THRESHOLD * 3)) * (THRESHOLD * 3);
          // if (stepped > fluidLayerThreshold) continue;
          this.renderFluidAt(x, y, threshold, g);
        }
      }
    }
    console.timeEnd('terrain simulation tick');
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
    const {terrain} = this.getCellEdges(x, y, threshold);

    const posX = x * GRID + offsetX;
    const posY = y * GRID + offsetY;
    this.renderAt(posX, posY, terrain, graphics);
  }

  private renderFluidAt(x: number, y: number, threshold: number, graphics: Phaser.GameObjects.Graphics): void {
    const {terrain, fluid} = this.getCellEdges(x, y, threshold);
    graphics.fillStyle(0x4081b7, 0.4);
    graphics.lineStyle(2, 0x01030c, 1);

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
  fluidLayerThresholds: number[];
}

export type TerrainConfig = TerrainRenderConfig & TerrainSimulationConfig;

export interface CoordBounds {
  coordX: number;
  coordY: number;
  numCoordsX: number;
  numCoordsY: number;
}

// TODO IDEA - assign 3 fluid layers for each terrain layer and don't allow them to flow anywhere but within their threshold
//  Meaning that the fluid will not flow UNDER the terrain and there won't be a need to have different z-levels for terrain making it possible
//  for the terrain to be a single big texture or bunch of smaller textures on the same z-level
//  While no fluid level can flow where there is more terrain elevation than it's max, it can flow where it is lower, so visually it wont look too different from now.
//  The one problem with having terrain be a single layer, is with units that are placed "behind" that should look like they are behind.
//  Maybe the fix to that is to either keep the z-index or create a second layer only for the parts of the terrain that may be in front of units (1-2 cells of the relevant shapes)

//  The problem now is that fluid is flowing below terrain. This is bad for performance but also palin wrong.
