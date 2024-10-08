import { Depth, GRID, HALF_GRID, SerializableEntityData, EntityProps as EntityProps, THRESHOLD, config, TICK_DELTA } from '../constants';
import { Cell, EnergyRequest } from '../terrain/TerrainSimulation';
import { PathfinderResult } from '../Graph';
import { computeTerrainElevation, computeClosestCellIndicesInRange, generateId, computeFluidElevation, cellIndexAt } from '../util';
import { Simulation } from '../terrain/TerrainSimulation';

export class Unit implements SerializableEntityData {
  id: string;
  xCoord: number;
  yCoord: number;
  active: boolean;
  built = false;
  props: EntityProps;

  x: number;
  y: number;
  cellIndex: number;

  energyPath: PathfinderResult<{x: number, y: number}> = {found: false, distance: Infinity, path: [], ids: new Set()};
  findPathAsyncInProgress = false;

  sprites: Phaser.GameObjects.Sprite[] = [];
  mortarShells: Phaser.GameObjects.Sprite[] = [];
  ammoCircle: Phaser.GameObjects.Graphics;
  healthBar: Phaser.GameObjects.Graphics;
  blastSprite: Phaser.GameObjects.Sprite;
  moveToTween: Phaser.Tweens.Tween;

  isMoving = false;
  isDestroyed = false;
  remainingBuildCost: number;
  healthCurrent = 0;
  ammoCurrent = 0;
  lastAttack: number;
  lastEnergyRequest: number;
  lastPathFindAttempt: number;
  cellIndicesInAttackRange: number[] = []; // sorted by distance

  pendingBuild: EnergyRequest[] = [];
  pendingHealth: EnergyRequest[] = [];
  pendingAmmo: EnergyRequest[] = [];
  textureKeysBlast: Set<string> = new Set();
  energyRequestCooldown = 10; // every 10 ticks (500ms)

  // TODO try to remove phaser dependencies completely from Unit. Everything visual should happen in the rendering adapter.
  //  Not a priority but I like to be able to run the simulation without a renderer or with different renderers
  static scene: Phaser.Scene;
  static particlePlaceEntity: Phaser.GameObjects.Particles.ParticleEmitter;
  static particleImpact: Phaser.GameObjects.Particles.ParticleEmitter;
  static sfx_place_structure:  Phaser.Sound.BaseSound;
  static sfx_startCollect: Phaser.Sound.BaseSound;
  static sfx_blasterHit: Phaser.Sound.BaseSound;
  static sfx_mortarShellHit: Phaser.Sound.BaseSound;
  static sfx_mortarShellStart: Phaser.Sound.BaseSound;
  static selectedOutline: Phaser.GameObjects.Graphics;
  static NOT_FOUND: PathfinderResult<{x: number, y: number}> = {distance: Infinity, path: [], ids: new Set(), found: false};

