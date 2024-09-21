export interface IMarchingSquaresConfig {
  squareSize: number;
}

export type Point = { x: number; y: number };
export type Line = { p1: Point; p2: Point, lw: number, c: number };

/** Represents a single "Marching Square: `[TopLeft, TopRight, BottomRight, BottomLeft]` **/
export type DensityData = [number, number, number, number];

export interface ISquareGeomData {
  polygons: Point[][];
  isoLines: Line[];
  shapeIndex: number;
  hash?: string;
}

const DEFAULT_CONFIG: IMarchingSquaresConfig = {
  squareSize: 32,
};

// TODO make this into a Phaser plugin together with the SculptComponent. Maybe make it possible to easily hookup the renderQueue
export class MarchingSquares {
  // TODO this is kind of like an intentional memory leak as there are millions of possible variations.
  //  Measure whether this is really worth it and how large it becomes after 30 mins of constantly generating random terrain
  polygonCache: Map<string, ISquareGeomData> = new Map();
  // private readonly polygonLookupFactory: ((c: ISquareDensityData) => ISquareGeomDataRaw)[];
  private readonly config: IMarchingSquaresConfig;
  private shapeTable: ISquareGeomData[] = [];

  constructor(config: IMarchingSquaresConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.shapeTable = this.createShapeTable(config.squareSize);
  }

  getSquareGeomData(densityData: DensityData, threshold): ISquareGeomData {
    const shapeIndex = this.getShapeIndex(densityData, threshold);
    return this.shapeTable[shapeIndex];
  }

  private createShapeTable(s: number): ISquareGeomData[] {
    const shapeTable: ISquareGeomData[] = [];

    // Define corner points and edge midpoints
    const topLeft: Point = { x: 0, y: 0 };
    const topRight: Point = { x: s, y: 0 };
    const bottomLeft: Point = { x: 0, y: s };
    const bottomRight: Point = { x: s, y: s };

    const leftMid: Point = { x: 0, y: s / 2 };
    const rightMid: Point = { x: s, y: s / 2 };
    const topMid: Point = { x: s / 2, y: 0 };
    const bottomMid: Point = { x: s / 2, y: s };

    // Precompute the polygons and isoLines for each possible shapeIndex
    for (let shapeIndex = 0; shapeIndex < 16; shapeIndex++) {
      const polygons: Point[][] = [];
      const isoLines: Line[] = [];

      switch (shapeIndex) {
      case 0: // Empty square
        break;
      case 1: // Bottom-left corner full
        polygons.push([leftMid, bottomMid, bottomLeft]);
        isoLines.push({ p1: leftMid, p2: bottomMid, lw: 1, c: 0xffffff });
        break;
      case 2: // Bottom-right corner full
        polygons.push([rightMid, bottomRight, bottomMid]);
        isoLines.push({ p1: bottomMid, p2: rightMid, lw: 1, c: 0xffffff });
        break;
      case 3: // Bottom half full
        polygons.push([leftMid, rightMid, bottomRight, bottomLeft]);
        isoLines.push({ p1: leftMid, p2: rightMid, lw: 1, c: 0xffffff });
        break;
      case 4: // Top-right corner full
        polygons.push([topMid, topRight, rightMid]);
        isoLines.push({ p1: rightMid, p2: topMid, lw: 2, c: 0x000000 });
        break;
      case 5: // Opposite corners full (bottom-left and top-right full)
        polygons.push([topMid, topRight, rightMid, bottomMid, bottomLeft, leftMid]);
        isoLines.push({ p1: leftMid, p2: topMid, lw: 1, c: 0xffffff });
        isoLines.push({ p1: bottomMid, p2: rightMid, lw: 2, c: 0x000000 });
        break;
      case 6: // Right half full
        polygons.push([topMid, topRight, bottomRight, bottomMid]);
        isoLines.push({ p1: bottomMid, p2: topMid, lw: 2, c: 0x000000 });
        break;
      case 7: // All but top-left corner full
        polygons.push([topMid, topRight, bottomRight, bottomLeft, leftMid]);
        isoLines.push({ p1: topMid, p2: leftMid, lw: 1, c: 0xffffff });
        break;
      case 8: // Top-left corner full
        polygons.push([topLeft, topMid, leftMid]);
        isoLines.push({ p1: topMid, p2: leftMid, lw: 2, c: 0x000000 });
        break;
      case 9: // Left half full
        polygons.push([topLeft, topMid, bottomMid, bottomLeft]);
        isoLines.push({ p1: topMid, p2: bottomMid, lw: 2, c: 0x000000 });
        break;
      case 10: // Opposite corners full (top-left and bottom-right full)
        polygons.push([topLeft, topMid, rightMid, bottomRight, bottomMid, leftMid]);
        isoLines.push({ p1: topMid, p2: rightMid, lw: 1, c: 0xffffff });
        isoLines.push({ p1: bottomMid, p2: leftMid, lw: 2, c: 0x000000 });
        break;
      case 11: // All but top-right corner full
        polygons.push([topLeft, topMid, rightMid, bottomRight, bottomLeft]);
        isoLines.push({ p1: topMid, p2: rightMid, lw: 1, c: 0xffffff });
        break;
      case 12: // Top half full
        polygons.push([topLeft, topRight, rightMid, leftMid]);
        isoLines.push({ p1: rightMid, p2: leftMid, lw: 2, c: 0x000000 });
        break;
      case 13: // All but bottom-right corner full
        polygons.push([topLeft, topRight, rightMid, bottomMid, bottomLeft]);
        isoLines.push({ p1: rightMid, p2: bottomMid, lw: 2, c: 0x000000 });
        break;
      case 14: // All but bottom-left corner full
        polygons.push([topLeft, topRight, bottomRight, bottomMid, leftMid]);
        isoLines.push({ p1: bottomMid, p2: leftMid, lw: 2, c: 0x000000 });
        break;
      case 15: // Full square
        polygons.push([topLeft, topRight, bottomRight, bottomLeft]);
        break;
      default:
        throw new Error('Invalid shape index');
      }

      shapeTable[shapeIndex] = { polygons, isoLines, shapeIndex };
    }

    return shapeTable;
  }

  getShapeIndex(data: DensityData, threshold): number {
    const [tl, tr, br, bl] = data;

    // Attempt to render a single layer of fluid by matching the opposite shape
    // Doesn't quite work as expected yet as there are edgecases which need custom shapes
    // if (threshold < THRESHOLD * 11) {
    // const val1 = tl >= threshold && tl < (threshold + THRESHOLD) ? 8 : 0;
    // const val2 = tr >= threshold && tr < (threshold + THRESHOLD) ? 4 : 0;
    // const val3 = br >= threshold && br < (threshold + THRESHOLD) ? 2 : 0;
    // const val4 = bl >= threshold && bl < (threshold + THRESHOLD) ? 1 : 0;
    // const shape =  val1 + val2 + val3 + val4;
    // return shape;
    // } else {
    const val1 = tl >= threshold ? 8 : 0;
    const val2 = tr >= threshold ? 4 : 0;
    const val3 = br >= threshold ? 2 : 0;
    const val4 = bl >= threshold ? 1 : 0;
    const shape =  val1 + val2 + val3 + val4;
    return shape;
    // }
  }
}
