import { DensityData, MarchingSquares } from './MarchingSquares';

import { config, GRID, level, THRESHOLD } from '../constants';
import { GameObjects, Scene } from 'phaser';
import GameScene from '../scenes/GameScene.js';

// Reusing the same objects to minimize Garbage Collection
const densityDataTerrainAbove: DensityData = [0, 0, 0, 0];
// const densityDataFluidAbove: DensityData = [0, 0, 0, 0];
const densityDataTerrain: DensityData = [0, 0, 0, 0];
const densityDataFluid: DensityData = [0, 0, 0, 0];

export class TerrainRenderer {
  private readonly scene: Scene;
  private readonly terrainGraphics: Map<number, GameObjects.Graphics> = new Map();
  private readonly marchingSquares: MarchingSquares;
  private texts: GameObjects.Text[];

  constructor(scene: GameScene, private readonly terrainData: Uint16Array, private readonly fluidData: Uint16Array) {
    this.scene = scene;
    this.marchingSquares = new MarchingSquares({ squareSize: GRID });
    this.initTerrain();
    config.fluidLayerThresholds.forEach(({elevation, depth, color, alpha}) => this.terrainGraphics.set(elevation, this.scene.add.graphics().setAlpha(1).setDepth(depth).fillStyle(color, alpha)));

    // this.texts = Array.from({ length: (level.sizeX + 1) * (level.sizeY + 1) }, () => scene.add.text(0, 0, '', { fontSize: '12px', color: '#000' }).setDepth(10000));
    // for (let y = 0; y <= level.sizeY; y++) {
    //   for (let x = 0; x <= level.sizeX; x++) {
    //     const indexCenter = y * (level.sizeX + 1) + x;
    //     const value = this.fluidData[indexCenter];
    //     this.texts[indexCenter].setPosition(x * GRID, y * GRID);
    //     this.texts[indexCenter].setText(value.toString());
    //   }
    // }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(tickCounter: number) {
    console.time('terrain rendering');
    const bounds = this.getVisibleBounds();
    if (!bounds) return;

    const endY = bounds.coordY + bounds.numCoordsY;
    const endX = bounds.coordX + bounds.numCoordsX;

    for (const conf of config.fluidLayerThresholds) {
      const g = this.terrainGraphics.get(conf.elevation);
      if (!g) throw new Error('no graphics');
      g.clear().fillStyle(conf.color, conf.alpha);
      for (let y = bounds.coordY; y <= endY; y++) {
        for (let x = bounds.coordX; x <= endX; x++) {
          if (x < 0 || y < 0 || x >= level.sizeX || y >= level.sizeY) continue;
          this.renderFluidAt(x, y, conf.elevation, g);
        }
      }
    }
    console.timeEnd('terrain rendering');

    // for (let y = 0; y <= level.sizeY; y++) {
    //   for (let x = 0; x <= level.sizeX; x++) {
    //     const indexCenter = y * (level.sizeX + 1) + x;
    //     const value = this.fluidData[indexCenter];
    //     this.texts[indexCenter].setText(value.toString());
    //   }
    // }
  }

  private initTerrain() {
    // TODO find more optimal way to display terrain. Static render textures have HORRIBLE performance when creeper graphics is underflowing it.
    // BOTTOM LAYER
    let graphics = this.scene.add.graphics().setDepth(1);
    // graphics.setBlendMode(Phaser.BlendModes.OVERLAY);
    const BASE_TERRAIN_COLOR = 0x544741;
    graphics.fillStyle(BASE_TERRAIN_COLOR, 1);
    graphics.fillRect(0, 0, level.sizeX * GRID, level.sizeY * GRID);
    // ELEVATION LAYERS
    for (const { elevation: threshold, color, depth} of config.terrainLayers) {
      graphics = this.scene.add.graphics().setDepth(depth);
      graphics.lineStyle(2, 0x000000).fillStyle(color, 1); // .setAlpha(0.5);
      for (let y = 0; y < level.sizeY; y++) {
        for (let x = 0; x < level.sizeX; x++) {
          this.renderTerrainAt(x, y, threshold, graphics, 0, 0);
        }
      }
    }
    graphics = this.scene.add.graphics().setDepth(config.terrainLayers.at(-1)?.depth || 0);
    graphics.fillStyle(0x333333, 1); // matching camera background
    graphics.fillRect(0, level.sizeY * GRID, level.sizeX * GRID, GRID).setDepth(config.terrainLayers.at(-1)?.depth || 0);
    graphics.fillRect(level.sizeX * GRID, 0, GRID,level.sizeY * GRID + GRID).setDepth(config.terrainLayers.at(-1)?.depth || 0);
  }

