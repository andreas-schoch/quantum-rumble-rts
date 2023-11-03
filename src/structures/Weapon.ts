import { Cell, EnergyRequest } from './City';
import GameScene from '../scenes/GameScene';
import { GRID, WORLD_DATA } from '..';
import { BaseStructure } from './BaseStructure';

export class Weapon extends BaseStructure {
  name = 'Weapon';
  isRelay = false;
  movable = true;
  connectionRange = 5;
  energyCollectionRange = 0;
  energyProduction = 0;

  energyStorageCapacity = 0;
  healthMax = 100;
  buildCost = 5;
  ammoCost = 0.25;

  updatePriority = 1;

  ammoMax = 10;
  ammoCurrent = 0;
  lastAttack: number;
  private attackRange = 5;
  private attackCooldown = 5; // num ticks for now
  private graphics: Phaser.GameObjects.Graphics;

  pendingAmmo: EnergyRequest[] = [];

  static attackSFX: Phaser.Sound.BaseSound;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    if (!Weapon.attackSFX) Weapon.attackSFX = scene.sound.add('attack_turret', {detune: -200, rate: 1.25, volume: 0.5 , loop: false});
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
    Weapon.attackSFX.play();
    this.scene.creeperFlow.damage(this.coordX, this.coordY, 20);
  }

  protected getNearestTarget(): Cell | null {
    let nearest: Cell | null = null;
    let nearestDistance = Infinity;

    for (let y = this.coordY - this.attackRange; y <= this.coordY + this.attackRange; y++) {
      for (let x = this.coordX - this.attackRange; x <= this.coordX + this.attackRange; x++) {
        if (x < 0 || y < 0 || x >= WORLD_DATA.length || y >= WORLD_DATA[0].length) continue; // skip out of bounds
        const cell = WORLD_DATA[y][x];
        if (!cell.ref) continue; // skip empty cells
        const distance = Math.abs(x - this.coordX) + Math.abs(y - this.coordY); // manhattan distance, not euclidean
        if (distance > this.attackRange) continue; // skip cells that are out of range
        if (distance < nearestDistance) {
          nearest = cell;
          nearestDistance = distance;
        }
      }
    }
    return nearest;
  }

  protected draw() {
    const rotation = -45;
    this.graphics.clear();
    this.graphics.setPosition(this.x, this.y);
    this.graphics.setRotation(Phaser.Math.DegToRad(rotation));
    this.graphics.lineStyle(2, 0x000000, 1);
    // background
    this.graphics.fillStyle(0xd3d3d3  , 1);
    BaseStructure.drawStar(this.graphics, 0, 0, 4, GRID * 0.6, GRID * 0.3);
    this.graphics.fillCircle(0, 0, GRID * 0.4);
    // progressbar
    this.graphics.fillStyle(0xff0000, 1);
    const degrees = 360 * (this.ammoCurrent / this.ammoMax);
    this.graphics.slice(0, 0, GRID * 0.4, Phaser.Math.DegToRad(rotation), Phaser.Math.DegToRad(rotation + degrees));
    this.graphics.fillPath();
    this.graphics.strokeCircle(0, 0, GRID * 0.4);
    // inside
    this.graphics.fillStyle(0xffffff, 2);
    this.graphics.fillCircle(0, 0, GRID * 0.2);
    this.graphics.strokeCircle(0, 0, GRID * 0.2);
    this.graphics.setDepth(12);
  }
}
