import { GRID, HALF_GRID, level } from '../constants';
import { Unit } from '..';
import { EnergyRequest } from '../Network';
import { PathfinderResult } from '../Graph';
import GameScene from '../scenes/GameScene';

// In hindsight, OOP wasn't the right choice for units. I would like to refactor it using the ECS pattern but cannot be bothered to do it now.
export abstract class BaseStructure {
  id: string;
  x: number;
  y: number;
  cellIndex: number;
  energyPath: PathfinderResult<{x: number, y: number}> = {found: false, distance: Infinity, path: []};

  static structuresInUpdatePriorityOrder: BaseStructure[] = [];
  static structuresById: Map<string, BaseStructure> = new Map();
  static activeStructureIds: Set<string> = new Set(); // only the ones in here will receive energy of any type

  static energyCollectionRange = 0; // max energy collection manhattan distance
  static energyStorageCapacity = 0;
  static energyProduction = 0; // different from collecting, this produces without the need to occupy cells
  static connectionRange = 5; // max manhattan distance to other structures to be able to connect to them
  static updatePriority = 1; // higher means it will be updated first
  static speedIncrease = 0; // px per second
  static isRelay = false; // whether this structure can relay energy
  static movable = false;

  static buildCost: number;
  static unitName: string;
  static healthMax: number;

  isEnergyRoot = false;

  findPathAsyncInProgress = false;
  destroyed = false;
  built = false;
  sprite: Phaser.GameObjects.Sprite | null = null;
  healthCurrent = 0;
  buildCost: number;

  pendingBuild: EnergyRequest[] = [];
  pendingHealth: EnergyRequest[] = [];
  CLASS: Unit;
  static type = 'structure';

