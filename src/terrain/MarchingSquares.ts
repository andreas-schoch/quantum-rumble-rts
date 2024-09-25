import { GRID, HALF_GRID } from "../constants";


export type Point = { x: number; y: number };
export type Line = { p1: Point; p2: Point, lw: number, c: number };

/** Represents a single "Marching Square: `[TopLeft, TopRight, BottomRight, BottomLeft]` **/
export type DensityData = [number, number, number, number];

export interface Shape {
  index: number;
  polygons: Point[][];
  isoLines: Line[];
}

// TODO make this into a Phaser plugin together with the SculptComponent. Maybe make it possible to easily hookup the renderQueue
export class MarchingSquares {
  readonly shapeByIndex: Shape[] = [];

  constructor() {
    this.shapeByIndex = this.createShapeTable();
  }

  getSquareGeomData(densityData: DensityData, threshold): Shape {
    const shapeIndex = this.getShapeIndex(densityData, threshold);
    return this.shapeByIndex[shapeIndex];
  }

  private createShapeTable(): Shape[] {
    const shapeTable: Shape[] = [];

    // Define corner points and edge midpoints
    const topLeft: Point = { x: 0, y: 0 };
    const topRight: Point = { x: GRID, y: 0 };
    const bottomLeft: Point = { x: 0, y: GRID };
    const bottomRight: Point = { x: GRID, y: GRID };

    const leftMid: Point = { x: 0, y: HALF_GRID };
    const rightMid: Point = { x: GRID, y: GRID / 2 };
    const topMid: Point = { x: HALF_GRID, y: 0 };
    const bottomMid: Point = { x: HALF_GRID, y: GRID };

    const lineWidth = GRID / 4;
    const halfLineWidth = lineWidth / 2;

    // Precompute the polygons and isoLines for each possible shapeIndex
    for (let shapeIndex = 0; shapeIndex < 16; shapeIndex++) {
      const polygons: Point[][] = [];
      const isoLines: Line[] = [];

      switch (shapeIndex) {
      case 0: // Empty square
        break;
      case 1: // Bottom-left corner full
        polygons.push([leftMid, bottomMid, bottomLeft]);
        isoLines.push({ p1: leftMid, p2: bottomMid, lw: halfLineWidth, c: 0xffffff });
        break;
      case 2: // Bottom-right corner full
        polygons.push([rightMid, bottomRight, bottomMid]);
        isoLines.push({ p1: bottomMid, p2: rightMid, lw: halfLineWidth, c: 0xffffff });
        break;
      case 3: // Bottom half full
        polygons.push([leftMid, rightMid, bottomRight, bottomLeft]);
        isoLines.push({ p1: leftMid, p2: rightMid, lw: halfLineWidth, c: 0xffffff });
        break;
      case 4: // Top-right corner full
        polygons.push([topMid, topRight, rightMid]);
        isoLines.push({ p1: rightMid, p2: topMid, lw: lineWidth, c: 0x000000 });
        break;
      case 5: // Opposite corners full (bottom-left and top-right full)
        polygons.push([topMid, topRight, rightMid, bottomMid, bottomLeft, leftMid]);
        isoLines.push({ p1: leftMid, p2: topMid, lw: halfLineWidth, c: 0xffffff });
        isoLines.push({ p1: bottomMid, p2: rightMid, lw: lineWidth, c: 0x000000 });
        break;
      case 6: // Right half full
        polygons.push([topMid, topRight, bottomRight, bottomMid]);
        isoLines.push({ p1: bottomMid, p2: topMid, lw: lineWidth, c: 0x000000 });
        break;
      case 7: // All but top-left corner full
        polygons.push([topMid, topRight, bottomRight, bottomLeft, leftMid]);
        isoLines.push({ p1: topMid, p2: leftMid, lw: halfLineWidth, c: 0xffffff });
        break;
      case 8: // Top-left corner full
        polygons.push([topLeft, topMid, leftMid]);
        isoLines.push({ p1: topMid, p2: leftMid, lw: lineWidth, c: 0x000000 });
        break;
      case 9: // Left half full
        polygons.push([topLeft, topMid, bottomMid, bottomLeft]);
        isoLines.push({ p1: topMid, p2: bottomMid, lw: lineWidth, c: 0x000000 });
        break;
      case 10: // Opposite corners full (top-left and bottom-right full)
        polygons.push([topLeft, topMid, rightMid, bottomRight, bottomMid, leftMid]);
        isoLines.push({ p1: topMid, p2: rightMid, lw: halfLineWidth, c: 0xffffff });
        isoLines.push({ p1: bottomMid, p2: leftMid, lw: lineWidth, c: 0x000000 });
        break;
      case 11: // All but top-right corner full
        polygons.push([topLeft, topMid, rightMid, bottomRight, bottomLeft]);
        isoLines.push({ p1: topMid, p2: rightMid, lw: halfLineWidth, c: 0xffffff });
        break;
      case 12: // Top half full
        polygons.push([topLeft, topRight, rightMid, leftMid]);
        isoLines.push({ p1: rightMid, p2: leftMid, lw: lineWidth, c: 0x000000 });
        break;
      case 13: // All but bottom-right corner full
        polygons.push([topLeft, topRight, rightMid, bottomMid, bottomLeft]);
        isoLines.push({ p1: rightMid, p2: bottomMid, lw: lineWidth, c: 0x000000 });
        break;
      case 14: // All but bottom-left corner full
        polygons.push([topLeft, topRight, bottomRight, bottomMid, leftMid]);
        isoLines.push({ p1: bottomMid, p2: leftMid, lw: lineWidth, c: 0x000000 });
        break;
      case 15: // Full square
        polygons.push([topLeft, topRight, bottomRight, bottomLeft]);
        break;
      default:
        throw new Error('Invalid shape index');
      }

      shapeTable[shapeIndex] = { polygons, isoLines, index: shapeIndex };
    }

    return shapeTable;
  }

  getShapeIndex(data: DensityData, threshold: number): number {
    const [tl, tr, br, bl] = data;
    let val = 0;
    if (tl >= threshold) val += 8;
    if (tr >= threshold) val += 4;
    if (br >= threshold) val += 2;
    if (bl >= threshold) val += 1;
    return val;
  }
}
