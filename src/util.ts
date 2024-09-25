import { GameObjects } from 'phaser';
import { GRID, level } from './constants';

export function getVisibleBounds(scene: Phaser.Scene): CoordBounds | null {
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

export interface CoordBounds {
  coordX: number;
  coordY: number;
  numCoordsX: number;
  numCoordsY: number;
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
