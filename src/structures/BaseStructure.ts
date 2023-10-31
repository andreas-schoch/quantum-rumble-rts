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
  static builtStructureIds: Set<string> = new Set();
  static activeStructureIds: Set<string> = new Set(); // only the ones in here will receive energy of any type
  static damagedStructureIds: Set<string> = new Set(); // damaged structures are prioritized when delegating energy
  static collectingStructureIds: Set<string> = new Set(); // only the ones in here will collect energy

  // Parameters
  abstract name: string;
  abstract isRelay: boolean; // whether this structure can relay energy
  abstract movable: boolean;
  abstract healthMax: number;
  abstract ammoMax: number;
  abstract connectionRange: number; // max manhattan distance to other structures to be able to connect to them
  abstract energyCollectionRange: number; // max energy collection manhattan distance
  abstract updatePriority: number; // higher means it will be updated first
  abstract buildCost: number;
  // abstract energyCollectionRate: number; // how much energy is collected per second per unclaimed cell in range
  abstract energyProduction: number; // different from collecting, this produces without the need to occupy cells
  abstract energyStorageCapacity: number;
  isEnergyRoot = false;

  preview = true;
  findPathAsyncInProgress = false;
  destroyed = false;
  built = false;
  sprite: Phaser.GameObjects.Sprite | null = null;
  healthCurrent = 0;
  ammoCurrent = 0;
  energyStorageCurrent = 0;
  speedIncrease = 0;

  pendingEnergyRequests: Record<EnergyRequest['type'], EnergyRequest[]> = {'ammo': [], 'build': [], 'health': []};

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
  tick(tickCounter: number) {
    if (this.destroyed) return;
    if (!this.energyPath.found && !this.isEnergyRoot && !this.findPathAsyncInProgress) return this.findPathAsync();
    if (!this.energyPath.found) return;

    const energySource = BaseStructure.structuresById.get(this.energyPath.path[0].id);
    if (!energySource) return;
    let request: EnergyRequest | null = null;

    // TODO don't create the request here but in the network class. add id to pending requests array
    if (!this.built && this.buildCost !== 0 && this.pendingEnergyRequests['build'].length < this.buildCost) {
      request = this.scene.network.requestEnergy('build', 1, this);
      console.log('------build', this.buildCost, this.pendingEnergyRequests['build'].length);
    } else if (this.healthCurrent < this.healthMax && this.pendingEnergyRequests['health'].length < this.healthMax - this.healthCurrent) {
      request = this.scene.network.requestEnergy('health', 1, this);
    } else if (this.ammoCurrent < this.ammoMax && this.pendingEnergyRequests['ammo'].length < this.ammoMax - this.ammoCurrent) {
      request = this.scene.network.requestEnergy('ammo', 1, this);
    } else if (!this.built && this.buildCost === 0) {
      this.build(1);
    }
    // TODO move ammo stuff to BaseWeaponStructure?

    // console.log('------pending', this.pendingEnergyRequests['build'].length);
    if (request) this.pendingEnergyRequests[request.type].push(request);
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
    if (this.energyProduction) this.scene.network.energyProducing -= this.energyProduction;
    if (this.energyStorageCapacity) this.scene.network.energyStorageMax -= this.energyStorageCapacity;
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
    console.log(this.built);
  }

  protected findPathAsync() {
    this.findPathAsyncInProgress = true;
    this.scene.network.findPathToEnergySourceAsync(this).then(path => {
      this.energyPath = path;
      this.findPathAsyncInProgress = false;
    });
  }

  protected destroy() {
    this.deactivate();
    this.destroyed = true;
    BaseStructure.structuresById.delete(this.id);
    BaseStructure.damagedStructureIds.delete(this.id);
    BaseStructure.collectingStructureIds.delete(this.id);
    BaseStructure.activeStructureIds.delete(this.id);
    BaseStructure.builtStructureIds.delete(this.id);
    WORLD_DATA[this.coordY][this.coordX].ref = null;
    // TODO Base class does to much. Move specific stuff to subclasses
    if (this.energyStorageCapacity) this.scene.network.energyStorageMax += this.energyStorageCapacity;
    if (this.speedIncrease) this.scene.network.speed -= this.speedIncrease;
    this.sprite?.destroy();
  }

  protected heal(amount: number) {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    this.healthCurrent = Math.min(this.healthCurrent + amount, this.healthMax);
    if (this.healthCurrent === this.healthMax) BaseStructure.damagedStructureIds.delete(this.id);
  }

  protected build(amount: number) {
    if (this.destroyed) throw new Error('This structure is already destroyed');
    if (this.built) throw new Error('This structure is already built');
    this.buildCost = Math.max(this.buildCost - amount, 0);
    if (this.buildCost <= 0) {
      if (this.energyCollectionRange) this.scene.network.startCollecting(this);
      BaseStructure.builtStructureIds.add(this.id);
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

  move(coordX: number, coordY: number) {
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