  constructor(private simulation: Simulation, data: SerializableEntityData) {
    this.id = data.id || generateId();
    this.xCoord = data.xCoord;
    this.yCoord = data.yCoord;
    this.x = data.xCoord * GRID + HALF_GRID;
    this.y = data.yCoord * GRID + HALF_GRID;
    this.active = data.active;
    this.props = data.props;
    this.cellIndex = cellIndexAt(this.xCoord, this.yCoord);

    const elevation = computeTerrainElevation(this.cellIndex, simulation.state);
    if (elevation % (THRESHOLD * 3) !== 0) throw new Error('Structure must be placed on a cell where all 4 edges are on the same elevation layer');

    Unit.particlePlaceEntity.explode(20, this.x, this.y);

    this.remainingBuildCost = this.props.buildCost;

    this.sprites = data.props.spriteKeys?.map(key => Unit.scene.add.sprite(this.x, this.y, key).setData('id', this.id).setDepth(Depth.UNIT).setAlpha(0.3).setInteractive()) || [];

    if (this.props.healthMax >= 1) this.healthBar = Unit.scene.add.graphics().setDepth(Depth.AMMO_CIRCLE);

    if (data.props.unitName === 'Blaster') {
      const indices = computeClosestCellIndicesInRange(this.simulation.state, this.xCoord, this.yCoord, this.props.attackRadius);
      this.cellIndicesInAttackRange = indices.filter(i => simulation.state.terrainData[i] <= elevation);
      this.ammoCircle = Unit.scene.add.graphics().setDepth(Depth.AMMO_CIRCLE);
      this.blastSprite = Unit.scene.add.sprite(this.x, this.y, this.getBlastSpriteTexture(this.props.attackRadius * GRID)).setDepth(Depth.MORTAR_SHELL).setVisible(false).setOrigin(0, 0.25);
      this.renderAmmo();
    } else if (data.props.unitName === 'Mortar') {
      this.cellIndicesInAttackRange = computeClosestCellIndicesInRange(this.simulation.state, this.xCoord, this.yCoord, this.props.attackRadius);
      this.ammoCircle = Unit.scene.add.graphics().setDepth(Depth.AMMO_CIRCLE);
      this.mortarShells.push(Unit.scene.add.sprite(this.x, this.y, 'Mortar_shell').setDepth(Depth.MORTAR_SHELL).setScale(1).setVisible(false));
      this.mortarShells.push(Unit.scene.add.sprite(this.x, this.y, 'Mortar_shell').setDepth(Depth.MORTAR_SHELL).setScale(1).setVisible(false));
      this.mortarShells.push(Unit.scene.add.sprite(this.x, this.y, 'Mortar_shell').setDepth(Depth.MORTAR_SHELL).setScale(1).setVisible(false));
      this.sprites[1].setVisible(false);
    }

    if (data.props.buildCost === 0 || data.built) this.build(data.props.buildCost + 1);

    this.simulation.state.entities.set(this.id, this);
    if (this.simulation.state.cells[this.cellIndex].ref) throw new Error('Cell is already occupied');
    this.simulation.state.cells[this.cellIndex].ref = this;
    if (this.props.isEnergyRoot) this.simulation.state.root = this;
    if (this.props.connectionRadius) this.simulation.connectToEnergyNetwork(this);
  }

  step() {
    if (this.isMoving) return;

    if (this.props.unitName === 'City') {
      // TODO
    } else if (this.props.unitName === 'Collector') {
      this.checkSelfDamage();
      this.checkEnergyNeeds();
    } else if (this.props.unitName === 'Relay') {
      this.checkSelfDamage();
      this.checkEnergyNeeds();
    } else if (this.props.unitName === 'Blaster') {
      this.checkSelfDamage();
      this.checkEnergyNeeds();
      this.selfHeal();
      this.blasterAttack();
    } else if (this.props.unitName === 'Mortar') {
      this.checkSelfDamage();
      this.checkEnergyNeeds();
      this.selfHeal();
      this.mortarAttack();
    } else if (this.props.unitName === 'Storage') {
      this.checkSelfDamage();
      this.checkEnergyNeeds();
    } else if (this.props.unitName === 'Speed') {
      this.checkSelfDamage();
      this.checkEnergyNeeds();
    } else if (this.props.unitName === 'Reactor') {
      this.checkSelfDamage();
      this.checkEnergyNeeds();
    } else if (this.props.unitName === 'Emitter') {
      this.emit();
    }
  }

  private checkEnergyNeeds() {
    if (this.isDestroyed || !this.active) return;

    if (!this.energyPath.found && this.props.unitName !== 'City') {
      if (!this.findPathAsyncInProgress) this.findPathAsync();
      return;
    }

    const tickCounter = this.simulation.state.tickCounter;
    if (tickCounter - this.lastEnergyRequest <= this.energyRequestCooldown) return;

    if (this.built) {
      if (this.ammoCurrent < this.props.ammoMax && this.pendingAmmo.length < this.props.ammoMax - this.ammoCurrent) {
        this.lastEnergyRequest = tickCounter;
        this.pendingAmmo.push(this.simulation.requestEnergy('ammo', 1, this));
      }
    } else {
      if (this.remainingBuildCost !== 0 && this.pendingBuild.length < this.remainingBuildCost) {
        this.lastEnergyRequest = tickCounter;
        this.pendingBuild.push(this.simulation.requestEnergy('build', 1, this));
      } else if (this.remainingBuildCost === 0) {
        this.build(1);
      }
    }
  }

  private selfHeal() {
    if (this.props.healthRegenPerSecond && this.healthCurrent < this.props.healthMax)
      this.healthCurrent = Math.min(this.healthCurrent + this.props.healthRegenPerSecond, this.props.healthMax);
  }

