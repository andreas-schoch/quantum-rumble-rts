import { EnergyRequest } from '../Network';
import GameScene from '../scenes/GameScene';
import { Depth, GRID, THRESHOLD } from '../constants';
import { BaseStructure } from './BaseUnit';
import { drawStar } from '../util';

// TODO consider refactoring everything to use ECS instead of inheritance...
// (or at least create classes like HealthComponent, EnergyComponent, WeaponComponent etc. that can be added to units that need them)
export class BaseWeaponStructure extends BaseStructure {
  static unitName = 'Weapon';
  static buildCost = 5;
  static isRelay = false;
  static movable = true;
  static connectionRange = 5;
  static energyCollectionRange = 0;
  static energyProduction = 0;
  static energyStorageCapacity = 0;
  static healthMax = 100;
  static damage = THRESHOLD * 8;

  ammoCost = 0.25;
  updatePriority = 1;
  ammoMax = 10;
  ammoCurrent = 0;
  lastAttack: number;
  private attackRange = 5;
  private attackCooldown = 5; // num ticks for now
  private graphics: Phaser.GameObjects.Graphics;
  // center cell and direct neighbors
  private damagePattern: number[][] = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]; // self and direct neighbors
  // private damagePattern: number[][] = [[0, 0], [1, 0], [1, 1], [0, 1], [0, -1], [1, -1], [2, 0], [2, 1], [0, 2], [1, 2], [-1, 0], [-1, 1]];

  pendingAmmo: EnergyRequest[] = [];

  static attackSFX: Phaser.Sound.BaseSound;

  constructor(scene: GameScene, coordX: number, coordY: number, elevation: number) {
    super(scene, coordX, coordY, elevation);
    if (!BaseWeaponStructure.attackSFX) BaseWeaponStructure.attackSFX = scene.sound.add('attack_turret', {detune: -200, rate: 1.25, volume: 0.5 , loop: false});
    this.graphics = scene.add.graphics();
    this.draw();
  }

  tick(tickCounter: number) {
    if (!super.tick(tickCounter)) return;
    if (this.built && this.ammoCurrent < this.ammoMax && this.pendingAmmo.length < this.ammoMax - this.ammoCurrent) {
      this.pendingAmmo.push(this.scene.network.requestEnergy('ammo', 1, this));
    }
    this.attack(tickCounter);
    return true;
  }

  move(coordX: number, coordY: number) {
    if (!super.move(coordX, coordY)) return;
    this.draw();
  }

  receiveEnergy(request: EnergyRequest): void {
    super.receiveEnergy(request);
    if (request.type === 'ammo') {
      this.ammoCurrent = Math.min(this.ammoCurrent + request.amount, this.ammoMax);
      this.pendingAmmo = this.pendingAmmo.filter(r => r.id !== request.id);
    }
  }

  protected destroy(): void {
    super.destroy();
    this.graphics.destroy();
  }

  protected attack(tickCounter: number) {
    if (this.ammoCurrent < this.ammoCost) return;
    if (tickCounter - this.lastAttack <= this.attackCooldown) return;

    if (Math.random() > 0.6666) return; // TODO remove this once there are enemies
    // if (this.scene.game.getTime() - this.lastAttackTime > this.cooldown) return;
    // const nearestTarget = this.getNearestTarget();
    // if (!nearestTarget) return;
    this.ammoCurrent -= this.ammoCost;
    this.lastAttack = tickCounter;
    this.draw();
    BaseWeaponStructure.attackSFX.play();
    // const xCoord = Math.floor(nearestTarget.x / GRID);
    // const yCoord = Math.floor(nearestTarget.y / GRID);
    // this.scene.simulation.fluidChangeRequest(xCoord, yCoord, -BaseWeaponStructure.damage, this.damagePattern);
    this.scene.simulation.fluidChangeRequest(this.xCoord, this.yCoord, -BaseWeaponStructure.damage, this.damagePattern);
  }

  // protected getNearestTarget(): Cell | null {
  //   const nearest: Cell | null = null;
  //   const nearestDistance = Infinity;

  //   const fluidData = this.scene.simulation.fluidData;

  //   for (let y = this.coordY - this.attackRange; y <= this.coordY + this.attackRange; y++) {
  //     for (let x = this.coordX - this.attackRange; x <= this.coordX + this.attackRange; x++) {
  //       if (x < 0 || y < 0 || x >= level.sizeX || y >= level.sizeY) continue; // skip out of bounds
  //       // const cell = this.scene.network.world[y][x];

  //       const indexTL = y * (level.sizeX + 1) + x;
  //       const indexBL = indexTL + level.sizeX + 1;
  //       const indexTR = indexTL + 1;
  //       const indexBR = indexBL + 1;

  //       const fluidTL = fluidData[indexTL];
  //       const fluidTR = fluidData[indexTR];
  //       const fluidBR = fluidData[indexBR];
  //       const fluidBL = fluidData[indexBL];
  //       const avg = (fluidTL + fluidTR + fluidBR + fluidBL) / 4;

  //       const distance = Math.abs(x - this.coordX) + Math.abs(y - this.coordY); // manhattan distance, not euclidean
  //       if (distance > this.attackRange) continue; // skip cells that are out of range
  //       if (distance < nearestDistance) {
  //       }
  //     }
  //   }
  //   return nearest;
  // }

  protected draw() {
    const rotation = -45;
    this.graphics.clear();
    this.graphics.setPosition(this.x, this.y);
    this.graphics.setRotation(Phaser.Math.DegToRad(rotation));
    this.graphics.lineStyle(2, 0x000000, 1);
    // background
    this.graphics.fillStyle(0xd3d3d3  , 1);
    drawStar(this.graphics, 0, 0, 4, GRID * 3 * 0.6, GRID * 3 * 0.3);
    this.graphics.fillCircle(0, 0, GRID * 3 * 0.4);
    // progressbar
    this.graphics.fillStyle(0xff0000, 1);
    const degrees = 360 * (this.ammoCurrent / this.ammoMax);
    this.graphics.slice(0, 0, GRID * 3 * 0.4, Phaser.Math.DegToRad(rotation), Phaser.Math.DegToRad(rotation + degrees));
    this.graphics.fillPath();
    this.graphics.strokeCircle(0, 0, GRID * 3 * 0.4);
    // inside
    this.graphics.fillStyle(0xffffff, 2);
    this.graphics.fillCircle(0, 0, GRID * 3 * 0.2);
    this.graphics.strokeCircle(0, 0, GRID * 3 * 0.2);
    this.graphics.setDepth(Depth.UNIT);
  }
}
