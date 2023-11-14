export interface IMarchingSquaresConfig {
  squareSize: number;
}

export type Point = { x: number; y: number };
export type Line = { p1: Point; p2: Point };

/** Represents a single "Marching Square */
export interface ISquareDensityData {
  /** topLeft corner Density */
  tl: number;
  /** topRight corner Density */
  tr: number;
  /** bottomRight corner Density */
  br: number;
  /** bottomLeft corner Density */
  bl: number;
  /** Min Density corners need to have to be considered solid */
  threshold: number;
}

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

  constructor(config: IMarchingSquaresConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  getSquareGeomData(e: ISquareDensityData): ISquareGeomData {
    const l = this.ilerp;
    const s = this.config.squareSize;
    const shapeIndex = this.getShapeIndex(e);
    const hash: string = this.getHashKey(e, shapeIndex);

    const polygons: Point[][] = [];
    const isoLines: Line[] = [];
    let poly: Point[] = [];
    switch (shapeIndex) {
    case 0: // empty square, do nothing
      break;
    case 1: // ◣ bottomLeft Full
      poly = [{x: 0, y: l(e.tl, e.bl, e.threshold)}, {x: l(e.bl, e.br, e.threshold), y: s}, {x: 0, y: s}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      break;
    case 2: // ◢ bottomRight full
      poly = [{x: l(e.bl, e.br, e.threshold), y: s}, {x: s, y: l(e.tr, e.br, e.threshold)}, {x: s, y: s}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      break;
    case 3: // ▄▄ bottom full
      poly = [{x: 0, y: l(e.tl, e.bl, e.threshold)}, {x: s, y: l(e.tr, e.br, e.threshold)}, {x: s, y: s}, {x: 0, y: s}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      break;
    case 4: // ◥ topRight full
      poly = [{x: s, y: l(e.tr, e.br, e.threshold)}, {x: l(e.tl, e.tr, e.threshold), y: 0}, {x: s, y: 0}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      break;
    case 5: // ◩◪ TopLeft and bottomRight full (Could also be topRight and bottomLeft full depending on density values but simplified for now)
      poly = [{x: 0, y: l(e.tl, e.bl, e.threshold)}, {x: l(e.bl, e.br, e.threshold), y: s}, {x: 0, y: s}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      poly = [{x: s, y: l(e.tr, e.br, e.threshold)}, {x: l(e.tl, e.tr, e.threshold), y: 0}, {x: s, y: 0}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      break;
    case 6: //
      poly = [{x: l(e.bl, e.br, e.threshold), y: s}, {x: l(e.tl, e.tr, e.threshold), y: 0}, {x: s, y: 0}, {x: s, y: s}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      break;
    case 7:
      poly = [{x: l(e.tl, e.tr, e.threshold), y: 0}, {x: 0, y: l(e.tl, e.bl, e.threshold)}, {x: 0, y: s}, {x: s, y: s}, {x: s, y: 0}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      break;
    case 8:
      poly = [{x: l(e.tl, e.tr, e.threshold), y: 0}, {x: 0, y: l(e.tl, e.bl, e.threshold)}, {x: 0, y: 0}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      break;
    case 9: // right full
      poly = [{x: l(e.tl, e.tr, e.threshold), y: 0}, {x: l(e.bl, e.br, e.threshold), y: s}, {x: 0, y: s}, {x: 0, y: 0}];
      polygons.push(poly);
      isoLines.push({p1: poly[0], p2: poly[1]});
      break;
    case 10: // topLeft and bottomRight empty (Could also be topRight and bottomLeft empty depending on density values but simplified for now)
      poly = [{x: 0, y: 0}, {x: l(e.tl, e.tr, e.threshold), y: 0}, {x: s, y: l(e.tr, e.br, e.threshold)}, {x: s, y: s}, {x: l(e.bl, e.br, e.threshold), y: s}, {x: 0, y: l(e.tl, e.bl, e.threshold)}];
      polygons.push(poly);
      isoLines.push({p1: poly[1], p2: poly [2]});
      isoLines.push({p1: poly[4], p2: poly [5]});
      break;
    case 11: // topRight empty
      poly = [{x: 0, y: 0}, {x: l(e.tl, e.tr, e.threshold), y: 0}, {x: s, y: l(e.tr, e.br, e.threshold)}, {x: s, y: s}, {x: 0, y: s}];
      polygons.push(poly);
      isoLines.push({p1: poly[1], p2: poly [2]});
      break;
    case 12: // top full
      poly = [{x: 0, y: 0}, {x: s, y: 0}, {x: s, y: l(e.tr, e.br, e.threshold)}, {x: 0, y: l(e.tl, e.bl, e.threshold)}];
      polygons.push(poly);
      isoLines.push({p1: poly[2], p2: poly [3]});
      break;
    case 13: // bottomRight empty
      poly = [{x: 0, y: 0}, {x: s, y: 0}, {x: s, y: l(e.tr, e.br, e.threshold)}, {x: l(e.bl, e.br, e.threshold), y: s}, {x: 0, y: s}];
      polygons.push(poly);
      isoLines.push({p1: poly[2], p2: poly [3]});
      break;
    case 14:
      // bottom left empty
      poly = [{x: 0, y: 0}, {x: s, y: 0}, {x: s, y: s}, {x: l(e.bl, e.br, e.threshold), y: s}, {x: 0, y: l(e.tl, e.bl, e.threshold)}];
      polygons.push(poly);
      isoLines.push({p1: poly[3], p2: poly [4]});
      break;
    case 15: // ■ full square
      polygons.push([{x: 0, y: 0}, {x: s, y: 0}, {x: this.config.squareSize, y: this.config.squareSize}, {x: 0, y: this.config.squareSize}]);
      break;
    default:
      throw new Error('Should never happen');
    }

    return {polygons, isoLines, shapeIndex, hash};
  }

  private getHashKey(data: ISquareDensityData, index?: number): string {
    index = index || this.getShapeIndex(data);
    if (index === 0) return 'empty-square';
    if (index === 15) return 'full-square';
    const {tl, tr, br, bl} = MarchingSquares.floorDensityValues(data);
    return `${tl}-${tr}-${br}-${bl}`;
  }

  private getShapeIndex(data: ISquareDensityData): number {
    const {tl, tr, br, bl, threshold} = data;
    const val1 = tl >= threshold ? 8 : 0;
    const val2 = tr >= threshold ? 4 : 0;
    const val3 = br >= threshold ? 2 : 0;
    const val4 = bl >= threshold ? 1 : 0;
    return val1 + val2 + val3 + val4;
  }

  /** Inverse lerp */
  private ilerp = (eA: number, eB: number, threshold: number): number => {
    return ((threshold - eA) / (eB - eA)) * this.config.squareSize;
  };

  private static floorDensityValues(data: ISquareDensityData): ISquareDensityData {
    data.tl = Math.floor(data.tl);
    data.tr = Math.floor(data.tr);
    data.br = Math.floor(data.br);
    data.bl = Math.floor(data.bl);
    return data;
  }
}
