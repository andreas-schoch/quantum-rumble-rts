import { Depth, EntityProps, GRID, HALF_GRID, level } from './constants';
import { SimulationState } from './terrain/TerrainSimulation';
import { canPlaceEntityAt, cellIndexAt, computeTerrainElevation, getCellsInRange, getEdgeSpriteTexture } from './util';

export class Previewer {

  renderTexture: Phaser.GameObjects.RenderTexture;
  textureKeysEdge: Set<string> = new Set();
  previewEdgeSprite: Phaser.GameObjects.Sprite;
  previewUnitSprite: Phaser.GameObjects.Sprite;
  previewUnitProps: EntityProps | null = null;
  previewEdgeRenderTexture: Phaser.GameObjects.RenderTexture;
  previewCollectionAreaRenderTexture: Phaser.GameObjects.RenderTexture;

  constructor(private scene: Phaser.Scene, private state: SimulationState) {
    this.previewEdgeSprite = scene.add.sprite(0, 0, 'cell_white').setDepth(Depth.NETWORK).setOrigin(0, 0.5);
    this.previewUnitSprite = scene.add.sprite(0, 0, 'cell_white').setDepth(Depth.PREVIEW_UNIT).setOrigin(0, 0.5);
    this.previewEdgeRenderTexture = scene.add.renderTexture(0, 0, level.sizeX * GRID, level.sizeY * GRID).setDepth(Depth.NETWORK).setOrigin(0, 0).setAlpha(0.5);
    this.previewCollectionAreaRenderTexture = scene.add.renderTexture(0, 0, level.sizeX * GRID, level.sizeY * GRID).setDepth(Depth.COLLECTION_PREVIEW).setOrigin(0, 0).setAlpha(0.5);
    this.previewEdgeSprite.setVisible(false);
  }

  previewEntity(xCoord: number | null, yCoord: number | null, unitProps: EntityProps | null) {
    if (xCoord === null || yCoord === null || xCoord < 0 || yCoord < 0 || xCoord >= level.sizeX || yCoord >= level.sizeY) return; // skip out of bounds
    if (unitProps) {
      this.previewUnitSprite.setPosition(xCoord * GRID - GRID, yCoord * GRID + HALF_GRID);
      if (this.previewUnitProps && this.previewUnitProps !== unitProps) this.previewCancel(); // reset because selected unit changed
      this.previewUnitSprite.setTexture(unitProps.uiTextureKey).setVisible(true);
      this.previewUnitProps = unitProps;

      if (canPlaceEntityAt(xCoord, yCoord, this.state)) {
        this.previewUnitSprite.clearTint();
        this.previewConnections(xCoord, yCoord, unitProps);
        this.previewCollectionArea(xCoord, yCoord, unitProps);
      } else {
        this.previewUnitSprite.setTint(0xff0000);
        this.previewEdgeRenderTexture.clear();
        this.previewCollectionAreaRenderTexture.clear();
        this.previewEdgeSprite.setVisible(false);
      }
    }
  }
  previewCollectionArea(xCoord: number, yCoord: number, unitProps: EntityProps) {
    this.previewCollectionAreaRenderTexture.clear();
    const cellIndex = cellIndexAt(xCoord, yCoord);
    const centerElevation = computeTerrainElevation(cellIndex, this.state);
    this.previewCollectionAreaRenderTexture.beginDraw();
    for (const [cell] of getCellsInRange(this.state, xCoord, yCoord, unitProps.collectionRadius, false)) {
      const cellElevation = computeTerrainElevation(cell.cellIndex, this.state);
      const canCollectFrom = cellElevation === centerElevation;
      this.previewCollectionAreaRenderTexture.batchDraw(canCollectFrom ? 'cell_white' : 'cell_red', cell.x, cell.y);
    }
    this.previewCollectionAreaRenderTexture.endDraw();
  }

  previewCancel() {
    this.previewEdgeRenderTexture.clear();
    this.previewCollectionAreaRenderTexture.clear();
    this.previewEdgeSprite.setVisible(false);
    this.previewUnitSprite.setVisible(false);
  }

  private previewConnections(coordX: number, coordY: number, previewUnitProps: EntityProps) {
    this.previewEdgeRenderTexture.clear();
    this.previewEdgeRenderTexture.beginDraw();
    for (const [cell, distance] of getCellsInRange(this.state, coordX, coordY, previewUnitProps.connectionRadius, false)) {
      if (!cell.ref) continue;
      if (!cell.ref.props.isRelay && !previewUnitProps.isRelay) continue; // non-relay structures cannot connect to each other
      if (distance > cell.ref.props.connectionRadius) continue; // won't connect if neighbour has a smaller connection range
      this.previewEdgeSprite.setPosition(coordX * GRID + HALF_GRID, coordY * GRID + HALF_GRID);
      const euclideanDistance = Math.sqrt(Math.pow(this.previewEdgeSprite.x - cell.ref.x, 2) + Math.pow(this.previewEdgeSprite.y - cell.ref.y, 2));
      if (Math.round(euclideanDistance) === 0) continue;
      this.previewEdgeSprite.setTexture(getEdgeSpriteTexture(this.scene, euclideanDistance)).setTint(0x00ff00);
      this.previewEdgeSprite.setRotation(Math.atan2(cell.ref.y - this.previewEdgeSprite.y, cell.ref.x - this.previewEdgeSprite.x));
      this.previewEdgeRenderTexture.batchDraw(this.previewEdgeSprite);
    }
    this.previewEdgeRenderTexture.endDraw();
    this.previewEdgeSprite.setVisible(false);
  }
}