  constructor(public scene: GameScene, public xCoord: number, public yCoord: number, public elevation: number) {
    this.id = Math.random().toString(36).substring(2, 10);
    this.x = xCoord * GRID + HALF_GRID;
    this.y = yCoord * GRID + HALF_GRID;
    this.cellIndex = yCoord * (level.sizeX + 1) + xCoord;
    BaseStructure.structuresById.set(this.id, this);
    this.buildCost = this.constructor['buildCost'];
    this.CLASS = Object.getPrototypeOf(this).constructor; // TODO I dont like this. get rid of it
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(tickCounter: number):  void | true {
    if (this.destroyed) return;
    if (!this.energyPath.found && !this.isEnergyRoot && !this.findPathAsyncInProgress) return this.findPathAsync();

    if (!this.isEnergyRoot && !this.energyPath.found) return;

    // if (!BaseStructure.structuresById.has(this.energyPath.path[0].id)) return; // No energy source
    if (!this.built && this.buildCost !== 0 && this.pendingBuild.length < this.buildCost)
      this.pendingBuild.push(this.scene.network.requestEnergy('build', 1, this));
    else if (this.healthCurrent < this.CLASS.healthMax && this.pendingHealth.length < this.CLASS.healthMax - this.healthCurrent)
      this.pendingHealth.push(this.scene.network.requestEnergy('health', 1, this));
    else if (!this.built && this.buildCost === 0)
      this.build(1);

    return true;
  }

  activate() {
    this.scene.network.world[this.cellIndex].ref = this;
    this.sprite && this.sprite.clearTint();
    BaseStructure.activeStructureIds.add(this.id);
    BaseStructure.structuresInUpdatePriorityOrder.push(this);
    BaseStructure.structuresInUpdatePriorityOrder.sort((a, b) => b.CLASS.updatePriority - a.CLASS.updatePriority);
    if (!this.isEnergyRoot) this.energyPath = this.scene.network.findPathToEnergySource(this);
    // this.preview = false;
    this.healthCurrent = this.CLASS.healthMax;
  }

  deactivate() {
    // if (this.preview) return;
    BaseStructure.activeStructureIds.delete(this.id);
    BaseStructure.structuresInUpdatePriorityOrder = BaseStructure.structuresInUpdatePriorityOrder.filter(s => s.id !== this.id);
    if (this.CLASS.energyCollectionRange) this.scene.simulation.removeCollector(this.id);
    // if (this.energyProduction) this.scene.network.energyProducing -= this.energyProduction;
    // if (this.energyStorageCapacity) this.scene.network.energyStorageMax -= this.energyStorageCapacity;
  }

  hit(amount: number) {
    this.healthCurrent = Math.max(this.healthCurrent - amount, 0);
    if (this.healthCurrent === 0) this.destroy();
  }

  receiveEnergy(request: EnergyRequest): void {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    if (!request) throw new Error('This structure does not have a pending energy request with that id');
    if (request.type === 'build') {
      this.build(request.amount);
      this.pendingBuild = this.pendingBuild.filter(r => r.id !== request.id);
    } else if (request.type === 'health') {
      this.heal(request.amount);
      this.pendingHealth = this.pendingHealth.filter(r => r.id !== request.id);
    }
  }

  protected findPathAsync() {
    this.findPathAsyncInProgress = true;
    this.scene.network.findPathToEnergySourceAsync(this).then(path => {
      this.energyPath = path;
      this.findPathAsyncInProgress = false;
    });
  }

  protected destroy() {
    this.sprite?.destroy();
    // if (this.preview) return;
    this.destroyed = true;
    this.deactivate();
    BaseStructure.structuresById.delete(this.id);
    BaseStructure.activeStructureIds.delete(this.id);
    this.scene.network.world[this.cellIndex].ref = null;
    // TODO Base class does to much. Move specific stuff to subclasses
    if (this.CLASS.energyStorageCapacity) this.scene.network.energyStorageMax -= this.CLASS.energyStorageCapacity;
    if (this.CLASS.energyProduction) this.scene.network.energyProducing -= this.CLASS.energyProduction;
    if (this.CLASS.speedIncrease) this.scene.network.speed -= this.CLASS.speedIncrease;

  }

  protected heal(amount: number) {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    this.healthCurrent = Math.min(this.healthCurrent + amount, this.CLASS.healthMax);
  }

  protected build(amount: number) {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    if (this.built) throw new Error('This structure is already built');
    this.buildCost = Math.max(this.buildCost - amount, 0);
    if (this.buildCost <= 0) {
      if (this.CLASS.energyCollectionRange) this.scene.simulation.addCollector({id: this.id, xCoord: this.xCoord, yCoord: this.yCoord, radius: this.CLASS.energyCollectionRange, elevation: this.elevation});
      this.healthCurrent = this.CLASS.healthMax;
      if (this.CLASS.energyProduction) this.scene.network.energyProducing += this.CLASS.energyProduction;
      if (this.CLASS.energyStorageCapacity) this.scene.network.energyStorageMax += this.CLASS.energyStorageCapacity;
      if (this.CLASS.speedIncrease) this.scene.network.speed += this.CLASS.speedIncrease;
      this.sprite?.setAlpha(1);
      this.built = true;
    }
  }

  protected draw() { /* no-op */ }

  canMoveTo(coordX: number, coordY: number) {
    const index = coordY * (level.sizeX + 1) + coordX;
    const ref = this.scene.network.world[index].ref;
    return ref === null || ref === this;
  }

  move(coordX: number, coordY: number): void | true {
    const newCellIndex = coordY * (level.sizeX + 1) + coordX;
    if (this.scene.network.world[newCellIndex].ref === this) return;
    if (!this.CLASS.movable || this.destroyed) throw new Error('This structure is not movable or already destroyed');
    this.xCoord = coordX;
    this.yCoord = coordY;
    this.x = coordX * GRID + HALF_GRID;
    this.y = coordY * GRID + HALF_GRID;

    if (this.sprite) this.sprite.setPosition(this.x, this.y);

    const cellBefore = this.scene.network.world[this.cellIndex];
    const cellAfter = this.scene.network.world[newCellIndex];

    cellBefore.ref = null;
    cellAfter.ref = this;
    return true;
  }
}