  private emit() {
    if (!this.active) return;
    const tickCounter = this.simulation.state.tickCounter;
    if (this.props.fluidDelay > tickCounter) return;
    if (this.props.fluidEmitEveryNthFrame > 1  && tickCounter % this.props.fluidEmitEveryNthFrame !== 1) return;
    const max = config.terrain.elevationMax + config.fluid.overflow;
    const amountPerTickAndEdge = (this.props.fluidPerSecond * TICK_DELTA);
    const amount = Math.min(Math.max(amountPerTickAndEdge, 0), max);
    const cell = this.simulation.state.cells[this.cellIndex];

    // amount is intentionally not divided by 4
    this.simulation.state.fluidData[cell.edgeIndexTL] = amount;
    this.simulation.state.fluidData[cell.edgeIndexTR] = amount;
    this.simulation.state.fluidData[cell.edgeIndexBL] = amount;
    this.simulation.state.fluidData[cell.edgeIndexBR] = amount;
  }

  hit(amount: number) {
    this.healthCurrent = Math.max(this.healthCurrent - amount, 0);
    if (this.healthCurrent === 0) this.destroy();
  }

  receiveEnergy(request: EnergyRequest): void {
    if (this.isDestroyed) return;
    if (!request) throw new Error('This structure does not have a pending energy request with that id');
    if (request.type === 'build') {
      this.build(request.amount);
      this.pendingBuild = this.pendingBuild.filter(r => r.id !== request.id);
    } else if (request.type === 'ammo') {
      this.ammoCurrent = Math.min(this.ammoCurrent + request.amount, this.props.ammoMax);
      this.pendingAmmo = this.pendingAmmo.filter(r => r.id !== request.id);
      if (this.ammoCircle) this.renderAmmo();
    }
  }

  private findPathAsync() {
    if (this.isDestroyed) return;
    const tickCounter = this.simulation.state.tickCounter;
    if (tickCounter - this.lastPathFindAttempt < 20) return;
    this.findPathAsyncInProgress = true;
    this.lastPathFindAttempt = tickCounter;
    this.simulation.findPathToEnergySourceAsync(this).then(path => {
      this.energyPath = path;
      this.findPathAsyncInProgress = false;
      if (path.found && this.built) {
        if (this.props.unitName === 'Collector') {
          this.simulation.state.collectorDataNeedsRefresh = true;
          this.simulation.state.collectorIds.add(this.id);
        }
      }
    });
  }

  private build(amount: number) {
    if (this.built || this.isDestroyed || (this.props.unitName !== 'City' && !this.energyPath.found)) return;
    this.remainingBuildCost = Math.max(this.remainingBuildCost - amount, 0);
    if (this.remainingBuildCost > 0) return;

    this.built = true;
    this.healthCurrent = this.props.healthMax;
    this.sprites.forEach(sprite => sprite.setAlpha(1));
    if (this.props.unitName === 'Collector' || this.props.unitName === 'City') {
      this.simulation.state.collectorDataNeedsRefresh = true;
      this.simulation.state.collectorIds.add(this.id);
    }
    if (this.props.energyProduction) this.simulation.state.energyProducing += this.props.energyProduction;
    if (this.props.energyStorageCapacity) this.simulation.state.energyStorageMax += this.props.energyStorageCapacity;
    if (this.props.speedIncrease) this.simulation.state.energyTravelSpeed += this.props.speedIncrease;
    if (this.props.fluidPerSecond) this.simulation.state.emitterIds.add(this.id);
    if (this.props.collectionRadius) Unit.sfx_startCollect.play();
  }

  destroy() {
    if (this.isDestroyed) return;
    this.sprites.forEach(sprite => sprite.destroy());
    if (this.ammoCircle) this.ammoCircle.destroy();
    if (this.healthBar) this.healthBar.destroy();
    if (this.blastSprite) this.blastSprite.destroy();
    this.mortarShells.forEach(shell => shell.destroy());
    Unit.particleImpact.explode(20, this.x, this.y);
    this.isDestroyed = true;
    this.healthCurrent = 0;
    this.simulation.removeEntity(this.id);

    if (this.props.energyStorageCapacity) this.simulation.state.energyStorageMax -= this.props.energyStorageCapacity;
    if (this.props.energyProduction) this.simulation.state.energyProducing -= this.props.energyProduction;
    if (this.props.speedIncrease) this.simulation.state.energyTravelSpeed -= this.props.speedIncrease;
    if (this.props.collectionRadius) {
      this.simulation.state.collectorDataNeedsRefresh = true;
      this.simulation.state.collectorIds.delete(this.id);
    }
    if (this.props.fluidPerSecond) this.simulation.state.emitterIds.delete(this.id);
  }

