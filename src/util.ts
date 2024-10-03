import { GameObjects } from 'phaser';
import { GRID, level, THRESHOLD } from './constants';
import { Cell, SimulationState } from './terrain/TerrainSimulation';

export function getVisibleBounds(scene: Phaser.Scene): {coordX: number, coordY: number, numCoordsX: number, numCoordsY: number} | null {
  const { x, y, width, height } = scene.cameras.main.worldView;

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

export function drawStar(graphics: GameObjects.Graphics, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  graphics.beginPath();
  graphics.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    graphics.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    graphics.lineTo(x, y);
    rot += step;
  }

  graphics.lineTo(cx, cy - outerRadius);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Returns all the cells within the range (euclidean distance) of the origin cell and returns them sorted by nearest first
// For now don't care to optimize as for current usecase it is computed once then cached. If that is not the case anymore try to optimize
export function computeClosestCellIndicesInRange(state: SimulationState, xCoord: number, yCoord: number, radius: number): number[] {
  const cells = getCellsInRange(state, xCoord, yCoord, radius, false);
  cells.sort((a, b) => a[1] - b[1]);
  return cells.map(cell => cell[0].cellIndex);
}

// TODO deduplicate with above
export function getCellsInRange(state: SimulationState, xCoord: number, yCoord: number, radius: number, occupiedOnly = true): [Cell, number][] {
  const startY = Math.max(yCoord - radius, 0);
  const startX = Math.max(xCoord - radius, 0);
  const endY = Math.min(yCoord + radius, level.sizeY);
  const endX = Math.min(xCoord + radius, level.sizeX);

  const cells: [Cell, number][] = [];
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const index = y * (level.sizeX + 1) + x;
      const cell = state.cells[index];

      if (occupiedOnly && !cell.ref) continue; // skip unoccupied cells only when desired
      const distance = Math.sqrt((xCoord - x) ** 2 + (yCoord - y) ** 2);
      if (distance > radius) continue; // skip cells that are out of range
      cells.push([cell, distance]);
    }
  }

  return cells;
}

export function computeTerrainElevation(cellIndex: number, state: SimulationState): number {
  const cell = state.cells[cellIndex];
  const elevationTL = state.terrainData[cell.edgeIndexTL];
  const elevationTR = state.terrainData[cell.edgeIndexTR];
  const elevationBL = state.terrainData[cell.edgeIndexBL];
  const elevationBR = state.terrainData[cell.edgeIndexBR];
  const avgElevation = (elevationTL + elevationTR + elevationBL + elevationBR) / 4;
  return avgElevation;
}

export function computeFluidElevation(cellIndex: number, state: SimulationState): number {
  const cell = state.cells[cellIndex];
  const elevationTL = state.fluidData[cell.edgeIndexTL];
  const elevationTR = state.fluidData[cell.edgeIndexTR];
  const elevationBL = state.fluidData[cell.edgeIndexBL];
  const elevationBR = state.fluidData[cell.edgeIndexBR];
  const avgElevation = (elevationTL + elevationTR + elevationBL + elevationBR) / 4;
  return avgElevation;
}

export function canPlaceEntityAt(coordX: number, coordY: number, state: SimulationState): boolean {
  // Assumes the entity is 3x3 (all are except City atm)
  const cellIndex = coordY * (level.sizeX + 1) + coordX;

  if (coordX < 0 || coordY < 0 || coordX >= level.sizeX || coordY >= level.sizeY) return false; // skip out of bounds

  // Can only place when terrain at center is "flat"
  const terrainElevation = computeTerrainElevation(cellIndex, state);
  if (terrainElevation % (THRESHOLD * 3) !== 0) return false;

  // Can only place on cells not occupied by other entities
  const centerCell = state.cells[cellIndex];
  if (centerCell.ref !== null) return false;

  // Can only place if all 8 surrounding cells are empty
  if (centerCell.cellIndexTop !== null && state.cells[centerCell.cellIndexTop].ref) return false;
  if (centerCell.cellIndexLeft !== null && state.cells[centerCell.cellIndexLeft].ref) return false;
  if (centerCell.cellIndexRight !== null && state.cells[centerCell.cellIndexRight].ref) return false;
  if (centerCell.cellIndexBottom !== null && state.cells[centerCell.cellIndexBottom].ref) return false;
  if (centerCell.cellIndexTopLeft !== null && state.cells[centerCell.cellIndexTopLeft].ref) return false;
  if (centerCell.cellIndexTopRight !== null && state.cells[centerCell.cellIndexTopRight].ref) return false;
  if (centerCell.cellIndexBottomLeft !== null && state.cells[centerCell.cellIndexBottomLeft].ref) return false;
  if (centerCell.cellIndexBottomRight !== null && state.cells[centerCell.cellIndexBottomRight].ref) return false;
  return true;
}

const textureKeysEdge = new Set<string>();
export function getEdgeSpriteTexture(scene: Phaser.Scene, euclideanDistance: number): string {
  const key = `line-${Math.round(euclideanDistance)}`;
  if (!textureKeysEdge.has(key)) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(0, 0, euclideanDistance, 6);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0 + 2, euclideanDistance, 2);
    graphics.generateTexture(key, euclideanDistance, 6);
    graphics.destroy();
    textureKeysEdge.add(key);
  }
  return key;
}
