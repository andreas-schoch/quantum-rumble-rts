import { MarchingSquares } from './MarchingSquares';

import { config, Depth, GRID, level, SPACE_BETWEEN, THRESHOLD } from '../constants';
import GameScene from '../scenes/GameScene';
import { getVisibleBounds } from '../util';
import { Cell, RenderingAdapter } from './TerrainSimulation';

export class PhaserRenderer implements RenderingAdapter {
  readonly marchingSquares: MarchingSquares;
  private fluidToTerrainAbove: Record<number, number> = {};

  private rtTerrain: Phaser.GameObjects.RenderTexture;
  private rtFluid: Phaser.GameObjects.RenderTexture;
  private rtCollection: Phaser.GameObjects.RenderTexture;

  constructor(private scene: GameScene) {
    const width = level.sizeX * GRID;
    const height = level.sizeY * GRID;
    this.rtTerrain = this.scene.make.renderTexture({x: 0, y: 0, width, height}, true).setDepth(Depth.TERRAIN).setOrigin(0, 0);
    this.rtCollection = this.scene.make.renderTexture({x: 0, y: 0, width, height}, true).setDepth(Depth.Collection).setOrigin(0, 0);
    this.rtFluid = this.scene.make.renderTexture({x: 0, y: 0, width, height}, true).setDepth(Depth.FLUID).setOrigin(0, 0);
    this.marchingSquares = new MarchingSquares();

    const terrainThickness = THRESHOLD * 3;
    for (const fluidLayer of config.fluidLayers) {
      const floored = Math.floor(fluidLayer.elevation / terrainThickness) * terrainThickness;
      this.fluidToTerrainAbove[fluidLayer.elevation] = floored + terrainThickness;
    }

    this.generateLayers();
  }

  renderTerrain(world: Cell[], terrainData: Uint16Array) {
    // console.time('renderTerrain');
    // BOTTOM LAYER
    const graphics = this.scene.add.graphics();
    const BASE_TERRAIN_COLOR = 0x544741;
    graphics.fillStyle(BASE_TERRAIN_COLOR, 1);
    graphics.fillRect(0, 0, level.sizeX * GRID, level.sizeY * GRID);
    // ELEVATION LAYERS
    this.rtTerrain.beginDraw();
    this.rtTerrain.batchDraw(graphics, 0, 0, 1);

    for (const {elevation} of config.terrainLayers) {
      const key = 'terrain_' + elevation;
      const terrainElevationAbove = elevation + THRESHOLD * 3;
      for (const {edgeIndexTL, edgeIndexTR, edgeIndexBL, edgeIndexBR, x, y} of world) {

        const tl = terrainData[edgeIndexTL];
        const tr = terrainData[edgeIndexTR];
        const br = terrainData[edgeIndexBR];
        const bl = terrainData[edgeIndexBL];

        const shapeIndexAbove = this.marchingSquares.getShapeIndex(tl, tr, br, bl, terrainElevationAbove);
        if (shapeIndexAbove === 15) continue; // prevent drawing invisible terrain

        const shape = this.marchingSquares.getShapeIndex(tl, tr, br, bl, elevation);
        this.rtTerrain.batchDrawFrame(key, shape, x, y, 1);
      }
    }

    this.rtTerrain.endDraw();
    graphics.destroy();
  }

  renderCollectionArea(world: Cell[], cd: Uint8Array) {
    this.rtCollection.clear();
    this.rtCollection.beginDraw();
    for (const {edgeIndexTL, edgeIndexTR, edgeIndexBL, edgeIndexBR, xCoord, yCoord} of world) {
      const shape = this.marchingSquares.getShapeIndex(cd[edgeIndexTL], cd[edgeIndexTR], cd[edgeIndexBR], cd[edgeIndexBL], 1);
      if (shape === 0) continue;
      this.rtCollection.batchDrawFrame('collection_area', shape, xCoord * GRID, yCoord * GRID);
    }
    this.rtCollection.endDraw();
  }