  private renderAmmo() {
    if (this.props.unitName !== 'Blaster' && this.props.unitName !== 'Mortar') return;
    if (this.isMoving) return;
    const rotation = -45; // Make it so it appears to start and end at the top
    this.ammoCircle.clear();
    this.ammoCircle.setDepth(Depth.AMMO_CIRCLE);
    this.ammoCircle.setVisible(true);
    this.ammoCircle.setPosition(this.x, this.y);
    this.ammoCircle.setRotation(Phaser.Math.DegToRad(rotation));
    this.ammoCircle.lineStyle(1, 0x000000, 1);
    this.ammoCircle.fillStyle(0xff0000, 1);
    const degrees = 360 * (this.ammoCurrent / this.props.ammoMax);
    this.ammoCircle.slice(0, 0, GRID - 1, Phaser.Math.DegToRad(rotation), Phaser.Math.DegToRad(rotation + degrees));
    this.ammoCircle.fillPath();

    if (this.props.unitName === 'Mortar') {
      const shellVisible = this.ammoCurrent >= this.props.ammoCost;
      this.sprites[1].setVisible(shellVisible);
    }
  }

  private renderHealth() {
    const length = this.props.size === '3x3' ? HALF_GRID * 3 : HALF_GRID * 9;
    let factor = 0;
    this.healthBar.clear().setVisible(true);
    this.healthBar.displayOriginY = 0.5;

    if (this.built) {
      if (this.props.healthMax === 0 || this.healthCurrent === this.props.healthMax) return;
      factor = this.healthCurrent / this.props.healthMax;
      this.healthBar.fillRect(this.x - HALF_GRID, this.y + GRID, length * factor, 2);
    } else {
      if (this.remainingBuildCost === 0) return;
      factor = 1 - (this.remainingBuildCost / this.props.buildCost);
    }
    this.healthBar.fillStyle(0xaaaaaa, 1);
    this.healthBar.fillRect(this.x - (length/2), this.y + GRID, length, 3);
    this.healthBar.fillStyle(0x00ff00, 1);
    this.healthBar.fillRect(this.x - (length/2), this.y + GRID, length * factor, 3);
  }

  private getBlastSpriteTexture(euclideanDistance: number): string {
    const key = `blast-${Math.round(euclideanDistance)}`;
    if (!this.textureKeysBlast.has(key)) {
      const WIDTH = 5;
      const graphics = Unit.scene.add.graphics();
      graphics.lineStyle(WIDTH, 0xff0000, 1);
      graphics.lineBetween(HALF_GRID * 3, 0, euclideanDistance, 0);
      graphics.generateTexture(key, euclideanDistance, WIDTH);
      graphics.destroy();
      this.textureKeysBlast.add(key);
    }
    return key;
  }

