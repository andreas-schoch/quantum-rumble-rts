import { GRID, HALF_GRID, WORLD_DATA } from '..';
import { Cell, Energy, EnergyRequest } from '../City';
import { PathfinderResult } from '../Graph';
import GameScene from '../scenes/GameScene';

export const getCellsInRange = (coordX: number, coordY: number, range: number, occupiedOnly = true) => {
  const cells: [Cell, number][] = [];
  // console.log('-----getNeighboursInRange-----', coordX, coordY, range);
  for (let y = coordY - range; y <= coordY + range; y++) {
    for (let x = coordX - range; x <= coordX + range; x++) {
      if (x < 0 || y < 0 || x >= WORLD_DATA[0].length || y >= WORLD_DATA.length) continue; // skip out of bounds
      const cell = WORLD_DATA[y][x];
      // console.log('x', x, 'y', y, cell);
      if (occupiedOnly && !cell.ref) continue; // skip unoccupied cells only when desired
      if (cell.ref === this) continue; // skip self
      const distance = Math.abs(x - coordX) + Math.abs(y - coordY); // manhattan distance, not euclidean
      if (distance > range) continue; // skip cells that are out of range
      cells.push([cell, distance]);
    }
  }

  // console.log('cells', cells);
  return cells;
};

export abstract class BaseStructure {
  scene: GameScene;
  id: string;
  x: number;
  y: number;
  coordX: number;
  coordY: number;
  energyPath: PathfinderResult<BaseStructure> = {found: false, distance: Infinity, path: []};
  static structuresInUpdatePriorityOrder: BaseStructure[] = [];
  static structuresById: Map<string, BaseStructure> = new Map();
  static builtStructureIds: Set<string> = new Set();
  static activeStructureIds: Set<string> = new Set(); // only the ones in here will receive energy of any type
  static damagedStructureIds: Set<string> = new Set(); // damaged structures are prioritized when delegating energy
  static collectingStructureIds: Set<string> = new Set(); // only the ones in here will collect energy
  // private static destroyedStructureIds: Set<string> = new Set(); // probably not needed in this format

  // Parameters
  abstract name: string;
  abstract connectionRange: number; // max manhattan distance to other structures to be able to connect to them
  abstract relay: boolean; // whether this structure can relay energy
  abstract healthMax: number;
  abstract ammoMax: number;
  abstract movable: boolean;
  abstract updatePriority: number; // higher means it will be updated first
  abstract buildCost: number;
  abstract energyCollectionRange: number; // max energy collection manhattan distance
  abstract energyCollectionRate: number; // how much energy is collected per second per unclaimed cell in range
  abstract energyProduction: number; // different from collecting

  pendingEnergyRequests: Record<EnergyRequest['type'], EnergyRequest[]> = {'ammo': [], 'build': [], 'health': []};

  destroyed = false;
  built = false;

  sprite: Phaser.GameObjects.Sprite | null = null;
  abstract buildCostPaid: number;
  abstract healthCurrent: number;
  abstract ammoCurrent: number;
  preview = true;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    this.scene = scene;
    this.id = Math.random().toString(36).substring(2, 10);
    this.x = coordX * GRID + HALF_GRID;
    this.y = coordY * GRID + HALF_GRID;
    this.coordX = coordX;
    this.coordY = coordY;
    BaseStructure.structuresById.set(this.id, this);
    WORLD_DATA[this.coordY][this.coordX].ref = this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update() {
    if (this.destroyed) return;
    if (!this.energyPath.found && !this.energyProduction) this.energyPath = this.scene.network.findPathToEnergySource(this);
    if (!this.energyPath.found) return;

    const energySource = this.energyPath.path[0].data;
    let request: EnergyRequest | null = null;

    if (!this.built && this.pendingEnergyRequests['build'].length < this.buildCost - this.buildCostPaid) {
      request = {id: this.generateId(), type: 'build', amount: 1, requester: this};
    } else if (this.healthCurrent < this.healthMax && this.pendingEnergyRequests['health'].length < this.healthMax - this.healthCurrent) {
      request = {id: this.generateId(), type: 'health', amount: 1, requester: this};
    } else if (this.ammoCurrent < this.ammoMax && this.pendingEnergyRequests['ammo'].length < this.ammoMax - this.ammoCurrent) {
      request = {id: this.generateId(), type: 'ammo', amount: 1, requester: this};
    } else if (this.buildCost === 0) {
      this.built = true;
    }
    // TODO move ammo stuff to BaseWeaponStructure?

    if (request) {
      this.pendingEnergyRequests[request.type].push(request);
      energySource.requestEnergy(request);
    }
  }

