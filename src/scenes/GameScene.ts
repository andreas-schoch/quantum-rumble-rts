import {DEFAULT_WIDTH, DEFAULT_ZOOM, GRID, MAX_ZOOM, MIN_ZOOM, STRUCTURE_BY_NAME, SceneKeys, WORLD_DATA, WORLD_X, WORLD_Y} from '..';
import { Cell, City } from '../City';
import { Network } from '../Network';
import { Structure } from '../structures/BaseStructure';
import { Collector } from '../structures/Collector';
import { Weapon } from '../structures/Weapon';

type CameraRotations = '0' | '90' | '180' | '270';
export default class GameScene extends Phaser.Scene {
  observer: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();
  controls!: Phaser.Cameras.Controls.SmoothedKeyControl;
  city!: City;
  network!: Network;
  private selectedStructure: Structure['name'] | null = null; // TODO fix this

  constructor() {
    super({key: SceneKeys.GAME_SCENE});
    for (let y = 0; y < WORLD_Y; y++) {
      const row : Cell[]= [];
      for (let x = 0; x < WORLD_X; x++) {
        row.push({x, y, ref: null});
      }
      WORLD_DATA.push(row);
    }

    console.log('worldData', WORLD_DATA);
  }

  private create() {
    this.setupCameraAndInput();
    this.observer.removeAllListeners();
    this.network = new Network(this);
    this.city = new City(this, Math.floor(WORLD_X / 2), Math.floor(WORLD_Y / 2));

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.lineStyle(1, 0xcccccc, 1);
    graphics.fillRect(0, 0, GRID, GRID);
    graphics.strokeRect(0, 0, GRID, GRID);
    graphics.generateTexture('cell_white', GRID, GRID);
    graphics.clear();
    this.add.tileSprite(0, 0, GRID * WORLD_X,GRID * WORLD_Y, 'cell_white').setOrigin(0, 0);

    graphics.fillStyle(0xe2ffe9, 1);
    graphics.lineStyle(1, 0x888888, 1);
    graphics.fillRect(0, 0, GRID, GRID);
    graphics.strokeRect(0, 0, GRID, GRID);
    graphics.generateTexture('cell_green', GRID, GRID);
    graphics.destroy();

    // new Weapon(this, 18, 2);
    // new Weapon(this, 19, 3);
    // new Weapon(this, 20, 2);
    // new Weapon(this, 21, 3);
    // new Weapon(this, 22, 2);
  }

  update(time: number, delta: number) {
    this.controls.update(delta);
  }

  private setupCameraAndInput() {
    // CAMERA STUFF
    const camera = this.cameras.main;
    const resolutionMod = this.cameras.main.width / DEFAULT_WIDTH;
    camera.setZoom(DEFAULT_ZOOM * resolutionMod);    camera.setBackgroundColor(0x333333);
    camera.centerOnX(GRID * WORLD_X / 2);
    camera.centerOnY(GRID * WORLD_Y / 2);

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
      maxSpeed: 0.75,
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
      zoomSpeed: 0.05,
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

    keyONE.onDown = () => this.selectedStructure = Collector.name;
    keyTWO.onDown = () => this.selectedStructure = Weapon.name;
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
      const coordX = Math.floor(worldX / GRID);
      const coordY = Math.floor(worldY / GRID);
      console.log('pointerdown', coordX, coordY, this.selectedStructure);
      if (this.selectedStructure === null) return;
      const structure = new STRUCTURE_BY_NAME[this.selectedStructure](this, coordX, coordY);
      console.log('------------new structure', structure);
      this.network.placeStructure(coordX, coordY, structure);
    });

    input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: unknown[], deltaX: number, deltaY: number) => {
      const newZoom = camera.zoom - (deltaY > 0 ? 0.025 : -0.025);
      const clampedZoom = Phaser.Math.Clamp(newZoom, 2/3, 4/3);
      camera.zoom = clampedZoom;
    });
  }
}