  // TODO this (unsurprisingly) is becoming a horrible spaghetti mess of brittle special cases for any new stuff I want to add
  //  Putting everything back into a single class again was supposed to be a temporary measure to re-learn the codebase before doing a proper refactor
  //  I don't think I am actually going to turn it into an ECS architecture I think once things are running I will start breaking behaviour up into reusable logical units
  //  Then maybe get rid of the base Unit and compose all entities from those logical units. This is not quite ECS but a format which is more familiar to me.
  //  To re-implement this mess using ECS I first need to do a new project using it to get a feel for it...
  // TODO moveTo is becomeing annoying. It might be simpler to silently destroy and recreate the entity when it lands and init it with some state like ammo and build status
  moveTo(coordX: number, coordY: number) {
    const newX = coordX * GRID + HALF_GRID;
    const newY = coordY * GRID + HALF_GRID;

    const newCellIndex = cellIndexAt(coordX, coordY);
    if (this.simulation.state.cells[newCellIndex].ref === this) return;
    if (!this.props.movable || this.isDestroyed) throw new Error('This structure is not movable or already destroyed');

    this.isMoving = true;
    this.simulation.state.cells[this.cellIndex].ref = null;
    this.energyPath = Unit.NOT_FOUND;
    if (this.simulation.state.root) this.simulation.state.graph.removeEdgeBetween(this.id, this.simulation.state.root.id);
    this.simulation.state.graph.getNeighbourVertices(this.id).then(neighbours => {
      neighbours.forEach(neighbour => {
        const otherEntity = this.simulation.state.entities.get(neighbour);
        if (!otherEntity) throw new Error('Neighbour entity not found');
        this.simulation.renderingAdapter.destroyConnectionBetween(this, otherEntity);
      });
    });
    this.simulation.state.graph.removeVertex(this.id);

    this.sprites.forEach(sprite => sprite.setScale(1));

    // TODO make speed consistent. Something wrong when moving and moving back while moving
    const distance = Math.sqrt((newX - this.x) ** 2 + (newY - this.y) ** 2);
    const pxPerSecond = 100;
    const duration = distance / pxPerSecond * 1000;

    if (this.moveToTween) this.moveToTween.stop().destroy();
    this.moveToTween = Unit.scene.tweens.add({
      targets: this.sprites,
      x: { value: newX, duration: duration, ease: 'Linear' },
      y: { value: newY, duration: duration, ease: 'Linear' },
      scaleX: { value: 1.3, duration: duration / 2, yoyo: true, repeat: 0 },
      scaleY: { value: 1.3, duration: duration / 2, yoyo: true, repeat: 0 },
      onStart: () => {
        this.ammoCircle.setVisible(false);
        this.healthBar.setVisible(false);
        this.pendingBuild = [];
        this.pendingAmmo = [];
        this.sprites.forEach(sprite => sprite.setDepth(Depth.UNIT_MOVING));

      },
      onComplete: () => {
        this.isMoving = false;
        this.cellIndex = newCellIndex;
        this.xCoord = coordX;
        this.yCoord = coordY;
        this.x = newX;
        this.y = newY;
        this.renderAmmo();
        this.renderHealth();
        this.simulation.state.cells[newCellIndex].ref = this;
        this.simulation.state.graph.removeVertex(this.id);
        this.sprites.forEach(sprite => sprite.setDepth(Depth.UNIT));
        this.resetPath();
        if (this.props.connectionRadius) this.simulation.connectToEnergyNetwork(this);

        this.moveToTween?.destroy();

        const elevation = computeTerrainElevation(this.cellIndex, this.simulation.state);
        if (elevation % (THRESHOLD * 3) !== 0) throw new Error('Structure must be placed on a cell where all 4 edges are on the same elevation layer');

        if (this.props.unitName === 'Mortar') {
          this.cellIndicesInAttackRange = computeClosestCellIndicesInRange(this.simulation.state, this.xCoord, this.yCoord, this.props.attackRadius);
        } else if (this.props.unitName === 'Blaster') {
          const indices = computeClosestCellIndicesInRange(this.simulation.state, this.xCoord, this.yCoord, this.props.attackRadius);
          this.cellIndicesInAttackRange = indices.filter(i => this.simulation.state.terrainData[i] <= elevation);
        }
      },
    });
  }