  renderFluid(world: Cell[], fluid: Uint16Array, terrain: Uint16Array): void {
    // console.time('renderFluid');
    this.rtFluid.clear();
    this.rtFluid.setBlendMode(Phaser.BlendModes.NORMAL);
    this.rtFluid.beginDraw();
    const bounds = getVisibleBounds(this.scene);
    if (!bounds) return;

    // reduce the amount of rendering by only rendering the visible area
    const startX = Math.max(bounds.coordX, 0);
    const startY = Math.max(bounds.coordY, 0);
    const endY = Math.min(bounds.coordY + bounds.numCoordsY, level.sizeY);
    const endX = Math.min(bounds.coordX + bounds.numCoordsX, level.sizeX);

    const rowOffset = level.sizeX + 1;

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const cell = world[y * rowOffset + x];
        const terrainTL = terrain[cell.edgeIndexTL];
        const terrainTR = terrain[cell.edgeIndexTR];
        const terrainBR = terrain[cell.edgeIndexBR];
        const terrainBL = terrain[cell.edgeIndexBL];

        let fluidTL = fluid[cell.edgeIndexTL];
        let fluidTR = fluid[cell.edgeIndexTR];
        let fluidBR = fluid[cell.edgeIndexBR];
        let fluidBL = fluid[cell.edgeIndexBL];

        if (fluidTL >= THRESHOLD) fluidTL += terrain[cell.edgeIndexTL];
        if (fluidTR >= THRESHOLD) fluidTR += terrain[cell.edgeIndexTR];
        if (fluidBR >= THRESHOLD) fluidBR += terrain[cell.edgeIndexBR];
        if (fluidBL >= THRESHOLD) fluidBL += terrain[cell.edgeIndexBL];

        let shapeBelow = -1;
        for (const {elevation} of config.fluidLayers) {
          const shape = this.marchingSquares.getShapeIndex(fluidTL, fluidTR, fluidBR, fluidBL, elevation);
          if (shape === 0) break; // above layers will also be empty if this one is
          // const omitLines = shapeBelow !== 15 &&
          //                   (shapeBelow === shape) ||
          //                   (shapeBelow === 9 && shape === 1 || shape === 8) ||
          //                   (shapeBelow === 12 && shape === 4 || shape === 8);

          const omitLines = shapeBelow === shape;

          const shapeTerrainAbove = this.marchingSquares.getShapeIndex(terrainTL, terrainTR, terrainBR, terrainBL, this.fluidToTerrainAbove[elevation]);
          if (shapeTerrainAbove === 15) continue; // no need to render if there is terrain higher than the fluid
          const key = omitLines ? 'fluid_' + elevation + '_noline' : 'fluid_' + elevation;
          this.rtFluid.batchDrawFrame(key, shape, cell.x, cell.y);
          // this.rtFluid.batchDrawFrame('fluid_' + elevation, shape, posX, posY);
          shapeBelow = shape;
        }
      }
    }
    this.rtFluid.endDraw();
    // console.timeEnd('renderFluid');
  }

  private generateLayers() {
    this.marchingSquares.computeShapeTable(GRID / 4, GRID / 8, 0x000000, 0xffffff);
    for (const {elevation, color} of config.terrainLayers) {
      const key = 'terrain_' + elevation;
      this.generateTexture(key, color, 4, SPACE_BETWEEN);
      this.generateTexture(key + '_noline', color, 4, SPACE_BETWEEN, false);
    }

    this.marchingSquares.computeShapeTable(GRID / 16, GRID / 16, 0x000000, 0xffffff, GRID / 8);
    for (const {elevation, color, alpha} of config.fluidLayers) {
      const key = 'fluid_' + elevation;
      this.generateTexture(key, color, alpha, SPACE_BETWEEN);
      this.generateTexture(key + '_noline', color, alpha, SPACE_BETWEEN, false);
    }

    this.marchingSquares.computeShapeTable(0, 0, 0, 0, GRID / 8);
    this.generateTexture('collection_area', 0x1a8f1e, 0.3, SPACE_BETWEEN);
  }

  private generateTexture(key: string, color: number, alpha: number = 1, spaceBetween: number = 2, renderLines = true) {
    const graphics = this.scene.add.graphics().fillStyle(color, alpha);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const shapeIndex = y * 4 + x;
        const shape = this.marchingSquares.shapeByIndex[shapeIndex];
        const offsetX = x * (GRID + spaceBetween);
        const offsetY = y * (GRID + spaceBetween);
        graphics.translateCanvas(offsetX, offsetY);
        if (shapeIndex === 15) {
          graphics.fillRect(0, 0, GRID, GRID);
        } else {
          for (const points of shape.polygons) graphics.fillPoints(points, true);
          if (renderLines) for (const { p1, p2, c, lw } of shape.isoLines) graphics.lineStyle(lw, c).lineBetween(p1.x, p1.y, p2.x, p2.y);
        }
        graphics.translateCanvas(-offsetX, -offsetY);
      }
    }

    const size = (GRID * 4) + (3 * spaceBetween);
    graphics.generateTexture(key, size, size);
    graphics.destroy();

    // Add all marching square shapes as frames to the texture
    const texture = this.scene.textures.get(key);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const shapeIndex = y * 4 + x;
        const offsetX = x * (GRID + SPACE_BETWEEN);
        const offsetY = y * (GRID + SPACE_BETWEEN);
        texture.add(shapeIndex, 0, offsetX, offsetY, GRID, GRID);
      }
    }
  }
}