  activate() {
    BaseStructure.activeStructureIds.add(this.id);
    BaseStructure.structuresInUpdatePriorityOrder.push(this);
    BaseStructure.structuresInUpdatePriorityOrder.sort((a, b) => b.updatePriority - a.updatePriority);
    // if (this.energyCollectionRange) this.scene.network.startCollecting(this);

    console.log('activate', this.energyProduction);
    if (!this.energyProduction){
      this.energyPath = this.scene.network.findPathToEnergySource(this);
      console.log('-------------energyPath', this.energyPath);
    }
  }

  deactivate() {
    BaseStructure.activeStructureIds.delete(this.id);
    BaseStructure.structuresInUpdatePriorityOrder = BaseStructure.structuresInUpdatePriorityOrder.filter(s => s.id !== this.id);
    if (this.energyCollectionRange) this.scene.network.stopCollecting(this);
  }

  damage(amount: number) {
    this.healthCurrent = Math.max(this.healthCurrent - amount, 0);
    if (this.healthCurrent === 0) this.destroy();
    else BaseStructure.damagedStructureIds.add(this.id);
  }

  receiveEnergy(request: EnergyRequest): void {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    this.pendingEnergyRequests[request.type] = this.pendingEnergyRequests[request.type].filter(r => r.id !== request.id);
    if (!request) throw new Error('This structure does not have a pending energy request with that id');

    // console.log('received energy', amount, request, this);

    switch (request.type) {
    case 'ammo':
      this.ammoCurrent = Math.min(this.ammoCurrent + request.amount, this.ammoMax);
      this.draw();
      break;
    case 'build':
      this.build(request.amount);
      break;
    case 'health':
      this.heal(request.amount);
      break;
    }

    //   if (this.buildCostPaid < this.buildCost) {
    //     this.buildCostPaid += amount;
    //     if (this.buildCostPaid === this.buildCost) this.activate();
    //     return;
    //   }

  //   console.log('received energy', amount, requestId);
  }

  requestEnergy(request: EnergyRequest): string {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    if (!this.energyProduction) throw new Error('This structure does not produce energy');
    if (!request.requester.energyPath.found) throw new Error('This structure is not connected to an energy source');
    const energyPath = request.requester.energyPath;

    const speed = 150; // units per second
    const duration = ( energyPath.distance / speed) * 1000; // convert to milliseconds

    const points = energyPath.path.reduce<number[]>((acc, cur) => acc.concat(cur.x, cur.y), []);
    const path = this.scene.add.path(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);

    const energyBall: Energy = {follower: this.scene.add.follower(path, points[0], points[1], 'energy'), id: this.generateId()};
    console.log('energyBall', energyBall, 'energyRequest', request);
    energyBall.follower.setScale(1).setDepth(100);
    energyBall.follower.startFollow({duration, repeat: 0, onComplete: () => {
      energyBall.follower.destroy();
      request.requester.receiveEnergy(request);
    }});

    // this.pendingEnergyRequests.push(request);
    return energyBall.id;
  }

  destroy() {
    this.deactivate();
    this.destroyed = true;
    BaseStructure.structuresById.delete(this.id);
    BaseStructure.damagedStructureIds.delete(this.id);
    BaseStructure.collectingStructureIds.delete(this.id);
    BaseStructure.activeStructureIds.delete(this.id);
    BaseStructure.builtStructureIds.delete(this.id);
    WORLD_DATA[this.coordY][this.coordX].ref = null;
    this.sprite?.destroy();
  }

  heal(amount: number) {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    this.healthCurrent = Math.min(this.healthCurrent + amount, this.healthMax);
    if (this.healthCurrent === this.healthMax) BaseStructure.damagedStructureIds.delete(this.id);
  }

  build(amount: number) {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    this.buildCostPaid += amount;
    if (this.buildCostPaid >= this.buildCost) {
      // this.buildCostPaid = 0;
      // this.activate();
      if (this.energyCollectionRange) this.scene.network.startCollecting(this);
      BaseStructure.builtStructureIds.add(this.id);
      this.built = true;

      this.sprite?.setAlpha(1);
    }
  }

  draw() {
    // throw new Error('This method must be implemented by the child class');
  }

  move(coordX: number, coordY: number) {
    if (!this.preview && (!this.movable || this.destroyed)) throw new Error('This structure is not movable or already destroyed');
    this.coordX = coordX;
    this.coordY = coordY;
    this.x = coordX * GRID + HALF_GRID;
    this.y = coordY * GRID + HALF_GRID;

    if (this.sprite) this.sprite.setPosition(this.x, this.y);

    if (!this.preview) {
      WORLD_DATA[this.coordY][this.coordX].ref = null;
      WORLD_DATA[coordY][coordX].ref = this;
    }
  }

  private generateId() {
    return Math.random().toString(36).substring(2, 10);
  }

  protected static drawStar (graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
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
}
