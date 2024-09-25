import { DensityData, MarchingSquares } from './MarchingSquares';

import { config, DEBUG, FLOW_DISABLED, GRID, level, SPACE_BETWEEN, THRESHOLD } from '../constants';
import { GameObjects } from 'phaser';
import GameScene from '../scenes/GameScene';
import { getVisibleBounds } from '../util';

// Reusing the same object to minimize Garbage Collection
const densityData: DensityData = [0, 0, 0, 0];
const densityDataTerrain: DensityData = [0, 0, 0, 0];

export class TerrainRenderer {
  private readonly scene: GameScene;
  // private readonly terrainGraphics: Map<number, GameObjects.Graphics> = new Map();
  readonly marchingSquares: MarchingSquares;
  private texts: GameObjects.Text[];
  private fluidToTerrainAbove: Record<number, number> = {};
  private renderTexture: Phaser.GameObjects.RenderTexture;
  private renderTextureFluid: Phaser.GameObjects.RenderTexture;
  private previousShapes: Uint8ClampedArray;

  constructor(scene: GameScene, private readonly terrainData: Uint16Array, private readonly fluidData: Uint16Array, private readonly collectionData: Uint16Array) {
    this.scene = scene;

    this.marchingSquares = new MarchingSquares();
    this.renderTexture = this.scene.make.renderTexture({x: 0, y: 0, width: level.sizeX * GRID, height: level.sizeY * GRID}, true).setDepth(1).setOrigin(0, 0);
    this.renderTextureFluid = this.scene.make.renderTexture({x: 0, y: 0, width: level.sizeX * GRID, height: level.sizeY * GRID}, true).setDepth(2).setOrigin(0, 0);
    // config.fluidLayers.forEach(({elevation, depth, color, alpha}) => this.terrainGraphics.set(elevation, this.scene.add.graphics().setAlpha(1).setDepth(depth).fillStyle(color, alpha)));
    // this.collectionGraphics = this.scene.add.graphics().setDepth(10000).fillStyle(0x000000, 1);

    // this.texts = Array.from({ length: (level.sizeX + 1) * (level.sizeY + 1) }, () => scene.add.text(0, 0, '', { fontSize: '12px', color: '#000' }).setDepth(10000));
    // for (let y = 0; y <= level.sizeY; y++) {
    //   for (let x = 0; x <= level.sizeX; x++) {
    //     const indexCenter = y * (level.sizeX + 1) + x;
    //     const value = this.fluidData[indexCenter];
    //     this.texts[indexCenter].setPosition(x * GRID, y * GRID);
    //     this.texts[indexCenter].setText(value.toString());
    //   }
    // }

    const terrainThickness = THRESHOLD * 3;
    for (const fluidLayer of config.fluidLayers) {
      const floored = Math.floor(fluidLayer.elevation / terrainThickness) * terrainThickness;
      this.fluidToTerrainAbove[fluidLayer.elevation] = floored + terrainThickness;
    }

    this.generateLayers();
    this.renderTerrain();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(tickCounter: number) {
    if (FLOW_DISABLED) return;
    this.renderFluid();
    if (DEBUG.showFluidDensityText) this.renderDebug();
  }

  private renderTerrain() {
    // console.time('renderTerrain');
    // BOTTOM LAYER
    const graphics = this.scene.add.graphics().setDepth(1);
    const BASE_TERRAIN_COLOR = 0x544741;
    graphics.fillStyle(BASE_TERRAIN_COLOR, 1);
    graphics.fillRect(0, 0, level.sizeX * GRID, level.sizeY * GRID);
    // ELEVATION LAYERS
    this.renderTexture.beginDraw();
    this.renderTexture.batchDraw(graphics, 0, 0, 1);
    for (const { elevation, color, depth} of config.terrainLayers) {
      // const layer = this.scene.tilemap.getLayer('terrain_' + elevation);
      // if (!layer) throw new Error('layer is null');
      // graphics = this.scene.add.graphics().setDepth(depth);
      // graphics.lineStyle(2, 0x000000).fillStyle(color, 1); // .setAlpha(0.5);
      for (let y = 0; y < level.sizeY; y++) {
        for (let x = 0; x < level.sizeX; x++) {
          const indexTL = y * (level.sizeX + 1) + x;
          const indexBL = indexTL + level.sizeX + 1;
          const indexTR = indexTL + 1;
          const indexBR = indexBL + 1;

          densityData[0] = this.terrainData[indexTL];
          densityData[1] = this.terrainData[indexTR];
          densityData[2] = this.terrainData[indexBR];
          densityData[3] = this.terrainData[indexBL];

          const shapeIndexAbove = this.marchingSquares.getShapeIndex(densityData, elevation + (THRESHOLD * 3));
          if (shapeIndexAbove === 15) continue; // prevent drawing invisible terrain

          const shape = this.marchingSquares.getShapeIndex(densityData, elevation);
          // layer.tilemapLayer.putTileAt(shape, x, y, false);
          // this.renderAt(x * GRID, y * GRID, densityData, elevation, graphics);
          this.renderTexture.batchDrawFrame('terrain_' + elevation, shape, x * GRID, y * GRID, 1);
        }
      }
    }

    this.renderTexture.endDraw();
    graphics.destroy();
    // console.timeEnd('renderTerrain');

    // graphics = this.scene.add.graphics().setDepth(config.terrainLayers.at(-1)?.depth || 0);
    // graphics.fillStyle(0x333333, 1); // matching camera background
    // graphics.fillRect(0, level.sizeY * GRID, level.sizeX * GRID, GRID).setDepth(config.terrainLayers.at(-1)?.depth || 0);
    // graphics.fillRect(level.sizeX * GRID, 0, GRID,level.sizeY * GRID + GRID).setDepth(config.terrainLayers.at(-1)?.depth || 0);
  }

  // Alternative way to render using tilemap. Keeping it for now. Probably gonna get removed as render texture and even graphics seem better for my usecase
  // private renderFluid(): void {
  //   console.time('fluid rendering');
  //   this.renderTextureFluid.clear();
  //   this.renderTextureFluid.beginDraw();
  //   const bounds = getVisibleBounds(this.scene);
  //   if (!bounds) return;

  //   // reduce the amount of rendering by only rendering the visible area
  //   const startX = Math.max(bounds.coordX, 0);
  //   const startY = Math.max(bounds.coordY, 0);
  //   const endY = Math.min(bounds.coordY + bounds.numCoordsY, level.sizeY);
  //   const endX = Math.min(bounds.coordX + bounds.numCoordsX, level.sizeX);

  //   const fluid = this.fluidData;
  //   const terrain = this.terrainData;
  //   const prev = this.previousShapes;
  //   const rowOffset = level.sizeX + 1;

  //   for (const {color, alpha, elevation} of config.fluidLayers) {
  //     // const layerData = this.scene.tilemap.getLayer('fluid_' + elevation);
  //     // if (!layerData) throw new Error('layer is null');
  //     // const layer = layerData.tilemapLayer;
  //     // const terrainThresholdAbove = this.fluidToTerrainAbove[elevation];
  //     // const layerGraphics = this.terrainGraphics.get(elevation);
  //     // if (!layerGraphics) throw new Error('no graphics');
  //     // layerGraphics.clear().fillStyle(color, alpha);

  //     for (let y = startY; y <= endY; y++) {
  //       for (let x = startX; x <= endX; x++) {
  //         const indexTL = y * rowOffset + x;
  //         const indexBL = indexTL + rowOffset;
  //         const indexTR = indexTL + 1;
  //         const indexBR = indexBL + 1;

  //         const fluidTL = fluid[indexTL];
  //         const fluidTR = fluid[indexTR];
  //         const fluidBR = fluid[indexBR];
  //         const fluidBL = fluid[indexBL];

  //         densityData[0] = (fluidTL >= THRESHOLD) ? fluidTL + terrain[indexTL] : fluidTL;
  //         densityData[1] = (fluidTR >= THRESHOLD) ? fluidTR + terrain[indexTR] : fluidTR;
  //         densityData[2] = (fluidBR >= THRESHOLD) ? fluidBR + terrain[indexBR] : fluidBR;
  //         densityData[3] = (fluidBL >= THRESHOLD) ? fluidBL + terrain[indexBL] : fluidBL;
  //         const shape = this.marchingSquares.getShapeIndex(densityData, elevation);

  //         if (shape === 0) continue;
  //         this.renderTextureFluid.batchDrawFrame('fluid_' + elevation, shape, x * GRID, y * GRID);

  //         // // const shapeIndexAbove = this.marchingSquares.getShapeIndex(densityData, elevation + (THRESHOLD * 3));
  //         // // if (shapeIndexAbove === 15) {
  //         // //   layer.removeTileAt(x, y, true, false);
  //         // //   continue;
  //         // // }
  //         // const tile = layer.getTileAt(x, y);
  //         // if (tile && tile.index === shape) continue;
  //         // densityData[0] = terrain[indexTL];
  //         // densityData[1] = terrain[indexTR];
  //         // densityData[2] = terrain[indexBR];
  //         // densityData[3] = terrain[indexBL];
  //         // const shapeTerrainAbove = this.marchingSquares.getShapeIndex(densityData, terrainThresholdAbove);
  //         // if (shapeTerrainAbove === 15) {
  //         //   layer.removeTileAt(x, y, true, false);
  //         //   continue;
  //         // }
  //         // // IMPORTANT: for removeTileAt() keep "replaceWithNull" param true. Otherwise slower and uses more memory
  //         // if (shape === 0) layer.removeTileAt(x, y, true, false);
  //         // else layer.putTileAt(shape, x, y, false);

  //         // this.renderAt(x * GRID, y * GRID, densityData, elevation, layerGraphics, true);
  //       }
  //     }
  //   }
  //   this.renderTextureFluid.endDraw();
  //   console.timeEnd('fluid rendering');
  // }

  private renderFluid(): void {
    // console.time('fluid rendering');
    this.renderTextureFluid.clear();
    this.renderTextureFluid.beginDraw();
    const bounds = getVisibleBounds(this.scene);
    if (!bounds) return;

    // reduce the amount of rendering by only rendering the visible area
    const startX = Math.max(bounds.coordX, 0);
    const startY = Math.max(bounds.coordY, 0);
    const endY = Math.min(bounds.coordY + bounds.numCoordsY, level.sizeY);
    const endX = Math.min(bounds.coordX + bounds.numCoordsX, level.sizeX);

    const fluid = this.fluidData;
    const terrain = this.terrainData;
    const prev = this.previousShapes;
    const rowOffset = level.sizeX + 1;

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const indexTL = y * rowOffset + x;
        const indexBL = indexTL + rowOffset;
        const indexTR = indexTL + 1;
        const indexBR = indexBL + 1;

        const fluidTL = fluid[indexTL];
        const fluidTR = fluid[indexTR];
        const fluidBR = fluid[indexBR];
        const fluidBL = fluid[indexBL];

        densityData[0] = (fluidTL >= THRESHOLD) ? fluidTL + terrain[indexTL] : fluidTL;
        densityData[1] = (fluidTR >= THRESHOLD) ? fluidTR + terrain[indexTR] : fluidTR;
        densityData[2] = (fluidBR >= THRESHOLD) ? fluidBR + terrain[indexBR] : fluidBR;
        densityData[3] = (fluidBL >= THRESHOLD) ? fluidBL + terrain[indexBL] : fluidBL;

        densityDataTerrain[0] = terrain[indexTL];
        densityDataTerrain[1] = terrain[indexTR];
        densityDataTerrain[2] = terrain[indexBR];
        densityDataTerrain[3] = terrain[indexBL];

        const posX = x * GRID;
        const posY = y * GRID;

        for (const {color, alpha, elevation} of config.fluidLayers) {
          const shape = this.marchingSquares.getShapeIndex(densityData, elevation);
          if (shape === 0) break;

          const shapeTerrainAbove = this.marchingSquares.getShapeIndex(densityDataTerrain, this.fluidToTerrainAbove[elevation]);
          if (shapeTerrainAbove === 15) continue;
          this.renderTextureFluid.batchDrawFrame('fluid_' + elevation, shape, posX, posY);
        }
      }
    }
    this.renderTextureFluid.endDraw();
    // console.timeEnd('fluid rendering');
  }

  private renderAt(x: number, y: number, densityData: DensityData, threshold,  graphics: GameObjects.Graphics, renderLines = true): void {
    const { polygons, isoLines, index: shapeIndex } = this.marchingSquares.getSquareGeomData(densityData, threshold);

    if (shapeIndex === 0) return; // not drawing empty square
    // if (shapeIndex === 15) return;

    graphics.translateCanvas(x, y);
    if (shapeIndex === 15) {
      graphics.fillRect(0, 0, GRID, GRID);
    } else {
      for (const points of polygons) graphics.fillPoints(points, true);
      if (renderLines) for (const { p1, p2, c, lw } of isoLines) graphics.lineStyle(lw, c).lineBetween(p1.x, p1.y, p2.x, p2.y);
    }
    graphics.translateCanvas(-x, -y);
  }

  private generateLayers() {

    // TERRAIN
    for (const {elevation, depth, color} of config.terrainLayers) {
      const key = 'terrain_' + elevation;
      this.generateTexture(key, color, 4, SPACE_BETWEEN);
      // const tileset = this.scene.tilemap.addTilesetImage(key, key, GRID, GRID, 0, SPACE_BETWEEN, 0);
      // if (!tileset) throw new Error('tileset is null');

      // const layer = this.scene.tilemap.createBlankLayer(key, tileset);
      // if (!layer) throw new Error('layer is null');
      // layer.setDepth(depth);
    }

    // FLUID
    for (const {elevation, depth, color, alpha} of config.fluidLayers) {
      const name = 'fluid_' + elevation;
      this.generateTexture(name, 0x4081b7, 0.4, SPACE_BETWEEN);
      // const tileset = this.scene.tilemap.addTilesetImage(name, name, GRID, GRID, 0, SPACE_BETWEEN, 0);
      // if (!tileset) throw new Error('tileset is null');

      // const layer = this.scene.tilemap.createBlankLayer(name, tileset);
      // if (!layer) throw new Error('layer is null');
      // layer.setDepth(depth);
    }
  }

  private generateTexture(key: string, color: number, alpha: number = 1, spaceBetween: number = 2) {
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
          for (const { p1, p2, c, lw } of shape.isoLines) graphics.lineStyle(lw, c).lineBetween(p1.x, p1.y, p2.x, p2.y);
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

  private renderDebug() {
    if (!this.texts) {
      this.texts = Array.from({ length: (level.sizeX + 1) * (level.sizeY + 1) }, () => this.scene.add.text(0, 0, '', { fontSize: '12px', color: '#000' }).setDepth(10000));
      for (let y = 0; y <= level.sizeY; y++) {
        for (let x = 0; x <= level.sizeX; x++) {
          const indexCenter = y * (level.sizeX + 1) + x;
          const value = this.fluidData[indexCenter];
          this.texts[indexCenter].setPosition(x * GRID, y * GRID);
          this.texts[indexCenter].setText(value.toString());
        }
      }
    }

    for (let y = 0; y <= level.sizeY; y++) {
      for (let x = 0; x <= level.sizeX; x++) {
        const indexCenter = y * (level.sizeX + 1) + x;
        const value = this.fluidData[indexCenter];
        this.texts[indexCenter].setText(value.toString());
      }
    }
  }
}