  resetPath() {
    this.energyPath = Unit.NOT_FOUND;
    // It would be better to not disconnect the path while moving but re-calc it constantly each step and keep the packets moving dynamically
    // I might change the whole pathfinding to a more dynamic approach where the node maintains a routing table where the energy balls at each hop decide where to go next
    // Right now I cache the whole path from start to finish for each node separately and the energy ball simply follows this path without any decision making.
    // I could model it like a pseudo tcp/ip model where each node has the equivalent of an ip Address (maybe just the coords?) and each node has a routing table which
    // allows the energy ball to make a decision at each hop where to go next (Or the energy ball could simply call a method on it's current node which gives it the next best node to hop to)
    // As long as I can optimize the routing table lookups to max 1-2 ms overhead per tick for 1000-2000 energy balls at once it should be fine.
    // I would have a worker thread which instead of computing the path for each node separately, would compute the routing table for all nodes at once. Not sure how fast I can make that work...
    // It would only need to be re-run when a node is: created, deactivated, moved or destroyed. I would trigger it each tick in the background when necessary.
    // It will likely be considerably faster than the tick (50ms) so should be ready in time, if not, I will delay the next tick until it is ready.

    // The most simple way I can think of is to have every node of the energy network send a status "pulse" each tick to it's direct neighbours notifying them which addresses can be reached from them
    // This means that it will take multiple ticks to propagate the information through the network. Nodes would only send pulses when they experienced a change in their routing table.
    // The pulsing could continue forever and does grow exponentially to the number of nodes. Not quite sure if feasable. Need to check what protocols real internet backbone routers use for this...
    // After a short research what I might want to implement is the "Optimized Link State Routing Protocol" with "MultiPoint Relaying (MPR)" to reduce message flooding.
    // https://www.geeksforgeeks.org/optimized-link-state-routing-protocol

    // If dijkstra is fast enough I could simply check the distance for each newly added node to every other node. Then for every Other node I update their table to also include the new node.
    this.pendingBuild = [];
    this.pendingAmmo = [];

    // To prevent energyBalls from other nodes moving along the old path we need to check if this entities ID is part of their path and also reset it
    // TODO monitor performance of this. Pathfinding is usually fast enough but if not ready by the next frame the game becomes less deterministic.
    // calling resetPath like this might cause a wave of unnecessary pathfinding requests without further optimization
    for (const entity of this.simulation.state.entities.values()) {
      if (entity.energyPath.ids.has(this.id)) entity.resetPath();
    }
  }

  blasterAttack() {
    if (this.ammoCurrent < this.props.ammoCost) return;
    if (this.simulation.state.tickCounter - this.lastAttack <= this.props.attackCooldown) return;

    for (const index of this.cellIndicesInAttackRange) {
      const cell = this.simulation.state.cells[index];
      const fluidElevation = computeFluidElevation(index, this.simulation.state);
      if (fluidElevation >= THRESHOLD) {
        this.ammoCurrent -= this.props.ammoCost;
        this.lastAttack = this.simulation.state.tickCounter;
        this.renderAmmo();

        // Rotate the Blaster_top sprite towards the target
        const dx = cell.xCoord - this.xCoord;
        const dy = cell.yCoord - this.yCoord;
        const angle = Math.atan2(dy, dx);
        const degrees = Phaser.Math.RadToDeg(angle);
        this.sprites[1].setAngle(degrees + 90); // +90 because the Blaster_top sprite is rotated 90 degrees
        this.simulation.fluidChangeRequest(cell.xCoord, cell.yCoord, -this.props.damage, this.props.damagePattern);

        this.blastSprite.setTexture(this.getBlastSpriteTexture(Math.sqrt((cell.x - this.x) ** 2 + (cell.y - this.y) ** 2)));
        setTimeout(() => this.blastSprite.setVisible(false).setActive(false), 75);
        this.blastSprite.setAngle(degrees).setVisible(true).setActive(true).setPosition(this.x, this.y);
        Unit.particleImpact.explode(20, cell.x, cell.y);
        Unit.sfx_blasterHit.play();
        break;
      }
    }
  }

  mortarAttack() {
    if (this.ammoCurrent < this.props.ammoCost) return;
    if (this.simulation.state.tickCounter - this.lastAttack <= this.props.attackCooldown) return;

    // Find cell with highest fluid elevation in attack range
    let highestFluidCell: Cell | null = null;
    let highestFluidElevation = 0;

    for (const index of this.cellIndicesInAttackRange) {
      const cell = this.simulation.state.cells[index];
      const fluidElevation = computeFluidElevation(index, this.simulation.state);

      if (fluidElevation < THRESHOLD) continue;

      if (highestFluidCell === null || fluidElevation > highestFluidElevation) {
        highestFluidCell = cell;
        highestFluidElevation = fluidElevation;
      }
    }

    if (highestFluidCell === null) return;

    this.ammoCurrent -= this.props.ammoCost;
    this.lastAttack = this.simulation.state.tickCounter;
    this.renderAmmo();

    // duration adjusted by distance so it flies longer the further away the target is
    const distance = Math.sqrt((highestFluidCell.x - this.x) ** 2 + (highestFluidCell.y - this.y) ** 2);
    const maxDistance = this.props.attackRadius * GRID;
    const TOTAL_DURATION = 1500 * (distance / maxDistance);
    Unit.sfx_mortarShellStart.play();
    const tween = Unit.scene.tweens.add({
      targets: this.mortarShells[0],
      x: { value: highestFluidCell.x, duration: TOTAL_DURATION, ease: 'Linear' },
      y: { value: highestFluidCell.y, duration: TOTAL_DURATION, ease: 'Linear' },
      scaleX: { value: 1.5, duration: TOTAL_DURATION / 2, yoyo: true, repeat: 0, ease: 'Bounce.inOut' },
      scaleY: { value: 1.5, duration: TOTAL_DURATION / 2, yoyo: true, repeat: 0, ease: 'Bounce.inOut' },
      angle: { value: 1080, duration: TOTAL_DURATION, ease: 'Linear' },
      onStart: () => {
        const shell = this.mortarShells.shift();
        shell?.setPosition(this.x, this.y);
        shell?.setVisible(true);
        if (!shell) throw new Error('No more mortar shells');
        this.mortarShells.push(shell);
      },
      onComplete: () => {
        (tween.targets[0] as Phaser.GameObjects.Sprite).setVisible(false);
        if (!highestFluidCell) throw new Error('cell is null');
        this.simulation.fluidChangeRequest(highestFluidCell.xCoord, highestFluidCell.yCoord, -this.props.damage, this.props.damagePattern);
        Unit.particleImpact.explode(30, highestFluidCell.x, highestFluidCell.y);
        Unit.sfx_mortarShellHit.play();
        tween.destroy();
      },
    });

  }

