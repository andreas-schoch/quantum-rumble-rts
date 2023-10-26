import { Cell, EnergyRequest } from '../City';
import GameScene from '../scenes/GameScene';
import { GRID, WORLD_DATA } from '..';
import { BaseStructure } from './BaseStructure';

export class Weapon extends BaseStructure {
  name = 'Weapon';
  relay = false;
  connectionRange = 5;

  private graphics: Phaser.GameObjects.Graphics;
  private health = 100;
  private totalAmmo = 10;
  private currentAmmo = 10;
  private buildEnergyRequired = 100;
  private buildEnergyReceived = 0;
  private attackRange = 5;
  private lastAttackTime: number = -1;
  private cooldown = 1000;

  constructor(scene: GameScene, coordX: number, coordY: number) {
    super(scene, coordX, coordY);
    this.graphics = scene.add.graphics();
    this.draw();

    this.scene.city.requestEnergy({
      id: Math.random().toString(36).substring(2, 9),
      type: 'energy',
      amount: 100,
      requester: this
    });
  }

  receiveEnergy(amount: number, requestId: string): void {
    console.log('received energy', amount, requestId);
  }

  draw() {
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
    const degrees = 360 * (this.currentAmmo / this.totalAmmo);
    this.graphics.slice(0, 0, GRID * 0.4, Phaser.Math.DegToRad(rotation), Phaser.Math.DegToRad(rotation + degrees));
    this.graphics.fillPath();
    this.graphics.strokeCircle(0, 0, GRID * 0.4);
    // inside
    this.graphics.fillStyle(0xffffff, 2);
    this.graphics.fillCircle(0, 0, GRID * 0.2);
    this.graphics.strokeCircle(0, 0, GRID * 0.2);
    this.graphics.setDepth(12);
  }

  attack() {
    if (this.currentAmmo <= 0) return;
    if (this.scene.game.getTime() - this.lastAttackTime > this.cooldown) return;
    const nearestTarget = this.getNearestTarget();
    if (!nearestTarget) return;
    this.currentAmmo--;
    this.lastAttackTime = this.scene.game.getTime();
    this.draw();
  }

  getNearestTarget(): Cell | null {
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

  damage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) this.scene.observer?.emit('weapon_destroyed', this);
  }

  move(coordX: number, coordY: number) {
    this.coordX = coordX;
    this.coordY = coordY;
    this.draw();
  }

  requestEnergy(request: EnergyRequest) {
    this.scene.observer?.emit('energy_request', request);
  }

  static generateTextures(): void {
    // TODO generate the dynamic red ammo texture as a spritesheet animation

  }
}
