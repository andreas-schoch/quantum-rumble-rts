import { GRID, HALF_GRID, WORLD_DATA } from '..';
import { EnergyRequest } from './City';
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

  // Parameters
  abstract name: string;
  abstract isRelay: boolean; // whether this structure can relay energy
  abstract movable: boolean;
  abstract healthMax: number;
  abstract connectionRange: number; // max manhattan distance to other structures to be able to connect to them
  abstract energyCollectionRange: number; // max energy collection manhattan distance
  abstract updatePriority: number; // higher means it will be updated first
  abstract buildCost: number;
  abstract energyProduction: number; // different from collecting, this produces without the need to occupy cells
  abstract energyStorageCapacity: number;
  isEnergyRoot = false;

  preview = true;
  findPathAsyncInProgress = false;
  destroyed = false;
  built = false;
  sprite: Phaser.GameObjects.Sprite | null = null;
  healthCurrent = 0;
  energyStorageCurrent = 0;
  speedIncrease = 0;

  pendingBuild: EnergyRequest[] = [];
  pendingHealth: EnergyRequest[] = [];
  // pendingEnergyByType: {[key: string]: EnergyRequest[]} = { build: this.pendingBuild, health: this.pendingHealth };

  constructor(scene: GameScene, coordX: number, coordY: number) {
    this.scene = scene;
    this.id = Math.random().toString(36).substring(2, 10);
    this.x = coordX * GRID + HALF_GRID;
    this.y = coordY * GRID + HALF_GRID;
    this.coordX = coordX;
    this.coordY = coordY;
    BaseStructure.structuresById.set(this.id, this);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(tickCounter: number):  void | true {
    if (this.destroyed) return;
    if (!this.energyPath.found && !this.isEnergyRoot && !this.findPathAsyncInProgress) return this.findPathAsync();

    if (!this.isEnergyRoot && !this.energyPath.found) return;

    // if (!BaseStructure.structuresById.has(this.energyPath.path[0].id)) return; // No energy source
    if (!this.built && this.buildCost !== 0 && this.pendingBuild.length < this.buildCost)
      this.pendingBuild.push(this.scene.network.requestEnergy('build', 1, this));
    else if (this.healthCurrent < this.healthMax && this.pendingHealth.length < this.healthMax - this.healthCurrent)
      this.pendingHealth.push(this.scene.network.requestEnergy('health', 1, this));
    else if (!this.built && this.buildCost === 0)
      this.build(1);

    return true;
  }

  activate() {
    WORLD_DATA[this.coordY][this.coordX].ref = this;
    this.sprite && this.sprite.clearTint();
    BaseStructure.activeStructureIds.add(this.id);
    BaseStructure.structuresInUpdatePriorityOrder.push(this);
    BaseStructure.structuresInUpdatePriorityOrder.sort((a, b) => b.updatePriority - a.updatePriority);
    if (!this.isEnergyRoot) this.energyPath = this.scene.network.findPathToEnergySource(this);
    this.preview = false;
    this.healthCurrent = this.healthMax;
  }

  deactivate() {
    if (this.preview) return;
    BaseStructure.activeStructureIds.delete(this.id);
    BaseStructure.structuresInUpdatePriorityOrder = BaseStructure.structuresInUpdatePriorityOrder.filter(s => s.id !== this.id);
    if (this.energyCollectionRange) this.scene.network.stopCollecting(this);
    // if (this.energyProduction) this.scene.network.energyProducing -= this.energyProduction;
    // if (this.energyStorageCapacity) this.scene.network.energyStorageMax -= this.energyStorageCapacity;
  }

  damage(amount: number) {
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
    if (this.preview) return;
    this.destroyed = true;
    this.deactivate();
    BaseStructure.structuresById.delete(this.id);
    BaseStructure.activeStructureIds.delete(this.id);
    WORLD_DATA[this.coordY][this.coordX].ref = null;
    // TODO Base class does to much. Move specific stuff to subclasses
    if (this.energyStorageCapacity) this.scene.network.energyStorageMax -= this.energyStorageCapacity;
    if (this.energyProduction) this.scene.network.energyProducing -= this.energyProduction;
    if (this.speedIncrease) this.scene.network.speed -= this.speedIncrease;

  }

  protected heal(amount: number) {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    this.healthCurrent = Math.min(this.healthCurrent + amount, this.healthMax);
  }

  protected build(amount: number) {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    if (this.built) throw new Error('This structure is already built');
    this.buildCost = Math.max(this.buildCost - amount, 0);
    if (this.buildCost <= 0) {
      if (this.energyCollectionRange) this.scene.network.startCollecting(this);
      this.healthCurrent = this.healthMax;
      if (this.energyProduction) this.scene.network.energyProducing += this.energyProduction;
      if (this.energyStorageCapacity) this.scene.network.energyStorageMax += this.energyStorageCapacity;
      if (this.speedIncrease) this.scene.network.speed += this.speedIncrease;
      this.sprite?.setAlpha(1);
      this.built = true;
      console.log('built------------', this.id);
    }
  }

  protected draw() { /* no-op */ }

  canMoveTo(coordX: number, coordY: number) {
    return WORLD_DATA[coordY][coordX].ref === null || WORLD_DATA[coordY][coordX].ref === this;
  }

  move(coordX: number, coordY: number): void | true {
    if (WORLD_DATA[coordY][coordX].ref === this) return;
    if (!this.preview && (!this.movable || this.destroyed)) throw new Error('This structure is not movable or already destroyed');
    this.coordX = coordX;
    this.coordY = coordY;
    this.x = coordX * GRID + HALF_GRID;
    this.y = coordY * GRID + HALF_GRID;

    if (this.sprite) this.sprite.setPosition(this.x, this.y);

    const cellBefore = WORLD_DATA[this.coordY][this.coordX];
    const cellAfter = WORLD_DATA[coordY][coordX];

    if (!this.preview) {
      cellBefore.ref = null;
      cellAfter.ref = this;
    } else if (cellAfter.ref) {
      this.sprite && this.sprite.setTint(0xff0000).setDepth(100);
    } else {
      this.sprite && this.sprite.clearTint().setDepth(12);
    }

    return true;
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
