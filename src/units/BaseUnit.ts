import { GRID, HALF_GRID } from '../constants';
import { Unit } from '..';
import { EnergyRequest } from '../Network';
import { PathfinderResult } from '../Graph';
import GameScene from '../scenes/GameScene';

export abstract class BaseStructure {
  scene: GameScene;
  id: string;
  x: number;
  y: number;
  coordX: number;
  coordY: number;
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

  constructor(scene: GameScene, coordX: number, coordY: number) {
    this.scene = scene;
    this.id = Math.random().toString(36).substring(2, 10);
    this.x = coordX * GRID + HALF_GRID;
    this.y = coordY * GRID + HALF_GRID;
    this.coordX = coordX;
    this.coordY = coordY;
    BaseStructure.structuresById.set(this.id, this);
    this.buildCost = this.constructor['buildCost'];
    this.CLASS = Object.getPrototypeOf(this).constructor;
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
    this.scene.network.world[this.coordY][this.coordX].ref = this;
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
    if (this.CLASS.energyCollectionRange) this.scene.network.stopCollecting(this);
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
    this.scene.network.world[this.coordY][this.coordX].ref = null;
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
      if (this.CLASS.energyCollectionRange) this.scene.network.startCollecting(this);
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
    return this.scene.network.world[coordY][coordX].ref === null || this.scene.network.world[coordY][coordX].ref === this;
  }

  move(coordX: number, coordY: number): void | true {
    if (this.scene.network.world[coordY][coordX].ref === this) return;
    if (!this.CLASS.movable || this.destroyed) throw new Error('This structure is not movable or already destroyed');
    this.coordX = coordX;
    this.coordY = coordY;
    this.x = coordX * GRID + HALF_GRID;
    this.y = coordY * GRID + HALF_GRID;

    if (this.sprite) this.sprite.setPosition(this.x, this.y);

    const cellBefore = this.scene.network.world[this.coordY][this.coordX];
    const cellAfter = this.scene.network.world[coordY][coordX];

    cellBefore.ref = null;
    cellAfter.ref = this;
    return true;
  }
}
