import {SceneKeys} from '..';
import { Cell, City } from '../City';
import { Collector } from '../structures/Collector';
import { Network } from '../Network';
import { Weapon } from '../structures/Weapon';

type CameraRotations = '0' | '90' | '180' | '270';
export default class GameScene extends Phaser.Scene {
  observer: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();
  controls!: Phaser.Cameras.Controls.SmoothedKeyControl;
  gridSize: number = 40;
  mapSizeX: number = 17;
  mapSizeY: number = 17;

  worldData: Cell[][] = [];
  city!: City;
  network!: Network;

  private selectedStructure: 'Collector' | 'Weapon' | null = null;
  private structures = {[Weapon.name]: Weapon, [Collector.name]: Collector};

  constructor() {
    super({key: SceneKeys.GAME_SCENE});
    for (let y = 0; y < this.mapSizeY; y++) {
      const row : Cell[]= [];
      for (let x = 0; x < this.mapSizeX; x++) {
        row.push({x, y, ref: null});
      }
      this.worldData.push(row);
    }

    console.log('worldData', this.worldData);
  }

  private create() {
    this.setupCameraAndInput();
    this.observer.removeAllListeners();
    this.network = new Network(this);
    this.city = new City(this, Math.floor(this.mapSizeX / 2), Math.floor(this.mapSizeY / 2));

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.lineStyle(1, 0xcccccc, 1);
    graphics.fillRect(0, 0, this.gridSize, this.gridSize);
    graphics.strokeRect(0, 0, this.gridSize, this.gridSize);
    graphics.generateTexture('cell_white', this.gridSize, this.gridSize);
    graphics.clear();
    this.add.tileSprite(0, 0, this.gridSize * this.mapSizeX,this.gridSize * this.mapSizeY, 'cell_white').setOrigin(0, 0);

    graphics.fillStyle(0xe2ffe9, 1);
    graphics.lineStyle(1, 0x888888, 1);
    graphics.fillRect(0, 0, this.gridSize, this.gridSize);
    graphics.strokeRect(0, 0, this.gridSize, this.gridSize);
    graphics.generateTexture('cell_green', this.gridSize, this.gridSize);
    graphics.destroy();

    new Weapon(this, 18, 2);
    new Weapon(this, 19, 3);
    new Weapon(this, 20, 2);
    new Weapon(this, 21, 3);
    new Weapon(this, 22, 2);
  }

  update(time: number, delta: number) {
    this.controls.update(delta);
  }

  private setupCameraAndInput() {
    // CAMERA STUFF
    const camera = this.cameras.main;
    camera.setZoom(1);
    camera.setBackgroundColor(0x333333);
    camera.centerOnX(this.gridSize * this.mapSizeX / 2);
    camera.centerOnY(this.gridSize * this.mapSizeY / 2);

    // KEYBOARD STUFF
    let cameraRotationDeg = 0;
    let rotating = false;
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('cursors is null');
    const keyW = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const keyA = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const keyS = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const keyD = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const keyR = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    const keyONE = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    const keyTWO = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    const keyESC = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const keyX = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    const rotKeyMap: {[key in CameraRotations]: [Phaser.Input.Keyboard.Key, Phaser.Input.Keyboard.Key, Phaser.Input.Keyboard.Key, Phaser.Input.Keyboard.Key]} = {
      '0': [keyW, keyA, keyS, keyD],
      '90': [keyD, keyW, keyA, keyS],
      '180': [keyS, keyD, keyW, keyA],
      '270': [keyA, keyS, keyD, keyW],
    };

    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl({
      camera,
      up: rotKeyMap[String(cameraRotationDeg) as CameraRotations][0],
      left: rotKeyMap[String(cameraRotationDeg) as CameraRotations][1],
      down: rotKeyMap[String(cameraRotationDeg) as CameraRotations][2],
      right: rotKeyMap[String(cameraRotationDeg) as CameraRotations][3],
      zoomIn: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      zoomOut: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      acceleration: 10,
      drag: 0.1,
      maxSpeed: 0.5,
      maxZoom: 4/3,
      minZoom: 2/3,
    });

    keyR.onDown = evt => {
      if (rotating) return;
      if(evt.ctrlKey) return;
      rotating = true;
      cameraRotationDeg = cameraRotationDeg + 90;
      if (cameraRotationDeg >= 360) cameraRotationDeg = 0;
      camera.rotateTo(Phaser.Math.DegToRad(cameraRotationDeg), false, 350, 'Linear', false, (ref, progress) => {if (progress === 1) rotating = false;});
      if (!this.controls) return;
      this.controls.up = rotKeyMap[String(cameraRotationDeg) as CameraRotations][0];
      this.controls.left = rotKeyMap[String(cameraRotationDeg) as CameraRotations][1];
      this.controls.down = rotKeyMap[String(cameraRotationDeg) as CameraRotations][2];
      this.controls.right = rotKeyMap[String(cameraRotationDeg) as CameraRotations][3];
    };

    keyONE.onDown = () => this.selectedStructure = 'Collector';
    keyTWO.onDown = () => this.selectedStructure = 'Weapon';
    keyESC.onDown = () => this.selectedStructure = null;
    keyX.onDown = () => this.selectedStructure = null;

    // MOUSE AND POINTER STUFF
    const input = this.input;
    input.mousePointer.motionFactor = 0.5;
    input.pointer1.motionFactor = 0.5;

    input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const { x, y } = p.velocity;
      camera.scrollX -= x / camera.zoom;
      camera.scrollY -= y / camera.zoom;
    });

    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const { worldX, worldY } = p;
      const coordX = Math.floor(worldX / this.gridSize);
      const coordY = Math.floor(worldY / this.gridSize);
      console.log('pointerdown', coordX, coordY);
      this.network.placeNode(coordX, coordY);
    });

    input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: unknown[], deltaX: number, deltaY: number) => {
      const newZoom = camera.zoom - (deltaY > 0 ? 0.025 : -0.025);
      const clampedZoom = Phaser.Math.Clamp(newZoom, 2/3, 4/3);
      camera.zoom = clampedZoom;
    });
  }
}