  private getVisibleBounds(): CoordBounds | null {
    const { x, y, width, height } = this.scene.cameras.main.worldView;

    const MAX_WIDTH = level.sizeX * GRID;
    const offsetLeftX = x < 0 ? Math.abs(x) : 0;
    const offsetRightX = (width + x) > MAX_WIDTH ? width + x - MAX_WIDTH : 0;
    const numCoordsX = Phaser.Math.Clamp(Math.floor((width - offsetLeftX - offsetRightX) / GRID), 0, level.sizeX - 1) + 2;
    if (numCoordsX <= 0) return null;

    const MAX_HEIGHT = level.sizeY * GRID;
    const offsetLeftY = y < 0 ? Math.abs(y) : 0;
    const offsetRightY = (height + y) > MAX_HEIGHT ? height + y - MAX_HEIGHT : 0;
    const numCoordsY = Phaser.Math.Clamp(Math.floor((height - offsetLeftY - offsetRightY) / GRID), 0, level.sizeY - 1) + 2;
    if (numCoordsY <= 0) return null;

    const coordX = Phaser.Math.Clamp(Math.floor(x / GRID) - 1, 0, level.sizeX - 1);
    const coordY = Phaser.Math.Clamp(Math.floor(y / GRID) - 1, 0, level.sizeY - 1);
    return { coordX, coordY, numCoordsX, numCoordsY };
  }

  private renderTerrainAt(x: number, y: number, threshold: number, graphics: Phaser.GameObjects.Graphics, offsetX = 0, offsetY = 0): void {
    this.setDensityData(x, y, densityDataTerrainAbove);

    const shapeIndexAbove = this.marchingSquares.getShapeIndex(densityDataTerrainAbove, threshold + (THRESHOLD * 3));
    if (shapeIndexAbove === 15) return; // prevent drawing invisible terrain

    const posX = x * GRID + offsetX;
    const posY = y * GRID + offsetY;
    this.setDensityData(x, y, densityDataTerrain);
    this.renderAt(posX, posY, densityDataTerrain, threshold, graphics);
  }

  private renderFluidAt(x: number, y: number, threshold: number, graphics: Phaser.GameObjects.Graphics): void {
    this.setDensityData(x, y, densityDataTerrain, densityDataFluid);
    if (densityDataFluid[0] >= THRESHOLD) densityDataFluid[0] += densityDataTerrain[0];
    if (densityDataFluid[1] >= THRESHOLD) densityDataFluid[1] += densityDataTerrain[1];
    if (densityDataFluid[2] >= THRESHOLD) densityDataFluid[2] += densityDataTerrain[2];
    if (densityDataFluid[3] >= THRESHOLD) densityDataFluid[3] += densityDataTerrain[3];
    this.renderAt(x * GRID, y * GRID, densityDataFluid, threshold, graphics, true);
  }

  private renderAt(x: number, y: number, densityData: DensityData, threshold,  graphics: GameObjects.Graphics, renderLines = true): void {
    const { polygons, isoLines, shapeIndex } = this.marchingSquares.getSquareGeomData(densityData, threshold);

    if (shapeIndex === 0) return; // not drawing empty square

    graphics.translateCanvas(x, y);
    if (shapeIndex === 15) {
      graphics.fillRect(0, 0, GRID, GRID);
    } else {
      for (const points of polygons) graphics.fillPoints(points, true);
      if (renderLines) for (const { p1, p2, c, lw } of isoLines) graphics.lineStyle(lw, c).lineBetween(p1.x, p1.y, p2.x, p2.y);
    }
    graphics.translateCanvas(-x, -y);
  }

  private setDensityData(x: number, y: number, outTerrain: DensityData, outFluid?: DensityData) {
    const indexTL = y * (level.sizeX + 1) + x;
    const indexBL = indexTL + level.sizeX + 1;
    const indexTR = indexTL + 1;
    const indexBR = indexBL + 1;

    outTerrain[0] = this.terrainData[indexTL];
    outTerrain[1] = this.terrainData[indexTR];
    outTerrain[2] = this.terrainData[indexBR];
    outTerrain[3] = this.terrainData[indexBL];

    if (!outFluid) return;
    outFluid[0] = this.fluidData[indexTL];
    outFluid[1] = this.fluidData[indexTR];
    outFluid[2] = this.fluidData[indexBR];
    outFluid[3] = this.fluidData[indexBL];
  }

  private isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < level.sizeX && y < level.sizeY;
  }
}

export interface CoordBounds {
  coordX: number;
  coordY: number;
  numCoordsX: number;
  numCoordsY: number;
}
