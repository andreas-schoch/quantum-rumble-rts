import { Depth, EntityProps, GRID, HALF_GRID, level } from './constants';
import { SimulationState } from './terrain/TerrainSimulation';
import { canPlaceEntityAt, cellIndexAt, computeTerrainElevation, getCellsInRange, getEdgeSpriteTexture } from './util';

export class Previewer {

  textureKeysEdge: Set<string> = new Set();
  previewUnitProps: EntityProps | null = null;
  connectionSprite: Phaser.GameObjects.Sprite;
  unitSprite: Phaser.GameObjects.Sprite;
  rtConnections: Phaser.GameObjects.RenderTexture;
  rtRange: Phaser.GameObjects.RenderTexture;

  constructor(private scene: Phaser.Scene, private state: SimulationState) {
    this.connectionSprite = scene.add.sprite(0, 0, 'cell_white').setDepth(Depth.NETWORK).setOrigin(0, 0.5).setVisible(false);
    this.unitSprite = scene.add.sprite(0, 0, 'cell_white').setDepth(Depth.PREVIEW_UNIT).setOrigin(0, 0.5).setVisible(false);
    this.rtConnections = scene.add.renderTexture(0, 0, level.sizeX * GRID, level.sizeY * GRID).setDepth(Depth.NETWORK).setOrigin(0, 0).setAlpha(0.5).setVisible(false);
    this.rtRange = scene.add.renderTexture(0, 0, level.sizeX * GRID, level.sizeY * GRID).setDepth(Depth.COLLECTION_PREVIEW).setOrigin(0, 0).setAlpha(0.5).setVisible(false);
  }

  previewEntity(xCoord: number | null, yCoord: number | null, unitProps: EntityProps | null) {
    if (xCoord === null || yCoord === null || xCoord < 0 || yCoord < 0 || xCoord >= level.sizeX || yCoord >= level.sizeY) return; // skip out of bounds
    if (unitProps) {
      this.unitSprite.setPosition(xCoord * GRID - GRID, yCoord * GRID + HALF_GRID);
      if (this.previewUnitProps && this.previewUnitProps !== unitProps) this.previewCancel(); // reset because selected unit changed
      this.unitSprite.setTexture(unitProps.uiTextureKey).setVisible(true);
      this.rtRange.setVisible(true);
      this.rtConnections.setVisible(true);
      this.previewUnitProps = unitProps;

      if (canPlaceEntityAt(xCoord, yCoord, this.state)) {
        this.unitSprite.clearTint();
        this.previewConnections(xCoord, yCoord, unitProps);
        this.previewCollectionArea(xCoord, yCoord, unitProps);
        this.previewBlasterAttackRange(xCoord, yCoord, unitProps);
        this.previewMortarAttackRange(xCoord, yCoord, unitProps);
      } else {
        this.unitSprite.setTint(0xff0000);
        this.rtConnections.clear();
        this.rtRange.clear();
        this.connectionSprite.setVisible(false);
      }
    }
  }

  previewCollectionArea(xCoord: number, yCoord: number, unitProps: EntityProps) {
    if (unitProps.collectionRadius === 0) return;
    // All cells in range that are equal in elevation can be collected from
    this.rtRange.clear();
    const cellIndex = cellIndexAt(xCoord, yCoord);
    const centerElevation = computeTerrainElevation(cellIndex, this.state);
    this.rtRange.beginDraw();
    for (const [cell] of getCellsInRange(this.state, xCoord, yCoord, unitProps.collectionRadius, false)) {
      const cellElevation = computeTerrainElevation(cell.cellIndex, this.state);
      const canCollectFrom = cellElevation === centerElevation;
      this.rtRange.batchDraw(canCollectFrom ? 'cell_white' : 'cell_red', cell.x, cell.y);
    }
    this.rtRange.endDraw();
  }

  previewBlasterAttackRange(xCoord: number, yCoord: number, unitProps: EntityProps) {
    // All cells in range that are equal or lower in elevation can be attacked
    // (My version is simplified, the actual game does a line of sight check. Will eventually switch to that)
    if (unitProps.unitName !== 'Blaster') return;
    this.rtRange.clear();
    const cellIndex = cellIndexAt(xCoord, yCoord);
    const centerElevation = computeTerrainElevation(cellIndex, this.state);
    this.rtRange.beginDraw();
    for (const [cell] of getCellsInRange(this.state, xCoord, yCoord, unitProps.attackRadius, false)) {
      const cellElevation = computeTerrainElevation(cell.cellIndex, this.state);
      const canAttack = cellElevation <= centerElevation;
      this.rtRange.batchDraw(canAttack ? 'cell_white' : 'cell_red', cell.x, cell.y);
    }
    this.rtRange.endDraw();
  }

  previewMortarAttackRange(xCoord: number, yCoord: number, unitProps: EntityProps) {
    // All cells in range can be attacked regardless of elevation
    if (unitProps.unitName !== 'Mortar') return;
    this.rtRange.clear();
    this.rtRange.beginDraw();
    for (const [cell] of getCellsInRange(this.state, xCoord, yCoord, unitProps.attackRadius, false)) {
      this.rtRange.batchDraw('cell_white', cell.x, cell.y);
    }
    this.rtRange.endDraw();
  }

  previewCancel() {
    this.rtConnections.clear().setVisible(false);
    this.rtRange.clear().setVisible(false);
    this.connectionSprite.setVisible(false);
    this.unitSprite.setVisible(false);
    this.previewUnitProps = null;
  }

  private previewConnections(coordX: number, coordY: number, previewUnitProps: EntityProps) {
    this.rtConnections.clear();
    this.rtConnections.beginDraw();
    for (const [cell, distance] of getCellsInRange(this.state, coordX, coordY, previewUnitProps.connectionRadius, false)) {
      if (!cell.ref) continue;
      if (!cell.ref.props.isRelay && !previewUnitProps.isRelay) continue; // non-relay structures cannot connect to each other
      if (distance > cell.ref.props.connectionRadius) continue; // won't connect if neighbour has a smaller connection range
      this.connectionSprite.setPosition(coordX * GRID + HALF_GRID, coordY * GRID + HALF_GRID);
      const euclideanDistance = Math.sqrt(Math.pow(this.connectionSprite.x - cell.ref.x, 2) + Math.pow(this.connectionSprite.y - cell.ref.y, 2));
      if (Math.round(euclideanDistance) === 0) continue;
      this.connectionSprite.setTexture(getEdgeSpriteTexture(this.scene, euclideanDistance)).setTint(0x00ff00);
      this.connectionSprite.setRotation(Math.atan2(cell.ref.y - this.connectionSprite.y, cell.ref.x - this.connectionSprite.x));
      this.rtConnections.batchDraw(this.connectionSprite);
    }
    this.rtConnections.endDraw();
    this.connectionSprite.setVisible(false);
  }
}