  private checkSelfDamage() {
    if (this.isDestroyed || this.props.fluidPerSecond) return;
    if (this.isMoving) return; // cannot be damaged while moving
    const fluidData = this.simulation.state.fluidData;
    const {edgeIndexTL, edgeIndexTR, edgeIndexBL, edgeIndexBR} = this.simulation.state.cells[this.cellIndex];
    const shouldTakeDamage = fluidData[edgeIndexTL] > THRESHOLD || fluidData[edgeIndexTR] > THRESHOLD || fluidData[edgeIndexBR] > THRESHOLD || fluidData[edgeIndexBL] > THRESHOLD;
    if (shouldTakeDamage) this.hit(3);
    this.renderHealth();
  }

  static initStatic(scene: Phaser.Scene) {
    Unit.scene = scene;
    if (!Unit.sfx_place_structure) Unit.sfx_place_structure = scene.sound.add('place_structure', {detune: 200, rate: 1.25, volume: 1 , loop: false});

    if (!Unit.sfx_startCollect) Unit.sfx_startCollect = scene.sound.add('start_collect', {detune: 600, rate: 1.25, volume: 0.35 , loop: false});
    if (!Unit.sfx_blasterHit) Unit.sfx_blasterHit = scene.sound.add('attack_turret', {detune: 0, rate: 1.25, volume: 0.35 , loop: false});
    if (!Unit.sfx_mortarShellHit) Unit.sfx_mortarShellHit = scene.sound.add('attack_turret', {detune: -1000, rate: 0.5, volume: 1.5, loop: false});
    if (!Unit.sfx_mortarShellStart) Unit.sfx_mortarShellStart = scene.sound.add('attack_turret', {detune: -600, rate: 1.75, volume: 0.7, loop: false});

    if (!Unit.particleImpact) {
      Unit.particleImpact = scene.add.particles(0, 0, 'energy_red', {
        frequency: -1,
        lifespan: 200,
        speed: {min: 200, max: 300},
        scale: {start: 0.4, end: 0.2},
        quantity: 1,
        blendMode: 'ADD',
      }).setDepth(Depth.PARTICLE_IMPACT);
    }

    if (!Unit.particlePlaceEntity) {
      Unit.particlePlaceEntity = scene.add.particles(0, 0, 'energy', {
        frequency: -1,
        lifespan: 150,
        speed: {min: 200, max: 300},
        scale: {start: 0.4, end: 0.3},
        quantity: 1,
        blendMode: 'ADD',
      }).setDepth(Depth.PARTICLE_IMPACT);
    }

    if (!Unit.selectedOutline) {
      Unit.selectedOutline = scene.add.graphics().setDepth(Depth.UNIT_SELECTION_OUTLINE);
      Unit.selectedOutline.lineStyle(2, 0x00ff00, 1);
      Unit.selectedOutline.strokeRect(0, 0, GRID, GRID);
    }
  }
}

// EmitSystem
// CollectionSystem
// DamageSystem
// RegenerationSystem
// EnergySystem
//
