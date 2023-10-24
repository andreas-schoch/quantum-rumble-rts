import { Cell } from '../City';
import GameScene from '../scenes/GameScene';

export class Collector {
  name: string = 'Collector';
  id: string;
  x: number;
  y: number;
  coordX: number;
  coordY: number;
  range = 5;
  private scene: GameScene;
  private textureGenerated = false;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    this.scene = scene;
    this.id = Math.random().toString(36).substring(2, 9);
    const grid = this.scene.gridSize;
    this.x = coordX * grid + grid / 2;
    this.y = coordY * grid + grid / 2;
    this.coordX = coordX;
    this.coordY = coordY;

    if (!this.textureGenerated) {
      this.generateTexture();
      this.textureGenerated = true;
    }

    this.scene.add.sprite(this.x, this.y, 'collector').setDepth(12);
    this.scene.worldData[this.coordY][this.coordX].ref = this;
  }

  // TODO create a generic Cell class where all general purpose logic is located
  getNeighboursInRange(range: number = this.range, occupiedOnly = true): Cell[] {
    const cells: Cell[] = [];
    for (let y = this.coordY - range; y <= this.coordY + range; y++) {
      for (let x = this.coordX - range; x <= this.coordX + range; x++) {
        if (x < 0 || y < 0 || x >= this.scene.worldData[0].length || y >= this.scene.worldData.length) continue; // skip out of bounds
        const cell = this.scene.worldData[y][x];
        if (occupiedOnly && !cell.ref) continue; // skip unoccupied cells only when desired
        if (cell.ref === this) continue; // skip self
        const distance = Math.abs(x - this.coordX) + Math.abs(y - this.coordY); // manhattan distance, not euclidean
        if (distance > range) continue; // skip cells that are out of range
        cells.push(cell);
      }
    }
    return cells;
  }

  destroy() {
    this.scene.worldData[this.coordY][this.coordX].ref = null;
    // this.graphics.destroy();
  }

  private generateTexture() {
    const graphics = this.scene.add.graphics();
    const grid = this.scene.gridSize;
    const halfGrid = grid / 2;
    const outer = grid * 0.30;
    const inner = outer / 2;
    graphics.fillStyle(0xd3d3d3, 1);
    graphics.lineStyle(2, 0x777777, 1);
    graphics.fillCircle(halfGrid, halfGrid, outer);
    graphics.strokeCircle(halfGrid, halfGrid, outer);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(halfGrid, halfGrid, inner);
    graphics.strokeCircle(halfGrid, halfGrid, inner);
    graphics.generateTexture('collector', grid, grid);
    graphics.destroy();
  }
}
