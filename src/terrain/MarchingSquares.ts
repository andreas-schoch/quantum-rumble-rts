import { GRID, HALF_GRID } from '../constants';

export type Point = { x: number; y: number };
export type Line = { p1: Point; p2: Point, lw: number, c: number };

export interface Shape {
  index: number;
  polygons: Point[][];
  isoLines: Line[];
}

// TODO make this into a Phaser plugin together with the SculptComponent. Maybe make it possible to easily hookup the renderQueue
export class MarchingSquares {
  shapeByIndex: Shape[] = [];

  constructor(lineWidthFront = GRID / 4, lineWidthBack = GRID / 8, lineColorFront = 0x000000, lineColorBack = 0xffffff) {
    this.computeShapeTable(lineWidthFront, lineWidthBack, lineColorFront, lineColorBack);
  }

  computeShapeTable(lineWidthFront: number, lineWidthBack: number, lineColorFront: number, lineColorBack: number, inset = 0) {
    const shapeTable: Shape[] = [];
    // Define corner points and edge midpoints
    const topLeft: Point = { x: 0, y: 0 };
    const topRight: Point = { x: GRID, y: 0 };
    const bottomLeft: Point = { x: 0, y: GRID };
    const bottomRight: Point = { x: GRID, y: GRID };

    const leftMid: Point = { x: 0, y: HALF_GRID };
    const rightMid: Point = { x: GRID, y: HALF_GRID };
    const topMid: Point = { x: HALF_GRID, y: 0 };
    const bottomMid: Point = { x: HALF_GRID, y: GRID };

    const insetDiagonal = inset / Math.sqrt(2); // need to inset diagonals by a smaller amount --> if 1 --> 0.70710
    const insetX = (vec: Point, insetEdgesBy: number): Point => ({ x: vec.x + insetEdgesBy, y: vec.y });
    const insetY = (vec: Point, insetEdgesBy: number): Point => ({ x: vec.x, y: vec.y + insetEdgesBy });

    // Inset is an offset from the midpoint towards a specific corner
    // This prevents the fluid from rendering over the terrain "cliff" line which makes it visually confusing as you don't see if there is a cliff or not
    // Each shape requires a different direction of the inset. The inset offset for diagonal is normalized to acount for the 45 degree angle
    const leftMidInsetDown = insetY(leftMid, inset);
    const leftMidInsetUp = insetY(leftMid, -inset);
    const leftMidInsetDownDiagonal = insetY(leftMid, insetDiagonal);
    const leftMidInsetUpDiagonal = insetY(leftMid, -insetDiagonal);

    const rightMidInsetDown = insetY(rightMid, inset);
    const rightMidInsetUp = insetY(rightMid, -inset);
    const rightMidInsetDownDiagonal = insetY(rightMid, insetDiagonal);
    const rightMidInsetUpDiagonal = insetY(rightMid, -insetDiagonal);

    const topMidInsetRight = insetX(topMid, inset);
    const topMidInsetLeft = insetX(topMid, -inset);
    const topMidInsetRightDiagonal = insetX(topMid, insetDiagonal);
    const topMidInsetLeftDiagonal = insetX(topMid, -insetDiagonal);

    const bottomMidInsetRight = insetX(bottomMid, inset);
    const bottomMidInsetLeft = insetX(bottomMid, -inset);
    const bottomMidInsetRightDiagonal = insetX(bottomMid, insetDiagonal);
    const bottomMidInsetLeftDiagonal = insetX(bottomMid, -insetDiagonal);

    // Precompute the polygons and isoLines for each possible shapeIndex
    for (let shapeIndex = 0; shapeIndex < 16; shapeIndex++) {
      const polygons: Point[][] = [];
      const isoLines: Line[] = [];

      switch (shapeIndex) {
      case 0: // Empty square
        break;
      case 1: // Bottom-left corner full
        polygons.push([leftMidInsetDownDiagonal, bottomMidInsetLeftDiagonal, bottomLeft]);
        if (lineWidthBack) isoLines.push({ p1: leftMidInsetDownDiagonal, p2: bottomMidInsetLeftDiagonal, lw: lineWidthBack, c: lineColorBack });
        break;
      case 2: // Bottom-right corner full
        polygons.push([rightMidInsetDownDiagonal, bottomRight, bottomMidInsetRightDiagonal]);
        if (lineWidthBack) isoLines.push({ p1: bottomMidInsetRightDiagonal, p2: rightMidInsetDownDiagonal, lw: lineWidthBack, c: lineColorBack });
        break;
      case 3: // Bottom half full
        polygons.push([leftMidInsetDown, rightMidInsetDown, bottomRight, bottomLeft]);
        if (lineWidthBack) isoLines.push({ p1: leftMidInsetDown, p2: rightMidInsetDown, lw: lineWidthBack, c: lineColorBack });
        break;
      case 4: // Top-right corner full
        polygons.push([topMidInsetRightDiagonal, topRight, rightMidInsetUpDiagonal]);
        if (lineWidthFront) isoLines.push({ p1: rightMidInsetUpDiagonal, p2: topMidInsetRightDiagonal, lw: lineWidthFront, c: lineColorFront });
        break;
      case 5: // Opposite corners full (bottom-left and top-right full)
        polygons.push([topMidInsetRightDiagonal, topRight, rightMidInsetUpDiagonal, bottomMidInsetLeftDiagonal, bottomLeft, leftMidInsetDownDiagonal]);
        if (lineWidthBack) isoLines.push({ p1: leftMidInsetDownDiagonal, p2: topMidInsetRightDiagonal, lw: lineWidthBack, c: lineColorBack });
        if (lineWidthFront) isoLines.push({ p1: bottomMidInsetLeftDiagonal, p2: rightMidInsetUpDiagonal, lw: lineWidthFront, c: lineColorFront });
        break;
      case 6: // Right half full
        polygons.push([topMidInsetRight, topRight, bottomRight, bottomMidInsetRight]);
        if (lineWidthFront) isoLines.push({ p1: bottomMidInsetRight, p2: topMidInsetRight, lw: lineWidthFront, c: lineColorFront });
        break;
      case 7: // All but top-left corner full
        polygons.push([topMidInsetRightDiagonal, topRight, bottomRight, bottomLeft, leftMidInsetDownDiagonal]);
        if (lineWidthBack) isoLines.push({ p1: topMidInsetRightDiagonal, p2: leftMidInsetDownDiagonal, lw: lineWidthBack, c: lineColorBack });
        break;
      case 8: // Top-left corner full
        polygons.push([topLeft, topMidInsetLeftDiagonal, leftMidInsetUpDiagonal]);
        if (lineWidthFront) isoLines.push({ p1: topMidInsetLeftDiagonal, p2: leftMidInsetUpDiagonal, lw: lineWidthFront, c: lineColorFront });
        break;
      case 9: // Left half full
        polygons.push([topLeft, topMidInsetLeft, bottomMidInsetLeft, bottomLeft]);
        if (lineWidthFront) isoLines.push({ p1: topMidInsetLeft, p2: bottomMidInsetLeft, lw: lineWidthFront, c: lineColorFront });
        break;
      case 10: // Opposite corners full (top-left and bottom-right full)
        polygons.push([topLeft, topMidInsetLeftDiagonal, rightMidInsetDownDiagonal, bottomRight, bottomMidInsetRightDiagonal, leftMidInsetUpDiagonal]);
        if (lineWidthBack) isoLines.push({ p1: topMidInsetLeftDiagonal, p2: rightMidInsetDownDiagonal, lw: lineWidthBack, c: lineColorBack });
        if (lineWidthFront) isoLines.push({ p1: bottomMidInsetRightDiagonal, p2: leftMidInsetUpDiagonal, lw: lineWidthFront, c: lineColorFront });
        break;
      case 11: // All but top-right corner full
        polygons.push([topLeft, topMidInsetLeftDiagonal, rightMidInsetDownDiagonal, bottomRight, bottomLeft]);
        if (lineWidthBack) isoLines.push({ p1: topMidInsetLeftDiagonal, p2: rightMidInsetDownDiagonal, lw: lineWidthBack, c: lineColorBack });
        break;
      case 12: // Top half full
        polygons.push([topLeft, topRight, rightMidInsetUp, leftMidInsetUp]);
        if (lineWidthFront) isoLines.push({ p1: rightMidInsetUp, p2: leftMidInsetUp, lw: lineWidthFront, c: lineColorFront });
        break;
      case 13: // All but bottom-right corner full
        polygons.push([topLeft, topRight, rightMidInsetUpDiagonal, bottomMidInsetLeftDiagonal, bottomLeft]);
        if (lineWidthFront) isoLines.push({ p1: rightMidInsetUpDiagonal, p2: bottomMidInsetLeftDiagonal, lw: lineWidthFront, c: lineColorFront });
        break;
      case 14: // All but bottom-left corner full
        polygons.push([topLeft, topRight, bottomRight, bottomMidInsetRightDiagonal, leftMidInsetUpDiagonal]);
        if (lineWidthFront) isoLines.push({ p1: bottomMidInsetRightDiagonal, p2: leftMidInsetUpDiagonal, lw: lineWidthFront, c: lineColorFront });
        break;
      case 15: // Full square
        polygons.push([topLeft, topRight, bottomRight, bottomLeft]);
        break;
      default:
        throw new Error('Invalid shape index');
      }

      shapeTable[shapeIndex] = { polygons, isoLines, index: shapeIndex };
    }

    this.shapeByIndex = shapeTable;
  }

  getShapeIndex(tl: number, tr: number, br: number, bl: number, threshold: number): number {
    let val = 0;
    if (tl >= threshold) val |= 0b1000;
    if (tr >= threshold) val |= 0b0100;
    if (br >= threshold) val |= 0b0010;
    if (bl >= threshold) val |= 0b0001;
    return val;
  }
}
